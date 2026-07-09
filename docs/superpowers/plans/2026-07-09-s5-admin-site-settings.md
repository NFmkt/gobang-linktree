# S5 — 관리자 사이트 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Task 1은 사람(컨트롤러)이 Supabase 대시보드에서 직접 실행한다 — 서브에이전트에게 위임하지 않는다.**

**Goal:** `/admin/settings`에서 브랜드명·bio·소셜 URL 5종·제휴 문의 이메일/라벨을 편집하면 공개 페이지(헤더·소셜·제휴 버튼·OG/메타 태그)에 즉시 반영된다.

**Architecture:** 지금은 `src/lib/site/config.ts`의 정적 `SITE_CONFIG` 상수를 페이지들이 직접 import해서 쓴다. 이를 S1의 `getLinks()`와 동일한 패턴으로 바꾼다: `getSiteConfig()`라는 비동기 함수를 새로 만들어, `NEXT_PUBLIC_SUPABASE_URL`이 있으면 `site_settings` 테이블(싱글턴 1행)에서 조회하고 없으면 정적 `SITE_CONFIG`로 폴백한다. `SITE_CONFIG`는 그대로 남겨 폴백 값이자 기존 테스트들의 기준값으로 계속 쓰인다. 관리자 쓰기는 S4와 동일하게 `createServiceSupabaseClient()`(service_role) + 기존 `src/proxy.ts` 보호를 그대로 재사용한다.

**Tech Stack:** Next.js 16 Route Handlers + `generateMetadata`(비동기), Supabase(jsonb 컬럼으로 소셜 배열 저장), React Client Component.

## Global Constraints

