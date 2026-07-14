import { describe, it, expect } from "vitest";
import {
  countByType,
  aggregateClicksByLink,
  aggregateClicksByLinkAndMedium,
  aggregateDailyTrend,
  aggregateTopReferrers,
  aggregateWeekdayDistribution,
  aggregatePeriodOverPeriod,
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

  it("링크 목록에 없는 link_id(삭제된 링크)는 통계에서 제외한다", () => {
    const events = [
      makeEvent({ type: "click", link_id: "deleted-id" }),
      makeEvent({ type: "click", link_id: "home" }),
    ];
    expect(aggregateClicksByLink(events, links)).toEqual([{ linkId: "home", title: "홈", count: 1 }]);
  });

  it("빈 이벤트 배열이면 빈 배열을 반환한다", () => {
    expect(aggregateClicksByLink([], links)).toEqual([]);
  });

  it("삭제된 링크만 클릭된 경우 결과가 완전히 빈 배열이다", () => {
    const events = [
      makeEvent({ type: "click", link_id: "deleted-a" }),
      makeEvent({ type: "click", link_id: "deleted-b" }),
      makeEvent({ type: "click", link_id: "deleted-b" }),
    ];
    expect(aggregateClicksByLink(events, links)).toEqual([]);
  });

  it("count가 동일하면 title 가나다순으로 정렬해 순서를 안정적으로 만든다", () => {
    const events = [
      makeEvent({ type: "click", link_id: "blog" }),
      makeEvent({ type: "click", link_id: "home" }),
    ];
    expect(aggregateClicksByLink(events, links)).toEqual([
      { linkId: "blog", title: "블로그", count: 1 },
      { linkId: "home", title: "홈", count: 1 },
    ]);
  });
});

