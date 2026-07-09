import type { SocialItem } from "@/lib/site/config";
import { LinkIcon } from "@/components/icons/LinkIcon";

type SocialRowProps = {
  items: SocialItem[];
};

/**
 * 소셜 링크 5종(홈/블로그/인스타그램/유튜브/카카오) — 블루틴트 칩 가로 배치.
 *
 * 각 칩은 blue-50 배경 + 브랜드 고정색 fill 아이콘, 최소 44x44(실제 48x48) 터치 타깃.
 * hover 시 칩 배경이 blue-100으로 진해진다(아이콘 색 반전 없음 — 아이콘은 브랜드색 고정).
 * 새 탭 이동, 스크린리더용 aria-label 필수. focus-visible 시 블루 글로우 링.
 */
export function SocialRow({ items }: SocialRowProps) {
  return (
    <nav aria-label="소셜 링크" className="flex justify-center gap-3">
      {items.map((item) => (
        <a
          key={item.key}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          className="focus-glow group flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--color-blue-50)] transition-[background-color,transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:bg-[var(--color-blue-100)] active:translate-y-0 active:scale-[0.96] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <LinkIcon iconKey={item.key} className="h-[22px] w-[22px]" />
        </a>
      ))}
    </nav>
  );
}
