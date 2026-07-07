type AffiliateButtonProps = {
  email: string;
  label: string;
};

/**
 * 제휴·협력 문의 CTA — 라임 accent를 사용하는 유일한 지점.
 *
 * 라임 배경 위에는 접근성 규칙에 따라 반드시 다크 텍스트(--color-ink)를 쓴다.
 */
export function AffiliateButton({ email, label }: AffiliateButtonProps) {
  return (
    <a
      href={`mailto:${email}`}
      className="flex min-h-[52px] w-full items-center justify-center rounded-[var(--radius-block)] border-[length:var(--block-border-width)] border-[var(--color-ink)] bg-[var(--color-accent)] px-4 py-3 text-[16px] font-semibold text-[var(--color-ink)] shadow-[var(--shadow-block)] transition-[transform,box-shadow] duration-150 ease-out hover:translate-x-px hover:translate-y-px hover:shadow-[var(--shadow-block-hover)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ink)]"
    >
      {label}
    </a>
  );
}
