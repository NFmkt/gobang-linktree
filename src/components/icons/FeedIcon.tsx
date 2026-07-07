import { IconBase, type IconProps } from "./IconBase";

/** 청년혜택 모아보기 — 리스트/카드 모티프 */
export function FeedIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </IconBase>
  );
}
