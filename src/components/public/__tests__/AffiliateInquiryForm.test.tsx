import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AffiliateInquiryForm } from "../AffiliateInquiryForm";

function fillRequired(overrides?: { phone?: string; email?: string }) {
  fireEvent.change(screen.getByLabelText("회사명/소속"), {
    target: { value: "네오플랫" },
  });
  fireEvent.change(screen.getByLabelText("문의내용"), {
    target: { value: "제휴 문의 드립니다." },
  });
  if (overrides?.phone !== undefined) {
    fireEvent.change(screen.getByLabelText("전화번호"), {
      target: { value: overrides.phone },
    });
  }
  if (overrides?.email !== undefined) {
    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: overrides.email },
    });
  }
}

describe("AffiliateInquiryForm", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("필수 입력 필드(회사명/소속, 문의유형, 문의내용)와 선택 필드(전화번호, 이메일)를 렌더한다", () => {
    render(<AffiliateInquiryForm />);
    expect(screen.getByLabelText("회사명/소속")).toBeRequired();
    expect(screen.getByLabelText("전화번호")).not.toBeRequired();
    expect(screen.getByLabelText("이메일")).not.toBeRequired();
    expect(screen.getByLabelText("문의유형")).toBeInTheDocument();
    expect(screen.getByLabelText("문의내용")).toBeRequired();
  });

  it("문의유형 옵션은 광고 문의(ad)/콘텐츠 제휴(content)/기타(other)를 갖는다", () => {
    render(<AffiliateInquiryForm />);
    const select = screen.getByLabelText("문의유형") as HTMLSelectElement;
    const values = Array.from(select.options).map((option) => option.value);
    expect(values).toEqual(["ad", "content", "other"]);
  });

  it("허니팟 입력은 화면/스크린리더 모두에서 숨겨져 있다", () => {
    render(<AffiliateInquiryForm />);
    const honeypot = screen.getByTestId("affiliate-honeypot");
    expect(honeypot).toHaveAttribute("aria-hidden", "true");
    expect(honeypot).toHaveAttribute("tabIndex", "-1");
    expect(honeypot).toHaveAttribute("autoComplete", "off");
    expect(honeypot.style.position).toBe("absolute");
    expect(honeypot.style.left).toBe("-9999px");
  });

  it("필수 항목이 비어 있으면 제출 버튼이 비활성화된다", () => {
    render(<AffiliateInquiryForm />);
    expect(screen.getByRole("button", { name: /제출/ })).toBeDisabled();
  });

  it("회사명/문의내용을 채워도 전화번호·이메일이 모두 없으면 제출 버튼이 비활성화된다", () => {
    render(<AffiliateInquiryForm />);
    fillRequired();
    expect(screen.getByRole("button", { name: /제출/ })).toBeDisabled();
  });

  it("전화번호만 채우면 제출 버튼이 활성화된다", () => {
    render(<AffiliateInquiryForm />);
    fillRequired({ phone: "010-1234-5678" });
    expect(screen.getByRole("button", { name: /제출/ })).toBeEnabled();
  });

  it("이메일만 채우면 제출 버튼이 활성화된다", () => {
    render(<AffiliateInquiryForm />);
    fillRequired({ email: "a@b.com" });
    expect(screen.getByRole("button", { name: /제출/ })).toBeEnabled();
  });

  it("제출 시 API에 formRenderedAt(마운트 시점)을 포함해 POST한다", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    render(<AffiliateInquiryForm />);
    fillRequired({ email: "a@b.com" });
    fireEvent.click(screen.getByRole("button", { name: /제출/ }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/affiliate-inquiries");
    expect(options?.method).toBe("POST");
    const body = JSON.parse(options?.body as string);
    expect(body).toMatchObject({
      companyName: "네오플랫",
      email: "a@b.com",
      inquiryType: "ad",
      message: "제휴 문의 드립니다.",
      formRenderedAt: 1_700_000_000_000,
    });
    expect(body.honeypot).toBe("");
  });

  it("제출 중에는 로딩 상태를 보이고 버튼이 비활성화된다", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<AffiliateInquiryForm />);
    fillRequired({ email: "a@b.com" });
    fireEvent.click(screen.getByRole("button", { name: /제출/ }));

    expect(await screen.findByRole("button", { name: /제출 중/ })).toBeDisabled();
    resolveFetch({ ok: true } as Response);
    await waitFor(() => expect(screen.getByText(/문의가 접수되었습니다/)).toBeInTheDocument());
  });

  it("성공 시 폼이 완료 문구로 교체된다", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    render(<AffiliateInquiryForm />);
    fillRequired({ email: "a@b.com" });
    fireEvent.click(screen.getByRole("button", { name: /제출/ }));

    expect(await screen.findByText(/문의가 접수되었습니다/)).toBeInTheDocument();
    expect(screen.queryByLabelText("회사명/소속")).not.toBeInTheDocument();
  });

  it("실패(non-2xx) 시 폼이 유지되고 에러 메시지를 보이며 재시도할 수 있다", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    render(<AffiliateInquiryForm />);
    fillRequired({ email: "a@b.com" });
    fireEvent.click(screen.getByRole("button", { name: /제출/ }));

    expect(await screen.findByText(/문의 접수에 실패했습니다/)).toBeInTheDocument();
    expect(screen.getByLabelText("회사명/소속")).toHaveValue("네오플랫");
    expect(screen.getByRole("button", { name: /제출/ })).toBeEnabled();
  });

  it("네트워크 오류 시 폼이 유지되고 에러 메시지를 보인다", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    render(<AffiliateInquiryForm />);
    fillRequired({ email: "a@b.com" });
    fireEvent.click(screen.getByRole("button", { name: /제출/ }));

    expect(await screen.findByText(/문의 접수에 실패했습니다/)).toBeInTheDocument();
    expect(screen.getByLabelText("문의내용")).toHaveValue("제휴 문의 드립니다.");
  });
});
