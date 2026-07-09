import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { getLinkIcon } from "../getLinkIcon";

describe("getLinkIcon", () => {
  it("youth 키에 대해 아이콘 컴포넌트를 반환한다", () => {
    const Icon = getLinkIcon("youth");
    const { container } = render(<Icon />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("feed 키에 대해 아이콘 컴포넌트를 반환한다", () => {
    const Icon = getLinkIcon("feed");
    const { container } = render(<Icon />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("series 키에 대해 아이콘 컴포넌트를 반환한다", () => {
    const Icon = getLinkIcon("series");
    const { container } = render(<Icon />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("소셜 키(home/blog/instagram/youtube/kakao)에 대해 아이콘 컴포넌트를 반환한다", () => {
    for (const key of ["home", "blog", "instagram", "youtube", "kakao"]) {
      const Icon = getLinkIcon(key);
      const { container } = render(<Icon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    }
  });

  it("매칭되지 않는 키는 기본 아이콘으로 폴백한다", () => {
    const Icon = getLinkIcon("unknown-key-xyz");
    const { container } = render(<Icon />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("렌더된 svg는 aria-hidden이다 (장식용, 텍스트 병기)", () => {
    const Icon = getLinkIcon("youth");
    const { container } = render(<Icon />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
