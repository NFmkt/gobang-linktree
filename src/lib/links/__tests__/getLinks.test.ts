import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { selectVisibleLinks, getLinks } from "../getLinks";
import { SEED_LINKS } from "../seed";
import type { Link } from "../types";
import { SITE_CONFIG } from "@/lib/site/config";

const ORIGINAL_ENV = { ...process.env };

describe("selectVisibleLinks", () => {
  it("active=false 링크를 제외한다", () => {
    const links: Link[] = [
      { id: "a", title: "A", url: "https://a.test", icon: "a", order: 1, active: true },
      { id: "b", title: "B", url: "https://b.test", icon: "b", order: 2, active: false },
    ];

    const result = selectVisibleLinks(links);

    expect(result.map((l) => l.id)).toEqual(["a"]);
  });

  it("order 오름차순으로 정렬한다 (입력을 뒤섞어도)", () => {
    const links: Link[] = [
      { id: "c", title: "C", url: "https://c.test", icon: "c", order: 3, active: true },
      { id: "a", title: "A", url: "https://a.test", icon: "a", order: 1, active: true },
      { id: "b", title: "B", url: "https://b.test", icon: "b", order: 2, active: true },
    ];

    const result = selectVisibleLinks(links);

    expect(result.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const links: Link[] = [
      { id: "b", title: "B", url: "https://b.test", icon: "b", order: 2, active: true },
      { id: "a", title: "A", url: "https://a.test", icon: "a", order: 1, active: true },
    ];
    const original = [...links];

    selectVisibleLinks(links);

    expect(links).toEqual(original);
  });
});

describe("SEED_LINKS", () => {
  it("정확히 3개이고 각 url이 SPEC 값과 일치한다", () => {
    expect(SEED_LINKS).toHaveLength(3);

    const byId = Object.fromEntries(SEED_LINKS.map((l) => [l.id, l]));

    expect(byId.youth).toMatchObject({
      id: "youth",
      title: "청년주택 공고 확인",
      url: "https://gobang.kr/youth",
      icon: "youth",
      order: 1,
      active: true,
    });
    expect(byId.feed).toMatchObject({
      id: "feed",
      title: "청년혜택 모아보기",
      url: "https://gobang.kr/feed",
      icon: "feed",
      order: 2,
      active: true,
    });
    expect(byId.series).toMatchObject({
      id: "series",
      title: "자취 꿀정보",
      url: "https://gobang.kr/feed/series",
      icon: "series",
      order: 3,
      active: true,
    });
  });
});

describe("getLinks", () => {
  it("활성 링크만, order 오름차순 정렬로 반환한다 (NEXT_PUBLIC_SUPABASE_URL 미설정 시 SEED_LINKS 폴백)", async () => {
    const result = await getLinks();

    expect(result.every((l) => l.active)).toBe(true);
    const orders = result.map((l) => l.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(result.map((l) => l.id)).toEqual(["youth", "feed", "series"]);
  });
});

describe("getLinks — Supabase 연동", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("NEXT_PUBLIC_SUPABASE_URL이 설정되면 SEED_LINKS 대신 Supabase에서 조회한 값을 반환한다", async () => {
    const dbRows: Link[] = [
      { id: "db-only", title: "DB 전용 링크", url: "https://db.test", icon: "db", order: 1, active: true },
    ];
    const order = vi.fn().mockResolvedValue({ data: dbRows, error: null });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });

    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { getLinks: getLinksWithSupabase } = await import("../getLinks");
    const result = await getLinksWithSupabase();

    expect(result).toEqual(dbRows);
    expect(from).toHaveBeenCalledWith("links");
    expect(select).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("order", { ascending: true });
  });

  it("Supabase 조회가 에러를 반환하면 예외를 던진다", async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: "network down" } });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });

    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { getLinks: getLinksWithSupabase } = await import("../getLinks");
    await expect(getLinksWithSupabase()).rejects.toThrow(/network down/);
  });
});

describe("SITE_CONFIG", () => {
  it("affiliateEmail과 social 5개 url이 SPEC 값과 일치한다", () => {
    expect(SITE_CONFIG.affiliateEmail).toBe("neoflatworks2@gmail.com");
    expect(SITE_CONFIG.social).toHaveLength(5);

    const byKey = Object.fromEntries(SITE_CONFIG.social.map((s) => [s.key, s]));

    expect(byKey.home.url).toBe(
      "https://gobang.kr/home?p=homeAdvertisingPopup",
    );
    expect(byKey.blog.url).toBe("https://blog.naver.com/neoflat1116");
    expect(byKey.instagram.url).toBe("https://www.instagram.com/gobang.kr");
    expect(byKey.youtube.url).toBe("https://www.youtube.com/@youth_info");
    expect(byKey.kakao.url).toBe("https://open.kakao.com/o/gspAuZ5");
  });
});
