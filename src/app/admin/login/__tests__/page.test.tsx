import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

describe("AdminLoginPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("올바른 비밀번호 제출 시 /api/admin/login을 호출하고 /admin으로 이동한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    const AdminLoginPage = (await import("../page")).default;
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByPlaceholderText("비밀번호"), { target: { value: "REDACTED" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin");
    });
    expect(fetch).toHaveBeenCalledWith("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "REDACTED" }),
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("틀린 비밀번호 제출 시 에러 메시지를 보여주고 이동하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "no" }), { status: 401 })));
    const AdminLoginPage = (await import("../page")).default;
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByPlaceholderText("비밀번호"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(screen.getByText("비밀번호가 올바르지 않습니다.")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("네트워크 오류로 fetch가 실패하면 에러 메시지를 보여주고 이동하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const AdminLoginPage = (await import("../page")).default;
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByPlaceholderText("비밀번호"), { target: { value: "REDACTED" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(
        screen.getByText("로그인 요청에 실패했습니다. 네트워크 상태를 확인해주세요."),
      ).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "로그인" })).not.toBeDisabled();
  });

  it("비밀번호가 비어 있으면 로그인 버튼이 비활성화된다", async () => {
    const AdminLoginPage = (await import("../page")).default;
    render(<AdminLoginPage />);
    expect(screen.getByRole("button", { name: "로그인" })).toBeDisabled();
  });
});
