import { IconBase, TI, type IconProps } from "./IconBase";

/** 문서/자료 — 폴드 코너 페이지 (fill-only, TOSSFACE) */
export function DocumentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 본체 */}
      <path
        d="M5 2.6 H11.6 L15.6 6.6 V16 A1.4 1.4 0 0 1 14.2 17.4 H5 A1.4 1.4 0 0 1 3.6 16 V4 A1.4 1.4 0 0 1 5 2.6 Z"
        fill={TI.blueSky}
      />
      {/* 폴드 코너 */}
      <path d="M11.6 2.6 L15.6 6.6 H13 A1.4 1.4 0 0 1 11.6 5.2 Z" fill={TI.blue} />
      {/* 텍스트 행 */}
      <rect x="6" y="9.4" width="6.6" height="1.5" rx="0.75" fill={TI.white} />
      <rect x="6" y="12.2" width="6.6" height="1.5" rx="0.75" fill={TI.white} />
    </IconBase>
  );
}
