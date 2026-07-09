import { describe, it, expect, vi, afterEach } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/links", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("GET /api/admin/links", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("order 오름차순으로 전체 링크(비활성 포함)를 반환한다", async () => {
    const rows = [
      { id: "a", title: "A", url: "https://a.test", icon: "home", order: 1, active: true },
      { id: "b", title: "B", url: "https://b.test", icon: "home", order: 2, active: false },
    ];
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { GET } = await import("../route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.links).toEqual(rows);
    expect(from).toHaveBeenCalledWith("links");
    expect(select).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("order", { ascending: true });
  });

  it("supabase 조회 에러 시 500을 반환한다", async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/links", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("title/url/icon/order가 없으면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ title: "제목만" }));
    expect(res.status).toBe(400);
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("url이 javascript: 스킴이면 400을 반환하고 insert하지 않는다", async () => {
    const from = vi.fn();
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({ title: "A", url: "javascript:alert(1)", icon: "home", order: 1 }),
    );

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("정상 생성 시 201과 함께 active 기본값 true로 insert한다", async () => {
    const createdRow = {
      id: "generated-id",
      title: "새 링크",
      url: "https://new.test",
      icon: "home",
      subtitle: null,
      thumbnail: null,
      active: true,
      order: 3,
    };
    const single = vi.fn().mockResolvedValue({ data: createdRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({ title: "새 링크", url: "https://new.test", icon: "home", order: 3 }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "새 링크",
        url: "https://new.test",
        icon: "home",
        subtitle: null,
        thumbnail: null,
        active: true,
        order: 3,
      }),
    );
    expect(body.link).toEqual(createdRow);
  });

  it("active를 명시하면 그 값을 그대로 쓴다", async () => {
    const single = vi.fn().mockResolvedValue({ data: {}, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    await POST(
      makeRequest({ title: "A", url: "https://a.test", icon: "home", order: 1, active: false }),
    );

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });
});
