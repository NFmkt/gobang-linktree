"use client";

import { sendEventBeacon } from "@/lib/events/sendBeacon";

type AffiliateButtonProps = {
  email: string;
  label: string;
  /** 진입 stagger용 지연(ms). 미지정 시 애니메이션 없음. */
  delayMs?: number;
};

/**
 * 제휴·협력 문의 CTA — 아웃라인 스타일.
 *
 * 흰 링크 카드들 사이에서 배경 없이 블루 테두리 + 블루 텍스트로 조용하게
 * 구분되는 유일한 강조 지점. hover 시 연한 블루(blue-50)로 채워지고,
 * focus-visible 시 블루 글로우 링을 노출한다.
 */
export function AffiliateButton({ email, label, delayMs }: AffiliateButtonProps) {
  const animated = delayMs !== undefined;
  return (
    <a
      href={`mailto:${email}`}
      onClick={() => sendEventBeacon({ type: "click", link_id: "affiliate" })}
      className={`focus-glow flex min-h-[54px] w-full items-center justify-center rounded-[var(--r)] border-[1.5px] border-[var(--color-primary)] bg-transparent px-4 py-3 text-[15.5px] font-bold text-[var(--color-primary)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-[var(--color-blue-50)] active:scale-[0.99] motion-reduce:transition-none${animated ? " reveal" : ""}`}
      style={animated ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {label}
    </a>
  );
}
