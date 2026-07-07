import type { SocialItem } from "@/lib/site/config";
import { LinkIcon } from "@/components/icons/LinkIcon";

type SocialRowProps = {
  items: SocialItem[];
};

/**
 * 소셜 링크 3종 — 정사각 아이콘 버튼 가로 배치.
 *
 * 각 버튼은 비비드 블록 소형(2px 테두리, 하드 오프셋) + 최소 44x44 터치 타깃.
 * 새 탭으로 이동하며 스크린리더를 위해 aria-label을 필수로 부여한다.
 */
export function SocialRow({ items }: SocialRowProps) {
  return (
    <nav aria-label="소셜 링크" className="flex justify-center gap-3 py-2">
      {items.map((item) => (
        <a
          key={item.key}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          className="group flex h-11 w-11 items-center justify-center rounded-[var(--radius-block)] border-[length:var(--block-border-width)] border-[var(--color-ink)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-block)] transition-[transform,box-shadow] duration-150 ease-out hover:translate-x-px hover:translate-y-px hover:shadow-[var(--shadow-block-hover)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0"
        >
          <LinkIcon
            iconKey={item.key}
            className="h-5 w-5 text-[var(--color-primary-deep)] transition-colors group-hover:text-[var(--color-primary)]"
          />
        </a>
      ))}
    </nav>
  );
}