- `site_settings` 테이블은 **싱글턴**(행 1개, `id='default'` 고정) — 여러 행을 만들 수 있는 CRUD가 아니다. INSERT/DELETE API를 만들지 않는다.
- 소셜 항목의 `key`(아이콘 매핑용)와 `label`(접근성 라벨)은 **편집 불가·고정** — 오직 `url`만 관리자가 바꿀 수 있다(S4에서 이미 확정된 5개: home/blog/instagram/youtube/kakao).
- **URL 필드는 반드시 `isSafeLinkUrl()`(S4에서 만든 `src/lib/links/isSafeLinkUrl.ts`, http/https/mailto 화이트리스트)로 검증한다** — 재구현 금지, 그대로 import해서 쓴다. 이 검증 없이 저장하면 저장형 XSS(S4 최종 리뷰에서 지적된 것과 동일 클래스)가 재발한다.
- 이메일 필드는 간단한 정규식(`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)으로 형식만 검증한다 — 실제 발송 검증(SMTP 등)은 범위 밖.
- 관리 API는 `createServiceSupabaseClient()`(service_role)를 쓰고 `src/proxy.ts`가 이미 보호한다 — 이 태스크에서 인증 로직을 추가하지 않는다.
- `SITE_CONFIG`(정적 상수)는 삭제하지 않는다 — `getSiteConfig()`의 폴백 값이자 기존 테스트 다수의 기준값이다.
- `logoLabel` 필드는 DB에 저장하지 않는다(로고는 이제 `public/bi.png` 정적 이미지이고 어디에도 텍스트로 렌더되지 않는 죽은 필드 — `getSiteConfig()`는 이 필드만 정적 `SITE_CONFIG.logoLabel`에서 그대로 채운다).
- fetch 호출은 반드시 `try/catch/finally`로 감싼다(S3·S4에서 반복 확인된 프로젝트 확립 패턴).
- 테스트: `npx vitest run` · 린트: `npm run lint` · 빌드: `npx next build`
- 커밋 메시지 접두사: `feat(S5): ...`

---

### Task 1: `site_settings` 테이블 마이그레이션 (컨트롤러가 직접 실행)

**Files:**
- Create: `supabase/migrations/0003_site_settings.sql`

**Interfaces:**
- Produces: `public.site_settings` 테이블 — 컬럼 `id text pk`(항상 `'default'`), `brand_name text`, `bio text`, `social jsonb`(`{key,label,url}[]`), `affiliate_email text`, `affiliate_label text`, `updated_at timestamptz`. anon에 SELECT만 허용. 현재 `SITE_CONFIG` 값으로 시드.

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 0003_site_settings.sql
-- 사이트 전역 설정(싱글턴 1행). 브랜드명/bio/소셜 URL/제휴 문의 정보.

create table if not exists public.site_settings (
  id text primary key default 'default',
  brand_name text not null,
  bio text not null,
  social jsonb not null,
  affiliate_email text not null,
  affiliate_label text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create policy "공개 설정은 누구나 조회 가능"
  on public.site_settings
  for select
  to anon
  using (true);

grant select on public.site_settings to anon;

insert into public.site_settings (id, brand_name, bio, social, affiliate_email, affiliate_label)
values (
  'default',
  '고방',
  '청년주택 청년혜택 자취 꿀정보',
  '[
    {"key":"home","label":"공식 홈페이지","url":"https://gobang.kr/home?p=homeAdvertisingPopup"},
    {"key":"blog","label":"블로그","url":"https://blog.naver.com/neoflat1116"},
    {"key":"instagram","label":"인스타그램","url":"https://www.instagram.com/gobang.kr"},
    {"key":"youtube","label":"유튜브","url":"https://www.youtube.com/@youth_info"},
    {"key":"kakao","label":"카카오톡 오픈채팅","url":"https://open.kakao.com/o/gspAuZ5"}
  ]'::jsonb,
  'neoflatworks2@gmail.com',
  '제휴·협력 문의'
)
on conflict (id) do nothing;
```

- [ ] **Step 2: 대시보드에서 적용**

`https://supabase.com/dashboard/project/emjgjfkacaterqwvveuo/sql/new` 에 붙여넣고 Run.

- [ ] **Step 3: 라이브 검증 (컨트롤러가 curl로 anon select 권한 확인)**

```bash
curl -s "https://emjgjfkacaterqwvveuo.supabase.co/rest/v1/site_settings?select=brand_name,social" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
Expected: `[{"brand_name":"고방","social":[...5개...]}]` — permission denied 아니어야 함.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/0003_site_settings.sql
git commit -m "feat(S5): site_settings 테이블 마이그레이션 (싱글턴, anon select-only)"
```

---

### Task 2: `getSiteConfig()` 데이터 레이어

**Files:**
- Modify: `src/lib/site/config.ts` (타입 `SiteSettingsRow` 추가)
- Create: `src/lib/site/getSiteConfig.ts`
- Test: `src/lib/site/__tests__/getSiteConfig.test.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient()`(`@/lib/supabase/server`, 기존, anon key)
- Produces: `getSiteConfig(): Promise<SiteConfig>`, `SiteSettingsRow` 타입(DB row 그대로의 snake_case 모양, `id/brand_name/bio/social/affiliate_email/affiliate_label`) — Task 3(관리 API)·Task 4(관리 UI)·Task 5(공개 페이지 연동)가 이 함수/타입을 그대로 쓴다.

**현재 `src/lib/site/config.ts` 전체 내용:**
```ts
/**
 * 소셜/외부 링크 하나를 나타낸다.
 */
export type SocialItem = {
  /** 고유 키 (아이콘 매핑 등에 사용) */
  key: string;
  /** 화면/접근성 라벨 */
  label: string;
  /** 이동 대상 URL */
  url: string;
};

/**
 * 사이트 전역 기본 설정.
 */
export type SiteConfig = {
  /** 브랜드명 */
  brandName: string;
  /** 프로필 소개 문구 */
  bio: string;
  /** 로고 마크 텍스트 (실제 이미지 로고는 S7에서 교체) */
  logoLabel: string;
  /** 소셜/외부 링크 목록 */
  social: SocialItem[];
  /** 제휴·협력 문의 이메일 */
  affiliateEmail: string;
  /** 제휴·협력 문의 라벨 */
  affiliateLabel: string;
};

/**
 * 사이트 기본 설정값.
 *
 * 지금은 정적 상수이며, S5에서 관리자 편집 기능이 추가되면
 * 이 값이 DB 기반 설정으로 대체될 예정이다.
 */
export const SITE_CONFIG: SiteConfig = {
  brandName: "고방",
  bio: "청년주택 청년혜택 자취 꿀정보",
  logoLabel: "GYI",
  social: [
    {
      key: "home",
      label: "공식 홈페이지",
      url: "https://gobang.kr/home?p=homeAdvertisingPopup",
    },
    {
      key: "blog",
      label: "블로그",
      url: "https://blog.naver.com/neoflat1116",
    },
    {
      key: "instagram",
      label: "인스타그램",
      url: "https://www.instagram.com/gobang.kr",
    },
    {
      key: "youtube",
      label: "유튜브",
      url: "https://www.youtube.com/@youth_info",
    },
    {
      key: "kakao",
      label: "카카오톡 오픈채팅",
      url: "https://open.kakao.com/o/gspAuZ5",
    },
  ],
  affiliateEmail: "neoflatworks2@gmail.com",
  affiliateLabel: "제휴·협력 문의",
};
```

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/site/__tests__/getSiteConfig.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { SITE_CONFIG } from "../config";

const ORIGINAL_ENV = { ...process.env };

describe("getSiteConfig", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("NEXT_PUBLIC_SUPABASE_URL이 없으면 정적 SITE_CONFIG로 폴백한다", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();

    const { getSiteConfig } = await import("../getSiteConfig");
    const result = await getSiteConfig();

    expect(result).toEqual(SITE_CONFIG);
  });

  it("NEXT_PUBLIC_SUPABASE_URL이 있으면 site_settings에서 조회해 매핑한다", async () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" };

    const dbRow = {
      brand_name: "DB브랜드",
      bio: "DB바이오",
      social: [{ key: "home", label: "홈", url: "https://db.test" }],
      affiliate_email: "db@test.com",
      affiliate_label: "DB제휴",
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { getSiteConfig } = await import("../getSiteConfig");
    const result = await getSiteConfig();

    expect(result).toEqual({
      brandName: "DB브랜드",
      bio: "DB바이오",
      logoLabel: SITE_CONFIG.logoLabel,
      social: dbRow.social,
      affiliateEmail: "db@test.com",
      affiliateLabel: "DB제휴",
    });
    expect(from).toHaveBeenCalledWith("site_settings");
    expect(eq).toHaveBeenCalledWith("id", "default");
  });

  it("조회 결과가 없으면 정적 SITE_CONFIG로 폴백한다", async () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" };

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { getSiteConfig } = await import("../getSiteConfig");
    const result = await getSiteConfig();

    expect(result).toEqual(SITE_CONFIG);
  });

  it("조회 에러 시 예외를 던진다", async () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" };

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn().mockResolvedValue({ from }),
    }));
    vi.resetModules();

    const { getSiteConfig } = await import("../getSiteConfig");
    await expect(getSiteConfig()).rejects.toThrow(/db down/);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/site/__tests__/getSiteConfig.test.ts`
Expected: FAIL — `Cannot find module '../getSiteConfig'`

- [ ] **Step 3: 최소 구현 작성**

`src/lib/site/config.ts`에 `SiteSettingsRow` 타입 추가 (기존 내용 끝에 추가, 나머지는 그대로 유지):
```ts
/**
 * `site_settings` 테이블의 원본 행 모양(snake_case). getSiteConfig()가
 * 이 모양을 조회해 SiteConfig(camelCase)로 매핑한다.
 */
