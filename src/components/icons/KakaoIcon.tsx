import { IconBase, IconChipBg, type IconProps } from "./IconBase";

const KAKAO_YELLOW = "#FEE500";
const KAKAO_BROWN = "#3C1E1E";

/** 카카오톡 오픈채팅 — 옐로우 바탕 + 브라운 말풍선 (fill-only) */
export function KakaoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <IconChipBg fill={KAKAO_YELLOW} />
      {/* 말풍선 본체 */}
      <rect x="4.6" y="5.6" width="10.8" height="7.4" rx="3.7" fill={KAKAO_BROWN} />
      {/* 말풍선 꼬리 */}
      <path d="M7.2 12.2 6 15.2 9.6 12.6Z" fill={KAKAO_BROWN} />
    </IconBase>
  );
}
