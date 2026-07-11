import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * events 테이블 조회 체인을 모킹한다.
 * 실제 코드는 select("*").gte(...).lte(...).order(...).limit(10000) 순서로 체이닝한다.
 */
function makeEventsSelect(events: unknown[]) {
  const limit = vi.fn().mockResolvedValue({ data: events, error: null });
  const order = vi.fn().mockReturnValue({ limit });
  const lte = vi.fn().mockReturnValue({ order });
  const gte = vi.fn().mockReturnValue({ lte });
  return { gte, lte, order, limit, select: vi.fn(makeSelectBranch(gte)) };
}

function makeSelectBranch(gte: ReturnType<typeof vi.fn>) {
  return (_columns: string, options?: { count?: string; head?: boolean }) => {
    if (options?.count) {
      return { eq: vi.fn((_col: string, value: string) => countBranchFor(value)) };
    }
    return { gte };
  };
}

let pageviewCount = 0;
let clickCount = 0;
let previousPageviewCount = 0;
let countError: { message: string } | null = null;

/**
 * count(exact, head) 쿼리 체인 모킹. `type = "pageview"`인 count 쿼리는 두 종류
 * (현재 기간 총 방문수 — `.lte()`로 끝맺음, 직전 기간 방문수 — `.lt()`로 끝맺음)가 있으므로
 * 어느 쪽 메서드가 호출됐는지로 반환값을 구분한다. `type = "click"`은 항상 `.lte()`.
 * 호출된 gte/lte/lt 모두 캡처해 테스트에서 정확한 인자를 검증할 수 있게 한다.
 */
const pageviewCountBranches: Array<{
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
}> = [];

function countBranchFor(type: string) {
  const lt = vi.fn().mockImplementation(() => {
    if (countError) return Promise.resolve({ data: null, error: countError, count: null });
    return Promise.resolve({ data: null, error: null, count: previousPageviewCount });
  });
  const lte = vi.fn().mockImplementation(() => {
    if (countError) return Promise.resolve({ data: null, error: countError, count: null });
    return Promise.resolve({
      data: null,
      error: null,
      count: type === "pageview" ? pageviewCount : clickCount,
    });
  });
  const gte = vi.fn().mockReturnValue({ lte, lt });
  if (type === "pageview") {
    pageviewCountBranches.push({ gte, lte, lt });
  }
  return { gte };
}

/** 두 개의 pageview count 쿼리 중 `.lt()`가 호출된(=직전 기간) 쪽을 찾는다. */
function findPreviousPageviewBranch() {
  return pageviewCountBranches.find((branch) => branch.lt.mock.calls.length > 0);
}

/** 두 개의 pageview count 쿼리 중 `.lte()`가 호출된(=현재 기간 총 방문수) 쪽을 찾는다. */
function findTotalPageviewBranch() {
  return pageviewCountBranches.find((branch) => branch.lte.mock.calls.length > 0);
}

