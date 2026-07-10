import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { buildStatsSummary } from "./aggregate";
import type { EventRow, LinkTitleRow, StatsSummary } from "./types";

/**
 * 전체 기간 이벤트를 조회해 통계 요약을 계산한다.
 *
 * 개인 링크트리 규모 트래픽을 가정해 limit(10000)까지만 조회한다 —
 * 이 이상 쌓이면 페이지네이션/집계 뷰가 필요하다(향후 과제).
 */
export async function getStatsSummary(): Promise<StatsSummary> {
  const supabase = createServiceSupabaseClient();

  const [eventsResult, linksResult] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: true }).limit(10000),
    supabase.from("links").select("id, title"),
  ]);

  if (eventsResult.error) {
    throw new Error(`events 조회 실패: ${eventsResult.error.message}`);
  }
  if (linksResult.error) {
    throw new Error(`links 조회 실패: ${linksResult.error.message}`);
  }

  const events = (eventsResult.data ?? []) as EventRow[];
  const links = (linksResult.data ?? []) as LinkTitleRow[];

  return buildStatsSummary(events, links);
}
