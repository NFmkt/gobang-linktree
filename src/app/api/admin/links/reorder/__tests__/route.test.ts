import { describe, it, expect, vi, afterEach } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/links/reorder", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("PATCH /api/admin/links/reorder", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("order 배열이 없으면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("order가 빈 배열이면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ order: [] }));
    expect(res.status).toBe(400);
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("배열 순서대로 각 id의 order를 1부터 갱신한다", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ order: ["c", "a", "b"] }));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenNthCalledWith(1, { order: 1 });
    expect(eq).toHaveBeenNthCalledWith(1, "id", "c");
    expect(update).toHaveBeenNthCalledWith(2, { order: 2 });
    expect(eq).toHaveBeenNthCalledWith(2, "id", "a");
    expect(update).toHaveBeenNthCalledWith(3, { order: 3 });
    expect(eq).toHaveBeenNthCalledWith(3, "id", "b");
  });

  it("하나라도 실패하면 500을 반환한다", async () => {
    const eq = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "update failed" } });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ order: ["a", "b"] }));
    expect(res.status).toBe(500);
  });
});
