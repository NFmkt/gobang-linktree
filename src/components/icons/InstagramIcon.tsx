import { IconBase, IconChipBg, TI, type IconProps } from "./IconBase";

const INSTAGRAM_MAGENTA = "#E1306C";

/** 인스타그램 — 카메라 글리프 (fill-only, 그라데이션 없이 플랫 마젠타) */
export function InstagramIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <IconChipBg fill={INSTAGRAM_MAGENTA} />
      {/* 카메라 바디 프레임 (흰 링) */}
      <rect x="5.2" y="5.2" width="9.6" height="9.6" rx="3" fill={TI.white} />
      <rect x="6.7" y="6.7" width="6.6" height="6.6" rx="2" fill={INSTAGRAM_MAGENTA} />
      {/* 렌즈 (흰 링) */}
      <circle cx="10" cy="10" r="2.6" fill={TI.white} />
      <circle cx="10" cy="10" r="1.3" fill={INSTAGRAM_MAGENTA} />
      {/* 플래시 */}
      <circle cx="13.1" cy="6.9" r="0.85" fill={TI.white} />
    </IconBase>
  );
}
