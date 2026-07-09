import type { Link } from "./types";
import { SEED_LINKS } from "./seed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
 * NEXT_PUBLIC_SUPABASE_URL이 설정돼 있으면 Supabase `links` 테이블에서 조회한다.
 * 없으면(로컬 키 미설정) `SEED_LINKS`로 폴백 — 키 없이도 로컬 개발이 가능하다.
 */
async function fetchAllLinks(): Promise<Link[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return SEED_LINKS;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    throw new Error(`links 조회 실패: ${error.message}`);
  }

  return data ?? [];
}

/**
 * 공개 링크페이지가 사용할 최종 링크 목록을 반환한다.
 * (활성 링크만, order 오름차순 정렬)
 */
export async function getLinks(): Promise<Link[]> {
  const allLinks = await fetchAllLinks();
  return selectVisibleLinks(allLinks);
}
