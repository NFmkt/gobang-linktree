import { describe, it, expect, vi, afterEach } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/events", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/events", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("type이 없으면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("type이 pageview/click이 아니면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ type: "bogus" }));
    expect(res.status).toBe(400);
  });

  it("click인데 link_id가 없으면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ type: "click" }));
    expect(res.status).toBe(400);
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("정상 pageview 요청은 204를 반환하고 supabase에 올바른 필드로 insert한다", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        type: "pageview",
        referrer: "https://ref.test",
        utm_source: "kakao",
      }),
    );

    expect(res.status).toBe(204);
    expect(from).toHaveBeenCalledWith("events");
    expect(insert).toHaveBeenCalledWith({
      type: "pageview",
      link_id: null,
      referrer: "https://ref.test",
      utm_source: "kakao",
      utm_medium: null,
      utm_campaign: null,
    });
  });

  it("정상 click 요청은 204를 반환하고 link_id를 insert한다", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ type: "click", link_id: "youth" }));

    expect(res.status).toBe(204);
    expect(insert).toHaveBeenCalledWith({
      type: "click",
      link_id: "youth",
      referrer: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
    });
  });

  it("utm 파라미터가 담긴 click 요청도 그대로 insert한다 (링크x매체 교차 분석용)", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({ type: "click", link_id: "youth", utm_source: "insta", utm_medium: "social" }),
    );

    expect(res.status).toBe(204);
    expect(insert).toHaveBeenCalledWith({
      type: "click",
      link_id: "youth",
      referrer: null,
      utm_source: "insta",
      utm_medium: "social",
      utm_campaign: null,
    });
  });

  it("supabase insert가 에러를 반환하면 500을 반환한다", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: "db down" } });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ type: "click", link_id: "youth" }));

    expect(res.status).toBe(500);
  });
});
