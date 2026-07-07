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

  it("로고 라벨(GYI)을 렌더한다", () => {
    render(<ProfileHeader config={SITE_CONFIG} />);
    expect(screen.getByText(SITE_CONFIG.logoLabel)).toBeInTheDocument();
  });
});
