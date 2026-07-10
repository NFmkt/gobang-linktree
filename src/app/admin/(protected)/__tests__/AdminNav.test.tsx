import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

function expectActive(el: HTMLElement) {
  expect(el.className).toContain("font-bold");
  expect(el.className).toContain("text-[var(--color-primary)]");
  // hover 클래스는 비활성 탭 전용이므로 active 탭에는 없어야 한다.
  expect(el.className).not.toContain("hover:text-[var(--color-primary)]");
}

function expectInactive(el: HTMLElement) {
  expect(el.className).not.toContain("font-bold");
  expect(el.className).toContain("text-[var(--color-ink-2)]");
  expect(el.className).toContain("hover:text-[var(--color-primary)]");
}

describe("AdminNav", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it("/admin/links 경로에서는 링크 관리 탭만 active 스타일이다", async () => {
    usePathnameMock.mockReturnValue("/admin/links");
    const { AdminNav } = await import("../AdminNav");
    render(<AdminNav />);

    expectActive(screen.getByRole("link", { name: "링크 관리" }));
    expectInactive(screen.getByRole("link", { name: "사이트 설정" }));
    expectInactive(screen.getByRole("link", { name: "통계" }));
  });

  it("/admin/settings 경로에서는 사이트 설정 탭만 active 스타일이다", async () => {
    usePathnameMock.mockReturnValue("/admin/settings");
    const { AdminNav } = await import("../AdminNav");
    render(<AdminNav />);

    expectActive(screen.getByRole("link", { name: "사이트 설정" }));
    expectInactive(screen.getByRole("link", { name: "링크 관리" }));
    expectInactive(screen.getByRole("link", { name: "통계" }));
  });

  it("/admin/stats 경로에서는 통계 탭만 active 스타일이다", async () => {
    usePathnameMock.mockReturnValue("/admin/stats");
    const { AdminNav } = await import("../AdminNav");
    render(<AdminNav />);

    expectActive(screen.getByRole("link", { name: "통계" }));
    expectInactive(screen.getByRole("link", { name: "링크 관리" }));
    expectInactive(screen.getByRole("link", { name: "사이트 설정" }));
  });

  it("하위 경로(/admin/links/123)에서도 링크 관리 탭이 active 처리된다", async () => {
    usePathnameMock.mockReturnValue("/admin/links/123");
    const { AdminNav } = await import("../AdminNav");
    render(<AdminNav />);

    expectActive(screen.getByRole("link", { name: "링크 관리" }));
  });

  it("모든 링크의 href가 올바르다", async () => {
    usePathnameMock.mockReturnValue("/admin/links");
    const { AdminNav } = await import("../AdminNav");
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "링크 관리" })).toHaveAttribute(
      "href",
      "/admin/links",
    );
    expect(screen.getByRole("link", { name: "사이트 설정" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
    expect(screen.getByRole("link", { name: "통계" })).toHaveAttribute("href", "/admin/stats");
  });
});
