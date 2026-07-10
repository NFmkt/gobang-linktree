import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { StatsSummary } from "@/lib/stats/types";

function makeSummary(overrides: Partial<StatsSummary> = {}): StatsSummary {
  return {
    totalPageviews: 10,
    totalClicks: 5,
    clickThroughRate: 50,
    pageviewsPeriodOverPeriod: { current: 10, previous: 8, changePercent: 25 },
    clicksByLink: [],
    dailyTrend: [],
    topReferrers: [],
    topCampaigns: [],
    weekdayDistribution: [],
    capped: false,
    ...overrides,
  };
}

describe("GET /api/admin/stats", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/stats/getStatsSummary");
    vi.resetModules();
  });

  it("from/to가 유효하면 getStatsSummary를 호출해 200과 StatsSummary를 그대로 응답한다", async () => {
    const summary = makeSummary();
    const getStatsSummary = vi.fn().mockResolvedValue(summary);
    vi.doMock("@/lib/stats/getStatsSummary", () => ({ getStatsSummary }));
    vi.resetModules();

    const { GET } = await import("../route");
    const req = new NextRequest(
      "http://localhost/api/admin/stats?from=2026-07-01&to=2026-07-10",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(summary);
    expect(getStatsSummary).toHaveBeenCalledTimes(1);
    const [calledFrom, calledTo] = getStatsSummary.mock.calls[0];
    expect(calledFrom).toBeInstanceOf(Date);
    expect(calledTo).toBeInstanceOf(Date);
    expect(calledFrom.toISOString()).toBe(new Date("2026-07-01").toISOString());
    expect(calledTo.toISOString()).toBe(new Date("2026-07-10").toISOString());
  });

  it("capped:true인 경우 응답 바디에 그대로 포함된다", async () => {
    const summary = makeSummary({ capped: true });
    const getStatsSummary = vi.fn().mockResolvedValue(summary);
    vi.doMock("@/lib/stats/getStatsSummary", () => ({ getStatsSummary }));
    vi.resetModules();

    const { GET } = await import("../route");
    const req = new NextRequest(
      "http://localhost/api/admin/stats?from=2026-07-01&to=2026-07-10",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.capped).toBe(true);
  });

  it("from이 없으면 400을 반환한다", async () => {
    const getStatsSummary = vi.fn();
    vi.doMock("@/lib/stats/getStatsSummary", () => ({ getStatsSummary }));
    vi.resetModules();

    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/admin/stats?to=2026-07-10");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("from, to 쿼리 파라미터는 필수입니다");
    expect(getStatsSummary).not.toHaveBeenCalled();
  });

  it("to가 없으면 400을 반환한다", async () => {
    const getStatsSummary = vi.fn();
    vi.doMock("@/lib/stats/getStatsSummary", () => ({ getStatsSummary }));
    vi.resetModules();

    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/admin/stats?from=2026-07-01");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("from, to 쿼리 파라미터는 필수입니다");
    expect(getStatsSummary).not.toHaveBeenCalled();
  });

  it("from/to가 모두 없으면 400을 반환한다", async () => {
    const getStatsSummary = vi.fn();
    vi.doMock("@/lib/stats/getStatsSummary", () => ({ getStatsSummary }));
    vi.resetModules();

    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/admin/stats");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("from, to 쿼리 파라미터는 필수입니다");
    expect(getStatsSummary).not.toHaveBeenCalled();
  });

  it("from이 올바른 날짜 형식이 아니면 400을 반환한다", async () => {
    const getStatsSummary = vi.fn();
    vi.doMock("@/lib/stats/getStatsSummary", () => ({ getStatsSummary }));
    vi.resetModules();

    const { GET } = await import("../route");
    const req = new NextRequest(
      "http://localhost/api/admin/stats?from=not-a-date&to=2026-07-10",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("from, to는 올바른 날짜 형식(ISO 8601)이어야 합니다");
    expect(getStatsSummary).not.toHaveBeenCalled();
  });

  it("to가 올바른 날짜 형식이 아니면 400을 반환한다", async () => {
    const getStatsSummary = vi.fn();
    vi.doMock("@/lib/stats/getStatsSummary", () => ({ getStatsSummary }));
    vi.resetModules();

    const { GET } = await import("../route");
    const req = new NextRequest(
      "http://localhost/api/admin/stats?from=2026-07-01&to=not-a-date",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("from, to는 올바른 날짜 형식(ISO 8601)이어야 합니다");
    expect(getStatsSummary).not.toHaveBeenCalled();
  });

  it("from > to이면 400을 반환한다", async () => {
    const getStatsSummary = vi.fn();
    vi.doMock("@/lib/stats/getStatsSummary", () => ({ getStatsSummary }));
    vi.resetModules();

    const { GET } = await import("../route");
    const req = new NextRequest(
      "http://localhost/api/admin/stats?from=2026-07-10&to=2026-07-01",
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("from은 to보다 이후일 수 없습니다");
    expect(getStatsSummary).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/stats", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("모든 이벤트를 삭제하고 200과 ok:true를 반환한다", async () => {
    const not = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ not });
    const from = vi.fn().mockReturnValue({ delete: del });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { DELETE } = await import("../route");
    const res = await DELETE();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("events");
    expect(del).toHaveBeenCalled();
    expect(not).toHaveBeenCalledWith("id", "is", null);
  });

  it("삭제 실패 시 500을 반환한다", async () => {
    const not = vi.fn().mockResolvedValue({ error: { message: "delete failed" } });
    const del = vi.fn().mockReturnValue({ not });
    const from = vi.fn().mockReturnValue({ delete: del });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { DELETE } = await import("../route");
    const res = await DELETE();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("delete failed");
  });
});
