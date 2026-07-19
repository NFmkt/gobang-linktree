import { describe, it, expect, vi, afterEach } from "vitest";
import { SITE_CONFIG } from "../config";

const ORIGINAL_ENV = { ...process.env };

describe("getSiteConfig", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("NEXT_PUBLIC_SUPABASE_URL이 없으면 정적 SITE_CONFIG로 폴백한다", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();

    const { getSiteConfig } = await import("../getSiteConfig");
    const result = await getSiteConfig();

    expect(result).toEqual(SITE_CONFIG);
  });

  it("NEXT_PUBLIC_SUPABASE_URL이 있으면 site_settings에서 조회해 매핑한다", async () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" };

    const dbRow = {
      brand_name: "DB브랜드",
      bio: "DB바이오",
      social: [{ key: "home", label: "홈", url: "https://db.test" }],
      affiliate_email: "db@test.com",
      affiliate_label: "DB제휴",
      affiliate_sheet_url: "https://docs.google.com/spreadsheets/d/db",
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { getSiteConfig } = await import("../getSiteConfig");
    const result = await getSiteConfig();

    expect(result).toEqual({
      brandName: "DB브랜드",
      bio: "DB바이오",
      logoLabel: SITE_CONFIG.logoLabel,
      social: dbRow.social,
      affiliateEmail: "db@test.com",
      affiliateLabel: "DB제휴",
      affiliateSheetUrl: "https://docs.google.com/spreadsheets/d/db",
    });
    expect(from).toHaveBeenCalledWith("site_settings");
    expect(eq).toHaveBeenCalledWith("id", "default");
  });

  it("DB 행에 affiliate_sheet_url 컬럼이 없으면(마이그레이션 0005 미적용) 빈 문자열로 채운다", async () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" };

    // 마이그레이션 0005(affiliate_sheet_url 컬럼 추가) 적용 전 상태를 흉내낸다:
    // select("*")가 돌려주는 행 객체에 해당 키 자체가 없다.
    const dbRow = {
      brand_name: "DB브랜드",
      bio: "DB바이오",
      social: [{ key: "home", label: "홈", url: "https://db.test" }],
      affiliate_email: "db@test.com",
      affiliate_label: "DB제휴",
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { getSiteConfig } = await import("../getSiteConfig");
    const result = await getSiteConfig();

    expect(result).toEqual({
      brandName: "DB브랜드",
      bio: "DB바이오",
      logoLabel: SITE_CONFIG.logoLabel,
      social: dbRow.social,
      affiliateEmail: "db@test.com",
      affiliateLabel: "DB제휴",
      affiliateSheetUrl: "",
    });
  });

  it("조회 결과가 없으면 정적 SITE_CONFIG로 폴백한다", async () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" };

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { getSiteConfig } = await import("../getSiteConfig");
    const result = await getSiteConfig();

    expect(result).toEqual(SITE_CONFIG);
  });

  it("조회 에러 시 예외를 던진다", async () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" };

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { getSiteConfig } = await import("../getSiteConfig");
    await expect(getSiteConfig()).rejects.toThrow(/db down/);
  });
});
