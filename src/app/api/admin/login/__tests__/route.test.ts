import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createAdminSessionToken } from "@/lib/auth/adminSession";

const ORIGINAL_ENV = { ...process.env };

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ADMIN_PASSWORD: "correct-password" };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("올바른 비밀번호면 200과 admin_session 쿠키를 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ password: "correct-password" }));

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");

    const expectedToken = await createAdminSessionToken();
    expect(setCookie).toContain(`admin_session=${expectedToken}`);
  });

  it("잘못된 비밀번호면 401을 반환하고 쿠키를 설정하지 않는다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ password: "wrong-password" }));

    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("password 필드가 없으면 401을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
  });
});
