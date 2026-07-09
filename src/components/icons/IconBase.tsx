import type { SVGProps } from "react";

/**
 * 아이콘 세트 공통 베이스 — icon-design 스킬(TOSSFACE 시각 언어) 준수.
 *
 * @icon-design 규칙 (본 프로젝트 SPEC — docs/DESIGN_SYSTEM.md §8):
 * - viewBox `0 0 20 20`, **fill 전용**(stroke 금지), 100% 플랫(그래디언트·그림자 없음)
 * - 고채도 팔레트에서만 컬러 선택, 한 아이콘 5색 이내
 * - 블루 모노 테마와의 조화를 위해 blue/blue-sky를 주조로, 악센트 색은 절제
 * - 장식용이므로 기본 aria-hidden(텍스트/aria-label과 항상 병기)
 */
export type IconProps = SVGProps<SVGSVGElement>;

/**
 * icon-design 팔레트 (고채도) + 브랜드 블루.
 * orange/green/navy는 아직 채택한 아이콘이 없는 예약 스와치 — 새 아이콘 추가 시 이 팔레트에서만 선택.
 */
export const TI = {
  blue: "#1B4DFF", // 브랜드 블루 (주조)
  blueSky: "#64A7FF", // 정보/보조 면
  yellow: "#FFC84D",
  orange: "#FF9000",
  red: "#EF4452",
  green: "#23B169",
  navy: "#313D4C",
  white: "#FFFFFF",
} as const;

/** 브랜드 인지형 아이콘(블로그/인스타/카카오 등)의 20x20 라운드 스퀘어 칩 배경. */
export function IconChipBg({ fill }: { fill: string }) {
  return <rect x="2.5" y="2.5" width="15" height="15" rx="4.5" fill={fill} />;
}

export function IconBase({
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      width={20}
      height={20}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}
