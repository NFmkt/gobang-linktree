import { IconBase, TI, type IconProps } from "./IconBase";

/** 청년혜택 모아보기 — 리스트 카드 (fill-only, TOSSFACE) */
export function FeedIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 카드 본체 */}
      <rect x="2.5" y="3.5" width="15" height="13" rx="2.5" fill={TI.blueSky} />
      {/* 불릿 */}
      <circle cx="5.4" cy="7" r="0.95" fill={TI.yellow} />
      <circle cx="5.4" cy="10" r="0.95" fill={TI.yellow} />
      <circle cx="5.4" cy="13" r="0.95" fill={TI.yellow} />
      {/* 행 */}
      <rect x="7.4" y="6.1" width="7.6" height="1.8" rx="0.9" fill={TI.white} />
      <rect x="7.4" y="9.1" width="7.6" height="1.8" rx="0.9" fill={TI.white} />
      <rect x="7.4" y="12.1" width="5" height="1.8" rx="0.9" fill={TI.white} />
    </IconBase>
  );
}
