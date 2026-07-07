import { IconBase, type IconProps } from "./IconBase";

/** 공식 홈페이지 — 집 모티프 */
export function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5h4v5" />
    </IconBase>
  );
}
