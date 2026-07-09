import { describe, it, expect } from "vitest";

describe("POST /api/admin/logout", () => {
  it("200을 반환하고 admin_session 쿠키를 즉시 만료시킨다", async () => {
    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("admin_session=");
    expect(setCookie.toLowerCase()).toContain("max-age=0");
  });
});
