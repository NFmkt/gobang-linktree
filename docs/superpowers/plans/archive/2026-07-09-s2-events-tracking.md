# S2 — 통계 축적(비콘) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Task 1은 사람(컨트롤러)이 Supabase 대시보드에서 직접 실행한다 — 서브에이전트에게 위임하지 않는다.**

**Goal:** 공개 링크페이지에서 pageview(방문)와 click(링크/제휴 클릭) 이벤트를 익명으로 Supabase `events` 테이블에 기록한다.

**Architecture:** 브라우저가 `navigator.sendBeacon`(폴백: keepalive fetch)으로 자체 Next.js Route Handler `POST /api/events`를 호출하고, 이 핸들러가 서버에서 Supabase에 insert한다. 브라우저가 Supabase REST에 직접 쓰지 않는 이유는 sendBeacon이 커스텀 헤더(apikey 등)를 못 보내기 때문이다. RLS로 `anon`은 insert만 가능하고 읽기는 차단(집계 조회는 S6에서 service_role로 수행).

**Tech Stack:** Next.js 16 App Router Route Handler, Supabase(Postgres+RLS), `navigator.sendBeacon`, Vitest.

## Global Constraints

- 이벤트 테이블명: `events` (스키마 `public`)
- 이벤트 타입 값은 정확히 `"pageview"` / `"click"` 두 가지 문자열만 허용 (그 외 400)
- API 엔드포인트 경로: 정확히 `/api/events`, `POST`만 지원
- **IP 원문(x-forwarded-for 등)은 어떤 컬럼에도 저장하지 않는다** — 코드에서 아예 읽지도 않는다
- click 이벤트는 `link_id` 필수 (없으면 400), pageview 이벤트는 `link_id` 없음
- 제휴 CTA(AffiliateButton) 클릭은 `link_id: "affiliate"`로 집계 (links 테이블에 없는 고정 문자열)
- Supabase 프로젝트: URL `https://emjgjfkacaterqwvveuo.supabase.co` (환경변수 `NEXT_PUBLIC_SUPABASE_URL`), 이미 `.env.local`에 설정됨
- 로컬 dev 포트: 3939 (`npm run dev`, `시작 3939.bat`)
- 테스트: `npx vitest run` · 린트: `npm run lint`(`eslint` 직접 실행) · 빌드: `npx next build`
- 기존 Supabase 클라이언트 팩토리 `createServerSupabaseClient()`(`src/lib/supabase/server.ts`)를 재사용한다 — 새 클라이언트 팩토리를 만들지 않는다
- 커밋 메시지는 `feat(S2): ...` 접두사를 쓴다 (프로젝트 관례, `git log --oneline` 참고)

---

### Task 1: `events` 테이블 마이그레이션 (컨트롤러가 직접 실행 — 서브에이전트 위임 금지)

**Files:**
- Create: `supabase/migrations/0002_events.sql`

**Interfaces:**
- Produces: `public.events` 테이블 — 컬럼 `id uuid`, `type text`, `link_id text`, `referrer text`, `utm_source text`, `utm_medium text`, `utm_campaign text`, `created_at timestamptz`. `anon` 롤에 INSERT만 허용.

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 0002_events.sql
-- 공개페이지 pageview/click 이벤트를 저장하는 익명 집계 테이블.
-- 개인식별정보(IP 원문 등)는 절대 저장하지 않는다.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('pageview', 'click')),
  link_id text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

-- RLS 활성화: 기본적으로 모든 접근을 차단하고 정책으로만 허용한다.
alter table public.events enable row level security;

-- 익명 방문자는 이벤트를 insert만 할 수 있다 (읽기는 S6에서 service_role로만 수행).
create policy "anon은 이벤트를 insert만 할 수 있음"
  on public.events
  for insert
  to anon
  with check (true);

