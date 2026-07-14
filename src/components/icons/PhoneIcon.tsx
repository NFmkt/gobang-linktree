import { IconBase, TI, type IconProps } from "./IconBase";

/** 전화/상담 — 회전된 수화기 실루엣 + 신호 도트 (fill-only, TOSSFACE) */
export function PhoneIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 수화기 본체 */}
      <g transform="rotate(45 10 10)">
        <rect x="3" y="8.5" width="4" height="3" rx="1.5" fill={TI.blue} />
        <rect x="13" y="8.5" width="4" height="3" rx="1.5" fill={TI.blue} />
        <rect x="6" y="9.3" width="8" height="1.4" rx="0.7" fill={TI.blue} />
      </g>
      {/* 신호 도트 */}
      <circle cx="15.3" cy="4.3" r="0.8" fill={TI.yellow} />
      <circle cx="17.3" cy="6.3" r="0.6" fill={TI.yellow} />
    </IconBase>
  );
}
