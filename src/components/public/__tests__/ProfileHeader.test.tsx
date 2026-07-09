import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileHeader } from "../ProfileHeader";
import { SITE_CONFIG } from "@/lib/site/config";

describe("ProfileHeader", () => {
  it('브랜드명 "고방"을 렌더한다', () => {
    render(<ProfileHeader config={SITE_CONFIG} />);
    expect(screen.getByText("고방")).toBeInTheDocument();
  });

  it("bio 문구를 렌더한다", () => {
    render(<ProfileHeader config={SITE_CONFIG} />);
    expect(screen.getByText(SITE_CONFIG.bio)).toBeInTheDocument();
  });

  it("GYI 로고 이미지를 렌더한다 (텍스트 라벨 대신)", () => {
    render(<ProfileHeader config={SITE_CONFIG} />);
    const logo = screen.getByAltText(`${SITE_CONFIG.brandName} 로고`);
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/bi.png");
    // GYI 텍스트는 더 이상 노출하지 않는다
    expect(screen.queryByText(SITE_CONFIG.logoLabel)).not.toBeInTheDocument();
  });

  it("공식 홈페이지 CTA(필 링크)를 노출하지 않는다", () => {
    render(<ProfileHeader config={SITE_CONFIG} />);
    expect(screen.queryByText(/공식 홈페이지/)).not.toBeInTheDocument();
  });
});
