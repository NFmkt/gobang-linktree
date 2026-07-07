import type { IconProps } from "./IconBase";
import { ICON_MAP, DefaultLinkIcon } from "./getLinkIcon";

type LinkIconProps = IconProps & {
  /** Link.icon 또는 SocialItem.key 값 */
  iconKey: string;
};

/**
 * 아이콘 키를 실제 아이콘 컴포넌트로 해석해 렌더하는 래퍼.
 *
 * 키 → 컴포넌트 매핑의 source of truth는 `getLinkIcon.tsx`가 내보내는
 * `ICON_MAP` 하나뿐이다(`getLinkIcon()` 함수도 동일한 맵을 조회한다).
 * 이 래퍼는 JSX 태그 자리에 함수 호출 결과가 아닌 맵 프로퍼티를 직접
 * 인덱싱해 사용함으로써 react-hooks/static-components(컴파일러의 "렌더 중
 * 컴포넌트 생성" 정적 검사)를 우회한다 — `getLinkIcon(key)`처럼 함수
 * 호출로 얻은 값을 JSX 태그로 쓰면 컴파일러가 이를 "동적으로 생성된
 * 컴포넌트"로 오탐하기 때문이다.
 */
export function LinkIcon({ iconKey, ...props }: LinkIconProps) {
  if (iconKey in ICON_MAP) {
    const Icon = ICON_MAP[iconKey];
    return <Icon {...props} />;
  }
  return <DefaultLinkIcon {...props} />;
}
