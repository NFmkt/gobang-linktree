import { describe, it, expect, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("adminSession", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ADMIN_PASSWORD: "test-password-123" };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("createAdminSessionToken은 같은 비밀번호에 대해 항상 같은 토큰을 생성한다", async () => {
    const { createAdminSessionToken } = await import("../adminSession");
    const a = await createAdminSessionToken();
    const b = await createAdminSessionToken();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("verifyAdminSessionToken은 올바른 토큰에 대해 true를 반환한다", async () => {
    const { createAdminSessionToken, verifyAdminSessionToken } = await import("../adminSession");
    const token = await createAdminSessionToken();
    expect(await verifyAdminSessionToken(token)).toBe(true);
  });

  it("verifyAdminSessionToken은 잘못된 토큰에 대해 false를 반환한다", async () => {
    const { verifyAdminSessionToken } = await import("../adminSession");
    expect(await verifyAdminSessionToken("bogus-token")).toBe(false);
  });

  it("verifyAdminSessionToken은 undefined/null에 대해 false를 반환한다", async () => {
    const { verifyAdminSessionToken } = await import("../adminSession");
    expect(await verifyAdminSessionToken(undefined)).toBe(false);
    expect(await verifyAdminSessionToken(null)).toBe(false);
  });

  it("ADMIN_PASSWORD가 다르면 다른 토큰을 생성한다", async () => {
    const { createAdminSessionToken } = await import("../adminSession");
    const tokenA = await createAdminSessionToken();

    process.env.ADMIN_PASSWORD = "different-password";
    const tokenB = await createAdminSessionToken();

    expect(tokenA).not.toBe(tokenB);
  });

  it("ADMIN_PASSWORD가 없으면 createAdminSessionToken이 에러를 던진다", async () => {
    delete process.env.ADMIN_PASSWORD;
    const { createAdminSessionToken } = await import("../adminSession");
    await expect(createAdminSessionToken()).rejects.toThrow(/ADMIN_PASSWORD/);
  });

  it("constantTimeEqual은 길이가 다르면 false, 같은 문자열이면 true를 반환한다", async () => {
    const { constantTimeEqual } = await import("../adminSession");
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
  });
});
