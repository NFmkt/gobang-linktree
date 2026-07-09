const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/**
 * 공개 페이지의 <a href>로 그대로 렌더되는 값이므로 스킴을 화이트리스트로 제한한다.
 * `javascript:` 등 스크립트 실행 스킴을 저장형 XSS로 악용하는 것을 막는다.
 */
export function isSafeLinkUrl(url: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}
