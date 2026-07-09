import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SocialRow } from "../SocialRow";
import { SITE_CONFIG } from "@/lib/site/config";

describe("SocialRow", () => {
  it("모든 소셜을 각 SITE_CONFIG.social url을 href로 렌더한다", () => {
    render(<SocialRow items={SITE_CONFIG.social} />);

    for (const item of SITE_CONFIG.social) {
      const link = screen.getByLabelText(item.label);
      expect(link).toHaveAttribute("href", item.url);
    }
  });

  it("인스타그램은 블로그와 유튜브 사이, 카카오는 유튜브 다음 순서다", () => {
    const keys = SITE_CONFIG.social.map((s) => s.key);
    expect(keys).toEqual(["home", "blog", "instagram", "youtube", "kakao"]);

    const insta = SITE_CONFIG.social.find((s) => s.key === "instagram");
    const kakao = SITE_CONFIG.social.find((s) => s.key === "kakao");
    expect(insta?.url).toBe("https://www.instagram.com/gobang.kr");
    expect(kakao?.url).toBe("https://open.kakao.com/o/gspAuZ5");
  });

  it("모든 링크가 새 탭(target=_blank)과 rel=noopener를 갖는다", () => {
    render(<SocialRow items={SITE_CONFIG.social} />);

    for (const item of SITE_CONFIG.social) {
      const link = screen.getByLabelText(item.label);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
  });

  it("각 링크에 aria-label이 존재한다", () => {
    render(<SocialRow items={SITE_CONFIG.social} />);
    for (const item of SITE_CONFIG.social) {
      expect(screen.getByLabelText(item.label)).toBeInTheDocument();
    }
  });

  it("각 링크가 focus-visible 시 블루 글로우 링 스타일(focus-glow)을 갖는다", () => {
    render(<SocialRow items={SITE_CONFIG.social} />);
    for (const item of SITE_CONFIG.social) {
      const link = screen.getByLabelText(item.label);
      expect(link.className).toMatch(/(^|\s)focus-glow(\s|$)/);
    }
  });
});
