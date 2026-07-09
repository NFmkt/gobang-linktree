import { IconBase, TI, type IconProps } from "./IconBase";

/** 자취 꿀정보 시리즈 — 겹쳐진 카드 (fill-only, TOSSFACE) */
export function SeriesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 뒤 카드 */}
      <rect x="6" y="2.8" width="11" height="13" rx="2.5" fill={TI.blueSky} />
      {/* 앞 카드 */}
      <rect x="3" y="5" width="11" height="12.2" rx="2.5" fill={TI.blue} />
      {/* 앞 카드 텍스트 행 */}
      <rect x="5.3" y="8" width="6.4" height="1.5" rx="0.75" fill={TI.white} />
      <rect x="5.3" y="10.8" width="6.4" height="1.5" rx="0.75" fill={TI.white} />
      <rect x="5.3" y="13.6" width="4" height="1.5" rx="0.75" fill={TI.white} />
    </IconBase>
  );
}
