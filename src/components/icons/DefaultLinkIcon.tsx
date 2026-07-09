import { IconBase, IconChipBg, TI, type IconProps } from "./IconBase";

/** 미매칭 아이콘 키 폴백 — 외부 링크 (fill-only, TOSSFACE) */
export function DefaultLinkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <IconChipBg fill={TI.blueSky} />
      {/* 외부 링크 화살표 */}
      <path
        d="M8.2 6.6h5.2v5.2h-1.9V9.8l-3.3 3.3-1.35-1.35 3.3-3.3H8.2Z"
        fill={TI.white}
      />
    </IconBase>
  );
}
