import { IconBase, TI, type IconProps } from "./IconBase";

/** 캘린더/일정 — 날짜 강조 달력 (fill-only, TOSSFACE) */
export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 본체 */}
      <rect x="2.6" y="4.6" width="14.8" height="12.8" rx="2.2" fill={TI.blueSky} />
      {/* 헤더 */}
      <rect x="2.6" y="4.6" width="14.8" height="3.6" fill={TI.blue} />
      {/* 바인더 링 */}
      <rect x="5.6" y="2.6" width="1.6" height="3.6" rx="0.8" fill={TI.navy} />
      <rect x="12.8" y="2.6" width="1.6" height="3.6" rx="0.8" fill={TI.navy} />
      {/* 강조 날짜 */}
      <rect x="11.6" y="11" width="3.4" height="3.4" rx="0.9" fill={TI.red} />
    </IconBase>
  );
}