describe("aggregateDailyTrend", () => {
  it("pageview만 날짜별로 집계하고 from~to 범위의 포인트를 양 끝 포함 반환한다", () => {
    const from = new Date("2026-07-08T00:00:00.000Z");
    const to = new Date("2026-07-10T12:00:00.000Z");
    const events = [
      makeEvent({ type: "pageview", created_at: "2026-07-10T01:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-10T23:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-09T05:00:00.000Z" }),
      makeEvent({ type: "click", link_id: "home", created_at: "2026-07-10T02:00:00.000Z" }),
    ];
    const result = aggregateDailyTrend(events, from, to);
    expect(result).toEqual([
      { date: "2026-07-08", count: 0 },
      { date: "2026-07-09", count: 1 },
      { date: "2026-07-10", count: 2 },
    ]);
  });

  it("이벤트가 없으면 전부 count 0인 포인트를 반환한다", () => {
    const from = new Date("2026-07-09T00:00:00.000Z");
    const to = new Date("2026-07-10T12:00:00.000Z");
    const result = aggregateDailyTrend([], from, to);
    expect(result).toEqual([
      { date: "2026-07-09", count: 0 },
      { date: "2026-07-10", count: 0 },
    ]);
  });

  it("from과 to가 같은 날이면 포인트 1개만 반환한다", () => {
    const from = new Date("2026-07-10T00:00:00.000Z");
    const to = new Date("2026-07-10T23:59:59.999Z");
    const events = [makeEvent({ type: "pageview", created_at: "2026-07-10T05:00:00.000Z" })];
    expect(aggregateDailyTrend(events, from, to)).toEqual([{ date: "2026-07-10", count: 1 }]);
  });

  it("from/to가 자정이 아니어도 날짜(UTC) 단위로 경계를 정규화한다", () => {
    const from = new Date("2026-07-09T15:00:00.000Z");
    const to = new Date("2026-07-11T03:00:00.000Z");
    const result = aggregateDailyTrend([], from, to);
    expect(result.map((p) => p.date)).toEqual(["2026-07-09", "2026-07-10", "2026-07-11"]);
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

  it("count 내림차순으로 정렬하며 개수 제한 없이 전체를 반환한다", () => {
    const events = [
      makeEvent({ type: "pageview", utm_source: "a" }),
      makeEvent({ type: "pageview", utm_source: "a" }),
      makeEvent({ type: "pageview", utm_source: "b" }),
      makeEvent({ type: "pageview", utm_source: "c" }),
    ];
    expect(aggregateTopReferrers(events)).toEqual([
      { source: "a", count: 2 },
      { source: "b", count: 1 },
      { source: "c", count: 1 },
    ]);
  });

  it("count가 동일하면 source 가나다순으로 정렬해 순서를 안정적으로 만든다", () => {
    const events = [
      makeEvent({ type: "pageview", utm_source: "z-소스" }),
      makeEvent({ type: "pageview", utm_source: "a-소스" }),
    ];
    expect(aggregateTopReferrers(events)).toEqual([
      { source: "a-소스", count: 1 },
      { source: "z-소스", count: 1 },
    ]);
  });
});

describe("aggregateClicksByLinkAndMedium", () => {
  const links: LinkTitleRow[] = [
    { id: "home", title: "홈" },
    { id: "blog", title: "블로그" },
  ];

  it("링크별로 utm_medium별 클릭수를 교차 집계한다", () => {
    const events = [
      makeEvent({ type: "click", link_id: "home", utm_medium: "social" }),
      makeEvent({ type: "click", link_id: "home", utm_medium: "social" }),
      makeEvent({ type: "click", link_id: "home", utm_medium: "email" }),
      makeEvent({ type: "click", link_id: "blog", utm_medium: "social" }),
    ];
    expect(aggregateClicksByLinkAndMedium(events, links)).toEqual([
      {
        linkId: "home",
        title: "홈",
        total: 3,
        mediums: [
          { medium: "social", count: 2 },
          { medium: "email", count: 1 },
        ],
      },
      {
        linkId: "blog",
        title: "블로그",
        total: 1,
        mediums: [{ medium: "social", count: 1 }],
      },
    ]);
  });

  it("utm_medium이 없는 클릭은 '미지정'으로 묶는다", () => {
    const events = [
      makeEvent({ type: "click", link_id: "home", utm_medium: null }),
      makeEvent({ type: "click", link_id: "home", utm_medium: null }),
    ];
    expect(aggregateClicksByLinkAndMedium(events, links)).toEqual([
      { linkId: "home", title: "홈", total: 2, mediums: [{ medium: "미지정", count: 2 }] },
    ]);
  });

  it("삭제된 링크(links 목록에 없는 link_id)는 제외한다", () => {
    const events = [makeEvent({ type: "click", link_id: "deleted-id", utm_medium: "social" })];
    expect(aggregateClicksByLinkAndMedium(events, links)).toEqual([]);
  });

  it("pageview 타입은 집계에서 제외한다", () => {
    const events = [makeEvent({ type: "pageview", link_id: "home", utm_medium: "social" })];
    expect(aggregateClicksByLinkAndMedium(events, links)).toEqual([]);
  });

  it("빈 이벤트 배열이면 빈 배열을 반환한다", () => {
    expect(aggregateClicksByLinkAndMedium([], links)).toEqual([]);
  });
});

describe("aggregateWeekdayDistribution", () => {
  it("pageview를 요일별로 집계하고 월~일 순서로 7개를 반환한다", () => {
    const events = [
      // 2026-07-06은 월요일(UTC)
      makeEvent({ type: "pageview", created_at: "2026-07-06T10:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-06T11:00:00.000Z" }),
      // 2026-07-12는 일요일(UTC)
      makeEvent({ type: "pageview", created_at: "2026-07-12T10:00:00.000Z" }),
      makeEvent({ type: "click", link_id: "home", created_at: "2026-07-06T10:00:00.000Z" }),
    ];
    const result = aggregateWeekdayDistribution(events);
    expect(result).toEqual([
      { weekday: "월", count: 2 },
      { weekday: "화", count: 0 },
      { weekday: "수", count: 0 },
      { weekday: "목", count: 0 },
      { weekday: "금", count: 0 },
      { weekday: "토", count: 0 },
      { weekday: "일", count: 1 },
    ]);
  });

  it("이벤트가 없으면 전부 count 0인 7개 포인트를 반환한다", () => {
    const result = aggregateWeekdayDistribution([]);
    expect(result).toHaveLength(7);
    expect(result.every((point) => point.count === 0)).toBe(true);
  });
});

describe("aggregatePeriodOverPeriod", () => {
  // 선택 기간: 7/3 12:00 ~ 7/10 12:00 (길이 7일) → 직전 기간: 6/26 12:00 ~ 7/3 12:00
  const from = new Date("2026-07-03T12:00:00.000Z");
  const to = new Date("2026-07-10T12:00:00.000Z");

  it("선택 기간과 그 직전 동일 길이 기간의 pageview 수·증감률을 계산한다", () => {
    const events = [
      // 선택 기간(from~to, 양 끝 포함): 3건
      makeEvent({ type: "pageview", created_at: "2026-07-09T00:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-09T00:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-05T00:00:00.000Z" }),
      // 직전 동일 길이 기간 [from-length, from): 2건
      makeEvent({ type: "pageview", created_at: "2026-07-01T00:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-06-28T00:00:00.000Z" }),
      // 범위 밖(직전 기간보다도 이전)
      makeEvent({ type: "pageview", created_at: "2026-06-01T00:00:00.000Z" }),
      makeEvent({ type: "click", link_id: "home", created_at: "2026-07-09T00:00:00.000Z" }),
    ];
    expect(aggregatePeriodOverPeriod(events, from, to)).toEqual({
      current: 3,
      previous: 2,
      changePercent: 50,
    });
  });

  it("임의 길이의 기간에도 동일하게 동작한다 (30일 범위)", () => {
    const from30 = new Date("2026-06-11T00:00:00.000Z");
    const to30 = new Date("2026-07-10T00:00:00.000Z");
    const events = [
      makeEvent({ type: "pageview", created_at: "2026-06-20T00:00:00.000Z" }), // 선택 기간
      makeEvent({ type: "pageview", created_at: "2026-05-15T00:00:00.000Z" }), // 직전 기간 [5/12, 6/11)
      makeEvent({ type: "pageview", created_at: "2026-04-01T00:00:00.000Z" }), // 범위 밖
    ];
    expect(aggregatePeriodOverPeriod(events, from30, to30)).toEqual({
      current: 1,
      previous: 1,
      changePercent: 0,
    });
  });

  it("직전 기간 데이터가 0건이면 changePercent는 null이다", () => {
    const events = [makeEvent({ type: "pageview", created_at: "2026-07-09T00:00:00.000Z" })];
    expect(aggregatePeriodOverPeriod(events, from, to)).toEqual({
      current: 1,
      previous: 0,
      changePercent: null,
    });
  });

  it("이벤트가 없으면 0/0/null을 반환한다", () => {
    expect(aggregatePeriodOverPeriod([], from, to)).toEqual({
      current: 0,
      previous: 0,
      changePercent: null,
    });
  });

  it("exactCounts.current/.previous를 넘기면 events 스캔 대신 그 값을 우선 사용한다", () => {
    // events 배열 자체는 선택 기간 2건 / 직전 기간 1건이지만, exactCounts로 다른 값을 넘긴다 —
    // 반환값은 exactCounts를 따라야 한다(메인 쿼리가 limit(10000)에 잘려 events가 부정확해도
    // 정확한 count(exact) 쿼리 결과를 신뢰할 수 있어야 함, B1 리뷰 1라운드 undercount 수정).
    const events = [
      makeEvent({ type: "pageview", created_at: "2026-07-09T00:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-05T00:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-01T00:00:00.000Z" }),
    ];
    expect(aggregatePeriodOverPeriod(events, from, to, { current: 50, previous: 20 })).toEqual({
      current: 50,
      previous: 20,
      changePercent: 150,
    });
  });

  it("exactCounts 중 한쪽만 넘기면 그 필드만 우선하고 나머지는 events 스캔값을 쓴다", () => {
    const events = [
      // 선택 기간: 2건
      makeEvent({ type: "pageview", created_at: "2026-07-09T00:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-05T00:00:00.000Z" }),
      // 직전 기간: 1건
      makeEvent({ type: "pageview", created_at: "2026-07-01T00:00:00.000Z" }),
    ];
    // previous만 exact로 넘김 → current는 events 스캔값(2)을 그대로 쓴다.
    expect(aggregatePeriodOverPeriod(events, from, to, { previous: 100 })).toEqual({
      current: 2,
      previous: 100,
      changePercent: -98,
    });
  });

  it("4번째 인자를 생략하면 기존과 동일하게 events 스캔값만으로 계산한다", () => {
    const events = [
      makeEvent({ type: "pageview", created_at: "2026-07-09T00:00:00.000Z" }),
      makeEvent({ type: "pageview", created_at: "2026-07-01T00:00:00.000Z" }),
    ];
    expect(aggregatePeriodOverPeriod(events, from, to)).toEqual({
      current: 1,
      previous: 1,
      changePercent: 0,
    });
  });
});

describe("buildStatsSummary", () => {
  const from = new Date("2026-07-04T00:00:00.000Z");
  const to = new Date("2026-07-10T23:59:59.999Z");

  it("모든 집계를 하나의 StatsSummary로 합친다", () => {
    const links: LinkTitleRow[] = [{ id: "home", title: "홈" }];
    const events = [
      makeEvent({ type: "pageview", created_at: "2026-07-10T01:00:00.000Z" }),
      makeEvent({ type: "click", link_id: "home", created_at: "2026-07-10T01:00:00.000Z" }),
    ];
    const summary = buildStatsSummary(events, links, from, to);

    expect(summary.totalPageviews).toBe(1);
    expect(summary.totalClicks).toBe(1);
    expect(summary.clicksByLink).toEqual([{ linkId: "home", title: "홈", count: 1 }]);
    expect(summary.dailyTrend).toHaveLength(7);
    expect(summary.dailyTrend[6]).toEqual({ date: "2026-07-10", count: 1 });
    expect(summary.topReferrers).toEqual([{ source: "직접 방문", count: 1 }]);
    expect(summary.clicksByLinkAndMedium).toEqual([
      { linkId: "home", title: "홈", total: 1, mediums: [{ medium: "미지정", count: 1 }] },
    ]);
    expect(summary.weekdayDistribution).toHaveLength(7);
    expect(summary.clickThroughRate).toBe(100);
    expect(summary.pageviewsPeriodOverPeriod).toEqual({ current: 1, previous: 0, changePercent: null });
    expect(summary.capped).toBe(false);
  });

  it("totalPageviews가 0이면 clickThroughRate는 null이다", () => {
    const summary = buildStatsSummary([], [], from, to);
    expect(summary.totalPageviews).toBe(0);
    expect(summary.clickThroughRate).toBeNull();
  });

  it("exactCounts를 넘기면 총계는 exactCounts를 우선 사용한다 (limit 캡 우회)", () => {
    const events = [makeEvent({ type: "pageview", created_at: "2026-07-10T01:00:00.000Z" })];
    const summary = buildStatsSummary(events, [], from, to, { pageviews: 12000, clicks: 340 });
    expect(summary.totalPageviews).toBe(12000);
    expect(summary.totalClicks).toBe(340);
    expect(summary.clickThroughRate).toBeCloseTo(2.8, 1);
  });

  it("from~to 범위 밖 이벤트는 클릭순위/유입출처/유입경로/요일분포 집계에서 제외한다", () => {
    const links: LinkTitleRow[] = [{ id: "home", title: "홈" }];
    const events = [
      makeEvent({ type: "click", link_id: "home", created_at: "2026-07-05T00:00:00.000Z" }), // 범위 내
      makeEvent({ type: "click", link_id: "home", created_at: "2026-06-01T00:00:00.000Z" }), // 범위 밖
    ];
    const summary = buildStatsSummary(events, links, from, to);
    expect(summary.clicksByLink).toEqual([{ linkId: "home", title: "홈", count: 1 }]);
    expect(summary.clicksByLinkAndMedium).toEqual([
      { linkId: "home", title: "홈", total: 1, mediums: [{ medium: "미지정", count: 1 }] },
    ]);
  });

  it("capped 인자를 넘기면 그대로 결과에 반영한다", () => {
    const summary = buildStatsSummary([], [], from, to, undefined, true);
    expect(summary.capped).toBe(true);
  });

  it("capped 인자를 생략하면 기본값은 false다", () => {
    const summary = buildStatsSummary([], [], from, to);
    expect(summary.capped).toBe(false);
  });
});
