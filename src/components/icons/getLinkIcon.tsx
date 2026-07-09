import type { ComponentType } from "react";
import type { IconProps } from "./IconBase";
import { YouthIcon } from "./YouthIcon";
import { FeedIcon } from "./FeedIcon";
import { SeriesIcon } from "./SeriesIcon";
import { HomeIcon } from "./HomeIcon";
import { BlogIcon } from "./BlogIcon";
import { InstagramIcon } from "./InstagramIcon";
import { YoutubeIcon } from "./YoutubeIcon";
import { KakaoIcon } from "./KakaoIcon";
import { DefaultLinkIcon } from "./DefaultLinkIcon";

/**
 * 링크/소셜 아이콘 키 → 아이콘 컴포넌트 매핑.
 *
 * `Link.icon` 필드와 `SocialItem.key` 필드 모두 이 헬퍼로 조회한다.
 * 매칭되지 않는 키는 `DefaultLinkIcon`으로 폴백한다.
 */
export const ICON_MAP: Record<string, ComponentType<IconProps>> = {
  youth: YouthIcon,
  feed: FeedIcon,
  series: SeriesIcon,
  home: HomeIcon,
  blog: BlogIcon,
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  kakao: KakaoIcon,
};

export { DefaultLinkIcon };

export function getLinkIcon(key: string): ComponentType<IconProps> {
  return ICON_MAP[key] ?? DefaultLinkIcon;
}