-- RLS 정책과 별개로 anon 롤 자체에 INSERT 권한을 부여해야 한다
-- (0001_links.sql 적용 때 GRANT SELECT 누락으로 permission denied가 났던 것과 동일한 계층).
grant insert on public.events to anon;
```

- [ ] **Step 2: 대시보드에서 적용**

https://supabase.com/dashboard/project/emjgjfkacaterqwvveuo/sql/new 에 위 SQL을 붙여넣고 Run. "Success. No rows returned" 확인.

- [ ] **Step 3: 라이브 검증 (컨트롤러가 curl로 anon insert 권한 확인)**

```bash
curl -s -X POST "https://emjgjfkacaterqwvveuo.supabase.co/rest/v1/events" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"pageview","referrer":"https://plan-verify.test"}'
```
Expected: 빈 응답(201) — `permission denied` 아니어야 함. 확인 후 SQL Editor에서 `delete from public.events where referrer = 'https://plan-verify.test';`로 검증용 행 정리.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/0002_events.sql
git commit -m "feat(S2): events 테이블 마이그레이션 (익명 insert-only RLS)"
```

---

### Task 2: 이벤트 페이로드 타입 + sendEventBeacon 유틸

**Files:**
- Create: `src/lib/events/types.ts`
- Create: `src/lib/events/sendBeacon.ts`
- Test: `src/lib/events/__tests__/sendBeacon.test.ts`

**Interfaces:**
- Produces: `EventPayload` 타입(판별 유니온), `sendEventBeacon(payload: EventPayload): void` — 이후 Task 4·5가 이 함수를 import해서 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/events/__tests__/sendBeacon.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { sendEventBeacon } from "../sendBeacon";

describe("sendEventBeacon", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("navigator.sendBeacon이 있으면 이를 사용해 /api/events로 전송한다", () => {
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { sendBeacon: sendBeaconMock });

    sendEventBeacon({ type: "click", link_id: "youth" });

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeaconMock.mock.calls[0];
    expect(url).toBe("/api/events");
    expect(blob).toBeInstanceOf(Blob);
  });

  it("navigator.sendBeacon이 없으면 keepalive fetch로 폴백한다", () => {
    vi.stubGlobal("navigator", {});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    sendEventBeacon({ type: "pageview", referrer: "https://ref.test" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/events");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
    expect(JSON.parse(init.body as string)).toEqual({
      type: "pageview",
      referrer: "https://ref.test",
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/events/__tests__/sendBeacon.test.ts`
Expected: FAIL — `Cannot find module '../sendBeacon'` (파일이 아직 없음)

- [ ] **Step 3: 최소 구현 작성**

`src/lib/events/types.ts`:
```ts
/**
 * /api/events로 전송되는 이벤트 페이로드.
 * type이 "click"이면 link_id가 필수, "pageview"면 referrer가 필수이고 utm은 선택.
 */
export type EventPayload =
  | {
      type: "pageview";
      referrer: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    }
  | {
      type: "click";
      link_id: string;
    };
```

`src/lib/events/sendBeacon.ts`:
```ts
import type { EventPayload } from "./types";

const EVENTS_ENDPOINT = "/api/events";

/**
 * 이벤트를 백그라운드로 전송한다. navigator.sendBeacon을 우선 쓰고,
 * 지원하지 않는 환경에서는 keepalive fetch로 폴백한다.
 * 전송 실패는 사용자 흐름(내비게이션)을 막지 않도록 조용히 무시한다.
 */
export function sendEventBeacon(payload: EventPayload): void {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(EVENTS_ENDPOINT, blob);
    return;
  }

  if (typeof fetch === "function") {
    fetch(EVENTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // 집계 실패는 무시 — 사용자 내비게이션을 막지 않는다.
    });
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/events/__tests__/sendBeacon.test.ts`
Expected: PASS (2/2)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/events/types.ts src/lib/events/sendBeacon.ts src/lib/events/__tests__/sendBeacon.test.ts
git commit -m "feat(S2): 이벤트 페이로드 타입 + sendEventBeacon 유틸"
```

---

### Task 3: `POST /api/events` 라우트 핸들러

**Files:**
- Create: `src/app/api/events/route.ts`
- Test: `src/app/api/events/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` from `@/lib/supabase/server` (기존 함수, `Promise<SupabaseClient>` 반환, `.from("events").insert(obj)`는 `Promise<{ error: { message: string } | null }>`를 반환)
- Produces: `POST(request: Request): Promise<Response>` — Next.js App Router Route Handler 규약.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/api/events/__tests__/route.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/events", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/events", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("type이 없으면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("type이 pageview/click이 아니면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ type: "bogus" }));
    expect(res.status).toBe(400);
  });

  it("click인데 link_id가 없으면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ type: "click" }));
    expect(res.status).toBe(400);
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("정상 pageview 요청은 204를 반환하고 supabase에 올바른 필드로 insert한다", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        type: "pageview",
        referrer: "https://ref.test",
        utm_source: "kakao",
      }),
    );

    expect(res.status).toBe(204);
    expect(from).toHaveBeenCalledWith("events");
    expect(insert).toHaveBeenCalledWith({
      type: "pageview",
      link_id: null,
      referrer: "https://ref.test",
      utm_source: "kakao",
      utm_medium: null,
      utm_campaign: null,
    });
  });

  it("정상 click 요청은 204를 반환하고 link_id를 insert한다", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ type: "click", link_id: "youth" }));

    expect(res.status).toBe(204);
    expect(insert).toHaveBeenCalledWith({
      type: "click",
      link_id: "youth",
      referrer: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
    });
  });

  it("supabase insert가 에러를 반환하면 500을 반환한다", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: "db down" } });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ type: "click", link_id: "youth" }));

    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/app/api/events/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: 최소 구현 작성**

