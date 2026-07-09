import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { createAdminSessionToken } from "@/lib/auth/adminSession";

const ORIGINAL_ENV = { ...process.env };

describe("proxy (admin route protection)", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ADMIN_PASSWORD: "correct-password" };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("/admin/login은 인증 없이 통과한다 (리다이렉트 없음)", async () => {
    const { proxy: middleware } = await import("../proxy");
    const req = new NextRequest("http://localhost/admin/login");
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("/api/admin/login은 인증 없이 통과한다", async () => {
    const { proxy: middleware } = await import("../proxy");
    const req = new NextRequest("http://localhost/api/admin/login", { method: "POST" });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("유효한 세션 쿠키가 있으면 /admin을 통과시킨다", async () => {
    const token = await createAdminSessionToken();
    const { proxy: middleware } = await import("../proxy");
    const req = new NextRequest("http://localhost/admin", {
      headers: { Cookie: `admin_session=${token}` },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("세션 쿠키가 없으면 /admin을 /admin/login으로 리다이렉트한다", async () => {
    const { proxy: middleware } = await import("../proxy");
    const req = new NextRequest("http://localhost/admin");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/admin/login");
  });

  it("세션 쿠키가 잘못됐으면 /admin/links를 /admin/login으로 리다이렉트한다", async () => {
    const { proxy: middleware } = await import("../proxy");
    const req = new NextRequest("http://localhost/admin/links", {
      headers: { Cookie: "admin_session=bogus" },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/admin/login");
  });

  it("세션 쿠키가 없으면 /api/admin/*는 401을 반환한다 (리다이렉트 아님)", async () => {
    const { proxy: middleware } = await import("../proxy");
    const req = new NextRequest("http://localhost/api/admin/links");
    const res = await middleware(req);
    expect(res.status).toBe(401);
    expect(res.headers.get("location")).toBeNull();
  });
});
