import { IconBase, type IconProps } from "./IconBase";

/** 미매칭 아이콘 키에 대한 폴백 — 체인/링크 모티프 */
export function DefaultLinkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M10.5 6.5 12 5a3.5 3.5 0 0 1 5 5l-1.5 1.5" />
      <path d="M13.5 17.5 12 19a3.5 3.5 0 0 1-5-5l1.5-1.5" />
    </IconBase>
  );
}
