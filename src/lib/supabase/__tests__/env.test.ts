import { describe, it, expect, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("Supabase 클라이언트 팩토리 — 환경변수 가드", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("브라우저 클라이언트: NEXT_PUBLIC_SUPABASE_URL이 없으면 명확한 에러를 던진다", async () => {
    const { createBrowserSupabaseClient } = await import("../client");
    expect(() => createBrowserSupabaseClient()).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("서버 클라이언트: SUPABASE_SERVICE_ROLE_KEY가 없으면 명확한 에러를 던진다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const { createServiceSupabaseClient } = await import("../server");
    expect(() => createServiceSupabaseClient()).toThrowError(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });
});
