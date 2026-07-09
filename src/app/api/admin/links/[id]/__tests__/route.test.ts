import { describe, it, expect, vi, afterEach } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/links/some-id", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/admin/links/[id]", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("body에 변경할 필드가 없으면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({}), makeParams("a"));
    expect(res.status).toBe(400);
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest("not json"), makeParams("a"));
    expect(res.status).toBe(400);
  });

  it("url이 javascript: 스킴이면 400을 반환하고 update하지 않는다", async () => {
    const from = vi.fn();
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ url: "javascript:alert(1)" }), makeParams("a"));

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("정상 업데이트 시 200과 갱신된 링크를 반환한다", async () => {
    const updatedRow = { id: "a", title: "A", url: "https://a.test", icon: "home", order: 1, active: false };
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
    const res = await PATCH(makeRequest({ active: false }), makeParams("a"));
    const resBody = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ active: false });
    expect(eq).toHaveBeenCalledWith("id", "a");
    expect(resBody.link).toEqual(updatedRow);
  });

  it("존재하지 않는 id면 404를 반환한다", async () => {
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
    const res = await PATCH(makeRequest({ active: false }), makeParams("missing"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/links/[id]", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("정상 삭제 시 200을 반환한다", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "a" }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { DELETE } = await import("../route");
    const res = await DELETE(
      new Request("http://localhost/api/admin/links/a", { method: "DELETE" }),
      makeParams("a"),
    );
    expect(res.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("id", "a");
  });

  it("존재하지 않는 id면 404를 반환한다", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { DELETE } = await import("../route");
    const res = await DELETE(
      new Request("http://localhost/api/admin/links/missing", { method: "DELETE" }),
      makeParams("missing"),
    );
    expect(res.status).toBe(404);
  });
});
