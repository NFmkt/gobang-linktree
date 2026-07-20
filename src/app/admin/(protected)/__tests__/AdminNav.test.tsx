import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

describe("AdminNav 제휴 문의 탭", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/admin/links");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("시트 링크가 설정돼 있으면 클릭 시 새 탭으로 연다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ settings: { affiliate_sheet_url: "https://docs.google.com/sheet" } }),
          { status: 200 },
        ),
      ),
    );
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    const { AdminNav } = await import("../AdminNav");
    render(<AdminNav />);
    fireEvent.click(screen.getByRole("button", { name: "제휴 문의" }));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        "https://docs.google.com/sheet",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  it("시트 링크가 비어있으면 클릭 시 안내 메시지를 띄운다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ settings: { affiliate_sheet_url: "" } }), { status: 200 }),
      ),
    );
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    const { AdminNav } = await import("../AdminNav");
    render(<AdminNav />);
    fireEvent.click(screen.getByRole("button", { name: "제휴 문의" }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("관리자 설정에서 시트 링크를 먼저 등록하세요");
    });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("설정 조회가 네트워크 오류로 실패해도 안내 메시지를 띄운다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const { AdminNav } = await import("../AdminNav");
    render(<AdminNav />);
    fireEvent.click(screen.getByRole("button", { name: "제휴 문의" }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("관리자 설정에서 시트 링크를 먼저 등록하세요");
    });
  });

  it("시트 링크가 javascript: 스킴이면 새 탭을 열지 않고 안내 메시지를 띄운다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ settings: { affiliate_sheet_url: "javascript:alert(1)" } }), {
          status: 200,
        }),
      ),
    );
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    const { AdminNav } = await import("../AdminNav");
    render(<AdminNav />);
    fireEvent.click(screen.getByRole("button", { name: "제휴 문의" }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("관리자 설정에서 시트 링크를 먼저 등록하세요");
    });
    expect(openSpy).not.toHaveBeenCalled();
  });
});
