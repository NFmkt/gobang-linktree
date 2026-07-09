import { IconBase, TI, type IconProps } from "./IconBase";

/** 유튜브 — 재생 버튼 (fill-only, TOSSFACE) */
export function YoutubeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 본체 */}
      <rect x="1.8" y="4.5" width="16.4" height="11" rx="3.5" fill={TI.red} />
      {/* 재생 삼각형 */}
      <path d="M8.2 7.6 13.2 10 8.2 12.4Z" fill={TI.white} />
    </IconBase>
  );
}
