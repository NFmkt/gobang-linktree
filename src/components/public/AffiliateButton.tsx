"use client";

import { useId, useState } from "react";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

type AffiliateButtonProps = {
  email: string;
  label: string;
  /** 진입 stagger용 지연(ms). 미지정 시 애니메이션 없음. */
  delayMs?: number;
};

/**
 * 제휴·협력 문의 CTA — 아웃라인 토글 버튼.
 *
 * 클릭하면 이메일 주소가 그 자리에 mailto 링크로 펼쳐진다(인라인 아코디언).
 * 상태 표시줄에만 살짝 뜨는 mailto 미리보기보다 눈에 잘 띄도록,
 * 이메일 자체를 화면에 텍스트로 노출한다. 다시 누르면 접힌다.
 */
export function AffiliateButton({ email, label, delayMs }: AffiliateButtonProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const animated = delayMs !== undefined;

  return (
    <div
      className={animated ? "reveal" : undefined}
      style={animated ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-glow flex min-h-[54px] w-full items-center justify-center gap-1.5 rounded-[var(--r)] border-[1.5px] border-[var(--color-primary)] bg-transparent px-4 py-3 text-[15.5px] font-bold text-[var(--color-primary)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-[var(--color-blue-50)] active:scale-[0.99] motion-reduce:transition-none"
      >
        {label}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "-rotate-90" : "rotate-90"}`}
          fill="currentColor"
        >
          <path d="M7.4 4.4a1.15 1.15 0 0 1 1.63 0l4.57 4.57a1.15 1.15 0 0 1 0 1.63L9.03 15.2a1.15 1.15 0 1 1-1.63-1.63L11.34 10 7.4 6.03a1.15 1.15 0 0 1 0-1.63Z" />
        </svg>
      </button>
      {open ? (
        <a
          id={panelId}
          href={`mailto:${email}`}
          onClick={() => sendEventBeacon({ type: "click", link_id: "affiliate" })}
          className="focus-glow mt-2 flex min-h-[46px] w-full items-center justify-center rounded-[var(--r)] bg-[var(--color-blue-50)] px-4 text-[15px] font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          {email}
        </a>
      ) : null}
    </div>
  );
}
