import type { SiteConfig } from "@/lib/site/config";

type ProfileHeaderProps = {
  config: SiteConfig;
};

/**
 * 프로필 히어로 — 풀블리드 비비드 블루 블록.
 *
 * 화면 폭을 꽉 채우는 블루 히어로(둥근 하단)에 떠있는 반투명 블러 도형을
 * 겹쳐 깊이감을 준다. 내부 콘텐츠(로고 마크 · 브랜드명 · bio)는
 * max-w-[480px]로 중앙 정렬된다. 로고는 흰 박스 안의 원본 GYI 마크 이미지
 * (`public/bi.png`)로, 텍스트 대신 브랜드 로고를 노출한다.
 */
export function ProfileHeader({ config }: ProfileHeaderProps) {
  return (
    <header className="reveal relative w-full overflow-hidden rounded-b-[30px] bg-[var(--color-primary)] text-[var(--color-on-primary)]">
      {/* 떠있는 반투명 블러 도형 (장식) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-8 h-36 w-56 rotate-[10deg] rounded-[40px_40px_40px_10px] bg-white/[0.08]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-7 -left-8 h-24 w-40 -rotate-[8deg] rounded-[10px_40px_40px_40px] bg-white/[0.08]"
      />

      <div className="relative mx-auto flex max-w-[480px] flex-col items-center px-7 pb-11 pt-14 text-center">
        <span className="flex h-[76px] w-[76px] items-center justify-center rounded-[20px] bg-white p-3.5 shadow-[var(--sh)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bi.png"
            alt={`${config.brandName} 로고`}
            width={48}
            height={48}
            fetchPriority="high"
            className="h-full w-full object-contain"
          />
        </span>

        <h1 className="mt-5 text-[34px] font-black leading-[1.15] tracking-[-0.04em]">
          {config.brandName}
        </h1>
        <p className="mt-2.5 text-[15.5px] font-medium leading-relaxed text-white/[0.88]">
          {config.bio}
        </p>
      </div>
    </header>
  );
}
