"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type InquiryType = "ad" | "content" | "other";

const INQUIRY_TYPE_OPTIONS: { value: InquiryType; label: string }[] = [
  { value: "ad", label: "광고 문의" },
  { value: "content", label: "콘텐츠 제휴" },
  { value: "other", label: "기타" },
];

type SubmitStatus = "idle" | "submitting" | "success" | "error";

const INQUIRIES_ENDPOINT = "/api/affiliate-inquiries";

/**
 * 제휴·협력 문의 폼 — mailto 병기용 아코디언 패널 안에서 렌더된다.
 *
 * - 회사명/소속·문의내용은 필수, 전화번호·이메일은 둘 중 최소 1개 필수(제출 버튼을 그때까지 비활성화).
 * - 허니팟(honeypot)은 봇 스팸 방지용 — 화면/스크린리더 모두에서 숨긴다.
 * - formRenderedAt은 마운트 시점의 Date.now()를 고정해 전송한다(서버의 최소 작성 시간 검증용).
 */
export function AffiliateInquiryForm() {
  const idPrefix = useId();
  // Date.now()는 순수하지 않으므로 렌더 중 직접 호출하지 않고
  // 마운트 시점 이펙트에서 한 번만 캡처해 ref에 고정한다.
  const renderedAtRef = useRef<number | null>(null);
  useEffect(() => {
    renderedAtRef.current = Date.now();
  }, []);

  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [inquiryType, setInquiryType] = useState<InquiryType>("ad");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const canSubmit =
    companyName.trim() !== "" && message.trim() !== "" && (phone.trim() !== "" || email.trim() !== "");
  const submitting = status === "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setStatus("submitting");

    try {
      const res = await fetch(INQUIRIES_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          inquiryType,
          message,
          honeypot,
          formRenderedAt: renderedAtRef.current,
        }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="rounded-[var(--r-sm)] bg-[var(--color-blue-50)] px-3 py-3 text-[14px] font-semibold text-[var(--color-primary)]">
        문의가 접수되었습니다. 빠르게 확인 후 연락드릴게요.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      {/* 허니팟: 화면/스크린리더 모두에서 숨김(display:none 대신 off-screen 배치 — 일부 자동완성/스팸봇이 display:none은 우회할 수 있음). */}
      <input
        type="text"
        data-testid="affiliate-honeypot"
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        name="affiliate-website"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        style={{ position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}
      />

      {status === "error" ? (
        <p className="text-[12.5px] text-[var(--color-danger)]">
          문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--color-ink-2)]">
        회사명/소속
        <input
          id={`${idPrefix}-company`}
          type="text"
          required
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--color-ink-2)]">
        전화번호
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--color-ink-2)]">
        이메일
        <input
          id={`${idPrefix}-email`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      <p className="text-[12px] text-[var(--color-ink-2)]">전화번호 또는 이메일 중 최소 1개는 입력해주세요.</p>

      <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--color-ink-2)]">
        문의유형
        <select
          id={`${idPrefix}-inquiry-type`}
          value={inquiryType}
          onChange={(event) => setInquiryType(event.target.value as InquiryType)}
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        >
          {INQUIRY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--color-ink-2)]">
        문의내용
        <textarea
          id={`${idPrefix}-message`}
          required
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="focus-glow resize-none rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="focus-glow min-h-11 rounded-[var(--r-sm)] bg-[var(--color-primary)] py-2 text-[13.5px] font-bold text-[var(--color-on-primary)] disabled:opacity-50"
      >
        {submitting ? "제출 중..." : "제출"}
      </button>
    </form>
  );
}
