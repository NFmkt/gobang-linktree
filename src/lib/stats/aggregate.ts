import type {
  CampaignCount,
  DailyTrendPoint,
  EventRow,
  ExactTotals,
  LinkClickCount,
  LinkTitleRow,
  PageviewsWeekOverWeek,
  ReferrerCount,
  StatsSummary,
  WeekdayCount,
} from "./types";

const DEFAULT_TOP_REFERRERS_LIMIT = 5;
const DEFAULT_TOP_CAMPAIGNS_LIMIT = 5;
const DELETED_LINK_TITLE = "삭제된 링크";
const DELETED_LINK_ID = "__deleted__";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** getUTCDay() 인덱스(0=일~6=토) 순서를 월~일로 재배열. */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function byLocaleKo(a: string, b: string): number {
  return a.localeCompare(b, "ko");
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

export function aggregateDailyTrend(
  events: EventRow[],
  days: number,
  now: Date = new Date(),
): DailyTrendPoint[] {
  const countByDate = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "pageview") continue;
    const key = toDateKey(event.created_at);
    countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
  }

  const points: DailyTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - i);
    const key = toDateKey(day.toISOString());
    points.push({ date: key, count: countByDate.get(key) ?? 0 });
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

export function aggregatePageviewsWeekOverWeek(
  events: EventRow[],
  now: Date = new Date(),
): PageviewsWeekOverWeek {
  const nowMs = now.getTime();
  const currentStart = nowMs - WEEK_MS;
  const previousStart = nowMs - 2 * WEEK_MS;

  let current = 0;
  let previous = 0;
  for (const event of events) {
    if (event.type !== "pageview") continue;
    const t = new Date(event.created_at).getTime();
    if (t >= currentStart && t <= nowMs) {
      current += 1;
    } else if (t >= previousStart && t < currentStart) {
      previous += 1;
    }
  }

  const changePercent = previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;
  return { current, previous, changePercent };
}

export function buildStatsSummary(
  events: EventRow[],
  links: LinkTitleRow[],
  now: Date = new Date(),
  exactTotals?: ExactTotals,
): StatsSummary {
  const totalPageviews = exactTotals?.pageviews ?? countByType(events, "pageview");
  const totalClicks = exactTotals?.clicks ?? countByType(events, "click");

  return {
    totalPageviews,
    totalClicks,
    clickThroughRate: totalPageviews === 0 ? null : Math.round((totalClicks / totalPageviews) * 1000) / 10,
    pageviewsWeekOverWeek: aggregatePageviewsWeekOverWeek(events, now),
    clicksByLink: aggregateClicksByLink(events, links),
    dailyTrend7: aggregateDailyTrend(events, 7, now),
    dailyTrend30: aggregateDailyTrend(events, 30, now),
    topReferrers: aggregateTopReferrers(events),
    topCampaigns: aggregateTopCampaigns(events),
    weekdayDistribution: aggregateWeekdayDistribution(events),
  };
}
