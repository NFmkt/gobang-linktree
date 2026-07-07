import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AffiliateButton } from "../AffiliateButton";
import { SITE_CONFIG } from "@/lib/site/config";

describe("AffiliateButton", () => {
  it("href가 정확히 mailto:neoflatworks2@gmail.com이다", () => {
    render(
      <AffiliateButton
        email={SITE_CONFIG.affiliateEmail}
        label={SITE_CONFIG.affiliateLabel}
      />,
    );
    const link = screen.getByRole("link", { name: SITE_CONFIG.affiliateLabel });
    expect(link).toHaveAttribute("href", "mailto:neoflatworks2@gmail.com");
  });

  it("라벨을 렌더한다", () => {
    render(
      <AffiliateButton
        email={SITE_CONFIG.affiliateEmail}
        label={SITE_CONFIG.affiliateLabel}
      />,
    );
    expect(screen.getByText(SITE_CONFIG.affiliateLabel)).toBeInTheDocument();
  });
});
