import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LinkButton } from "../LinkButton";
import type { Link } from "@/lib/links/types";

const link: Link = {
  id: "youth",
  title: "청년주택 공고 확인",
  url: "https://gobang.kr/youth",
  icon: "youth",
  order: 1,
  active: true,
};

describe("LinkButton", () => {
  it("link의 title을 렌더한다", () => {
    render(<LinkButton link={link} />);
    expect(screen.getByText(link.title)).toBeInTheDocument();
  });

  it("href가 link.url과 일치하는 <a> 태그를 렌더한다", () => {
    render(<LinkButton link={link} />);
    const anchor = screen.getByRole("link", { name: new RegExp(link.title) });
    expect(anchor.tagName).toBe("A");
    expect(anchor).toHaveAttribute("href", link.url);
  });

  it("subtitle이 있으면 렌더한다", () => {
    render(<LinkButton link={{ ...link, subtitle: "보조 설명" }} />);
    expect(screen.getByText("보조 설명")).toBeInTheDocument();
  });

  it("subtitle이 없으면 렌더하지 않는다", () => {
    render(<LinkButton link={link} />);
    expect(screen.queryByText("보조 설명")).not.toBeInTheDocument();
  });

  it("focus-visible 포커스 링 스타일을 갖는다", () => {
    render(<LinkButton link={link} />);
    const anchor = screen.getByRole("link", { name: new RegExp(link.title) });
    expect(anchor.className).toMatch(/focus-visible:outline/);
    expect(anchor.className).toMatch(/focus-visible:outline-\[var\(--color-ink\)\]/);
  });
});

describe("LinkButton 리스트 렌더", () => {
  it("활성 링크 3개가 각 정확한 href로 렌더된다", () => {
    const links: Link[] = [
      { id: "youth", title: "청년주택 공고 확인", url: "https://gobang.kr/youth", icon: "youth", order: 1, active: true },
      { id: "feed", title: "청년혜택 모아보기", url: "https://gobang.kr/feed", icon: "feed", order: 2, active: true },
      { id: "series", title: "자취 꿀정보", url: "https://gobang.kr/feed/series", icon: "series", order: 3, active: true },
    ];

    render(
      <>
        {links.map((l) => (
          <LinkButton key={l.id} link={l} />
        ))}
      </>,
    );

    for (const l of links) {
      const anchor = screen.getByRole("link", { name: new RegExp(l.title) });
      expect(anchor).toHaveAttribute("href", l.url);
    }
  });

  it("selectVisibleLinks를 거친 결과는 active=false 링크를 노출하지 않는다", async () => {
    const { selectVisibleLinks } = await import("@/lib/links/getLinks");
    const links: Link[] = [
      { id: "a", title: "노출됨A", url: "https://a.test", icon: "a", order: 1, active: true },
      { id: "b", title: "숨김B", url: "https://b.test", icon: "b", order: 3, active: false },
      { id: "c", title: "노출됨C", url: "https://c.test", icon: "c", order: 2, active: true },
    ];

    const visible = selectVisibleLinks(links);

    render(
      <>
        {visible.map((l) => (
          <LinkButton key={l.id} link={l} />
        ))}
      </>,
    );

    expect(screen.getByText("노출됨A")).toBeInTheDocument();
    expect(screen.getByText("노출됨C")).toBeInTheDocument();
    expect(screen.queryByText("숨김B")).not.toBeInTheDocument();
  });
});