export type SiteSettingsRow = {
  id: string;
  brand_name: string;
  bio: string;
  social: SocialItem[];
  affiliate_email: string;
  affiliate_label: string;
};
```

`src/lib/site/getSiteConfig.ts`:
```ts
import { SITE_CONFIG, type SiteConfig } from "./config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * 사이트 전역 설정을 가져온다.
 *
 * NEXT_PUBLIC_SUPABASE_URL이 설정돼 있으면 site_settings 테이블에서 조회하고,
 * 없으면(로컬 키 미설정) 정적 SITE_CONFIG로 폴백한다(getLinks()와 동일 패턴).
 */
export async function getSiteConfig(): Promise<SiteConfig> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return SITE_CONFIG;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("brand_name, bio, social, affiliate_email, affiliate_label")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    throw new Error(`site_settings 조회 실패: ${error.message}`);
  }
  if (!data) {
    return SITE_CONFIG;
  }

  return {
    brandName: data.brand_name,
    bio: data.bio,
    logoLabel: SITE_CONFIG.logoLabel,
    social: data.social,
    affiliateEmail: data.affiliate_email,
    affiliateLabel: data.affiliate_label,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/site/__tests__/getSiteConfig.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/site/config.ts src/lib/site/getSiteConfig.ts src/lib/site/__tests__/getSiteConfig.test.ts
git commit -m "feat(S5): getSiteConfig() 데이터 레이어 (SITE_CONFIG 폴백 유지)"
```

---

### Task 3: 사이트 설정 관리 API

**Files:**
- Create: `src/app/api/admin/settings/route.ts`
- Test: `src/app/api/admin/settings/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `createServiceSupabaseClient()`(`@/lib/supabase/server`), `isSafeLinkUrl()`(`@/lib/links/isSafeLinkUrl`, S4에서 이미 존재)
- Produces: `GET /api/admin/settings` → `{settings: SiteSettingsRow}` | 404, `PATCH /api/admin/settings`(body: 부분 필드 `{brand_name?, bio?, social?, affiliate_email?, affiliate_label?}`) → `{settings: SiteSettingsRow}` | 400 | 404. Task 4(관리 UI)가 이 두 엔드포인트를 그대로 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/api/admin/settings/__tests__/route.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/settings", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("GET /api/admin/settings", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("현재 설정을 반환한다", async () => {
    const row = {
      id: "default",
      brand_name: "고방",
      bio: "bio",
      social: [],
      affiliate_email: "a@b.com",
      affiliate_label: "제휴",
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { GET } = await import("../route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings).toEqual(row);
  });

  it("설정 행이 없으면 404를 반환한다", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/settings", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("변경할 필드가 없으면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("이메일 형식이 올바르지 않으면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ affiliate_email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("social 항목에 javascript: URL이 있으면 400을 반환하고 update하지 않는다", async () => {
    const from = vi.fn();
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(
      makeRequest({ social: [{ key: "home", label: "홈", url: "javascript:alert(1)" }] }),
    );

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("정상 업데이트 시 200과 갱신된 설정을 반환한다", async () => {
    const updatedRow = {
      id: "default",
      brand_name: "새이름",
      bio: "bio",
      social: [],
      affiliate_email: "a@b.com",
      affiliate_label: "제휴",
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ brand_name: "새이름" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ brand_name: "새이름" });
    expect(eq).toHaveBeenCalledWith("id", "default");
    expect(body.settings).toEqual(updatedRow);
  });

  it("존재하지 않는 설정이면 404를 반환한다", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ brand_name: "새이름" }));
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/app/api/admin/settings/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: 최소 구현 작성**

