import { describe, it, expect } from "vitest";
import { buildStatsCsv } from "../buildStatsCsv";
import type { StatsSummary } from "../types";

const summary: StatsSummary = {
  totalPageviews: 42,
  totalClicks: 17,
  clickThroughRate: 40.5,
  pageviewsPeriodOverPeriod: { current: 42, previous: 30, changePercent: 40 },
  clicksByLink: [{ linkId: "home", title: "홈", count: 10 }],
  clicksByLinkAndMedium: [
    {
      linkId: "home",
      title: "홈",
      total: 10,
      mediums: [
        { medium: "social", count: 8 },
        { medium: "미지정", count: 2 },
      ],
    },
  ],
  dailyTrend: [
    { date: "2026-07-09", count: 6 },
    { date: "2026-07-10", count: 7 },
  ],
  topReferrers: [{ source: "instagram.com", count: 20 }],
  weekdayDistribution: [
    { weekday: "월", count: 5 },
    { weekday: "화", count: 3 },
  ],
  capped: false,
};

describe("buildStatsCsv", () => {
  it("KPI 요약 섹션을 포함한다", () => {
    const csv = buildStatsCsv(summary);
    expect(csv).toContain("총 방문수,42");
    expect(csv).toContain("총 클릭수,17");
    expect(csv).toContain("클릭률(%),40.5");
  });

  it("링크별 클릭수 섹션을 포함한다", () => {
    const csv = buildStatsCsv(summary);
    expect(csv).toContain("링크별 클릭수");
    expect(csv).toContain("링크,클릭수");
    expect(csv).toContain("홈,10");
  });

  it("링크별 유입 경로 섹션을 포함한다", () => {
    const csv = buildStatsCsv(summary);
    expect(csv).toContain("링크별 유입 경로");
    expect(csv).toContain("링크,유입 경로,클릭수");
    expect(csv).toContain("홈,social,8");
    expect(csv).toContain("홈,미지정,2");
  });

  it("방문 추이·요일별 분포·유입출처 섹션을 포함한다", () => {
    const csv = buildStatsCsv(summary);
    expect(csv).toContain("방문 추이");
    expect(csv).toContain("2026-07-09,6");
    expect(csv).toContain("요일별 방문 분포");
    expect(csv).toContain("월,5");
    expect(csv).toContain("링크트리 유입 출처");
    expect(csv).toContain("instagram.com,20");
  });

  it("값에 쉼표·따옴표·줄바꿈이 있으면 CSV 규칙대로 이스케이프한다", () => {
    const withComma: StatsSummary = {
      ...summary,
      clicksByLink: [{ linkId: "a", title: '제목, "인용" 포함', count: 3 }],
    };
    const csv = buildStatsCsv(withComma);
    expect(csv).toContain('"제목, ""인용"" 포함",3');
  });

  it("빈 섹션은 헤더만 있고 데이터 행은 없다", () => {
    const empty: StatsSummary = {
      totalPageviews: 0,
      totalClicks: 0,
      clickThroughRate: null,
      pageviewsPeriodOverPeriod: { current: 0, previous: 0, changePercent: null },
      clicksByLink: [],
      clicksByLinkAndMedium: [],
      dailyTrend: [],
      topReferrers: [],
      weekdayDistribution: [],
      capped: false,
    };
    const csv = buildStatsCsv(empty);
    expect(csv).toContain("클릭률(%),-");
    expect(csv).toContain("링크,클릭수");
  });
});
