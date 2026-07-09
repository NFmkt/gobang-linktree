import { IconBase, TI, type IconProps } from "./IconBase";

/** 청년주택 공고 — 아파트 건물 + 공고 배지 (fill-only, TOSSFACE) */
export function YouthIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 건물 본체 */}
      <rect x="3.2" y="3" width="10" height="15" rx="2" fill={TI.blueSky} />
      {/* 창문 */}
      <rect x="5.2" y="5.2" width="2.4" height="2.4" rx="0.6" fill={TI.white} />
      <rect x="8.8" y="5.2" width="2.4" height="2.4" rx="0.6" fill={TI.white} />
      <rect x="5.2" y="8.8" width="2.4" height="2.4" rx="0.6" fill={TI.white} />
      <rect x="8.8" y="8.8" width="2.4" height="2.4" rx="0.6" fill={TI.white} />
      {/* 문 */}
      <rect x="6.3" y="13.4" width="3.8" height="4.6" rx="0.9" fill={TI.blue} />
      {/* 공고 배지 */}
      <circle cx="15" cy="6" r="3" fill={TI.red} />
      <rect x="14.4" y="4.1" width="1.2" height="2.5" rx="0.6" fill={TI.white} />
      <circle cx="15" cy="7.6" r="0.75" fill={TI.white} />
    </IconBase>
  );
}
