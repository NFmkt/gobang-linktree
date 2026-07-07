import { IconBase, type IconProps } from "./IconBase";

/** 청년주택 공고 — 건물/키 모티프 */
export function YouthIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 21V9.5L12 4l8 5.5V21" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 12h.01M15 12h.01" />
    </IconBase>
  );
}
