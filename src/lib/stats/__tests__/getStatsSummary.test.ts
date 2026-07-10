import { describe, it, expect, vi, afterEach } from "vitest";

describe("getStatsSummary", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("events·links를 조회해 StatsSummary로 집계한다", async () => {
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

    const limit = vi.fn().mockResolvedValue({ data: events, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eventsSelect = vi.fn().mockReturnValue({ order });
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

    expect(summary.totalPageviews).toBe(1);
    expect(summary.totalClicks).toBe(1);
    expect(summary.clicksByLink).toEqual([{ linkId: "home", title: "홈", count: 1 }]);
    expect(eventsSelect).toHaveBeenCalledWith("*");
    expect(linksSelect).toHaveBeenCalledWith("id, title");
  });

  it("events 조회 에러 시 예외를 던진다", async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: { message: "events db down" } });
    const order = vi.fn().mockReturnValue({ limit });
    const eventsSelect = vi.fn().mockReturnValue({ order });
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
    const eventsSelect = vi.fn().mockReturnValue({ order });
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
});
