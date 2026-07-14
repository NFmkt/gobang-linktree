import { IconBase, TI, type IconProps } from "./IconBase";

/** 쇼핑/스토어 — 쇼핑백 (fill-only, TOSSFACE) */
export function ShopIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 손잡이 */}
      <rect x="7.2" y="4.4" width="1.6" height="5" rx="0.8" fill={TI.navy} />
      <rect x="11.2" y="4.4" width="1.6" height="5" rx="0.8" fill={TI.navy} />
      {/* 가방 본체 */}
      <rect x="3.4" y="7.4" width="13.2" height="10.4" rx="2" fill={TI.blue} />
      {/* 태그 */}
      <rect x="8" y="10.4" width="4" height="1.6" rx="0.8" fill={TI.yellow} />
    </IconBase>
  );
}