`src/app/api/admin/settings/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { isSafeLinkUrl } from "@/lib/links/isSafeLinkUrl";

type SocialUpdateItem = {
  key: string;
  label: string;
  url: string;
};

type UpdateSettingsBody = {
  brand_name?: string;
  bio?: string;
  social?: SocialUpdateItem[];
  affiliate_email?: string;
  affiliate_label?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "설정을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ settings: data });
}

export async function PATCH(request: Request) {
  let body: UpdateSettingsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (body.affiliate_email !== undefined && !isValidEmail(body.affiliate_email)) {
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다" }, { status: 400 });
  }

  if (body.social !== undefined) {
    for (const item of body.social) {
      if (!isSafeLinkUrl(item.url)) {
        return NextResponse.json(
          { error: `허용되지 않는 URL 형식입니다: ${item.key}` },
          { status: 400 },
        );
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.brand_name !== undefined) updates.brand_name = body.brand_name;
  if (body.bio !== undefined) updates.bio = body.bio;
  if (body.social !== undefined) updates.social = body.social;
  if (body.affiliate_email !== undefined) updates.affiliate_email = body.affiliate_email;
  if (body.affiliate_label !== undefined) updates.affiliate_label = body.affiliate_label;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 필드가 없습니다" }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .update(updates)
    .eq("id", "default")
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "설정을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ settings: data });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/app/api/admin/settings/__tests__/route.test.ts`
Expected: PASS (8/8)

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/admin/settings/route.ts src/app/api/admin/settings/__tests__/route.test.ts
git commit -m "feat(S5): 사이트 설정 관리 API (GET/PATCH, URL·이메일 검증)"
```

---

### Task 4: 관리자 사이트 설정 페이지

**Files:**
- Create: `src/app/admin/(protected)/settings/page.tsx`
- Create: `src/app/admin/(protected)/settings/SettingsForm.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx` (네비에 "사이트 설정" 링크 추가)
- Modify: `src/app/admin/(protected)/__tests__/adminShell.test.tsx` (네비 링크 검증 추가)
- Test: `src/app/admin/(protected)/settings/__tests__/SettingsForm.test.tsx`

**Interfaces:**
- Consumes: `createServiceSupabaseClient()`, `SiteSettingsRow`/`SocialItem` 타입(`@/lib/site/config`, Task 2), `GET/PATCH /api/admin/settings`(Task 3)
- Produces: `/admin/settings` 페이지.

**현재 `src/app/admin/(protected)/layout.tsx` 전체 내용(S4 완료 시점):**
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
  it("브랜드명·네비 링크·로그아웃 버튼·children을 렌더한다", async () => {
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
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    expect(screen.getByText("본문 콘텐츠")).toBeInTheDocument();
  });
});
```

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/admin/(protected)/settings/__tests__/SettingsForm.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsForm } from "../SettingsForm";
import type { SiteSettingsRow } from "@/lib/site/config";