`src/app/api/events/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type EventRequestBody = {
  type?: string;
  link_id?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

const VALID_TYPES = new Set(["pageview", "click"]);

export async function POST(request: Request) {
  let body: EventRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.type || !VALID_TYPES.has(body.type)) {
    return NextResponse.json(
      { error: "type must be 'pageview' or 'click'" },
      { status: 400 },
    );
  }
  if (body.type === "click" && !body.link_id) {
    return NextResponse.json(
      { error: "link_id is required for click events" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("events").insert({
    type: body.type,
    link_id: body.link_id ?? null,
    referrer: body.referrer ?? null,
    utm_source: body.utm_source ?? null,
    utm_medium: body.utm_medium ?? null,
    utm_campaign: body.utm_campaign ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/app/api/events/__tests__/route.test.ts`
Expected: PASS (7/7)

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/events/route.ts src/app/api/events/__tests__/route.test.ts
git commit -m "feat(S2): POST /api/events 라우트 핸들러"
```

---

### Task 4: PageviewBeacon 컴포넌트 + page.tsx 연동

**Files:**
- Create: `src/components/public/PageviewBeacon.tsx`
- Test: `src/components/public/__tests__/PageviewBeacon.test.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `sendEventBeacon` from `@/lib/events/sendBeacon` (Task 2)
- Produces: `PageviewBeacon` — 클라이언트 컴포넌트, 마운트 시 1회 pageview 비콘 전송, 화면에는 아무것도 렌더하지 않음(`null` 반환).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/public/__tests__/PageviewBeacon.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { PageviewBeacon } from "../PageviewBeacon";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

vi.mock("@/lib/events/sendBeacon", () => ({
  sendEventBeacon: vi.fn(),
}));

