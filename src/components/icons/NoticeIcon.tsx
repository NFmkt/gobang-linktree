import { IconBase, TI, type IconProps } from "./IconBase";

/** 공지/안내 — 알림 종 (fill-only, TOSSFACE) */
export function NoticeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* 종 본체 */}
      <path
        d="M10 2.5a1 1 0 0 1 1 1v.3c2.4.6 4.1 2.8 4.1 5.4v2.8l1.3 2.1a.7.7 0 0 1-.6 1.1H4.2a.7.7 0 0 1-.6-1.1l1.3-2.1V9.2c0-2.6 1.7-4.8 4.1-5.4v-.3a1 1 0 0 1 1-1Z"
        fill={TI.blue}
      />
      {/* 종 추 */}
      <circle cx="10" cy="17.3" r="1.2" fill={TI.navy} />
    </IconBase>
  );
}
