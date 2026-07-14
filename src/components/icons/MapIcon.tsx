import { IconBase, TI, type IconProps } from "./IconBase";

/** 지도/오시는길 — 위치 핀 (fill-only, TOSSFACE) */
export function MapIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 핀 본체 */}
      <path
        d="M10 2.4c-3.3 0-6 2.6-6 5.9 0 4.4 6 9.3 6 9.3s6-4.9 6-9.3c0-3.3-2.7-5.9-6-5.9Z"
        fill={TI.blue}
      />
      {/* 핀 중심 */}
      <circle cx="10" cy="8.2" r="2.3" fill={TI.white} />
    </IconBase>
  );
}
