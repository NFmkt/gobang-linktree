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
let countError: { message: string } | null = null;

function countBranchFor(type: string) {
  const gte = vi.fn().mockReturnValue({
    lte: vi.fn().mockImplementation(() => {
      if (countError) return Promise.resolve({ data: null, error: countError, count: null });
      return Promise.resolve({
        data: null,
        error: null,
        count: type === "pageview" ? pageviewCount : clickCount,
      });
    }),
  });
  return { gte };
}

describe("getStatsSummary", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
    pageviewCount = 0;
    clickCount = 0;
    countError = null;
  });

  const from = new Date("2026-07-04T00:00:00.000Z");
  const to = new Date("2026-07-10T23:59:59.999Z");

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
    // 직전 동일 길이 기간까지 포함한 넓은 범위로 조회(기간대비 비교를 위해)
    expect(gte).toHaveBeenCalledWith("created_at", expect.any(String));
    expect(lte).toHaveBeenCalledWith("created_at", to.toISOString());
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(10000);
    expect(linksSelect).toHaveBeenCalledWith("id, title");
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
});
