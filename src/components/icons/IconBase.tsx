import type { SVGProps } from "react";

/**
 * 아이콘 세트 공통 베이스.
 *
 * @icon-design 적용 규칙 (본 프로젝트 SPEC — docs/DESIGN_SYSTEM.md §6):
 * - 24x24 뷰박스, currentColor 기반 stroke 라인 아이콘
 * - strokeWidth 1.75로 세트 전체 통일 (개별 아이콘에서 덮어쓰지 않음)
 * - strokeLinecap/Linejoin round로 통일된 라인 무게감
 * - 장식용 아이콘이므로 기본 aria-hidden (텍스트와 항상 병기됨)
 */
export type IconProps = SVGProps<SVGSVGElement>;

export const ICON_STROKE_WIDTH = 1.75;

export function IconBase({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}
