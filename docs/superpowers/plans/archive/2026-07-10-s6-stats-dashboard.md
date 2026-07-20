# S6 — 요약 통계 대시보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/stats`에서 총 방문수·총 클릭수·링크별 클릭 순위·최근 7/30일 방문 추이·유입출처 top을 보여주고, 통계를 수동으로 초기화할 수 있게 한다.

**Architecture:** `events` 테이블(0002_events.sql)의 원본 행을 `createServiceSupabaseClient()`(service_role, RLS 우회)로 전량 조회한 뒤, 순수 함수(`src/lib/stats/aggregate.ts`)로 서버 메모리에서 집계한다. 별도 SQL 뷰나 RPC 함수는 만들지 않는다(개인 링크트리 규모 트래픽에서는 불필요한 복잡도). 차트는 신규 npm 패키지 없이 React+SVG로 직접 그린다(사용자 승인됨, `docs/DESIGN_SYSTEM.md` §9의 "경량 대안" 선택지). 페이지는 S4/S5 관리자 페이지와 동일 패턴: `page.tsx`(Server Component, service_role 직접 조회) → 집계 → Client Component에 결과 전달.

**Tech Stack:** Next.js 16 Server Component + Route Handler(`DELETE`), Supabase(service_role), React(순수 SVG 차트, 신규 라이브러리 없음).

## Global Constraints

- **반드시 `type='click'`인 행만 클릭 집계에 포함한다** — pageview 행도 구조상 `link_id`를 받을 수 있어(S2 route.ts가 미차단, 의도된 것) 필터 없이 group by하면 클릭 카운트가 오염된다(S2 whole-slice 최종 리뷰에서 S6로 이월된 주의사항).
- **referrer/utm 집계는 `type='pageview'`인 행만 포함한다** — click 이벤트는 `EventPayload` 타입상 referrer/utm을 보내지 않는다(`src/lib/events/types.ts` 참조), DB 컬럼은 nullable이라 값이 없으면 반드시 `null`이다.
- **총 방문수/총 클릭수는 전체 기간 누적**이다(날짜 필터 없음) — "최근 7/30일 추이"만 기간이 있다. 하나의 이벤트 조회 쿼리 결과에서 전체 집계와 기간 집계를 모두 계산한다(쿼리 두 번 안 함).
- **집계 로직은 순수 함수로 분리**하고 `EventRow[]`/`LinkTitleRow[]` 인풋만으로 테스트한다 — DB 접근 코드(`getStatsSummary.ts`)와 섞지 않는다(S1의 `selectVisibleLinks` 패턴).
- **차트는 신규 npm 패키지 추가 금지** — React+SVG로 직접 구현. 각 차트는 단일 시리즈이므로 신규 CSS 컬러 토큰 추가 없이 기존 `--color-primary`만 사용한다(YAGNI — 다중 시리즈가 필요해지면 그때 `--color-blue-*` 계열 토큰 추가).
- **삭제(통계 초기화)는 파괴적 액션** — 기존 컨벤션(`LinksManager.tsx`)대로 `window.confirm()`으로 확인 후 진행.
- **fetch 호출은 반드시 `try/catch/finally`로 감싼다**(S3·S4에서 반복 확인된 프로젝트 확립 패턴, `catch` 없이 `try/finally`만 쓰면 미처리 프로미스 거부가 발생한다).
- 관리 API(`DELETE /api/admin/stats`)는 `createServiceSupabaseClient()`(service_role)를 쓰고 `src/proxy.ts`가 이미 `/api/admin/*` 전체를 보호한다 — 이 태스크에서 인증 로직을 추가하지 않는다.
- 테스트: `npx vitest run` · 린트: `npm run lint` · 빌드: `npx next build`
- 커밋 메시지 접두사: `feat(S6): ...`

---

### Task 1: 통계 집계 순수 함수

**Files:**
- Create: `src/lib/stats/types.ts`
- Create: `src/lib/stats/aggregate.ts`
- Test: `src/lib/stats/__tests__/aggregate.test.ts`

