import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SocialRow } from "../SocialRow";
import { SITE_CONFIG } from "@/lib/site/config";

describe("SocialRow", () => {
  it("소셜 3개를 각 SITE_CONFIG.social url을 href로 렌더한다", () => {
    render(<SocialRow items={SITE_CONFIG.social} />);

    for (const item of SITE_CONFIG.social) {
      const link = screen.getByLabelText(item.label);
      expect(link).toHaveAttribute("href", item.url);
    }
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
});