describe("PageviewBeacon", () => {
  const originalReferrer = document.referrer;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "referrer", {
      value: "https://ref.test/",
      configurable: true,
    });
    window.history.pushState({}, "", "/?utm_source=kakao&utm_medium=chat");
  });

  afterEach(() => {
    Object.defineProperty(document, "referrer", {
      value: originalReferrer,
      configurable: true,
    });
    window.history.pushState({}, "", "/");
  });

  it("마운트 시 referrer와 utm 파라미터를 담아 pageview 이벤트를 1회 전송한다", () => {
    render(<PageviewBeacon />);

    expect(sendEventBeacon).toHaveBeenCalledTimes(1);
    expect(sendEventBeacon).toHaveBeenCalledWith({
      type: "pageview",
      referrer: "https://ref.test/",
      utm_source: "kakao",
      utm_medium: "chat",
      utm_campaign: undefined,
    });
  });

  it("아무 것도 화면에 렌더하지 않는다", () => {
    const { container } = render(<PageviewBeacon />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/public/__tests__/PageviewBeacon.test.tsx`
Expected: FAIL — `Cannot find module '../PageviewBeacon'`

- [ ] **Step 3: 최소 구현 작성**

`src/components/public/PageviewBeacon.tsx`:
```tsx
"use client";

import { useEffect } from "react";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

/**
 * 마운트 시 1회 pageview 이벤트를 기록한다. 화면에는 아무것도 렌더하지 않는다.
 */
export function PageviewBeacon() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    sendEventBeacon({
      type: "pageview",
      referrer: document.referrer,
      utm_source: params.get("utm_source") ?? undefined,
      utm_medium: params.get("utm_medium") ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/public/__tests__/PageviewBeacon.test.tsx`
Expected: PASS (2/2)

- [ ] **Step 5: page.tsx에 연동**

`src/app/page.tsx` 전체 (변경분은 import 추가 + `<PageviewBeacon />` 렌더):
```tsx
import { getLinks } from "@/lib/links/getLinks";
import { SITE_CONFIG } from "@/lib/site/config";
import { ProfileHeader } from "@/components/public/ProfileHeader";
import { SocialRow } from "@/components/public/SocialRow";
import { LinkButton } from "@/components/public/LinkButton";
import { AffiliateButton } from "@/components/public/AffiliateButton";
import { Footer } from "@/components/public/Footer";
import { PageviewBeacon } from "@/components/public/PageviewBeacon";

const LINK_STAGGER_MS = 45;
/** 히어로(0) 이후 소셜 로우가 시작하는 지연 baseline. */
const SOCIAL_DELAY_MS = 80;
const LINKS_BASE_DELAY_MS = 140;

export default async function Home() {
  const links = await getLinks();

  return (
    <main className="flex flex-1 flex-col items-center">
      <PageviewBeacon />
      <ProfileHeader config={SITE_CONFIG} />

      <div className="flex w-full max-w-[480px] flex-1 flex-col gap-4 px-5 pb-2 pt-6">
        <div className="reveal" style={{ animationDelay: `${SOCIAL_DELAY_MS}ms` }}>
          <SocialRow items={SITE_CONFIG.social} />
        </div>

        <section aria-label="링크 목록" className="flex flex-col gap-3">
          {links.map((link, index) => (
            <LinkButton
              key={link.id}
              link={link}
              delayMs={LINKS_BASE_DELAY_MS + index * LINK_STAGGER_MS}
            />
          ))}
        </section>

        <AffiliateButton
          email={SITE_CONFIG.affiliateEmail}
          label={SITE_CONFIG.affiliateLabel}
          delayMs={LINKS_BASE_DELAY_MS + links.length * LINK_STAGGER_MS}
        />

        <Footer brandName={SITE_CONFIG.brandName} />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: 전체 테스트 스위트 재확인 (회귀 없는지)**

Run: `npx vitest run`
Expected: PASS (전체, 기존 테스트 포함 회귀 없음)

- [ ] **Step 7: 커밋**

```bash
git add src/components/public/PageviewBeacon.tsx src/components/public/__tests__/PageviewBeacon.test.tsx src/app/page.tsx
git commit -m "feat(S2): PageviewBeacon 컴포넌트 + page.tsx 연동"
```

---

### Task 5: LinkButton·AffiliateButton 클릭 비콘 연동

**Files:**
- Modify: `src/components/public/LinkButton.tsx`
- Modify: `src/components/public/AffiliateButton.tsx`
- Modify: `src/components/public/__tests__/LinkButton.test.tsx`
- Modify: `src/components/public/__tests__/AffiliateButton.test.tsx`

**Interfaces:**
- Consumes: `sendEventBeacon` from `@/lib/events/sendBeacon` (Task 2)

**Context — 현재 파일 전체 내용 (그대로 두고 onClick만 추가):**

`src/components/public/LinkButton.tsx` (현재):
```tsx
import type { Link } from "@/lib/links/types";
import { LinkIcon } from "@/components/icons/LinkIcon";

type LinkButtonProps = {
  link: Link;
  /** 진입 stagger용 지연(ms). 미지정 시 애니메이션 없음. */
  delayMs?: number;
};

/**
 * 링크 목록의 개별 항목 — 흰 소프트 카드.
 *
 * 좌측 블루틴트 아이콘 칩 + title(800) + optional subtitle + 우측 셰브론.
 * 1.5px 소프트 보더 + 부드러운 그림자. hover 시 보더가 블루로 바뀌며
 * 글로우 링이 번지고 셰브론이 오른쪽으로 이동한다. active 시 살짝 축소.
 * focus-visible 시 동일한 블루 글로우 링을 노출한다.
 */
export function LinkButton({ link, delayMs }: LinkButtonProps) {
  const animated = delayMs !== undefined;
  return (
    <a
      href={link.url}
      className={`focus-glow group flex min-h-[68px] w-full items-center gap-3.5 rounded-[var(--r)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3.5 text-[var(--color-ink)] shadow-[var(--sh-sm)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[0_0_0_4px_var(--color-blue-ring)] active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:border-[var(--color-primary)]${animated ? " reveal" : ""}`}
      style={animated ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-blue-50)]">
        <LinkIcon iconKey={link.icon} className="h-[22px] w-[22px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="truncate text-[16px] font-extrabold leading-tight tracking-[-0.01em]">
          {link.title}
        </span>
        {link.subtitle ? (
          <span className="mt-0.5 truncate text-[13.5px] leading-tight text-[var(--color-ink-2)]">
            {link.subtitle}
          </span>
        ) : null}
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-5 w-5 shrink-0 text-[var(--color-muted)] transition-[transform,color] duration-200 ease-out group-hover:translate-x-1 group-hover:text-[var(--color-primary)] motion-reduce:transition-none"
        fill="currentColor"
      >
        <path d="M7.4 4.4a1.15 1.15 0 0 1 1.63 0l4.57 4.57a1.15 1.15 0 0 1 0 1.63L9.03 15.2a1.15 1.15 0 1 1-1.63-1.63L11.34 10 7.4 6.03a1.15 1.15 0 0 1 0-1.63Z" />
      </svg>
    </a>
  );
}
```

`src/components/public/AffiliateButton.tsx` (현재):
```tsx
type AffiliateButtonProps = {
  email: string;
  label: string;
  /** 진입 stagger용 지연(ms). 미지정 시 애니메이션 없음. */
  delayMs?: number;
};

/**
 * 제휴·협력 문의 CTA — 아웃라인 스타일.
 *
 * 흰 링크 카드들 사이에서 배경 없이 블루 테두리 + 블루 텍스트로 조용하게
 * 구분되는 유일한 강조 지점. hover 시 연한 블루(blue-50)로 채워지고,
 * focus-visible 시 블루 글로우 링을 노출한다.
 */
export function AffiliateButton({ email, label, delayMs }: AffiliateButtonProps) {
  const animated = delayMs !== undefined;
  return (
    <a
      href={`mailto:${email}`}
      className={`focus-glow flex min-h-[54px] w-full items-center justify-center rounded-[var(--r)] border-[1.5px] border-[var(--color-primary)] bg-transparent px-4 py-3 text-[15.5px] font-bold text-[var(--color-primary)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-[var(--color-blue-50)] active:scale-[0.99] motion-reduce:transition-none${animated ? " reveal" : ""}`}
      style={animated ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {label}
    </a>
  );
}
```

- [ ] **Step 1: 실패하는 테스트 작성 (기존 테스트 파일에 추가)**

`src/components/public/__tests__/LinkButton.test.tsx` 상단 import 뒤에 mock 추가:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LinkButton } from "../LinkButton";
import type { Link } from "@/lib/links/types";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

vi.mock("@/lib/events/sendBeacon", () => ({
  sendEventBeacon: vi.fn(),
}));
```
(`vi`, `fireEvent`, `sendEventBeacon` import와 `vi.mock` 블록이 기존 최상단 import를 대체한다.)

`describe("LinkButton", ...)` 블록 안, 기존 마지막 `it`("delayMs가 주어지면...") 다음에 추가:
```tsx
  it("클릭 시 link.id로 클릭 이벤트 비콘을 전송한다", () => {
    vi.mocked(sendEventBeacon).mockClear();
    render(<LinkButton link={link} />);
    const anchor = screen.getByRole("link", { name: new RegExp(link.title) });
    fireEvent.click(anchor);
    expect(sendEventBeacon).toHaveBeenCalledWith({ type: "click", link_id: link.id });
  });
```

`src/components/public/__tests__/AffiliateButton.test.tsx` 상단 import 뒤에 mock 추가:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AffiliateButton } from "../AffiliateButton";
import { SITE_CONFIG } from "@/lib/site/config";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

vi.mock("@/lib/events/sendBeacon", () => ({
  sendEventBeacon: vi.fn(),
}));
```

`describe("AffiliateButton", ...)` 블록 안, 마지막 `it`("아웃라인 스타일...") 다음에 추가:
```tsx
  it("클릭 시 link_id='affiliate'로 클릭 이벤트 비콘을 전송한다", () => {
    vi.mocked(sendEventBeacon).mockClear();
    render(
      <AffiliateButton
        email={SITE_CONFIG.affiliateEmail}
        label={SITE_CONFIG.affiliateLabel}
      />,
    );
    const link = screen.getByRole("link", { name: SITE_CONFIG.affiliateLabel });
    fireEvent.click(link);
    expect(sendEventBeacon).toHaveBeenCalledWith({ type: "click", link_id: "affiliate" });
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/public/__tests__/LinkButton.test.tsx src/components/public/__tests__/AffiliateButton.test.tsx`
Expected: FAIL — 새 `it` 2개가 `sendEventBeacon`이 호출되지 않아 실패 (컴포넌트에 아직 onClick 없음)

- [ ] **Step 3: 최소 구현 — onClick 추가 + Client Component 전환**

`src/components/public/LinkButton.tsx` 수정 — 파일 최상단에 `"use client";` 추가, import에 `sendEventBeacon` 추가, `<a>`에 `onClick` 추가:
```tsx
"use client";

import type { Link } from "@/lib/links/types";
import { LinkIcon } from "@/components/icons/LinkIcon";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

type LinkButtonProps = {
  link: Link;
  /** 진입 stagger용 지연(ms). 미지정 시 애니메이션 없음. */
  delayMs?: number;
};

/**
 * 링크 목록의 개별 항목 — 흰 소프트 카드.
 *
 * 좌측 블루틴트 아이콘 칩 + title(800) + optional subtitle + 우측 셰브론.
 * 1.5px 소프트 보더 + 부드러운 그림자. hover 시 보더가 블루로 바뀌며
 * 글로우 링이 번지고 셰브론이 오른쪽으로 이동한다. active 시 살짝 축소.
 * focus-visible 시 동일한 블루 글로우 링을 노출한다.
 */
export function LinkButton({ link, delayMs }: LinkButtonProps) {
  const animated = delayMs !== undefined;
  return (
    <a
      href={link.url}
      onClick={() => sendEventBeacon({ type: "click", link_id: link.id })}
      className={`focus-glow group flex min-h-[68px] w-full items-center gap-3.5 rounded-[var(--r)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3.5 text-[var(--color-ink)] shadow-[var(--sh-sm)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[0_0_0_4px_var(--color-blue-ring)] active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:border-[var(--color-primary)]${animated ? " reveal" : ""}`}
      style={animated ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-blue-50)]">
        <LinkIcon iconKey={link.icon} className="h-[22px] w-[22px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="truncate text-[16px] font-extrabold leading-tight tracking-[-0.01em]">
          {link.title}
        </span>
        {link.subtitle ? (
          <span className="mt-0.5 truncate text-[13.5px] leading-tight text-[var(--color-ink-2)]">
            {link.subtitle}
          </span>
        ) : null}
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-5 w-5 shrink-0 text-[var(--color-muted)] transition-[transform,color] duration-200 ease-out group-hover:translate-x-1 group-hover:text-[var(--color-primary)] motion-reduce:transition-none"
        fill="currentColor"
      >
        <path d="M7.4 4.4a1.15 1.15 0 0 1 1.63 0l4.57 4.57a1.15 1.15 0 0 1 0 1.63L9.03 15.2a1.15 1.15 0 1 1-1.63-1.63L11.34 10 7.4 6.03a1.15 1.15 0 0 1 0-1.63Z" />
      </svg>
    </a>
  );
}
```

`src/components/public/AffiliateButton.tsx` 수정 — `"use client";` 추가, `onClick` 추가:
```tsx
"use client";

import { sendEventBeacon } from "@/lib/events/sendBeacon";

type AffiliateButtonProps = {
  email: string;
  label: string;
  /** 진입 stagger용 지연(ms). 미지정 시 애니메이션 없음. */
  delayMs?: number;
};

/**
 * 제휴·협력 문의 CTA — 아웃라인 스타일.
 *
 * 흰 링크 카드들 사이에서 배경 없이 블루 테두리 + 블루 텍스트로 조용하게
 * 구분되는 유일한 강조 지점. hover 시 연한 블루(blue-50)로 채워지고,
 * focus-visible 시 블루 글로우 링을 노출한다.
 */
export function AffiliateButton({ email, label, delayMs }: AffiliateButtonProps) {
  const animated = delayMs !== undefined;
  return (
    <a
      href={`mailto:${email}`}
      onClick={() => sendEventBeacon({ type: "click", link_id: "affiliate" })}
      className={`focus-glow flex min-h-[54px] w-full items-center justify-center rounded-[var(--r)] border-[1.5px] border-[var(--color-primary)] bg-transparent px-4 py-3 text-[15.5px] font-bold text-[var(--color-primary)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-[var(--color-blue-50)] active:scale-[0.99] motion-reduce:transition-none${animated ? " reveal" : ""}`}
      style={animated ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {label}
    </a>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/public/__tests__/LinkButton.test.tsx src/components/public/__tests__/AffiliateButton.test.tsx`
Expected: PASS (전부)

- [ ] **Step 5: 전체 검증 (테스트/린트/빌드)**

```bash
npx vitest run
npm run lint
npx next build
```
Expected: 전부 clean/성공. `next build` 출력에서 `/` 라우트가 여전히 정상 동작하는지 확인(Client Component 전환이 Server Component인 page.tsx의 렌더를 깨지 않는지).

- [ ] **Step 6: 커밋**

```bash
git add src/components/public/LinkButton.tsx src/components/public/AffiliateButton.tsx src/components/public/__tests__/LinkButton.test.tsx src/components/public/__tests__/AffiliateButton.test.tsx
git commit -m "feat(S2): LinkButton·AffiliateButton 클릭 이벤트 비콘 연동"
```

---

## Task 완료 후 (전체)

- [ ] `docs/TODO.md`의 S2 체크박스를 `[x]`로 갱신하고, 실제 구현 방식(Route Handler + sendBeacon)을 한 줄로 보강
- [ ] `HANDOFF.md` 갱신: S2 완료, S3(관리자 인증)부터 재개 지점 명시
