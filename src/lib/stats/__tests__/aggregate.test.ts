import { describe, it, expect } from "vitest";
import {
  countByType,
  aggregateClicksByLink,
  aggregateDailyTrend,
  aggregateTopReferrers,
  buildStatsSummary,
} from "../aggregate";
import type { EventRow, LinkTitleRow } from "../types";

function makeEvent(overrides: Partial<EventRow>): EventRow {
  return {
    id: crypto.randomUUID(),
    type: "pageview",
    link_id: null,
    referrer: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    created_at: "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("countByType", () => {
  it("type별 개수를 센다", () => {
    const events = [
      makeEvent({ type: "pageview" }),
      makeEvent({ type: "pageview" }),
      makeEvent({ type: "click", link_id: "home" }),
    ];
    expect(countByType(events, "pageview")).toBe(2);
    expect(countByType(events, "click")).toBe(1);
  });

  it("빈 배열이면 0을 반환한다", () => {
    expect(countByType([], "click")).toBe(0);
  });
});

describe("aggregateClicksByLink", () => {
  const links: LinkTitleRow[] = [
    { id: "home", title: "홈" },
    { id: "blog", title: "블로그" },
  ];

  it("click 타입만 집계하고 count 내림차순으로 정렬한다", () => {
    const events = [
      makeEvent({ type: "click", link_id: "home" }),
      makeEvent({ type: "click", link_id: "blog" }),
      makeEvent({ type: "click", link_id: "home" }),
    ];
    expect(aggregateClicksByLink(events, links)).toEqual([
      { linkId: "home", title: "홈", count: 2 },
      { linkId: "blog", title: "블로그", count: 1 },
    ]);
  });

  it("pageview 타입은 link_id가 있어도 집계에서 제외한다 (S2 오염 방지)", () => {
    const events = [
      makeEvent({ type: "pageview", link_id: "home" }),
      makeEvent({ type: "click", link_id: "home" }),
    ];
    expect(aggregateClicksByLink(events, links)).toEqual([{ linkId: "home", title: "홈", count: 1 }]);
  });

  it("링크 목록에 없는 link_id는 '삭제된 링크'로 표시한다", () => {
    const events = [makeEvent({ type: "click", link_id: "deleted-id" })];
    expect(aggregateClicksByLink(events, links)).toEqual([
      { linkId: "deleted-id", title: "삭제된 링크", count: 1 },
    ]);
  });

  it("빈 이벤트 배열이면 빈 배열을 반환한다", () => {
    expect(aggregateClicksByLink([], links)).toEqual([]);
  });
});

describe("aggregateDailyTrend", () => {
  const now = new Date("2026-07-10T12:00:00.000Z");

  it("pageview만 날짜별로 집계하고 days만큼의 포인트를 오늘 포함 반환한다", () => {
    const events = [
      makeEvent({ type: "pageview", created_at: "2026-07-10T01:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-10T23:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-09T05:00:00.000Z" }),
      makeEvent({ type: "click", link_id: "home", created_at: "2026-07-10T02:00:00.000Z" }),
    ];
    const result = aggregateDailyTrend(events, 3, now);
    expect(result).toEqual([
      { date: "2026-07-08", count: 0 },
      { date: "2026-07-09", count: 1 },
      { date: "2026-07-10", count: 2 },
    ]);
  });

  it("이벤트가 없으면 전부 count 0인 포인트를 반환한다", () => {
    const result = aggregateDailyTrend([], 2, now);
    expect(result).toEqual([
      { date: "2026-07-09", count: 0 },
      { date: "2026-07-10", count: 0 },
    ]);
  });
});

describe("aggregateTopReferrers", () => {
  it("utm_source가 있으면 referrer보다 우선한다", () => {
    const events = [
      makeEvent({ type: "pageview", referrer: "https://instagram.com/x", utm_source: "insta_bio" }),
    ];
    expect(aggregateTopReferrers(events)).toEqual([{ source: "insta_bio", count: 1 }]);
  });

  it("referrer만 있으면 hostname을 추출한다", () => {
    const events = [makeEvent({ type: "pageview", referrer: "https://www.instagram.com/reel/abc" })];
    expect(aggregateTopReferrers(events)).toEqual([{ source: "www.instagram.com", count: 1 }]);
  });

  it("referrer/utm_source 둘 다 없으면 '직접 방문'으로 집계한다", () => {
    const events = [
      makeEvent({ type: "pageview", referrer: null }),
      makeEvent({ type: "pageview", referrer: "" }),
    ];
    expect(aggregateTopReferrers(events)).toEqual([{ source: "직접 방문", count: 2 }]);
  });

  it("referrer가 URL 형식이 아니면 원본 문자열을 그대로 쓴다", () => {
    const events = [makeEvent({ type: "pageview", referrer: "not-a-valid-url" })];
    expect(aggregateTopReferrers(events)).toEqual([{ source: "not-a-valid-url", count: 1 }]);
  });

  it("click 타입은 집계에서 제외한다", () => {
    const events = [makeEvent({ type: "click", link_id: "home" })];
    expect(aggregateTopReferrers(events)).toEqual([]);
  });

  it("count 내림차순 정렬 후 limit개만 반환한다", () => {
    const events = [
      makeEvent({ type: "pageview", utm_source: "a" }),
      makeEvent({ type: "pageview", utm_source: "a" }),
      makeEvent({ type: "pageview", utm_source: "b" }),
      makeEvent({ type: "pageview", utm_source: "c" }),
    ];
    expect(aggregateTopReferrers(events, 2)).toEqual([
      { source: "a", count: 2 },
      { source: "b", count: 1 },
    ]);
  });
});

describe("buildStatsSummary", () => {
  it("모든 집계를 하나의 StatsSummary로 합친다", () => {
    const now = new Date("2026-07-10T12:00:00.000Z");
    const links: LinkTitleRow[] = [{ id: "home", title: "홈" }];
    const events = [
      makeEvent({ type: "pageview", created_at: "2026-07-10T01:00:00.000Z" }),
      makeEvent({ type: "click", link_id: "home", created_at: "2026-07-10T01:00:00.000Z" }),
    ];
    const summary = buildStatsSummary(events, links, now);

    expect(summary.totalPageviews).toBe(1);
    expect(summary.totalClicks).toBe(1);
    expect(summary.clicksByLink).toEqual([{ linkId: "home", title: "홈", count: 1 }]);
    expect(summary.dailyTrend7).toHaveLength(7);
    expect(summary.dailyTrend30).toHaveLength(30);
    expect(summary.dailyTrend7[6]).toEqual({ date: "2026-07-10", count: 1 });
    expect(summary.topReferrers).toEqual([{ source: "직접 방문", count: 1 }]);
  });
});
