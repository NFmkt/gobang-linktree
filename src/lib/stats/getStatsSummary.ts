import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { buildStatsSummary } from "./aggregate";
import type { EventRow, LinkTitleRow, StatsSummary } from "./types";

/**
 * 선택된 `from~to` 날짜 범위의 이벤트를 조회해 통계 요약을 계산한다.
 *
 * 개인 링크트리 규모 트래픽을 가정해 상세 이벤트(트렌드/유입출처/캠페인/요일분포 계산용)는
 * limit(10000)까지만 조회한다 — 이 이상 쌓이면 페이지네이션/집계 뷰가 필요하다(향후 과제).
 * 내림차순 정렬 후 자르므로, 10000건을 넘을 경우 잘려나가는 쪽은
 * 항상 가장 오래된 이벤트다 — 최신 데이터를 유지한 채로 계산된다
 * (오름차순+자르기였다면 반대로 최신 데이터가 유실됐을 것, task-2 리뷰에서 발견).
 * 조회 건수가 정확히 10000이면(캡에 도달했으면) `capped: true`를 반환해 UI가
 * "일부 데이터가 생략됐을 수 있음"을 알릴 수 있게 한다.
 *
 * 이 메인 이벤트 쿼리는 정확히 `[from, to]` 범위로만 조회한다(과거에는 `pageviewsPeriodOverPeriod`
 * 계산을 위해 직전 동일 길이 기간까지 포함한 "2배 범위"로 넓혀 조회했으나, 그 경우 내림차순
 * limit(10000) 절단이 선택 범위보다 먼저 직전 기간을 갉아먹어 두 가지 버그를 낳았다 — B1 리뷰 1라운드:
 * ①선택 범위 자체는 10000건 근처도 아닌데 직전 기간까지 합쳐서 10000을 채우면 `capped: true`가
 * 잘못 뜨는 false positive, ②그 상태로 `previous` 카운트도 이 잘린 배열에서 스캔하므로 직전 기간이
 * 과소 집계되어 `changePercent`가 부정확해지는 silent undercount).
 * 이제 `capped = events.length === 10000`은 오직 사용자가 실제로 선택한 `[from,to]` 범위의
 * 절단 여부만 반영한다 — 클릭순위/유입출처/캠페인/요일분포/일별추이 네 집계도 애초에 `[from,to]`
 * 범위만 필요로 했으므로 문제 없다.
 *
 * "총 방문수/총 클릭수" KPI와 "직전 동일 길이 기간의 방문수"는 이 캡과 무관하게 정확해야 하므로
 * 셋 다 count(exact, head)로 별도 조회한다:
 * - 총 방문수/총 클릭수: `[from, to]` (기존과 동일, S6 whole-slice 리뷰 Minor 후속)
 * - 직전 기간 방문수: `[from - (to-from), from)` — 시작 포함·끝 미포함(aggregatePeriodOverPeriod의
 *   순수 함수 로직과 동일한 경계 규약, 경계 이벤트 중복 집계 방지). `buildStatsSummary`에
 *   `exactTotals.previousPageviews`로 넘겨 `pageviewsPeriodOverPeriod.previous`가 이벤트 배열
 *   스캔이 아닌 이 정확한 값을 쓰도록 한다.
 */
export async function getStatsSummary(from: Date, to: Date): Promise<StatsSummary> {
  const supabase = createServiceSupabaseClient();

  const previousStart = new Date(from.getTime() - (to.getTime() - from.getTime()));

  const [eventsResult, linksResult, pageviewCountResult, clickCountResult, previousPageviewCountResult] =
    await Promise.all([
      supabase
        .from("events")
        .select("*")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false })
        .limit(10000),
      supabase.from("links").select("id, title"),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("type", "pageview")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString()),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("type", "click")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString()),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("type", "pageview")
        .gte("created_at", previousStart.toISOString())
        .lt("created_at", from.toISOString()),
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
  if (previousPageviewCountResult.error) {
    throw new Error(`직전 기간 조회 실패: ${previousPageviewCountResult.error.message}`);
  }

  const events = (eventsResult.data ?? []) as EventRow[];
  const links = (linksResult.data ?? []) as LinkTitleRow[];
  const capped = events.length === 10000;

  return buildStatsSummary(
    events,
    links,
    from,
    to,
    {
      pageviews: pageviewCountResult.count ?? 0,
      clicks: clickCountResult.count ?? 0,
      previousPageviews: previousPageviewCountResult.count ?? 0,
    },
    capped,
  );
}
