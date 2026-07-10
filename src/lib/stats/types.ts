/**
 * `events` 테이블(supabase/migrations/0002_events.sql)의 원본 행.
 */
export type EventRow = {
  id: string;
  type: "pageview" | "click";
  link_id: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
};

/**
 * 클릭수 집계 시 link_id → title 매핑에 필요한 최소 필드.
 */
export type LinkTitleRow = {
  id: string;
  title: string;
};

export type LinkClickCount = {
  linkId: string;
  title: string;
  count: number;
};

export type DailyTrendPoint = {
  /** YYYY-MM-DD (UTC) */
  date: string;
  count: number;
};

export type ReferrerCount = {
  source: string;
  count: number;
};

export type StatsSummary = {
  totalPageviews: number;
  totalClicks: number;
  clicksByLink: LinkClickCount[];
  dailyTrend7: DailyTrendPoint[];
  dailyTrend30: DailyTrendPoint[];
  topReferrers: ReferrerCount[];
};
