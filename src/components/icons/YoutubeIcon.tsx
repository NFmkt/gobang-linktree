import { IconBase, type IconProps } from "./IconBase";

/** 유튜브 — 재생 버튼 모티프 (브랜드 로고 형태 차용 없이 재생 삼각형으로 추상화) */
export function YoutubeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="6" width="17" height="12" rx="4" />
      <path d="M10.5 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}