describe("getStatsSummary", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
    pageviewCount = 0;
    clickCount = 0;
    previousPageviewCount = 0;
    countError = null;
    pageviewCountBranches.length = 0;
  });

  const from = new Date("2026-07-04T00:00:00.000Z");
  const to = new Date("2026-07-10T23:59:59.999Z");
  const previousStart = new Date(from.getTime() - (to.getTime() - from.getTime()));

  it("events·links·정확한 총계를 from~to 범위로 조회해 StatsSummary로 집계한다", async () => {
    const events = [
      {
        id: "1",
        type: "pageview",
        link_id: null,
        referrer: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        created_at: "2026-07-05T00:00:00.000Z",
      },
      {
        id: "2",
        type: "click",
        link_id: "home",
        referrer: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        created_at: "2026-07-05T00:00:00.000Z",
      },
    ];
    const links = [{ id: "home", title: "홈" }];
    pageviewCount = 15000;
    clickCount = 320;
    previousPageviewCount = 8000;

    const { gte, lte, order, limit, select: eventsSelect } = makeEventsSelect(events);
    const linksSelect = vi.fn().mockResolvedValue({ data: links, error: null });
    const from2 = vi.fn((table: string) => {
      if (table === "events") return { select: eventsSelect };
      if (table === "links") return { select: linksSelect };
      throw new Error(`unexpected table: ${table}`);
    });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from: from2 }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    const summary = await getStatsSummary(from, to);

    // 총계는 limit(10000) 캡과 무관하게 별도 count 쿼리 값을 쓴다.
    expect(summary.totalPageviews).toBe(15000);
    expect(summary.totalClicks).toBe(320);
    expect(summary.clicksByLink).toEqual([{ linkId: "home", title: "홈", count: 1 }]);
    expect(summary.capped).toBe(false);
    expect(eventsSelect).toHaveBeenCalledWith("*");
    // 메인 이벤트 쿼리는 이제 직전 기간을 섞지 않고 정확히 [from, to]만 조회한다
    // (과거 doubled-range 버그 수정 — B1 리뷰 1라운드).
    expect(gte).toHaveBeenCalledWith("created_at", from.toISOString());
    expect(lte).toHaveBeenCalledWith("created_at", to.toISOString());
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(10000);
    expect(linksSelect).toHaveBeenCalledWith("id, title");

    // 직전 기간 방문수는 별도 count(exact) 쿼리로, [previousStart, from) 경계로 조회한다.
    const previousBranch = findPreviousPageviewBranch();
    expect(previousBranch).toBeDefined();
    expect(previousBranch?.gte).toHaveBeenCalledWith("created_at", previousStart.toISOString());
    expect(previousBranch?.lt).toHaveBeenCalledWith("created_at", from.toISOString());

    // 현재 기간 총 방문수 count 쿼리는 여전히 [from, to] 그대로(양 끝 포함)다.
    const totalBranch = findTotalPageviewBranch();
    expect(totalBranch).toBeDefined();
    expect(totalBranch?.gte).toHaveBeenCalledWith("created_at", from.toISOString());
    expect(totalBranch?.lte).toHaveBeenCalledWith("created_at", to.toISOString());

    // previous는 정확한 count(exact) 쿼리 결과를 그대로 쓴다(events 스캔이 아님).
    expect(summary.pageviewsPeriodOverPeriod.previous).toBe(8000);
    expect(summary.pageviewsPeriodOverPeriod.current).toBe(15000);
  });

  it("선택 범위가 10000건 미만이면, 직전 기간까지 합치면 10000건이 넘는 상황이어도 capped: false다 (false-positive 수정)", async () => {
    // 선택 [from,to] 범위 자체의 이벤트는 9000건뿐이다(10000 미만) — 과거 doubled-range
    // 구현이었다면 여기에 직전 기간 이벤트까지 섞여 조회돼 10000건을 채우고 capped: true가
    // 잘못 반환됐을 상황이다. 메인 쿼리가 이제 [from,to]만 조회하므로 capped는 false여야 한다.
    const events = Array.from({ length: 9000 }, (_, i) => ({
      id: String(i),
      type: "pageview",
      link_id: null,
      referrer: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      created_at: "2026-07-05T00:00:00.000Z",
    }));
    // 직전 기간에도 다량의 이벤트가 있었다고 가정(구현이 doubled-range였다면 총합이 10000을 넘었을 상황).
    previousPageviewCount = 5000;

    const { gte, select: eventsSelect } = makeEventsSelect(events);
    const linksSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const from2 = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from: from2 }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    const summary = await getStatsSummary(from, to);

    expect(summary.capped).toBe(false);
    // 메인 쿼리가 여전히 [from,to]로만 조회했음을 확인(직전 기간 시작으로 넓어지지 않음).
    expect(gte).toHaveBeenCalledWith("created_at", from.toISOString());
  });

  it("이벤트 조회 결과가 10000건이면 capped: true를 반환한다", async () => {
    const events = Array.from({ length: 10000 }, (_, i) => ({
      id: String(i),
      type: "pageview",
      link_id: null,
      referrer: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      created_at: "2026-07-05T00:00:00.000Z",
    }));
    const { select: eventsSelect } = makeEventsSelect(events);
    const linksSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const from2 = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from: from2 }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    const summary = await getStatsSummary(from, to);
    expect(summary.capped).toBe(true);
  });

  it("메인 쿼리의 events 배열과 무관하게, previous는 직전 기간 count(exact) 쿼리 값을 정확히 반영한다", async () => {
    // 메인 쿼리가 반환하는 events에는 직전 기간 데이터가 전혀 없다(스코프가 [from,to]뿐이므로) —
    // 그럼에도 previous는 별도 count(exact) 쿼리 값(previousPageviewCount)을 그대로 써야 한다
    // (과거 undercount 버그 수정 — B1 리뷰 1라운드).
    const events = [
      {
        id: "1",
        type: "pageview",
        link_id: null,
        referrer: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        created_at: "2026-07-05T00:00:00.000Z",
      },
    ];
    pageviewCount = 1;
    previousPageviewCount = 4321;

    const { select: eventsSelect } = makeEventsSelect(events);
    const linksSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const from2 = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from: from2 }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    const summary = await getStatsSummary(from, to);

    expect(summary.pageviewsPeriodOverPeriod.previous).toBe(4321);
  });

  it("events 조회 에러 시 예외를 던진다", async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: { message: "events db down" } });
    const order = vi.fn().mockReturnValue({ limit });
    const lte = vi.fn().mockReturnValue({ order });
    const gte = vi.fn().mockReturnValue({ lte });
    const eventsSelect = vi.fn(makeSelectBranch(gte));
    const linksSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const from2 = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from: from2 }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    await expect(getStatsSummary(from, to)).rejects.toThrow(/events db down/);
  });

  it("links 조회 에러 시 예외를 던진다", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const lte = vi.fn().mockReturnValue({ order });
    const gte = vi.fn().mockReturnValue({ lte });
    const eventsSelect = vi.fn(makeSelectBranch(gte));
    const linksSelect = vi.fn().mockResolvedValue({ data: null, error: { message: "links db down" } });
    const from2 = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from: from2 }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    await expect(getStatsSummary(from, to)).rejects.toThrow(/links db down/);
  });

  it("총계 count 쿼리 에러 시 예외를 던진다", async () => {
    countError = { message: "count db down" };
    const events: unknown[] = [];
    const { select: eventsSelect } = makeEventsSelect(events);
    const linksSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const from2 = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from: from2 }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    await expect(getStatsSummary(from, to)).rejects.toThrow(/count db down/);
  });

  it("직전 기간 count 쿼리 에러 시 예외를 던진다", async () => {
    // pageview/click 총계 쿼리는 정상이지만 직전 기간 쿼리만 에러인 경우도 커버.
    // countError는 pageview/click/previous 세 count 쿼리에 공통 적용되므로, 여기서는
    // 최소한 "직전 기간 조회 실패" 메시지 포맷이 코드 경로상 실제로 쓰이는지를
    // 별도로 확인하기 위해 pageview/click count는 성공시키고 previous만 실패시킨다.
    const events: unknown[] = [];
    const limit = vi.fn().mockResolvedValue({ data: events, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const mainLte = vi.fn().mockReturnValue({ order });
    const mainGte = vi.fn().mockReturnValue({ lte: mainLte });

    let pageviewishCallCount = 0;
    const eventsSelect = vi.fn((_columns: string, options?: { count?: string; head?: boolean }) => {
      if (options?.count) {
        return {
          eq: vi.fn((_col: string, value: string) => {
            if (value === "click") {
              return {
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
                }),
              };
            }
            // pageview: first call = total pageviews (via .lte), second call = previous (via .lt, errors)
            pageviewishCallCount += 1;
            const isFirstPageviewCall = pageviewishCallCount === 1;
            return {
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue(
                  isFirstPageviewCall
                    ? { data: null, error: null, count: 0 }
                    : { data: null, error: null, count: 0 },
                ),
                lt: vi.fn().mockResolvedValue(
                  isFirstPageviewCall
                    ? { data: null, error: null, count: 0 }
                    : { data: null, error: { message: "previous period db down" }, count: null },
                ),
              }),
            };
          }),
        };
      }
      return { gte: mainGte };
    });
    const linksSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const from2 = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from: from2 }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    await expect(getStatsSummary(from, to)).rejects.toThrow(/직전 기간 조회 실패/);
  });
});
