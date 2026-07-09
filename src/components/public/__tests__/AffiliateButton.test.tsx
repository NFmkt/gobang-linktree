import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AffiliateButton } from "../AffiliateButton";
import { SITE_CONFIG } from "@/lib/site/config";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

vi.mock("@/lib/events/sendBeacon", () => ({
  sendEventBeacon: vi.fn(),
}));

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

  it("focus-visible 시 블루 글로우 링 스타일(focus-glow)을 갖는다", () => {
    render(
      <AffiliateButton
        email={SITE_CONFIG.affiliateEmail}
        label={SITE_CONFIG.affiliateLabel}
      />,
    );
    const link = screen.getByRole("link", { name: SITE_CONFIG.affiliateLabel });
    expect(link.className).toMatch(/(^|\s)focus-glow(\s|$)/);
  });

  it("아웃라인 스타일 — 블루 테두리 + 블루 텍스트", () => {
    render(
      <AffiliateButton
        email={SITE_CONFIG.affiliateEmail}
        label={SITE_CONFIG.affiliateLabel}
      />,
    );
    const link = screen.getByRole("link", { name: SITE_CONFIG.affiliateLabel });
    expect(link.className).toMatch(/border-\[var\(--color-primary\)\]/);
    expect(link.className).toMatch(/text-\[var\(--color-primary\)\]/);
  });

  it("클릭 시 link_id='affiliate'로 클릭 이벤트 비콘을 전송한다", () => {
    vi.mocked(sendEventBeacon).mockClear();
    render(
      <AffiliateButton
        email={SITE_CONFIG.affiliateEmail}
        label={SITE_CONFIG.affiliateLabel}
      />,
    );
    const link = screen.getByRole("link", { name: SITE_CONFIG.affiliateLabel });
    fireEvent.click(link);
    expect(sendEventBeacon).toHaveBeenCalledWith({ type: "click", link_id: "affiliate" });
  });
});
