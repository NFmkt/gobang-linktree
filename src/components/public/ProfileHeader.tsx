import type { SiteConfig } from "@/lib/site/config";

type ProfileHeaderProps = {
  config: SiteConfig;
};

/**
 * 프로필 헤더 — 로고 마크 + 브랜드명 + bio.
 *
 * 로고는 비비드 블록 규칙(2px 다크 테두리, 14px 라운드, 하드 오프셋 그림자)을
 * 따르는 정사각 마크. 틸 배경 위 흰 텍스트로 브랜드 컬러를 첫인상에 각인시킨다.
 */
export function ProfileHeader({ config }: ProfileHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-4 pt-10 pb-2 text-center">
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-block)] border-[length:var(--block-border-width)] border-[var(--color-ink)] bg-[var(--color-primary)] text-lg font-bold tracking-tight text-[var(--color-on-primary)] shadow-[var(--shadow-block)]"
      >
        {config.logoLabel}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          {config.brandName}
        </h1>
        <p className="max-w-[320px] text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
          {config.bio}
        </p>
      </div>
    </header>
  );
}
