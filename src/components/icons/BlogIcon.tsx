import { IconBase, type IconProps } from "./IconBase";

/** 블로그 — 펼쳐진 노트/펜 모티프 */
export function BlogIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 4.5h11.5L19 7v12.5H5z" />
      <path d="M14.5 4.5V7H19" />
      <path d="M8 12h7M8 15.5h5" />
    </IconBase>
  );
}