**Interfaces:**
- Produces: `EventRow`, `LinkTitleRow`, `LinkClickCount`, `DailyTrendPoint`, `ReferrerCount`, `StatsSummary` 타입 및 `countByType()`, `aggregateClicksByLink()`, `aggregateDailyTrend()`, `aggregateTopReferrers()`, `buildStatsSummary()` 함수 — Task 2(`getStatsSummary.ts`)가 `buildStatsSummary()`와 모든 타입을 그대로 import해서 쓴다. Task 4(차트 컴포넌트)·Task 5(대시보드 UI)는 `StatsSummary`/`LinkClickCount`/`DailyTrendPoint`/`ReferrerCount` 타입을 참조한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/stats/types.ts`:
```ts
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
```

`src/lib/stats/__tests__/aggregate.test.ts`:
```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/stats/__tests__/aggregate.test.ts`
Expected: FAIL — `Cannot find module '../aggregate'`

- [ ] **Step 3: 최소 구현 작성**

`src/lib/stats/aggregate.ts`:
```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/stats/__tests__/aggregate.test.ts`
Expected: PASS (전부)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/stats/types.ts src/lib/stats/aggregate.ts src/lib/stats/__tests__/aggregate.test.ts
git commit -m "feat(S6): 통계 집계 순수 함수 (클릭 순위·일별 추이·유입출처 top)"
```

---

### Task 2: 이벤트 조회 데이터 레이어

**Files:**
- Create: `src/lib/stats/getStatsSummary.ts`
- Test: `src/lib/stats/__tests__/getStatsSummary.test.ts`

**Interfaces:**
- Consumes: `createServiceSupabaseClient()`(`@/lib/supabase/server`, 기존), `buildStatsSummary()`·`EventRow`·`LinkTitleRow`·`StatsSummary`(Task 1, `./aggregate`·`./types`)
- Produces: `getStatsSummary(): Promise<StatsSummary>` — Task 5(`page.tsx`)가 그대로 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/stats/__tests__/getStatsSummary.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";

describe("getStatsSummary", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("events·links를 조회해 StatsSummary로 집계한다", async () => {
    const events = [
      {
        id: "1",
        type: "pageview",
        link_id: null,
        referrer: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        created_at: "2026-07-10T00:00:00.000Z",
      },
      {
        id: "2",
        type: "click",
        link_id: "home",
        referrer: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        created_at: "2026-07-10T00:00:00.000Z",
      },
    ];
    const links = [{ id: "home", title: "홈" }];

    const limit = vi.fn().mockResolvedValue({ data: events, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eventsSelect = vi.fn().mockReturnValue({ order });
    const linksSelect = vi.fn().mockResolvedValue({ data: links, error: null });
    const from = vi.fn((table: string) => {
      if (table === "events") return { select: eventsSelect };
      if (table === "links") return { select: linksSelect };
      throw new Error(`unexpected table: ${table}`);
    });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    const summary = await getStatsSummary();

    expect(summary.totalPageviews).toBe(1);
    expect(summary.totalClicks).toBe(1);
    expect(summary.clicksByLink).toEqual([{ linkId: "home", title: "홈", count: 1 }]);
    expect(eventsSelect).toHaveBeenCalledWith("*");
    expect(linksSelect).toHaveBeenCalledWith("id, title");
  });

  it("events 조회 에러 시 예외를 던진다", async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: { message: "events db down" } });
    const order = vi.fn().mockReturnValue({ limit });
    const eventsSelect = vi.fn().mockReturnValue({ order });
    const linksSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const from = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    await expect(getStatsSummary()).rejects.toThrow(/events db down/);
  });

  it("links 조회 에러 시 예외를 던진다", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eventsSelect = vi.fn().mockReturnValue({ order });
    const linksSelect = vi.fn().mockResolvedValue({ data: null, error: { message: "links db down" } });
    const from = vi.fn((table: string) =>
      table === "events" ? { select: eventsSelect } : { select: linksSelect },
    );
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { getStatsSummary } = await import("../getStatsSummary");
    await expect(getStatsSummary()).rejects.toThrow(/links db down/);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/stats/__tests__/getStatsSummary.test.ts`
Expected: FAIL — `Cannot find module '../getStatsSummary'`

- [ ] **Step 3: 최소 구현 작성**

`src/lib/stats/getStatsSummary.ts`:
```ts
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { buildStatsSummary } from "./aggregate";
import type { EventRow, LinkTitleRow, StatsSummary } from "./types";

/**
 * 전체 기간 이벤트를 조회해 통계 요약을 계산한다.
 *
 * 개인 링크트리 규모 트래픽을 가정해 limit(10000)까지만 조회한다 —
 * 이 이상 쌓이면 페이지네이션/집계 뷰가 필요하다(향후 과제).
 */
export async function getStatsSummary(): Promise<StatsSummary> {
  const supabase = createServiceSupabaseClient();

  const [eventsResult, linksResult] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: true }).limit(10000),
    supabase.from("links").select("id, title"),
  ]);

  if (eventsResult.error) {
    throw new Error(`events 조회 실패: ${eventsResult.error.message}`);
  }
  if (linksResult.error) {
    throw new Error(`links 조회 실패: ${linksResult.error.message}`);
  }

  const events = (eventsResult.data ?? []) as EventRow[];
  const links = (linksResult.data ?? []) as LinkTitleRow[];

  return buildStatsSummary(events, links);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/stats/__tests__/getStatsSummary.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/stats/getStatsSummary.ts src/lib/stats/__tests__/getStatsSummary.test.ts
