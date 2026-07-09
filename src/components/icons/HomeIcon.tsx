import { IconBase, TI, type IconProps } from "./IconBase";

/** 공식 홈페이지 — 집 모티프 (fill-only, TOSSFACE) */
export function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 지붕 */}
      <path d="M10 2.2 18.4 9.2H1.6Z" fill={TI.blue} />
      {/* 본체 */}
      <rect x="3.4" y="8.6" width="13.2" height="9" rx="2" fill={TI.blueSky} />
      {/* 문 */}
      <rect x="8.1" y="12" width="3.8" height="5.6" rx="1.3" fill={TI.white} />
    </IconBase>
  );
}