const initialSettings: SiteSettingsRow = {
  id: "default",
  brand_name: "고방",
  bio: "청년주택 청년혜택 자취 꿀정보",
  social: [
    { key: "home", label: "공식 홈페이지", url: "https://gobang.kr/home" },
    { key: "blog", label: "블로그", url: "https://blog.naver.com/neoflat1116" },
  ],
  affiliate_email: "neoflatworks2@gmail.com",
  affiliate_label: "제휴·협력 문의",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SettingsForm", () => {
  it("초기값을 필드에 채운다", () => {
    render(<SettingsForm initialSettings={initialSettings} />);
    expect(screen.getByDisplayValue("고방")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://gobang.kr/home")).toBeInTheDocument();
    expect(screen.getByDisplayValue("neoflatworks2@gmail.com")).toBeInTheDocument();
  });

  it("제출 시 PATCH /api/admin/settings를 변경된 값으로 호출하고 성공 메시지를 보여준다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ settings: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsForm initialSettings={initialSettings} />);
    fireEvent.change(screen.getByDisplayValue("고방"), { target: { value: "새이름" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(screen.getByText("저장했습니다.")).toBeInTheDocument();
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toMatchObject({ brand_name: "새이름" });
  });

  it("저장 실패(non-2xx) 시 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    render(<SettingsForm initialSettings={initialSettings} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(screen.getByText("저장에 실패했습니다.")).toBeInTheDocument();
    });
  });

  it("네트워크 오류 시 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<SettingsForm initialSettings={initialSettings} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(
        screen.getByText("저장 요청에 실패했습니다. 네트워크 상태를 확인해주세요."),
      ).toBeInTheDocument();
    });
  });
});
```

`src/app/admin/(protected)/__tests__/adminShell.test.tsx`의 `AdminLayout` 블록을 아래로 교체:
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

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run "src/app/admin/(protected)/settings/__tests__/SettingsForm.test.tsx" "src/app/admin/(protected)/__tests__/adminShell.test.tsx"`
Expected: FAIL — `Cannot find module '../SettingsForm'`, adminShell 쪽은 "사이트 설정" 링크를 못 찾아 실패

- [ ] **Step 3: 최소 구현 작성**

`src/app/admin/(protected)/settings/page.tsx`:
```tsx
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return (
      <p className="text-[14px] text-[var(--color-danger)]">
        설정을 불러오지 못했습니다{error ? `: ${error.message}` : ""}
      </p>
    );
  }

  return <SettingsForm initialSettings={data} />;
}
```

`src/app/admin/(protected)/settings/SettingsForm.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import type { SocialItem, SiteSettingsRow } from "@/lib/site/config";

type SettingsFormProps = {
  initialSettings: SiteSettingsRow;
};

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [brandName, setBrandName] = useState(initialSettings.brand_name);
  const [bio, setBio] = useState(initialSettings.bio);
  const [social, setSocial] = useState<SocialItem[]>(initialSettings.social);
  const [affiliateEmail, setAffiliateEmail] = useState(initialSettings.affiliate_email);
  const [affiliateLabel, setAffiliateLabel] = useState(initialSettings.affiliate_label);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateSocialUrl(key: string, url: string) {
    setSocial((prev) => prev.map((item) => (item.key === key ? { ...item, url } : item)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          bio,
          social,
          affiliate_email: affiliateEmail,
          affiliate_label: affiliateLabel,
        }),
      });

      if (!res.ok) {
        setError("저장에 실패했습니다.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("저장 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-[480px] flex-col gap-3 rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]"
    >
      <h1 className="text-[18px] font-extrabold text-[var(--color-ink)]">사이트 설정</h1>

      <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
        브랜드명
        <input
          value={brandName}
          onChange={(event) => setBrandName(event.target.value)}
          required
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
        소개(bio)
        <input
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          required
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      {social.map((item) => (
        <label
          key={item.key}
          className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]"
        >
          {item.label} URL
          <input
            value={item.url}
            onChange={(event) => updateSocialUrl(item.key, event.target.value)}
            required
            className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
          />
        </label>
      ))}

      <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
        제휴 문의 이메일
        <input
          type="email"
          value={affiliateEmail}
          onChange={(event) => setAffiliateEmail(event.target.value)}
          required
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
        제휴 문의 버튼 라벨
        <input
          value={affiliateLabel}
          onChange={(event) => setAffiliateLabel(event.target.value)}
          required
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      {error ? <p className="text-[12.5px] text-[var(--color-danger)]">{error}</p> : null}
      {success ? <p className="text-[12.5px] text-[var(--color-good)]">저장했습니다.</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="focus-glow flex h-10 items-center justify-center rounded-[var(--r-sm)] bg-[var(--color-primary)] text-[14px] font-bold text-[var(--color-on-primary)] disabled:opacity-50"
      >
        {submitting ? "저장 중..." : "저장"}
      </button>
    </form>
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

Run: `npx vitest run "src/app/admin/(protected)/settings/__tests__/SettingsForm.test.tsx" "src/app/admin/(protected)/__tests__/adminShell.test.tsx"`
Expected: PASS (전부)

- [ ] **Step 5: 전체 검증**

```bash
npx vitest run
npm run lint
npx next build
```
빌드 출력에 `/admin/settings`가 라우트로 등록되는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add "src/app/admin/(protected)/settings" "src/app/admin/(protected)/layout.tsx" "src/app/admin/(protected)/__tests__/adminShell.test.tsx"
git commit -m "feat(S5): 관리자 사이트 설정 페이지"
```

