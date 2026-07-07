import type { Link } from "@/lib/links/types";
import { LinkIcon } from "@/components/icons/LinkIcon";

type LinkButtonProps = {
  link: Link;
  /** 진입 stagger용 지연(ms). 미지정 시 애니메이션 없음. */
  delayMs?: number;
};

/**
 * 링크 목록의 개별 항목 — full-width 비비드 블록 버튼.
 *
 * 좌측 아이콘 + title(라벨, 500) + optional subtitle(본문, 400).
 * 흰 표면 위 2px 다크 테두리 + 하드 오프셋 그림자. hover 시 오프셋이
 * 줄어들며 버튼이 "눌리는" 느낌을 주고, active 시 살짝 축소된다.
 */
export function LinkButton({ link, delayMs }: LinkButtonProps) {
  return (
    <a
      href={link.url}
      className="group link-button-enter flex min-h-[56px] w-full items-center gap-3 rounded-[var(--radius-block)] border-[length:var(--block-border-width)] border-[var(--color-ink)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-ink)] shadow-[var(--shadow-block)] transition-[transform,box-shadow] duration-150 ease-out hover:translate-x-px hover:translate-y-px hover:shadow-[var(--shadow-block-hover)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0"
      style={delayMs !== undefined ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-bg)] text-[var(--color-primary-deep)]">
        <LinkIcon iconKey={link.icon} className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-col items-start">
        <span className="truncate text-[16px] font-medium leading-tight">
          {link.title}
        </span>
        {link.subtitle ? (
          <span className="truncate text-[13px] leading-tight text-[var(--color-ink-soft)]">
            {link.subtitle}
          </span>
        ) : null}
      </span>
    </a>
  );
}
