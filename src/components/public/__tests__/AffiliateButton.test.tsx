import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AffiliateButton } from "../AffiliateButton";
import { SITE_CONFIG } from "@/lib/site/config";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

vi.mock("@/lib/events/sendBeacon", () => ({
  sendEventBeacon: vi.fn(),
}));

describe("AffiliateButton", () => {
  it("초기 상태: 라벨 버튼만 보이고 이메일은 숨겨져 있다", () => {
    render(
      <AffiliateButton email={SITE_CONFIG.affiliateEmail} label={SITE_CONFIG.affiliateLabel} />,
    );
    expect(screen.getByRole("button", { name: SITE_CONFIG.affiliateLabel })).toBeInTheDocument();
    expect(screen.queryByText(SITE_CONFIG.affiliateEmail)).not.toBeInTheDocument();
  });

  it("버튼 클릭 시 이메일이 mailto 링크로 펼쳐진다", () => {
    render(
      <AffiliateButton email={SITE_CONFIG.affiliateEmail} label={SITE_CONFIG.affiliateLabel} />,
    );
    fireEvent.click(screen.getByRole("button", { name: SITE_CONFIG.affiliateLabel }));
    const emailLink = screen.getByRole("link", { name: SITE_CONFIG.affiliateEmail });
    expect(emailLink).toHaveAttribute("href", `mailto:${SITE_CONFIG.affiliateEmail}`);
  });

  it("다시 클릭하면 이메일이 접힌다", () => {
    render(
      <AffiliateButton email={SITE_CONFIG.affiliateEmail} label={SITE_CONFIG.affiliateLabel} />,
    );
    const toggle = screen.getByRole("button", { name: SITE_CONFIG.affiliateLabel });
    fireEvent.click(toggle);
    expect(screen.getByText(SITE_CONFIG.affiliateEmail)).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText(SITE_CONFIG.affiliateEmail)).not.toBeInTheDocument();
  });

  it("버튼의 aria-expanded로 펼침/접힘 상태를 노출한다", () => {
    render(
      <AffiliateButton email={SITE_CONFIG.affiliateEmail} label={SITE_CONFIG.affiliateLabel} />,
    );
    const toggle = screen.getByRole("button", { name: SITE_CONFIG.affiliateLabel });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("토글 버튼은 focus-visible 시 블루 글로우 링 스타일(focus-glow)을 갖는다", () => {
    render(
      <AffiliateButton email={SITE_CONFIG.affiliateEmail} label={SITE_CONFIG.affiliateLabel} />,
    );
    const toggle = screen.getByRole("button", { name: SITE_CONFIG.affiliateLabel });
    expect(toggle.className).toMatch(/(^|\s)focus-glow(\s|$)/);
  });

  it("토글 버튼은 아웃라인 스타일 — 블루 테두리 + 블루 텍스트", () => {
    render(
      <AffiliateButton email={SITE_CONFIG.affiliateEmail} label={SITE_CONFIG.affiliateLabel} />,
    );
    const toggle = screen.getByRole("button", { name: SITE_CONFIG.affiliateLabel });
    expect(toggle.className).toMatch(/border-\[var\(--color-primary\)\]/);
    expect(toggle.className).toMatch(/text-\[var\(--color-primary\)\]/);
  });

  it("펼쳐진 이메일 링크 클릭 시 link_id='affiliate'로 클릭 이벤트 비콘을 전송한다", () => {
    vi.mocked(sendEventBeacon).mockClear();
    render(
      <AffiliateButton email={SITE_CONFIG.affiliateEmail} label={SITE_CONFIG.affiliateLabel} />,
    );
    fireEvent.click(screen.getByRole("button", { name: SITE_CONFIG.affiliateLabel }));
    fireEvent.click(screen.getByRole("link", { name: SITE_CONFIG.affiliateEmail }));
    expect(sendEventBeacon).toHaveBeenCalledWith({ type: "click", link_id: "affiliate" });
  });

  it("이메일을 펼치는 토글 클릭만으로는 비콘을 전송하지 않는다", () => {
    vi.mocked(sendEventBeacon).mockClear();
    render(
      <AffiliateButton email={SITE_CONFIG.affiliateEmail} label={SITE_CONFIG.affiliateLabel} />,
    );
    fireEvent.click(screen.getByRole("button", { name: SITE_CONFIG.affiliateLabel }));
    expect(sendEventBeacon).not.toHaveBeenCalled();
  });
});
