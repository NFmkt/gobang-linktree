import type { Link } from "@/lib/links/types";
import { LinkIcon } from "@/components/icons/LinkIcon";

type LinkButtonProps = {
  link: Link;
  /** 진입 stagger용 지연(ms). 미지정 시 애니메이션 없음. */
  delayMs?: number;
};

/**
 * 링크 목록의 개별 항목 — 흰 소프트 카드.
 *
 * 좌측 블루틴트 아이콘 칩 + title(800) + optional subtitle + 우측 셰브론.
 * 1.5px 소프트 보더 + 부드러운 그림자. hover 시 보더가 블루로 바뀌며
 * 글로우 링이 번지고 셰브론이 오른쪽으로 이동한다. active 시 살짝 축소.
 * focus-visible 시 동일한 블루 글로우 링을 노출한다.
 */
export function LinkButton({ link, delayMs }: LinkButtonProps) {
  const animated = delayMs !== undefined;
  return (
    <a
      href={link.url}
      className={`focus-glow group flex min-h-[68px] w-full items-center gap-3.5 rounded-[var(--r)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3.5 text-[var(--color-ink)] shadow-[var(--sh-sm)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[0_0_0_4px_var(--color-blue-ring)] active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:border-[var(--color-primary)]${animated ? " reveal" : ""}`}
      style={animated ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-blue-50)]">
        <LinkIcon iconKey={link.icon} className="h-[22px] w-[22px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="truncate text-[16px] font-extrabold leading-tight tracking-[-0.01em]">
          {link.title}
        </span>
        {link.subtitle ? (
          <span className="mt-0.5 truncate text-[13.5px] leading-tight text-[var(--color-ink-2)]">
            {link.subtitle}
          </span>
        ) : null}
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-5 w-5 shrink-0 text-[var(--color-muted)] transition-[transform,color] duration-200 ease-out group-hover:translate-x-1 group-hover:text-[var(--color-primary)] motion-reduce:transition-none"
        fill="currentColor"
      >
        <path d="M7.4 4.4a1.15 1.15 0 0 1 1.63 0l4.57 4.57a1.15 1.15 0 0 1 0 1.63L9.03 15.2a1.15 1.15 0 1 1-1.63-1.63L11.34 10 7.4 6.03a1.15 1.15 0 0 1 0-1.63Z" />
      </svg>
    </a>
  );
}
