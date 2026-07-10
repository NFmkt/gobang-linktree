import { describe, it, expect, vi, afterEach } from "vitest";

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
