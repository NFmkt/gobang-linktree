import { describe, it, expect, vi, afterEach } from "vitest";

function makeEventsSelect(events: unknown[]) {
  const limit = vi.fn().mockResolvedValue({ data: events, error: null });
  const order = vi.fn().mockReturnValue({ limit });
  return { order, select: vi.fn(makeSelectBranch(order)) };
}

function makeSelectBranch(order: ReturnType<typeof vi.fn>) {
  return (_columns: string, options?: { count?: string; head?: boolean }) => {
    if (options?.count) {
      return { eq: vi.fn((_col: string, value: string) => countResultFor(value)) };
    }
    return { order };
  };
}

let pageviewCount = 0;
let clickCount = 0;
let countError: { message: string } | null = null;

function countResultFor(type: string) {
  if (countError) return Promise.resolve({ data: null, error: countError, count: null });
  return Promise.resolve({
    data: null,
    error: null,
    count: type === "pageview" ? pageviewCount : clickCount,
  });
}

describe("getStatsSummary", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
    pageviewCount = 0;
    clickCount = 0;
    countError = null;
  });

  it("events·links·정확한 총계를 조회해 StatsSummary로 집계한다", async () => {
    const events = [
      {
        id: "1",
        type: "pageview",
        link_id: null,
        referrer: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        created_at: "2026-07-10T00:00:00.000Z",
      },
      {
        id: "2",
        type: "click",
        link_id: "home",
        referrer: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        created_at: "2026-07-10T00:00:00.000Z",
      },
    ];
    const links = [{ id: "home", title: "홈" }];
    pageviewCount = 15000;
    clickCount = 320;

    const { order, select: eventsSelect } = makeEventsSelect(events);
    const linksSelect = vi.fn().mockResolvedValue({ data: links, error: null });
    const from = vi.fn((table: string) => {
      if (table === "events") return { select: eventsSelect };
      if (table === "links") return { select: linksSelect };
      throw new Error(`unexpected table: ${table}`);
    });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    const summary = await getStatsSummary();

    // 총계는 limit(10000) 캡과 무관하게 별도 count 쿼리 값을 쓴다.
    expect(summary.totalPageviews).toBe(15000);
    expect(summary.totalClicks).toBe(320);
    expect(summary.clicksByLink).toEqual([{ linkId: "home", title: "홈", count: 1 }]);
    expect(eventsSelect).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(linksSelect).toHaveBeenCalledWith("id, title");
  });

  it("events 조회 에러 시 예외를 던진다", async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: { message: "events db down" } });
    const order = vi.fn().mockReturnValue({ limit });
    const eventsSelect = vi.fn(makeSelectBranch(order));
    const linksSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const from = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    await expect(getStatsSummary()).rejects.toThrow(/events db down/);
  });

  it("links 조회 에러 시 예외를 던진다", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eventsSelect = vi.fn(makeSelectBranch(order));
    const linksSelect = vi.fn().mockResolvedValue({ data: null, error: { message: "links db down" } });
    const from = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    await expect(getStatsSummary()).rejects.toThrow(/links db down/);
  });

  it("총계 count 쿼리 에러 시 예외를 던진다", async () => {
    countError = { message: "count db down" };
    const events: unknown[] = [];
    const { select: eventsSelect } = makeEventsSelect(events);
    const linksSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const from = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    await expect(getStatsSummary()).rejects.toThrow(/count db down/);
  });
});
