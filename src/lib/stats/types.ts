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

/** 링크별 클릭을 utm_medium(유입 경로)별로 나눈 교차 집계 한 행. */
export type LinkMediumBreakdown = {
  linkId: string;
  title: string;
  total: number;
  mediums: { medium: string; count: number }[];
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

export type WeekdayCount = {
  /** "월"~"일" 한 글자 요일 라벨. */
  weekday: string;
  count: number;
};

/**
 * "선택 기간(from~to)" vs "그 직전의 동일 길이 기간" pageview 수 비교.
 * 과거 `PageviewsWeekOverWeek`(고정 7일 비교)를 임의 기간 비교로 일반화한 타입.
 */
export type PageviewsPeriodOverPeriod = {
  current: number;
  previous: number;
  /** previous가 0이면 비교 불가이므로 null. */
  changePercent: number | null;
};

/** limit(10000) 캡과 무관하게 정확한 총계를 넘길 때 사용(getStatsSummary에서 별도 count 쿼리로 조회). */
export type ExactTotals = {
  pageviews: number;
  clicks: number;
  /**
   * 직전 동일 길이 기간의 정확한 pageview 수(별도 count(exact, head) 쿼리로 조회).
   * 생략 가능 — 생략 시 aggregatePeriodOverPeriod가 events 배열 스캔값으로 대체한다.
   */
  previousPageviews?: number;
};

export type StatsSummary = {
  totalPageviews: number;
  totalClicks: number;
  /** 0~100, totalPageviews가 0이면 null. */
  clickThroughRate: number | null;
  pageviewsPeriodOverPeriod: PageviewsPeriodOverPeriod;
  clicksByLink: LinkClickCount[];
  /** 링크별 클릭을 유입 경로(utm_medium)별로 나눈 교차 집계. */
  clicksByLinkAndMedium: LinkMediumBreakdown[];
  /** 선택된 from~to 범위의 하루 단위 방문 추이(양 끝 날짜 포함). */
  dailyTrend: DailyTrendPoint[];
  topReferrers: ReferrerCount[];
  weekdayDistribution: WeekdayCount[];
  /** 이벤트 조회가 limit(10000)에 도달해 잘렸으면 true(총계 KPI 제외 나머지 집계가 부분 데이터일 수 있음을 의미). */
  capped: boolean;
};