git commit -m "feat(S6): getStatsSummary() 데이터 레이어 (service_role 전량 조회+집계)"
```

---

### Task 3: 통계 초기화 API

**Files:**
- Create: `src/app/api/admin/stats/route.ts`
- Test: `src/app/api/admin/stats/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `createServiceSupabaseClient()`(`@/lib/supabase/server`, 기존)
- Produces: `DELETE /api/admin/stats` → `{ok: true}` | 500. Task 5(`StatsDashboard.tsx`)가 이 엔드포인트를 fetch로 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/api/admin/stats/__tests__/route.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";

describe("DELETE /api/admin/stats", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("모든 이벤트를 삭제하고 200과 ok:true를 반환한다", async () => {
    const not = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ not });
    const from = vi.fn().mockReturnValue({ delete: del });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { DELETE } = await import("../route");
    const res = await DELETE();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("events");
    expect(del).toHaveBeenCalled();
    expect(not).toHaveBeenCalledWith("id", "is", null);
  });

  it("삭제 실패 시 500을 반환한다", async () => {
    const not = vi.fn().mockResolvedValue({ error: { message: "delete failed" } });
    const del = vi.fn().mockReturnValue({ not });
    const from = vi.fn().mockReturnValue({ delete: del });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { DELETE } = await import("../route");
    const res = await DELETE();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("delete failed");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/app/api/admin/stats/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: 최소 구현 작성**

`src/app/api/admin/stats/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

/**
 * 통계 수동 초기화 — events 테이블의 모든 행을 삭제한다.
 * Supabase JS 클라이언트는 WHERE 없는 delete를 허용하지 않으므로
 * 항상 참인 조건(`id is not null` — id는 PK라 항상 non-null)으로 전체 삭제한다.
 */
export async function DELETE() {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("events").delete().not("id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/app/api/admin/stats/__tests__/route.test.ts`
Expected: PASS (2/2)

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/admin/stats/route.ts src/app/api/admin/stats/__tests__/route.test.ts
git commit -m "feat(S6): 통계 초기화 API (DELETE /api/admin/stats)"
```

---

### Task 4: 차트 프리미티브 컴포넌트

**Files:**
- Create: `src/components/admin/BarChart.tsx`
- Create: `src/components/admin/LineChart.tsx`
- Test: `src/components/admin/__tests__/BarChart.test.tsx`
- Test: `src/components/admin/__tests__/LineChart.test.tsx`

**Interfaces:**
- Produces: `BarChart({items, emptyMessage})`(`BarChartItem = {label, value}`), `LineChart({points, emptyMessage})`(`LineChartPoint = {date, count}`) — Task 5(`StatsDashboard.tsx`)가 `StatsSummary`의 `clicksByLink`/`topReferrers`를 `BarChartItem[]`으로, `dailyTrend7`/`dailyTrend30`을 그대로 `LineChartPoint[]`로 매핑해 넘긴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/admin/__tests__/BarChart.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarChart } from "../BarChart";

describe("BarChart", () => {
  it("항목이 없으면 emptyMessage를 보여준다", () => {
    render(<BarChart items={[]} emptyMessage="데이터가 없습니다." />);
    expect(screen.getByText("데이터가 없습니다.")).toBeInTheDocument();
  });

  it("항목의 라벨과 값을 렌더한다", () => {
    render(
      <BarChart
        items={[
          { label: "홈", value: 10 },
          { label: "블로그", value: 5 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("블로그")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("최댓값 항목의 막대는 100% 너비를 갖는다", () => {
    render(
      <BarChart
        items={[
          { label: "홈", value: 10 },
          { label: "블로그", value: 5 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    const bars = document.querySelectorAll("[data-bar-fill]");
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "50%" });
  });
});
```

`src/components/admin/__tests__/LineChart.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LineChart } from "../LineChart";

describe("LineChart", () => {
  it("포인트가 없으면 emptyMessage를 보여준다", () => {
    render(<LineChart points={[]} emptyMessage="데이터가 없습니다." />);
    expect(screen.getByText("데이터가 없습니다.")).toBeInTheDocument();
  });

  it("포인트 개수만큼 원(circle)을 렌더한다", () => {
    render(
      <LineChart
        points={[
          { date: "2026-07-08", count: 1 },
          { date: "2026-07-09", count: 3 },
          { date: "2026-07-10", count: 2 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    const circles = document.querySelectorAll("circle");
    expect(circles).toHaveLength(3);
  });

  it("접근성을 위한 aria-label을 가진 svg를 렌더한다", () => {
    render(
      <LineChart points={[{ date: "2026-07-10", count: 1 }]} emptyMessage="데이터가 없습니다." />,
    );
    expect(screen.getByRole("img", { name: "일별 방문 추이" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/admin/__tests__/BarChart.test.tsx src/components/admin/__tests__/LineChart.test.tsx`
Expected: FAIL — `Cannot find module '../BarChart'` / `'../LineChart'`

- [ ] **Step 3: 최소 구현 작성**

`src/components/admin/BarChart.tsx`:
```tsx
export type BarChartItem = {
  label: string;
  value: number;
};

type BarChartProps = {
  items: BarChartItem[];
  emptyMessage: string;
};

export function BarChart({ items, emptyMessage }: BarChartProps) {
  if (items.length === 0) {
    return <p className="text-[13px] text-[var(--color-ink-2)]">{emptyMessage}</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-[12.5px] font-semibold text-[var(--color-ink-2)]">
            {item.label}
          </span>
          <span className="flex h-6 flex-1 items-center rounded-[var(--r-sm)] bg-[var(--color-blue-50)]">
            <span
              data-bar-fill
              className="h-6 rounded-[var(--r-sm)] bg-[var(--color-primary)]"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </span>
          <span className="w-10 shrink-0 text-right text-[12.5px] font-bold text-[var(--color-ink)]">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

`src/components/admin/LineChart.tsx`:
```tsx
export type LineChartPoint = {
  date: string;
  count: number;
};

type LineChartProps = {
  points: LineChartPoint[];
  emptyMessage: string;
};

const CHART_WIDTH = 560;
const CHART_HEIGHT = 160;
const CHART_PADDING = 16;

export function LineChart({ points, emptyMessage }: LineChartProps) {
  if (points.length === 0) {
    return <p className="text-[13px] text-[var(--color-ink-2)]">{emptyMessage}</p>;
  }

  const max = Math.max(...points.map((point) => point.count), 1);
  const stepX = points.length > 1 ? (CHART_WIDTH - CHART_PADDING * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: CHART_PADDING + index * stepX,
    y: CHART_HEIGHT - CHART_PADDING - (point.count / max) * (CHART_HEIGHT - CHART_PADDING * 2),
  }));

  const polylinePoints = coords.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <svg
      role="img"
      aria-label="일별 방문 추이"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="h-40 w-full"
    >
      <polyline points={polylinePoints} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      {coords.map((coord, index) => (
        <circle key={points[index].date} cx={coord.x} cy={coord.y} r={3} fill="var(--color-primary)" />
      ))}
    </svg>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/admin/__tests__/BarChart.test.tsx src/components/admin/__tests__/LineChart.test.tsx`
Expected: PASS (전부)

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/BarChart.tsx src/components/admin/LineChart.tsx src/components/admin/__tests__/BarChart.test.tsx src/components/admin/__tests__/LineChart.test.tsx
git commit -m "feat(S6): 막대·라인 차트 프리미티브 (신규 패키지 없이 SVG)"
```

---

### Task 5: 통계 대시보드 페이지

**Files:**
- Create: `src/app/admin/(protected)/stats/page.tsx`
- Create: `src/app/admin/(protected)/stats/StatsDashboard.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx` (네비에 "통계" 링크 추가)
- Modify: `src/app/admin/(protected)/__tests__/adminShell.test.tsx` (네비 링크 검증 추가)
- Test: `src/app/admin/(protected)/stats/__tests__/StatsDashboard.test.tsx`

**Interfaces:**
- Consumes: `getStatsSummary()`(`@/lib/stats/getStatsSummary`, Task 2), `BarChart`/`LineChart`(`@/components/admin/{BarChart,LineChart}`, Task 4), `DELETE /api/admin/stats`(Task 3), `StatsSummary` 타입(`@/lib/stats/types`, Task 1)
- Produces: `/admin/stats` 페이지.

**현재 `src/app/admin/(protected)/layout.tsx` 전체 내용(S5 완료 시점):**
```tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
        <div className="flex items-center gap-5">
          <span className="text-[15px] font-extrabold text-[var(--color-ink)]">고방 관리자</span>
          <nav className="flex items-center gap-3">
            <Link
              href="/admin/links"
              className="focus-glow rounded-[var(--r-sm)] px-2 py-1 text-[13.5px] font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-primary)]"
            >
              링크 관리
            </Link>
            <Link
              href="/admin/settings"
              className="focus-glow rounded-[var(--r-sm)] px-2 py-1 text-[13.5px] font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-primary)]"
            >
              사이트 설정
            </Link>
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="p-5">{children}</main>
    </div>
  );
}
```

**현재 `src/app/admin/(protected)/__tests__/adminShell.test.tsx`의 `AdminLayout` 테스트 블록:**
```tsx
describe("AdminLayout", () => {
  it("브랜드명·네비 링크 2개·로그아웃 버튼·children을 렌더한다", async () => {
    const AdminLayout = (await import("../layout")).default;
    render(
      <AdminLayout>
        <p>본문 콘텐츠</p>
      </AdminLayout>,
    );
    expect(screen.getByText("고방 관리자")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "링크 관리" })).toHaveAttribute(
      "href",
      "/admin/links",
    );
    expect(screen.getByRole("link", { name: "사이트 설정" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    expect(screen.getByText("본문 콘텐츠")).toBeInTheDocument();
  });
});
```

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/admin/(protected)/stats/__tests__/StatsDashboard.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { StatsSummary } from "@/lib/stats/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const summaryWithData: StatsSummary = {
  totalPageviews: 42,
  totalClicks: 17,
  clicksByLink: [{ linkId: "home", title: "홈", count: 10 }],
  dailyTrend7: [
    { date: "2026-07-04", count: 1 },
    { date: "2026-07-05", count: 2 },
    { date: "2026-07-06", count: 3 },
    { date: "2026-07-07", count: 4 },
    { date: "2026-07-08", count: 5 },
    { date: "2026-07-09", count: 6 },
    { date: "2026-07-10", count: 7 },
  ],
  dailyTrend30: Array.from({ length: 30 }, (_, i) => ({ date: `2026-06-${i + 1}`, count: i })),
  topReferrers: [{ source: "instagram.com", count: 20 }],
};