---

### Task 5: 공개 페이지·메타데이터를 getSiteConfig()로 연동

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/opengraph-image.tsx`
- Modify: `src/app/__tests__/layout.metadata.test.ts`

**Interfaces:**
- Consumes: `getSiteConfig()`(`@/lib/site/getSiteConfig`, Task 2)

**현재 `src/app/page.tsx` 전체 내용:**
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

**현재 `src/app/layout.tsx` 전체 내용:**
```tsx
import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/site/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3939",
  ),
  title: SITE_CONFIG.brandName,
  description: SITE_CONFIG.bio,
  openGraph: {
    title: SITE_CONFIG.brandName,
    description: SITE_CONFIG.bio,
    type: "website",
    locale: "ko_KR",
    images: [{ url: "/opengraph-image" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.brandName,
    description: SITE_CONFIG.bio,
    images: [{ url: "/opengraph-image" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
```

**현재 `src/app/opengraph-image.tsx`의 상단 import 및 default export 시그니처(전체 JSX는 변경 없음, `SITE_CONFIG` 참조 2곳만 교체):**
```tsx
import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import { SITE_CONFIG } from "@/lib/site/config";
// ...(중략, 폰트/로고 fs 로드 부분 그대로 유지)...

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div /* ... */>
        {/* ...중략... */}
        <div /* ... */>{SITE_CONFIG.brandName}</div>
        {/* ...중략... */}
        <div /* ... */>{SITE_CONFIG.bio}</div>
      </div>
    ),
    { /* ... */ },
  );
}
```

**현재 `src/app/__tests__/layout.metadata.test.ts` 전체 내용:**
```ts
import { describe, it, expect } from "vitest";
import { metadata } from "../layout";
import { SITE_CONFIG } from "@/lib/site/config";

/**
 * S7: layout.tsx의 metadata가 OG/Twitter 카드 및 metadataBase를
 * SITE_CONFIG 값과 일치하게 설정하는지 검증한다.
 * (하드코딩 중복 없이 SITE_CONFIG를 재사용해야 함)
 */
describe("layout metadata (S7 OG/메타 태그)", () => {
  it("metadataBase가 설정되어 있다", () => {
    expect(metadata.metadataBase).toBeInstanceOf(URL);
  });

  it("title/description이 SITE_CONFIG 값과 일치한다", () => {
    expect(metadata.title).toBe(SITE_CONFIG.brandName);
    expect(metadata.description).toBe(SITE_CONFIG.bio);
  });

  it("openGraph.title/description이 SITE_CONFIG 값과 일치한다", () => {
    const og = metadata.openGraph;
    expect(og).toBeDefined();
    expect(og?.title).toBe(SITE_CONFIG.brandName);
    expect(og?.description).toBe(SITE_CONFIG.bio);
  });

  it("openGraph.images가 존재한다", () => {
    const images = metadata.openGraph?.images;
    expect(images).toBeDefined();
    expect(Array.isArray(images) ? images.length : 1).toBeGreaterThan(0);
  });

  it("twitter 카드가 summary_large_image로 설정된다", () => {
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(metadata.twitter?.title).toBe(SITE_CONFIG.brandName);
    expect(metadata.twitter?.description).toBe(SITE_CONFIG.bio);
  });
});
```

이 태스크는 TDD RED→GREEN이 아니라 **기존 동작을 보존하는 리팩터링**이다(정적 SITE_CONFIG 참조를 비동기 getSiteConfig() 호출로 교체). 순서: 먼저 테스트를 새 계약(비동기 `generateMetadata`)에 맞게 고치고, 그 다음 구현을 바꾼다.

- [ ] **Step 1: `layout.metadata.test.ts`를 비동기 `generateMetadata` 계약으로 갱신**

`src/app/__tests__/layout.metadata.test.ts` 전체 교체:
```ts
import { describe, it, expect } from "vitest";
import { generateMetadata } from "../layout";
import { SITE_CONFIG } from "@/lib/site/config";

/**
 * S7: layout.tsx의 metadata가 OG/Twitter 카드 및 metadataBase를
 * getSiteConfig() 값과 일치하게 설정하는지 검증한다.
 * (S5부터 generateMetadata가 getSiteConfig()를 통해 DB 값을 반영 —
 * NEXT_PUBLIC_SUPABASE_URL 미설정 로컬 테스트 환경에서는 SITE_CONFIG로 폴백)
 */
describe("layout metadata (S7 OG/메타 태그, S5부터 getSiteConfig 연동)", () => {
  it("metadataBase가 설정되어 있다", async () => {
    const metadata = await generateMetadata();
    expect(metadata.metadataBase).toBeInstanceOf(URL);
  });

  it("title/description이 SITE_CONFIG 값과 일치한다", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe(SITE_CONFIG.brandName);
    expect(metadata.description).toBe(SITE_CONFIG.bio);
  });

  it("openGraph.title/description이 SITE_CONFIG 값과 일치한다", async () => {
    const metadata = await generateMetadata();
    const og = metadata.openGraph;
    expect(og).toBeDefined();
    expect(og?.title).toBe(SITE_CONFIG.brandName);
    expect(og?.description).toBe(SITE_CONFIG.bio);
  });

  it("openGraph.images가 존재한다", async () => {
    const metadata = await generateMetadata();
    const images = metadata.openGraph?.images;
    expect(images).toBeDefined();
    expect(Array.isArray(images) ? images.length : 1).toBeGreaterThan(0);
  });

  it("twitter 카드가 summary_large_image로 설정된다", async () => {
    const metadata = await generateMetadata();
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(metadata.twitter?.title).toBe(SITE_CONFIG.brandName);
    expect(metadata.twitter?.description).toBe(SITE_CONFIG.bio);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/app/__tests__/layout.metadata.test.ts`
Expected: FAIL — `generateMetadata`가 아직 export되지 않음(`layout.tsx`가 여전히 정적 `metadata` const를 export)

- [ ] **Step 3: `layout.tsx`를 비동기 `generateMetadata`로 전환**

`src/app/layout.tsx` 전체 교체:
```tsx
import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/site/getSiteConfig";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getSiteConfig();

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3939",
    ),
    title: siteConfig.brandName,
    description: siteConfig.bio,
    openGraph: {
      title: siteConfig.brandName,
      description: siteConfig.bio,
      type: "website",
      locale: "ko_KR",
      images: [{ url: "/opengraph-image" }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.brandName,
      description: siteConfig.bio,
      images: [{ url: "/opengraph-image" }],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: 메타데이터 테스트 통과 확인**

Run: `npx vitest run src/app/__tests__/layout.metadata.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: `page.tsx`를 getSiteConfig()로 전환**

`src/app/page.tsx` 전체 교체:
```tsx
import { getLinks } from "@/lib/links/getLinks";
import { getSiteConfig } from "@/lib/site/getSiteConfig";
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
  const [links, siteConfig] = await Promise.all([getLinks(), getSiteConfig()]);

  return (
    <main className="flex flex-1 flex-col items-center">
      <PageviewBeacon />
      <ProfileHeader config={siteConfig} />

      <div className="flex w-full max-w-[480px] flex-1 flex-col gap-4 px-5 pb-2 pt-6">
        <div className="reveal" style={{ animationDelay: `${SOCIAL_DELAY_MS}ms` }}>
          <SocialRow items={siteConfig.social} />
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
          email={siteConfig.affiliateEmail}
          label={siteConfig.affiliateLabel}
          delayMs={LINKS_BASE_DELAY_MS + links.length * LINK_STAGGER_MS}
        />

        <Footer brandName={siteConfig.brandName} />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: `opengraph-image.tsx`를 getSiteConfig()로 전환**

`src/app/opengraph-image.tsx`에서 import 교체:
```tsx
import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import { getSiteConfig } from "@/lib/site/getSiteConfig";
```
(기존 `import { SITE_CONFIG } from "@/lib/site/config";` 줄을 위로 교체)

default export를 async로 바꾸고 함수 시작에 `const siteConfig = await getSiteConfig();`를 추가, 본문의 `SITE_CONFIG.brandName`/`SITE_CONFIG.bio` 참조 2곳을 `siteConfig.brandName`/`siteConfig.bio`로 교체:
```tsx
export default async function OpengraphImage() {
  const siteConfig = await getSiteConfig();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#1B4DFF",
          fontFamily: "Pretendard",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 떠있는 반투명 라운드 도형 (히어로와 동일 장식) */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -100,
            width: 460,
            height: 300,
            background: "rgba(255,255,255,0.08)",
            borderRadius: "120px 120px 120px 40px",
            transform: "rotate(10deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -140,
            left: -80,
            width: 340,
            height: 240,
            background: "rgba(255,255,255,0.07)",
            borderRadius: "40px 120px 120px 120px",
            transform: "rotate(-8deg)",
          }}
        />

        {/* 코너 태그 */}
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 56,
            display: "flex",
            alignItems: "center",
            padding: "10px 22px",
            background: "rgba(255,255,255,0.16)",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: 999,
            fontSize: 24,
            fontWeight: 600,
            color: "#FFFFFF",
          }}
        >
          gobang.kr
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          {/* 흰 박스 + bi.png 로고 — ProfileHeader 히어로와 동일 아이덴티티 */}
          <div
            style={{
              display: "flex",
              width: 120,
              height: 120,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              background: "#FFFFFF",
              borderRadius: 30,
              padding: 18,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoDataUri}
              alt=""
              width={84}
              height={84}
              style={{ objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              fontSize: 116,
              fontWeight: 700,
              lineHeight: 1,
              color: "#FFFFFF",
              letterSpacing: -3,
            }}
          >
            {siteConfig.brandName}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            marginTop: 46,
            padding: "24px 34px",
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 22,
            fontSize: 40,
            fontWeight: 500,
            color: "rgba(255,255,255,0.94)",
          }}
        >
          {siteConfig.bio}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: pretendardRegular, weight: 400, style: "normal" },
        { name: "Pretendard", data: pretendardSemiBold, weight: 600, style: "normal" },
        { name: "Pretendard", data: pretendardBold, weight: 700, style: "normal" },
      ],
    },
  );
}
```
(파일 상단의 폰트/로고 fs 로드 상수들, 주석은 그대로 둔다 — `import` 줄과 default export 함수 시그니처·본문 2곳만 바뀐다.)

- [ ] **Step 7: 전체 검증**

```bash
npx vitest run
npm run lint
npx next build
```
빌드가 clean한지, `/`와 `/opengraph-image`가 여전히 정상 등록되는지 확인. 기존 `ProfileHeader`/`SocialRow`/`AffiliateButton`/`Footer` 테스트들(변경 안 됨)이 여전히 통과하는지도 전체 스위트로 확인됨.

- [ ] **Step 8: 커밋**

```bash
git add src/app/page.tsx src/app/layout.tsx src/app/opengraph-image.tsx src/app/__tests__/layout.metadata.test.ts
git commit -m "feat(S5): 공개 페이지·메타데이터를 getSiteConfig()로 연동"
```

---

## Task 완료 후 (전체)

- [ ] 라이브 검증(컨트롤러): `/admin/settings`에서 브랜드명 또는 소셜 URL 하나를 바꿔 저장 → 공개 `/`와 `/opengraph-image`에 즉시 반영되는지 curl 또는 브라우저로 확인 후 원래 값으로 되돌려놓기
- [ ] `docs/TODO.md`의 S5 체크박스를 `[x]`로 갱신
- [ ] `HANDOFF.md`·`.superpowers/sdd/progress.md` 갱신: S5 완료, S6(요약 통계 대시보드)부터 재개 지점 명시
