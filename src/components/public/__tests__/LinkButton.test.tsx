import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LinkButton } from "../LinkButton";
import type { Link } from "@/lib/links/types";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

vi.mock("@/lib/events/sendBeacon", () => ({
  sendEventBeacon: vi.fn(),
}));

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

  it("thumbnail이 없으면 아이콘 칩을 렌더한다", () => {
    render(<LinkButton link={link} />);
    const anchor = screen.getByRole("link", { name: new RegExp(link.title) });
    expect(anchor.querySelector("img")).not.toBeInTheDocument();
  });

  it("thumbnail이 있으면 아이콘 대신 썸네일 이미지를 렌더한다", () => {
    render(<LinkButton link={{ ...link, thumbnail: "https://cdn.test/thumb.jpg" }} />);
    const anchor = screen.getByRole("link", { name: new RegExp(link.title) });
    const img = anchor.querySelector("img");
    expect(img).toHaveAttribute("src", "https://cdn.test/thumb.jpg");
  });

  it("thumbnail이 안전하지 않은 스킴이면 무시하고 아이콘 칩을 렌더한다", () => {
    render(<LinkButton link={{ ...link, thumbnail: "javascript:alert(1)" }} />);
    const anchor = screen.getByRole("link", { name: new RegExp(link.title) });
    expect(anchor.querySelector("img")).not.toBeInTheDocument();
  });

  it("focus-visible 시 블루 글로우 링 스타일(focus-glow)을 갖는다", () => {
    render(<LinkButton link={link} />);
    const anchor = screen.getByRole("link", { name: new RegExp(link.title) });
    expect(anchor.className).toMatch(/(^|\s)focus-glow(\s|$)/);
  });

  it("delayMs가 주어지면 reveal 애니메이션 클래스와 지연을 적용한다", () => {
    render(<LinkButton link={link} delayMs={200} />);
    const anchor = screen.getByRole("link", { name: new RegExp(link.title) });
    expect(anchor.className).toMatch(/(^|\s)reveal(\s|$)/);
    expect(anchor.style.animationDelay).toBe("200ms");
  });

  it("클릭 시 link.id로 클릭 이벤트 비콘을 전송한다", () => {
    vi.mocked(sendEventBeacon).mockClear();
    render(<LinkButton link={link} />);
    const anchor = screen.getByRole("link", { name: new RegExp(link.title) });
    fireEvent.click(anchor);
    expect(sendEventBeacon).toHaveBeenCalledWith({
      type: "click",
      link_id: link.id,
      utm_source: undefined,
      utm_medium: undefined,
      utm_campaign: undefined,
    });
  });

  it("현재 URL에 utm 파라미터가 있으면 클릭 이벤트에도 함께 담아 보낸다", () => {
    vi.mocked(sendEventBeacon).mockClear();
    window.history.pushState({}, "", "/?utm_source=insta&utm_medium=social");
    render(<LinkButton link={link} />);
    const anchor = screen.getByRole("link", { name: new RegExp(link.title) });
    fireEvent.click(anchor);
    expect(sendEventBeacon).toHaveBeenCalledWith({
      type: "click",
      link_id: link.id,
      utm_source: "insta",
      utm_medium: "social",
      utm_campaign: undefined,
    });
    window.history.pushState({}, "", "/");
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
