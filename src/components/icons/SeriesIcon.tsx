import { IconBase, type IconProps } from "./IconBase";

/** 자취 꿀정보 시리즈 — 겹쳐진 문서/포개진 카드 모티프 */
export function SeriesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3.5h8.5L19 7v13.5H7z" />
      <path d="M15.5 3.5V7H19" />
      <path d="M5 7.5v13h9.5" />
    </IconBase>
  );
}
