import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("클릭 시 /api/admin/logout을 POST하고 로그인 페이지로 이동한다", async () => {
    const { LogoutButton } = await import("../LogoutButton");
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin/login");
    });
    expect(fetch).toHaveBeenCalledWith("/api/admin/logout", { method: "POST" });
    expect(refreshMock).toHaveBeenCalled();
  });
});

describe("AdminLayout", () => {
  it("브랜드명·로그아웃 버튼·children을 렌더한다", async () => {
    const AdminLayout = (await import("../layout")).default;
    render(
      <AdminLayout>
        <p>본문 콘텐츠</p>
      </AdminLayout>,
    );
    expect(screen.getByText("고방 관리자")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    expect(screen.getByText("본문 콘텐츠")).toBeInTheDocument();
  });
});

describe("AdminHomePage", () => {
  it("인증 완료 메시지를 렌더한다", async () => {
    const AdminHomePage = (await import("../page")).default;
    render(<AdminHomePage />);
    expect(screen.getByText(/인증되었습니다/)).toBeInTheDocument();
  });
});
