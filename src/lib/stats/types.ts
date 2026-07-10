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

export type CampaignCount = {
  campaign: string;
  count: number;
};

export type WeekdayCount = {
  /** "월"~"일" 한 글자 요일 라벨. */
  weekday: string;
  count: number;
};

export type PageviewsWeekOverWeek = {
  current: number;
  previous: number;
  /** previous가 0이면 비교 불가이므로 null. */
  changePercent: number | null;
};

/** limit(10000) 캡과 무관하게 정확한 총계를 넘길 때 사용(getStatsSummary에서 별도 count 쿼리로 조회). */
export type ExactTotals = {
  pageviews: number;
  clicks: number;
};

export type StatsSummary = {
  totalPageviews: number;
  totalClicks: number;
  /** 0~100, totalPageviews가 0이면 null. */
  clickThroughRate: number | null;
  pageviewsWeekOverWeek: PageviewsWeekOverWeek;
  clicksByLink: LinkClickCount[];
  dailyTrend7: DailyTrendPoint[];
  dailyTrend30: DailyTrendPoint[];
  topReferrers: ReferrerCount[];
  topCampaigns: CampaignCount[];
  weekdayDistribution: WeekdayCount[];
};