const emptySummary: StatsSummary = {
  totalPageviews: 0,
  totalClicks: 0,
  clicksByLink: [],
  dailyTrend7: [],
  dailyTrend30: [],
  topReferrers: [],
};

describe("StatsDashboard", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("KPI·차트를 렌더한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("instagram.com")).toBeInTheDocument();
  });

  it("데이터가 전혀 없으면 empty state를 보여준다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={emptySummary} />);
    expect(screen.getByText(/아직 쌓인 통계가 없습니다/)).toBeInTheDocument();
  });

  it("7일/30일 토글 버튼으로 추이 데이터를 전환한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    const svgBefore = document.querySelectorAll("circle");
    expect(svgBefore).toHaveLength(7);

    fireEvent.click(screen.getByRole("button", { name: "30일" }));
    const svgAfter = document.querySelectorAll("circle");
    expect(svgAfter).toHaveLength(30);
  });

  it("초기화 버튼 클릭 시 확인 후 DELETE를 호출하고 router.refresh()를 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    fireEvent.click(screen.getByRole("button", { name: "통계 초기화" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/stats", { method: "DELETE" });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("확인 다이얼로그를 취소하면 DELETE를 호출하지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    fireEvent.click(screen.getByRole("button", { name: "통계 초기화" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("초기화 요청이 네트워크 오류로 실패하면 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    fireEvent.click(screen.getByRole("button", { name: "통계 초기화" }));

    await waitFor(() => {
      expect(
        screen.getByText("통계 초기화 요청에 실패했습니다. 네트워크 상태를 확인해주세요."),
      ).toBeInTheDocument();
    });
  });
});
```

`src/app/admin/(protected)/__tests__/adminShell.test.tsx`의 `AdminLayout` 블록을 아래로 교체:
```tsx
describe("AdminLayout", () => {
  it("브랜드명·네비 링크 3개·로그아웃 버튼·children을 렌더한다", async () => {
    const AdminLayout = (await import("../layout")).default;
    render(
      <AdminLayout>
        <p>본문 콘텐츠</p>
      </AdminLayout>,
    );
    expect(screen.getByText("고방 관리자")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "링크 관리" })).toHaveAttribute(
      "href",
      "/admin/links",
    );
    expect(screen.getByRole("link", { name: "사이트 설정" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
    expect(screen.getByRole("link", { name: "통계" })).toHaveAttribute("href", "/admin/stats");
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    expect(screen.getByText("본문 콘텐츠")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run "src/app/admin/(protected)/stats/__tests__/StatsDashboard.test.tsx" "src/app/admin/(protected)/__tests__/adminShell.test.tsx"`
Expected: FAIL — `Cannot find module '../StatsDashboard'`, adminShell 쪽은 "통계" 링크를 못 찾아 실패

- [ ] **Step 3: 최소 구현 작성**

`src/app/admin/(protected)/stats/page.tsx`:
```tsx
import { getStatsSummary } from "@/lib/stats/getStatsSummary";
import { StatsDashboard } from "./StatsDashboard";

export default async function AdminStatsPage() {
  try {
    const summary = await getStatsSummary();
    return <StatsDashboard summary={summary} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return (
      <p className="text-[14px] text-[var(--color-danger)]">통계를 불러오지 못했습니다: {message}</p>
    );
  }
}
```

`src/app/admin/(protected)/stats/StatsDashboard.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart } from "@/components/admin/BarChart";
import { LineChart } from "@/components/admin/LineChart";
import type { StatsSummary } from "@/lib/stats/types";

type StatsDashboardProps = {
  summary: StatsSummary;
};

export function StatsDashboard({ summary }: StatsDashboardProps) {
  const router = useRouter();
  const [trendRange, setTrendRange] = useState<7 | 30>(7);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const isEmpty = summary.totalPageviews === 0 && summary.totalClicks === 0;
  const trendPoints = trendRange === 7 ? summary.dailyTrend7 : summary.dailyTrend30;

  async function handleReset() {
    if (!window.confirm("모든 통계 데이터를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;

    setResetting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { method: "DELETE" });
      if (!res.ok) {
        setError("통계 초기화에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("통계 초기화 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-extrabold text-[var(--color-ink)]">통계</h1>
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={resetting}
          className="focus-glow rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-danger)] disabled:opacity-50"
        >
          {resetting ? "초기화 중..." : "통계 초기화"}
        </button>
      </div>

      {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}

      {isEmpty ? (
        <p className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-[13.5px] text-[var(--color-ink-2)]">
          아직 쌓인 통계가 없습니다. 공개 페이지에 방문이 생기면 여기에 표시됩니다.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
              <p className="text-[12.5px] font-semibold text-[var(--color-ink-2)]">총 방문수</p>
              <p className="text-[24px] font-extrabold text-[var(--color-ink)]">
                {summary.totalPageviews}
              </p>
            </div>
            <div className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
              <p className="text-[12.5px] font-semibold text-[var(--color-ink-2)]">총 클릭수</p>
              <p className="text-[24px] font-extrabold text-[var(--color-ink)]">
                {summary.totalClicks}
              </p>
            </div>
          </div>

          <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
            <h2 className="mb-3 text-[14px] font-bold text-[var(--color-ink)]">링크별 클릭수 순위</h2>
            <BarChart
              items={summary.clicksByLink.map((item) => ({ label: item.title, value: item.count }))}
              emptyMessage="아직 클릭 기록이 없습니다."
            />
          </section>

          <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-[var(--color-ink)]">방문 추이</h2>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTrendRange(7)}
                  className={`focus-glow rounded-[var(--r-sm)] px-2.5 py-1 text-[12.5px] font-semibold ${
                    trendRange === 7
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-ink-2)]"
                  }`}
                >
                  7일
                </button>
                <button
                  type="button"
                  onClick={() => setTrendRange(30)}
                  className={`focus-glow rounded-[var(--r-sm)] px-2.5 py-1 text-[12.5px] font-semibold ${
                    trendRange === 30
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-ink-2)]"
                  }`}
                >
                  30일
                </button>
              </div>
            </div>
            <LineChart points={trendPoints} emptyMessage="아직 방문 기록이 없습니다." />
          </section>

          <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
            <h2 className="mb-3 text-[14px] font-bold text-[var(--color-ink)]">유입출처 TOP</h2>
            <BarChart
              items={summary.topReferrers.map((item) => ({ label: item.source, value: item.count }))}
              emptyMessage="아직 유입 기록이 없습니다."
            />
          </section>
        </>
      )}
    </div>
  );
}
```

`src/app/admin/(protected)/layout.tsx` 전체 교체:
```tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
        <div className="flex items-center gap-5">
          <span className="text-[15px] font-extrabold text-[var(--color-ink)]">고방 관리자</span>
          <nav className="flex items-center gap-3">
            <Link
              href="/admin/links"
              className="focus-glow rounded-[var(--r-sm)] px-2 py-1 text-[13.5px] font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-primary)]"
            >
              링크 관리
            </Link>
            <Link
              href="/admin/settings"
              className="focus-glow rounded-[var(--r-sm)] px-2 py-1 text-[13.5px] font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-primary)]"
            >
              사이트 설정
            </Link>
            <Link
              href="/admin/stats"
              className="focus-glow rounded-[var(--r-sm)] px-2 py-1 text-[13.5px] font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-primary)]"
            >
              통계
            </Link>
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="p-5">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run "src/app/admin/(protected)/stats/__tests__/StatsDashboard.test.tsx" "src/app/admin/(protected)/__tests__/adminShell.test.tsx"`
Expected: PASS (전부)

- [ ] **Step 5: 전체 검증**

```bash
npx vitest run
npm run lint
npx next build
```
빌드 출력에 `/admin/stats`와 `/api/admin/stats`가 라우트로 등록되는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add "src/app/admin/(protected)/stats" "src/app/admin/(protected)/layout.tsx" "src/app/admin/(protected)/__tests__/adminShell.test.tsx"
git commit -m "feat(S6): 관리자 통계 대시보드 페이지"
```

---

## Task 완료 후 (전체)

- [ ] 라이브 검증(컨트롤러): `/admin/stats` 접속 → 공개 페이지에서 실제 pageview/click 몇 건 발생시킨 뒤 반영 확인 → "통계 초기화" 클릭 후 0으로 리셋되는지 확인 (Vercel 배포 전이면 로컬 dev 서버로, dev 서버가 안 뜨면 curl로 `/api/admin/stats` DELETE 호출 후 페이지 재조회로 대체)
- [ ] `docs/TODO.md`의 S6 체크박스를 `[x]`로 갱신
- [ ] `HANDOFF.md`·`.superpowers/sdd/progress.md` 갱신: S6 완료. **이 슬라이스로 S0~S7 전체 개발 슬라이스 완료** — 다음은 whole-branch 최종 리뷰 또는 실 배포(Vercel) 단계 안내 필요.
