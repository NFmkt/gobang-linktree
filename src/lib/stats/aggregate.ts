import type {
  DailyTrendPoint,
  EventRow,
  LinkClickCount,
  LinkTitleRow,
  ReferrerCount,
  StatsSummary,
} from "./types";

const DEFAULT_TOP_REFERRERS_LIMIT = 5;

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

  return Array.from(countById.entries())
    .map(([linkId, count]) => ({
      linkId,
      title: titleById.get(linkId) ?? "삭제된 링크",
      count,
    }))
    .sort((a, b) => b.count - a.count);
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
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildStatsSummary(
  events: EventRow[],
  links: LinkTitleRow[],
  now: Date = new Date(),
): StatsSummary {
  return {
    totalPageviews: countByType(events, "pageview"),
    totalClicks: countByType(events, "click"),
    clicksByLink: aggregateClicksByLink(events, links),
    dailyTrend7: aggregateDailyTrend(events, 7, now),
    dailyTrend30: aggregateDailyTrend(events, 30, now),
    topReferrers: aggregateTopReferrers(events),
  };
}
