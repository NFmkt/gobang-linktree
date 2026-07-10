import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { buildStatsSummary } from "./aggregate";
import type { EventRow, LinkTitleRow, StatsSummary } from "./types";

/**
 * 전체 기간 이벤트를 조회해 통계 요약을 계산한다.
 *
 * 개인 링크트리 규모 트래픽을 가정해 상세 이벤트(트렌드/유입출처/캠페인/요일분포 계산용)는
 * limit(10000)까지만 조회한다 — 이 이상 쌓이면 페이지네이션/집계 뷰가 필요하다(향후 과제).
 * 내림차순 정렬 후 자르므로, 10000건을 넘을 경우 잘려나가는 쪽은
 * 항상 가장 오래된 이벤트다 — 최근 7/30일 추이가 최신 데이터를
 * 유지한 채로 계산된다(오름차순+자르기였다면 반대로 최신 데이터가
 * 유실됐을 것, task-2 리뷰에서 발견).
 *
 * 단, "총 방문수/총 클릭수" KPI는 이 캡과 무관하게 정확해야 하므로
 * count(exact, head)로 별도 조회해 buildStatsSummary에 넘긴다
 * (10000건 넘게 쌓여도 총계 라벨이 실제와 어긋나지 않도록, S6 whole-slice 리뷰 Minor 후속).
 */
export async function getStatsSummary(): Promise<StatsSummary> {
  const supabase = createServiceSupabaseClient();

  const [eventsResult, linksResult, pageviewCountResult, clickCountResult] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: false }).limit(10000),
    supabase.from("links").select("id, title"),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("type", "pageview"),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("type", "click"),
  ]);

  if (eventsResult.error) {
    throw new Error(`events 조회 실패: ${eventsResult.error.message}`);
  }
  if (linksResult.error) {
    throw new Error(`links 조회 실패: ${linksResult.error.message}`);
  }
  if (pageviewCountResult.error) {
    throw new Error(`총 방문수 조회 실패: ${pageviewCountResult.error.message}`);
  }
  if (clickCountResult.error) {
    throw new Error(`총 클릭수 조회 실패: ${clickCountResult.error.message}`);
  }

  const events = (eventsResult.data ?? []) as EventRow[];
  const links = (linksResult.data ?? []) as LinkTitleRow[];

  return buildStatsSummary(events, links, new Date(), {
    pageviews: pageviewCountResult.count ?? 0,
    clicks: clickCountResult.count ?? 0,
  });
}
