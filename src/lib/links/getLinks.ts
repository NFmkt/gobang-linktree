import type { Link } from "./types";
import { SEED_LINKS } from "./seed";

/**
 * 공개 노출 대상 링크만 골라 order 오름차순으로 정렬한다.
 *
 * 순수 함수 — 원본 배열을 변형하지 않고 새 배열을 반환한다.
 */
export function selectVisibleLinks(links: Link[]): Link[] {
  // filter가 이미 새 배열을 만들어내므로 원본을 안전하게 정렬할 수 있다.
  return links.filter((link) => link.active).sort((a, b) => a.order - b.order);
}

/**
 * 링크 데이터 소스에서 전체 링크를 가져온다.
 *
 * 로컬 우선(local-first) 단계: `SEED_LINKS`를 그대로 반환한다.
 * 추후 Supabase 키가 준비되면 이 함수 내부만 교체하면 된다. 예:
 *
 *   if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
 *     const supabase = await createServerSupabaseClient();
 *     const { data } = await supabase.from("links").select("*");
 *     return data ?? [];
 *   }
 *
 * 위 코드는 지금 작성하지 않는다 (실 키 없음, 과도설계 금지) — 교체 지점만 명시.
 */
async function fetchAllLinks(): Promise<Link[]> {
  return SEED_LINKS;
}

/**
 * 공개 링크페이지가 사용할 최종 링크 목록을 반환한다.
 * (활성 링크만, order 오름차순 정렬)
 */
export async function getLinks(): Promise<Link[]> {
  const allLinks = await fetchAllLinks();
  return selectVisibleLinks(allLinks);
}
