import { IconBase, IconChipBg, TI, type IconProps } from "./IconBase";

const NAVER_GREEN = "#03C75A";

/** 블로그 — 네이버 블로그(그린 라운드 스퀘어 + 흰 b) 인지형 (fill-only) */
export function BlogIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <IconChipBg fill={NAVER_GREEN} />
      {/* 흰 'b' — 세로 스템 + 볼(도넛) */}
      <rect x="6" y="4.6" width="2.3" height="10.8" rx="1.15" fill={TI.white} />
      <circle cx="10.3" cy="11.4" r="3.7" fill={TI.white} />
      <circle cx="10.3" cy="11.4" r="1.6" fill={NAVER_GREEN} />
    </IconBase>
  );
}
