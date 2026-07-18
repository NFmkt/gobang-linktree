import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsForm } from "../SettingsForm";
import type { SiteSettingsRow } from "@/lib/site/config";

const initialSettings: SiteSettingsRow = {
  id: "default",
  brand_name: "고방",
  bio: "청년주택 청년혜택 자취 꿀정보",
  social: [
    { key: "home", label: "공식 홈페이지", url: "https://gobang.kr/home" },
    { key: "blog", label: "블로그", url: "https://blog.naver.com/neoflat1116" },
  ],
  affiliate_email: "neoflatworks2@gmail.com",
  affiliate_label: "제휴·협력 문의",
  affiliate_sheet_url: "https://docs.google.com/spreadsheets/d/abc",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SettingsForm", () => {
  it("초기값을 필드에 채운다", () => {
    render(<SettingsForm initialSettings={initialSettings} />);
    expect(screen.getByDisplayValue("고방")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://gobang.kr/home")).toBeInTheDocument();
    expect(screen.getByDisplayValue("neoflatworks2@gmail.com")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://docs.google.com/spreadsheets/d/abc"),
    ).toBeInTheDocument();
  });

  it("제휴 문의 시트 링크는 필수 입력이 아니다", () => {
    render(<SettingsForm initialSettings={initialSettings} />);
    const sheetInput = screen.getByPlaceholderText("https://docs.google.com/spreadsheets/...");
    expect(sheetInput).not.toBeRequired();
  });

  it("제출 시 PATCH /api/admin/settings를 변경된 값으로 호출하고 성공 메시지를 보여준다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ settings: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsForm initialSettings={initialSettings} />);
    fireEvent.change(screen.getByDisplayValue("고방"), { target: { value: "새이름" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(screen.getByText("저장했습니다.")).toBeInTheDocument();
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toMatchObject({
      brand_name: "새이름",
      affiliate_sheet_url: "https://docs.google.com/spreadsheets/d/abc",
    });
  });

  it("저장 실패(non-2xx) 시 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    render(<SettingsForm initialSettings={initialSettings} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(screen.getByText("저장에 실패했습니다.")).toBeInTheDocument();
    });
  });

  it("네트워크 오류 시 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<SettingsForm initialSettings={initialSettings} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(
        screen.getByText("저장 요청에 실패했습니다. 네트워크 상태를 확인해주세요."),
      ).toBeInTheDocument();
    });
  });
});
