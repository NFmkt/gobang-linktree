import type { IconProps } from "./IconBase";
import { YouthIcon } from "./YouthIcon";
import { FeedIcon } from "./FeedIcon";
import { SeriesIcon } from "./SeriesIcon";
import { HomeIcon } from "./HomeIcon";
import { BlogIcon } from "./BlogIcon";
import { YoutubeIcon } from "./YoutubeIcon";
import { DefaultLinkIcon } from "./DefaultLinkIcon";

type LinkIconProps = IconProps & {
  /** Link.icon 또는 SocialItem.key 값 */
  iconKey: string;
};

/**
 * 아이콘 키를 실제 아이콘 컴포넌트로 해석해 렌더하는 래퍼.
 *
 * 정적 분석(react-hooks/static-components)이 "렌더 중 컴포넌트 생성"으로
 * 오탐하는 것을 피하기 위해, 변수에 컴포넌트를 담아 JSX 태그로 쓰는 대신
 * 각 분기에서 고정된 컴포넌트를 직접 JSX로 반환한다. 키 → 컴포넌트 매핑의
 * source of truth는 이 함수이며, `getLinkIcon`은 매핑 자체(테스트/기타 소비처용)를
 * 노출하는 별도 헬퍼로 유지한다.
 */
export function LinkIcon({ iconKey, ...props }: LinkIconProps) {
  switch (iconKey) {
    case "youth":
      return <YouthIcon {...props} />;
    case "feed":
      return <FeedIcon {...props} />;
    case "series":
      return <SeriesIcon {...props} />;
    case "home":
      return <HomeIcon {...props} />;
    case "blog":
      return <BlogIcon {...props} />;
    case "youtube":
      return <YoutubeIcon {...props} />;
    default:
      return <DefaultLinkIcon {...props} />;
  }
}
