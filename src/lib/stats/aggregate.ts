import type {
  CampaignCount,
  DailyTrendPoint,
  EventRow,
  ExactTotals,
  LinkClickCount,
  LinkTitleRow,
  PageviewsPeriodOverPeriod,
  ReferrerCount,
  StatsSummary,
  WeekdayCount,
} from "./types";

const DEFAULT_TOP_REFERRERS_LIMIT = 5;
const DEFAULT_TOP_CAMPAIGNS_LIMIT = 5;
const DELETED_LINK_TITLE = "삭제된 링크";
const DELETED_LINK_ID = "__deleted__";
/** getUTCDay() 인덱스(0=일~6=토) 순서를 월~일로 재배열. */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function byLocaleKo(a: string, b: string): number {
  return a.localeCompare(b, "ko");
}

/** events를 [from, to] 범위(양 끝 포함)로 필터링한다. */
function filterByRange(events: EventRow[], from: Date, to: Date): EventRow[] {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  return events.filter((event) => {
    const t = new Date(event.created_at).getTime();
    return t >= fromMs && t <= toMs;
  });
}

export function countByType(events: EventRow[], type: "pageview" | "click"): number {
  return events.filter((event) => event.type === type).length;
}

export function aggregateClicksByLink(events: EventRow[], links: LinkTitleRow[]): LinkClickCount[] {
  const titleById = new Map(links.map((link) => [link.id, link.title]));
  const countById = new Map<string, number>();

  for (const event of events) {
    if (event.type !== "click" || !event.link_id) continue;
    countById.set(event.link_id, (countById.get(event.link_id) ?? 0) + 1);
  }

  const rows = Array.from(countById.entries()).map(([linkId, count]) => ({
    linkId,
    title: titleById.get(linkId) ?? DELETED_LINK_TITLE,
    count,
  }));

  const activeRows = rows.filter((row) => titleById.has(row.linkId));
  const deletedRows = rows.filter((row) => !titleById.has(row.linkId));

  const mergedDeletedRows =
    deletedRows.length > 1
      ? [
          {
            linkId: DELETED_LINK_ID,
            title: DELETED_LINK_TITLE,
            count: deletedRows.reduce((sum, row) => sum + row.count, 0),
          },
        ]
      : deletedRows;

  return [...activeRows, ...mergedDeletedRows].sort(
    (a, b) => b.count - a.count || byLocaleKo(a.title, b.title),
  );
}

function toDateKey(isoString: string): string {
  return isoString.slice(0, 10);
}

/**
 * 임의의 `from~to` 날짜 범위(양 끝 포함)에 대해 하루 단위 pageview 추이를 생성한다.
 * from/to가 자정이 아니어도 UTC 날짜 단위로 경계를 정규화한다(예: 어느 하루 안의 특정 시각이어도
 * 그 날짜 전체가 범위에 포함된 것으로 취급).
 */
