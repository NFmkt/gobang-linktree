import { describe, it, expect, vi, afterEach } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/settings", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("GET /api/admin/settings", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("현재 설정을 반환한다", async () => {
    const row = {
      id: "default",
      brand_name: "고방",
      bio: "bio",
      social: [],
      affiliate_email: "a@b.com",
      affiliate_label: "제휴",
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { GET } = await import("../route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings).toEqual(row);
  });

  it("설정 행이 없으면 404를 반환한다", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/settings", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("변경할 필드가 없으면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("이메일 형식이 올바르지 않으면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ affiliate_email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("social이 배열이 아니면 400을 반환하고 update하지 않는다", async () => {
    const from = vi.fn();
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ social: "not-an-array" }));

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("social 항목에 javascript: URL이 있으면 400을 반환하고 update하지 않는다", async () => {
    const from = vi.fn();
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(
      makeRequest({ social: [{ key: "home", label: "홈", url: "javascript:alert(1)" }] }),
    );

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("정상 업데이트 시 200과 갱신된 설정을 반환한다", async () => {
    const updatedRow = {
      id: "default",
      brand_name: "새이름",
      bio: "bio",
      social: [],
      affiliate_email: "a@b.com",
      affiliate_label: "제휴",
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ brand_name: "새이름" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ brand_name: "새이름" });
    expect(eq).toHaveBeenCalledWith("id", "default");
    expect(body.settings).toEqual(updatedRow);
  });

  it("존재하지 않는 설정이면 404를 반환한다", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ brand_name: "새이름" }));
    expect(res.status).toBe(404);
  });
});