export function aggregateDailyTrend(events: EventRow[], from: Date, to: Date): DailyTrendPoint[] {
  const countByDate = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "pageview") continue;
    const key = toDateKey(event.created_at);
    countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
  }

  const points: DailyTrendPoint[] = [];
  const cursor = new Date(`${toDateKey(from.toISOString())}T00:00:00.000Z`);
  const end = new Date(`${toDateKey(to.toISOString())}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    const key = toDateKey(cursor.toISOString());
    points.push({ date: key, count: countByDate.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

function referrerSource(event: EventRow): string {
  if (event.utm_source) return event.utm_source;
  if (!event.referrer) return "직접 방문";
  try {
    return new URL(event.referrer).hostname;
  } catch {
    return event.referrer;
  }
}

export function aggregateTopReferrers(
  events: EventRow[],
  limit: number = DEFAULT_TOP_REFERRERS_LIMIT,
): ReferrerCount[] {
  const countBySource = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "pageview") continue;
    const source = referrerSource(event);
    countBySource.set(source, (countBySource.get(source) ?? 0) + 1);
  }

  return Array.from(countBySource.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || byLocaleKo(a.source, b.source))
    .slice(0, limit);
}

export function aggregateTopCampaigns(
  events: EventRow[],
  limit: number = DEFAULT_TOP_CAMPAIGNS_LIMIT,
): CampaignCount[] {
  const countByCampaign = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "pageview" || !event.utm_campaign) continue;
    countByCampaign.set(event.utm_campaign, (countByCampaign.get(event.utm_campaign) ?? 0) + 1);
  }

  return Array.from(countByCampaign.entries())
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count || byLocaleKo(a.campaign, b.campaign))
    .slice(0, limit);
}

export function aggregateWeekdayDistribution(events: EventRow[]): WeekdayCount[] {
  const countByDay = new Map<number, number>();
  for (const event of events) {
    if (event.type !== "pageview") continue;
    const day = new Date(event.created_at).getUTCDay();
    countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
  }

  return WEEKDAY_ORDER.map((day) => ({
    weekday: WEEKDAY_LABELS[day],
    count: countByDay.get(day) ?? 0,
  }));
}

/**
 * "선택 기간(from~to)" vs "그 직전의 동일 길이 기간" pageview 수·증감률을 비교한다.
 * 기간 길이를 `length = to - from`이라 할 때, 직전 기간은 `[from - length, from)`이다
 * (선택 기간은 양 끝 포함, 직전 기간은 시작 포함·끝 미포함 — 경계 이벤트 중복 집계 방지).
 *
 * `events`는 선택 기간만이 아니라 직전 기간의 이벤트도 포함해서 넘겨야 array-scan 방식의
 * `previous` 값이 의미 있다. 다만 호출부(getStatsSummary)는 더 이상 넓은 범위를 조회하지
 * 않으므로, 정확한 `current`/`previous`를 이미 별도 count(exact) 쿼리로 갖고 있다면
 * `exactCounts`로 넘겨 array-scan을 우회할 수 있다(필드 단위로 선택 가능 — 한쪽만 넘겨도 됨).
 */
export function aggregatePeriodOverPeriod(
  events: EventRow[],
  from: Date,
  to: Date,
  exactCounts?: { current?: number; previous?: number },
): PageviewsPeriodOverPeriod {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const length = toMs - fromMs;
  const previousStart = fromMs - length;

  let scannedCurrent = 0;
  let scannedPrevious = 0;
  for (const event of events) {
    if (event.type !== "pageview") continue;
    const t = new Date(event.created_at).getTime();
    if (t >= fromMs && t <= toMs) {
      scannedCurrent += 1;
    } else if (t >= previousStart && t < fromMs) {
      scannedPrevious += 1;
    }
  }

  const current = exactCounts?.current ?? scannedCurrent;
  const previous = exactCounts?.previous ?? scannedPrevious;

  const changePercent = previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;
  return { current, previous, changePercent };
}

/**
 * events 배열과 [from, to] 범위를 받아 StatsSummary를 계산한다.
 *
 * `events`는 [from, to] 범위로 조회된 것을 가정한다(호출부가 더 넓은 범위를 넘겨도 이 함수
 * 내부에서 [from, to]로 다시 필터링한 뒤 계산하므로 안전하다). `aggregatePeriodOverPeriod`의
 * `previous`(직전 동일 길이 기간)는 이 events 배열만으로는 정확히 계산할 수 없으므로 —
 * events가 [from,to]로만 좁혀져 있다면 직전 기간 데이터가 아예 없다 — 호출부가
 * `exactTotals.previousPageviews`로 별도 count(exact) 쿼리 결과를 넘기면 그 값을 우선 쓴다.
 * 넘기지 않으면(또는 undefined) `aggregatePeriodOverPeriod`가 events 배열 스캔값으로 대체한다.
 *
 * `capped`는 이벤트 조회가 limit(10000)에 도달했는지를 호출부가 판단해 그대로 전달하는 값이다
 * (이 함수 자체는 순수 함수라 쿼리 결과의 캡 여부를 알 수 없다).
 */
export function buildStatsSummary(
  events: EventRow[],
  links: LinkTitleRow[],
  from: Date,
  to: Date,
  exactTotals?: ExactTotals,
  capped: boolean = false,
): StatsSummary {
  const rangeEvents = filterByRange(events, from, to);
  const totalPageviews = exactTotals?.pageviews ?? countByType(rangeEvents, "pageview");
  const totalClicks = exactTotals?.clicks ?? countByType(rangeEvents, "click");

  return {
    totalPageviews,
    totalClicks,
    clickThroughRate: totalPageviews === 0 ? null : Math.round((totalClicks / totalPageviews) * 1000) / 10,
    pageviewsPeriodOverPeriod: aggregatePeriodOverPeriod(
      events,
      from,
      to,
      exactTotals ? { current: exactTotals.pageviews, previous: exactTotals.previousPageviews } : undefined,
    ),
    clicksByLink: aggregateClicksByLink(rangeEvents, links),
    dailyTrend: aggregateDailyTrend(rangeEvents, from, to),
    topReferrers: aggregateTopReferrers(rangeEvents),
    topCampaigns: aggregateTopCampaigns(rangeEvents),
    weekdayDistribution: aggregateWeekdayDistribution(rangeEvents),
    capped,
  };
}
