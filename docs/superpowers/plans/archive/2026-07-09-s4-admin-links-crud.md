# S4 — 관리자 링크 CRUD + 드래그 정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/links`에서 링크를 추가·수정·삭제하고, active 토글로 노출을 제어하고, 드래그로 순서를 바꿀 수 있다. 변경은 공개 `/`에 즉시 반영된다(별도 캐시 무효화 불필요 — `getLinks()`가 이미 매 요청 실 조회).

**Architecture:** `/api/admin/links` 아래 REST 라우트(GET/POST/PATCH/DELETE + reorder)가 `createServiceSupabaseClient()`(service_role, RLS 우회)로 `links` 테이블을 직접 조작한다. 이 라우트들은 이미 `src/proxy.ts`가 `/api/admin/*` 패턴으로 보호하고 있어 별도 인증 코드가 필요 없다. 관리 UI(`/admin/links`)는 Server Component가 초기 목록을 직접 DB에서 읽어 Client Component(`LinksManager`)에 넘기고, 이후 모든 변경(생성/수정/삭제/재정렬)은 위 API를 호출한 뒤 전체 목록을 다시 불러와(refetch) 상태를 동기화한다 — 복잡한 낙관적 업데이트 로직 없이 단순하게 간다.

**Tech Stack:** Next.js 16 Route Handlers, Supabase(service_role), React Client Component, 네이티브 HTML5 Drag and Drop API(신규 패키지 없음).

## Global Constraints

- `links` 테이블 스키마는 이미 존재(`supabase/migrations/0001_links.sql`): `id text pk, title, url, icon, subtitle, "order" integer, active boolean, thumbnail, created_at` — 스키마 변경 없음
- 관리 API는 전부 `createServiceSupabaseClient()`(`src/lib/supabase/server.ts`, 이미 존재, RLS 우회)를 쓴다 — 새 클라이언트 팩토리 없음
- 관리 API 경로는 이미 `src/proxy.ts`의 `/api/admin/:path*` 매처로 보호됨 — 이 태스크에서 인증 로직을 추가로 만들지 않는다
- 신규 링크 생성 시 `id`는 서버가 `crypto.randomUUID()`로 자동 생성(관리자가 직접 입력하지 않음), `order`는 **클라이언트가 계산해 body에 포함**(`links.length + 1`) — 서버는 별도 max-order 조회 없이 그대로 저장(YAGNI, 저트래픽 관리 도구라 완벽한 원자성 불필요)
- 아이콘 키는 `src/components/icons/getLinkIcon.tsx`의 `ICON_MAP`에 있는 8개(`youth, feed, series, home, blog, instagram, youtube, kakao`)만 선택 가능 — 새 아이콘을 만들지 않는다
- 드래그 정렬은 **네이티브 HTML5 Drag and Drop API**만 쓴다(`draggable`, `onDragStart`, `onDragOver`, `onDrop`) — dnd-kit 등 새 패키지를 추가하지 않는다(3.5단계 리소스 승인 불필요, 신규 의존성 없음)
- 관리자 UI는 `docs/DESIGN_SYSTEM.md`의 비비드 블루 토큰만 재사용(`--color-primary`, `--color-bg`, `--color-surface`, `--color-border`, `--color-border-strong`, `--color-ink`, `--color-ink-2`, `--color-danger`, `--color-blue-50`, `--r-sm`, `--r`, `--sh-sm`, `.focus-glow`) — 새 색/그림자 없음
- fetch 호출은 반드시 `try/catch/finally`로 감싼다(S3 리뷰에서 `try/finally`만으로는 네트워크 실패 시 미처리 예외가 난다는 것을 확인함 — 이 프로젝트의 확립된 패턴)
- 테스트: `npx vitest run` · 린트: `npm run lint` · 빌드: `npx next build`
- 커밋 메시지 접두사: `feat(S4): ...`

---

### Task 1: 링크 CRUD API (목록/생성/수정/삭제)

**Files:**
- Create: `src/app/api/admin/links/route.ts` (GET 목록, POST 생성)
- Create: `src/app/api/admin/links/[id]/route.ts` (PATCH 수정, DELETE 삭제)
- Test: `src/app/api/admin/links/__tests__/route.test.ts`
- Test: `src/app/api/admin/links/[id]/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `createServiceSupabaseClient()` from `@/lib/supabase/server` (기존 함수, 동기 함수 — `await` 불필요, `.from("table")`로 RLS 우회 쿼리)
- Produces: `GET /api/admin/links` → `{links: Link[]}`(비활성 포함, order 오름차순), `POST /api/admin/links`(body: `{title, url, icon, subtitle?, thumbnail?, active?, order}`) → 201 `{link: Link}`, `PATCH /api/admin/links/[id]`(body: 부분 필드) → 200 `{link: Link}` | 404, `DELETE /api/admin/links/[id]` → 200 `{ok: true}` | 404. Task 4(관리 UI)가 이 4개 엔드포인트를 그대로 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/api/admin/links/__tests__/route.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/links", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("GET /api/admin/links", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("order 오름차순으로 전체 링크(비활성 포함)를 반환한다", async () => {
    const rows = [
      { id: "a", title: "A", url: "https://a.test", icon: "home", order: 1, active: true },
      { id: "b", title: "B", url: "https://b.test", icon: "home", order: 2, active: false },
    ];
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { GET } = await import("../route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.links).toEqual(rows);
    expect(from).toHaveBeenCalledWith("links");
    expect(select).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("order", { ascending: true });
  });

  it("supabase 조회 에러 시 500을 반환한다", async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/links", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("title/url/icon/order가 없으면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ title: "제목만" }));
    expect(res.status).toBe(400);
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("정상 생성 시 201과 함께 active 기본값 true로 insert한다", async () => {
    const createdRow = {
      id: "generated-id",
      title: "새 링크",
      url: "https://new.test",
      icon: "home",
      subtitle: null,
      thumbnail: null,
      active: true,
      order: 3,
    };
    const single = vi.fn().mockResolvedValue({ data: createdRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({ title: "새 링크", url: "https://new.test", icon: "home", order: 3 }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "새 링크",
        url: "https://new.test",
        icon: "home",
        subtitle: null,
        thumbnail: null,
        active: true,
        order: 3,
      }),
    );
    expect(body.link).toEqual(createdRow);
  });

  it("active를 명시하면 그 값을 그대로 쓴다", async () => {
    const single = vi.fn().mockResolvedValue({ data: {}, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { POST } = await import("../route");
    await POST(
      makeRequest({ title: "A", url: "https://a.test", icon: "home", order: 1, active: false }),
    );

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });
});
```

`src/app/api/admin/links/[id]/__tests__/route.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/links/some-id", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/admin/links/[id]", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("body에 변경할 필드가 없으면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({}), makeParams("a"));
    expect(res.status).toBe(400);
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest("not json"), makeParams("a"));
    expect(res.status).toBe(400);
  });

  it("정상 업데이트 시 200과 갱신된 링크를 반환한다", async () => {
    const updatedRow = { id: "a", title: "A", url: "https://a.test", icon: "home", order: 1, active: false };
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
    const res = await PATCH(makeRequest({ active: false }), makeParams("a"));
    const resBody = await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ active: false });
    expect(eq).toHaveBeenCalledWith("id", "a");
    expect(resBody.link).toEqual(updatedRow);
  });

  it("존재하지 않는 id면 404를 반환한다", async () => {
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
    const res = await PATCH(makeRequest({ active: false }), makeParams("missing"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/links/[id]", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("정상 삭제 시 200을 반환한다", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "a" }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { DELETE } = await import("../route");
    const res = await DELETE(
      new Request("http://localhost/api/admin/links/a", { method: "DELETE" }),
      makeParams("a"),
    );
    expect(res.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("id", "a");
  });

  it("존재하지 않는 id면 404를 반환한다", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { DELETE } = await import("../route");
    const res = await DELETE(
      new Request("http://localhost/api/admin/links/missing", { method: "DELETE" }),
      makeParams("missing"),
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run "src/app/api/admin/links/__tests__/route.test.ts" "src/app/api/admin/links/[id]/__tests__/route.test.ts"`
Expected: FAIL — `Cannot find module '../route'` (양쪽 다)

- [ ] **Step 3: 최소 구현 작성**

`src/app/api/admin/links/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type CreateLinkBody = {
  title?: string;
  url?: string;
  icon?: string;
  subtitle?: string;
  thumbnail?: string;
  active?: boolean;
  order?: number;
};

export async function GET() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ links: data ?? [] });
}

export async function POST(request: Request) {
  let body: CreateLinkBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.title || !body.url || !body.icon || typeof body.order !== "number") {
    return NextResponse.json(
      { error: "title, url, icon, order는 필수입니다" },
      { status: 400 },
    );
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .insert({
      id: crypto.randomUUID(),
      title: body.title,
      url: body.url,
      icon: body.icon,
      subtitle: body.subtitle ?? null,
      thumbnail: body.thumbnail ?? null,
      active: body.active ?? true,
      order: body.order,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ link: data }, { status: 201 });
}
```

`src/app/api/admin/links/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ id: string }> };

type UpdateLinkBody = {
  title?: string;
  url?: string;
  icon?: string;
  subtitle?: string | null;
  thumbnail?: string | null;
  active?: boolean;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: UpdateLinkBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.url !== undefined) updates.url = body.url;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.subtitle !== undefined) updates.subtitle = body.subtitle;
  if (body.thumbnail !== undefined) updates.thumbnail = body.thumbnail;
  if (body.active !== undefined) updates.active = body.active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 필드가 없습니다" }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ link: data });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run "src/app/api/admin/links/__tests__/route.test.ts" "src/app/api/admin/links/[id]/__tests__/route.test.ts"`
Expected: PASS (6/6 + 6/6)

- [ ] **Step 5: 커밋**

```bash
git add "src/app/api/admin/links/route.ts" "src/app/api/admin/links/__tests__/route.test.ts" "src/app/api/admin/links/[id]/route.ts" "src/app/api/admin/links/[id]/__tests__/route.test.ts"
git commit -m "feat(S4): 링크 CRUD API (목록/생성/수정/삭제)"
```

---

### Task 2: 링크 순서 일괄 변경 API

**Files:**
- Create: `src/app/api/admin/links/reorder/route.ts`
- Test: `src/app/api/admin/links/reorder/__tests__/route.test.ts`

**Interfaces:**
- Produces: `PATCH /api/admin/links/reorder`(body: `{order: string[]}` — 원하는 순서대로 나열된 id 배열) → 200 `{ok: true}`. 배열의 인덱스+1이 각 id의 새 `order` 값이 된다. Task 5(드래그 정렬)가 이 엔드포인트를 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/api/admin/links/reorder/__tests__/route.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/links/reorder", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("PATCH /api/admin/links/reorder", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("order 배열이 없으면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("order가 빈 배열이면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ order: [] }));
    expect(res.status).toBe(400);
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("배열 순서대로 각 id의 order를 1부터 갱신한다", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ order: ["c", "a", "b"] }));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenNthCalledWith(1, { order: 1 });
    expect(eq).toHaveBeenNthCalledWith(1, "id", "c");
    expect(update).toHaveBeenNthCalledWith(2, { order: 2 });
    expect(eq).toHaveBeenNthCalledWith(2, "id", "a");
    expect(update).toHaveBeenNthCalledWith(3, { order: 3 });
    expect(eq).toHaveBeenNthCalledWith(3, "id", "b");
  });

  it("하나라도 실패하면 500을 반환한다", async () => {
    const eq = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "update failed" } });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    vi.doMock("@/lib/supabase/server", () => ({
      createServiceSupabaseClient: vi.fn().mockReturnValue({ from }),
    }));
    vi.resetModules();

    const { PATCH } = await import("../route");
    const res = await PATCH(makeRequest({ order: ["a", "b"] }));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run "src/app/api/admin/links/reorder/__tests__/route.test.ts"`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: 최소 구현 작성**

`src/app/api/admin/links/reorder/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type ReorderBody = {
  order?: string[];
};

export async function PATCH(request: Request) {
  let body: ReorderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.order) || body.order.length === 0) {
    return NextResponse.json({ error: "order는 id 배열이어야 합니다" }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  const results = await Promise.all(
    body.order.map((id, index) =>
      supabase.from("links").update({ order: index + 1 }).eq("id", id),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run "src/app/api/admin/links/reorder/__tests__/route.test.ts"`
Expected: PASS (5/5)

- [ ] **Step 5: 커밋**

```bash
git add "src/app/api/admin/links/reorder/route.ts" "src/app/api/admin/links/reorder/__tests__/route.test.ts"
git commit -m "feat(S4): 링크 순서 일괄 변경 API"
```

---

### Task 3: 아이콘 선택 컴포넌트 (IconSelect)

**Files:**
- Create: `src/components/admin/IconSelect.tsx`
- Test: `src/components/admin/__tests__/IconSelect.test.tsx`

**Interfaces:**
- Consumes: `LinkIcon` from `@/components/icons/LinkIcon` (기존, props `{iconKey: string} & IconProps`)
- Produces: `IconSelect({value, onChange}: {value: string; onChange: (key: string) => void})`, `ICON_OPTIONS`(8개 아이콘 키 배열 상수) — Task 4(LinkForm)가 이 컴포넌트와 상수를 그대로 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/admin/__tests__/IconSelect.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IconSelect, ICON_OPTIONS } from "../IconSelect";

describe("IconSelect", () => {
  it("ICON_OPTIONS의 모든 키를 옵션으로 렌더한다", () => {
    render(<IconSelect value="home" onChange={() => {}} />);
    for (const key of ICON_OPTIONS) {
      expect(screen.getByRole("option", { name: key })).toBeInTheDocument();
    }
  });

  it("현재 value를 select의 값으로 반영한다", () => {
    render(<IconSelect value="youtube" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveValue("youtube");
  });

  it("다른 옵션 선택 시 onChange를 새 값으로 호출한다", () => {
    const onChange = vi.fn();
    render(<IconSelect value="home" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "kakao" } });
    expect(onChange).toHaveBeenCalledWith("kakao");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/admin/__tests__/IconSelect.test.tsx`
Expected: FAIL — `Cannot find module '../IconSelect'`

- [ ] **Step 3: 최소 구현 작성**

`src/components/admin/IconSelect.tsx`:
```tsx
"use client";

import { LinkIcon } from "@/components/icons/LinkIcon";

export const ICON_OPTIONS = [
  "youth",
  "feed",
  "series",
  "home",
  "blog",
  "instagram",
  "youtube",
  "kakao",
] as const;

type IconSelectProps = {
  value: string;
  onChange: (key: string) => void;
};

export function IconSelect({ value, onChange }: IconSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--color-blue-50)]">
        <LinkIcon iconKey={value} className="h-5 w-5" />
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-glow h-9 flex-1 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] outline-none"
      >
        {ICON_OPTIONS.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/admin/__tests__/IconSelect.test.tsx`
Expected: PASS (3/3)

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/IconSelect.tsx src/components/admin/__tests__/IconSelect.test.tsx
git commit -m "feat(S4): 아이콘 선택 컴포넌트 (IconSelect)"
```

---

### Task 4: 관리자 링크 페이지 (목록/토글/삭제/추가/수정)

**Files:**
- Create: `src/app/admin/(protected)/links/page.tsx`
- Create: `src/app/admin/(protected)/links/LinksManager.tsx`
- Create: `src/app/admin/(protected)/links/LinkForm.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx` (네비에 "링크 관리" 링크 추가)
- Modify: `src/app/admin/(protected)/__tests__/adminShell.test.tsx` (레이아웃에 네비 링크 검증 추가)
- Test: `src/app/admin/(protected)/links/__tests__/LinksManager.test.tsx`
- Test: `src/app/admin/(protected)/links/__tests__/LinkForm.test.tsx`

**Interfaces:**
- Consumes: `createServiceSupabaseClient()`(`@/lib/supabase/server`), `Link` 타입(`@/lib/links/types`), `LinkIcon`(`@/components/icons/LinkIcon`), `IconSelect`(`@/components/admin/IconSelect`, Task 3), `GET/POST /api/admin/links`·`PATCH/DELETE /api/admin/links/[id]`(Task 1)
- Produces: `LinksManager({initialLinks: Link[]})`, `LinkForm`(create/edit 모드) — Task 5(드래그 정렬)가 `LinksManager.tsx`를 이어서 수정한다.

**현재 `src/app/admin/(protected)/layout.tsx` 전체 내용:**
```tsx
import type { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
        <span className="text-[15px] font-extrabold text-[var(--color-ink)]">고방 관리자</span>
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
  it("브랜드명·로그아웃 버튼·children을 렌더한다", async () => {
    const AdminLayout = (await import("../layout")).default;
    render(
      <AdminLayout>
        <p>본문 콘텐츠</p>
      </AdminLayout>,
    );
    expect(screen.getByText("고방 관리자")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    expect(screen.getByText("본문 콘텐츠")).toBeInTheDocument();
  });
});
```

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/admin/(protected)/links/__tests__/LinksManager.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Link } from "@/lib/links/types";
import { LinksManager } from "../LinksManager";

const links: Link[] = [
  { id: "a", title: "A 링크", url: "https://a.test", icon: "home", order: 1, active: true },
  { id: "b", title: "B 링크", url: "https://b.test", icon: "feed", order: 2, active: false },
];

describe("LinksManager", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("전달받은 링크 목록을 렌더한다", () => {
    render(<LinksManager initialLinks={links} />);
    expect(screen.getByText("A 링크")).toBeInTheDocument();
    expect(screen.getByText("B 링크")).toBeInTheDocument();
  });

  it("노출 체크박스를 토글하면 PATCH 후 목록을 다시 불러온다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ links: [{ ...links[0], active: false }, links[1]] }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={links} />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/links/a", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/links");
  });

  it("삭제 버튼 클릭 시 확인 후 DELETE를 호출하고 목록을 다시 불러온다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ links: [links[1]] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/links/a", { method: "DELETE" });
    });
    expect(window.confirm).toHaveBeenCalled();
  });

  it("삭제 확인을 취소하면 DELETE를 호출하지 않는다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("+ 링크 추가 버튼 클릭 시 생성 폼이 나타난다", () => {
    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getByRole("button", { name: "+ 링크 추가" }));
    expect(screen.getByPlaceholderText("제목")).toBeInTheDocument();
  });

  it("수정 버튼 클릭 시 해당 링크 값으로 폼이 나타난다", () => {
    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getAllByRole("button", { name: "수정" })[0]);
    expect(screen.getByPlaceholderText("제목")).toHaveValue("A 링크");
  });
});
```

`src/app/admin/(protected)/links/__tests__/LinkForm.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Link } from "@/lib/links/types";
import { LinkForm } from "../LinkForm";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LinkForm — create 모드", () => {
  it("제출 시 POST /api/admin/links를 호출하고 onSaved를 부른다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ link: {} }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();

    render(<LinkForm mode="create" nextOrder={3} onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("제목"), { target: { value: "새 링크" } });
    fireEvent.change(screen.getByPlaceholderText("URL"), { target: { value: "https://new.test" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/links",
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toMatchObject({
      title: "새 링크",
      url: "https://new.test",
      icon: "home",
      order: 3,
    });
  });
});

describe("LinkForm — edit 모드", () => {
  const link: Link = {
    id: "a",
    title: "A",
    url: "https://a.test",
    icon: "feed",
    order: 1,
    active: true,
    thumbnail: "https://a.test/thumb.png",
  };

  it("초기값을 링크 데이터로 채운다 (썸네일 포함)", () => {
    render(<LinkForm mode="edit" link={link} onSaved={() => {}} onCancel={() => {}} />);
    expect(screen.getByPlaceholderText("제목")).toHaveValue("A");
    expect(screen.getByPlaceholderText("URL")).toHaveValue("https://a.test");
    expect(screen.getByPlaceholderText("썸네일 이미지 URL (선택)")).toHaveValue(
      "https://a.test/thumb.png",
    );
  });

  it("썸네일을 수정해 제출하면 PATCH body에 thumbnail이 포함된다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ link: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinkForm mode="edit" link={link} onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("썸네일 이미지 URL (선택)"), {
      target: { value: "https://a.test/new-thumb.png" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toMatchObject({
      thumbnail: "https://a.test/new-thumb.png",
    });
  });

  it("제출 시 PATCH /api/admin/links/[id]를 호출한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ link: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();

    render(<LinkForm mode="edit" link={link} onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("제목"), { target: { value: "수정됨" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/links/a",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("취소 버튼 클릭 시 onCancel을 호출한다", () => {
    const onCancel = vi.fn();
    render(<LinkForm mode="edit" link={link} onSaved={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("네트워크 오류로 fetch가 실패하면 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    render(<LinkForm mode="edit" link={link} onSaved={() => {}} onCancel={() => {}} />);
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

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run "src/app/admin/(protected)/links/__tests__/LinksManager.test.tsx" "src/app/admin/(protected)/links/__tests__/LinkForm.test.tsx" "src/app/admin/(protected)/__tests__/adminShell.test.tsx"`
Expected: FAIL — `Cannot find module '../LinksManager'`(등), adminShell 쪽은 "링크 관리" 링크를 못 찾아 실패

- [ ] **Step 3: 최소 구현 작성**

`src/app/admin/(protected)/links/page.tsx`:
```tsx
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Link } from "@/lib/links/types";
import { LinksManager } from "./LinksManager";

export default async function AdminLinksPage() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    return (
      <p className="text-[14px] text-[var(--color-danger)]">
        링크를 불러오지 못했습니다: {error.message}
      </p>
    );
  }

  return <LinksManager initialLinks={(data ?? []) as Link[]} />;
}
```

`src/app/admin/(protected)/links/LinkForm.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import type { Link } from "@/lib/links/types";
import { IconSelect } from "@/components/admin/IconSelect";

type LinkFormProps =
  | {
      mode: "create";
      nextOrder: number;
      onSaved: () => void;
      onCancel: () => void;
    }
  | {
      mode: "edit";
      link: Link;
      onSaved: () => void;
      onCancel: () => void;
    };

export function LinkForm(props: LinkFormProps) {
  const initial = props.mode === "edit" ? props.link : null;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "home");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res =
        props.mode === "create"
          ? await fetch("/api/admin/links", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                url,
                icon,
                subtitle: subtitle || undefined,
                thumbnail: thumbnail || undefined,
                order: props.nextOrder,
              }),
            })
          : await fetch(`/api/admin/links/${props.link.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                url,
                icon,
                subtitle: subtitle || null,
                thumbnail: thumbnail || null,
              }),
            });

      if (!res.ok) {
        setError("저장에 실패했습니다.");
        return;
      }

      props.onSaved();
    } catch {
      setError("저장 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]"
    >
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="제목"
        required
        className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] text-[var(--color-ink)] outline-none"
      />
      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="URL"
        required
        className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] text-[var(--color-ink)] outline-none"
      />
      <input
        value={subtitle}
        onChange={(event) => setSubtitle(event.target.value)}
        placeholder="부제 (선택)"
        className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] text-[var(--color-ink)] outline-none"
      />
      <input
        value={thumbnail}
        onChange={(event) => setThumbnail(event.target.value)}
        placeholder="썸네일 이미지 URL (선택)"
        className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] text-[var(--color-ink)] outline-none"
      />
      <IconSelect value={icon} onChange={setIcon} />
      {error ? <p className="text-[12.5px] text-[var(--color-danger)]">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="focus-glow flex-1 rounded-[var(--r-sm)] bg-[var(--color-primary)] py-2 text-[13.5px] font-bold text-[var(--color-on-primary)] disabled:opacity-50"
        >
          {submitting ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={props.onCancel}
          className="focus-glow flex-1 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] py-2 text-[13.5px] font-semibold text-[var(--color-ink-2)]"
        >
          취소
        </button>
      </div>
    </form>
  );
}
```

`src/app/admin/(protected)/links/LinksManager.tsx`:
```tsx
"use client";

import { useState } from "react";
import type { Link } from "@/lib/links/types";
import { LinkIcon } from "@/components/icons/LinkIcon";
import { LinkForm } from "./LinkForm";

type LinksManagerProps = {
  initialLinks: Link[];
};

export function LinksManager({ initialLinks }: LinksManagerProps) {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function refetch() {
    const res = await fetch("/api/admin/links");
    if (res.ok) {
      const body = await res.json();
      setLinks(body.links);
    }
  }

  async function handleToggleActive(link: Link) {
    await fetch(`/api/admin/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !link.active }),
    });
    await refetch();
  }

  async function handleDelete(link: Link) {
    if (!window.confirm(`"${link.title}" 링크를 삭제할까요?`)) return;
    await fetch(`/api/admin/links/${link.id}`, { method: "DELETE" });
    await refetch();
  }

  function handleFormSaved() {
    setEditingLink(null);
    setIsCreating(false);
    void refetch();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-extrabold text-[var(--color-ink)]">링크 관리</h1>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="focus-glow rounded-[var(--r-sm)] bg-[var(--color-primary)] px-3 py-1.5 text-[13.5px] font-bold text-[var(--color-on-primary)]"
        >
          + 링크 추가
        </button>
      </div>

      {isCreating ? (
        <LinkForm
          mode="create"
          nextOrder={links.length + 1}
          onSaved={handleFormSaved}
          onCancel={() => setIsCreating(false)}
        />
      ) : null}

      {editingLink ? (
        <LinkForm
          mode="edit"
          link={editingLink}
          onSaved={handleFormSaved}
          onCancel={() => setEditingLink(null)}
        />
      ) : null}

      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li
            key={link.id}
            className="flex items-center gap-3 rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--sh-sm)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--color-blue-50)]">
              <LinkIcon iconKey={link.icon} className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-bold text-[var(--color-ink)]">
                {link.title}
              </span>
              <span className="truncate text-[12.5px] text-[var(--color-ink-2)]">{link.url}</span>
            </span>
            <label className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink-2)]">
              <input
                type="checkbox"
                checked={link.active}
                onChange={() => void handleToggleActive(link)}
              />
              노출
            </label>
            <button
              type="button"
              onClick={() => setEditingLink(link)}
              className="focus-glow rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-ink-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(link)}
              className="focus-glow rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-danger)]"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
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

Run: `npx vitest run "src/app/admin/(protected)/links/__tests__/LinksManager.test.tsx" "src/app/admin/(protected)/links/__tests__/LinkForm.test.tsx" "src/app/admin/(protected)/__tests__/adminShell.test.tsx"`
Expected: PASS (전부)

- [ ] **Step 5: 전체 검증**

```bash
npx vitest run
npm run lint
npx next build
```
빌드 출력에 `/admin/links`가 라우트로 등록되는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add "src/app/admin/(protected)/links" "src/app/admin/(protected)/layout.tsx" "src/app/admin/(protected)/__tests__/adminShell.test.tsx"
git commit -m "feat(S4): 관리자 링크 페이지 (목록/토글/삭제/추가/수정)"
```

---

### Task 5: 드래그 앤 드롭 순서 변경

**Files:**
- Create: `src/lib/admin/reorderLinks.ts`
- Test: `src/lib/admin/__tests__/reorderLinks.test.ts`
- Modify: `src/app/admin/(protected)/links/LinksManager.tsx`
- Test: `src/app/admin/(protected)/links/__tests__/LinksManager.test.tsx` (드래그 케이스 추가)

**Interfaces:**
- Consumes: 없음(순수 함수), Task 4가 만든 `LinksManager.tsx`를 이어서 수정
- Produces: `reorderLinks(links: Link[], draggedId: string, targetId: string): Link[]` — draggedId를 targetId 위치로 옮기고 각 항목의 `order`를 새 인덱스+1로 재계산한 새 배열을 반환(원본 불변)

- [ ] **Step 1: 실패하는 테스트 작성 (순수 함수)**

`src/lib/admin/__tests__/reorderLinks.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { reorderLinks } from "../reorderLinks";
import type { Link } from "@/lib/links/types";

const links: Link[] = [
  { id: "a", title: "A", url: "https://a.test", icon: "home", order: 1, active: true },
  { id: "b", title: "B", url: "https://b.test", icon: "home", order: 2, active: true },
  { id: "c", title: "C", url: "https://c.test", icon: "home", order: 3, active: true },
];

describe("reorderLinks", () => {
  it("draggedId를 targetId 위치로 옮기고 order를 재계산한다", () => {
    const result = reorderLinks(links, "c", "a");
    expect(result.map((l) => l.id)).toEqual(["c", "a", "b"]);
    expect(result.map((l) => l.order)).toEqual([1, 2, 3]);
  });

  it("draggedId와 targetId가 같으면 원본과 동일한 순서를 반환한다", () => {
    const result = reorderLinks(links, "a", "a");
    expect(result.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("존재하지 않는 id가 있으면 원본 배열을 그대로 반환한다", () => {
    const result = reorderLinks(links, "missing", "a");
    expect(result).toBe(links);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const original = [...links];
    reorderLinks(links, "c", "a");
    expect(links).toEqual(original);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/admin/__tests__/reorderLinks.test.ts`
Expected: FAIL — `Cannot find module '../reorderLinks'`

- [ ] **Step 3: 최소 구현 작성 (순수 함수)**

`src/lib/admin/reorderLinks.ts`:
```ts
import type { Link } from "@/lib/links/types";

/**
 * draggedId를 targetId 위치로 옮긴 새 배열을 반환한다(원본 불변).
 * order 필드는 새 배열의 인덱스+1로 재계산해서 반환한다.
 */
export function reorderLinks(links: Link[], draggedId: string, targetId: string): Link[] {
  if (draggedId === targetId) return links;

  const draggedIndex = links.findIndex((link) => link.id === draggedId);
  const targetIndex = links.findIndex((link) => link.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) return links;

  const next = [...links];
  const [dragged] = next.splice(draggedIndex, 1);
  next.splice(targetIndex, 0, dragged);

  return next.map((link, index) => ({ ...link, order: index + 1 }));
}
```

- [ ] **Step 4: 순수 함수 테스트 통과 확인**

Run: `npx vitest run src/lib/admin/__tests__/reorderLinks.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: LinksManager에 드래그 인터랙션 테스트 추가**

`src/app/admin/(protected)/links/__tests__/LinksManager.test.tsx`의 마지막 `it`("수정 버튼 클릭...") 다음에 추가:
```tsx
  it("링크를 드래그해서 놓으면 새 순서로 reorder API를 호출한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 })); // reorder PATCH
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={links} />);
    const items = screen.getAllByRole("listitem");

    fireEvent.dragStart(items[1]); // "B 링크"를 집어서
    fireEvent.dragOver(items[0]);
    fireEvent.drop(items[0]); // "A 링크" 위치에 놓음

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/links/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: ["b", "a"] }),
      });
    });
  });
```

- [ ] **Step 6: 드래그 테스트 실패 확인**

Run: `npx vitest run "src/app/admin/(protected)/links/__tests__/LinksManager.test.tsx"`
Expected: FAIL — 새 테스트만 실패(드래그해도 아무 일도 안 일어남, fetchMock이 호출되지 않음)

- [ ] **Step 7: LinksManager에 드래그 배선 추가**

`src/app/admin/(protected)/links/LinksManager.tsx`의 import와 컴포넌트 본문을 아래로 교체(Task 4가 만든 파일에 드래그 관련 부분만 추가):
```tsx
"use client";

import { useState, type DragEvent } from "react";
import type { Link } from "@/lib/links/types";
import { LinkIcon } from "@/components/icons/LinkIcon";
import { reorderLinks } from "@/lib/admin/reorderLinks";
import { LinkForm } from "./LinkForm";

type LinksManagerProps = {
  initialLinks: Link[];
};

export function LinksManager({ initialLinks }: LinksManagerProps) {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function refetch() {
    const res = await fetch("/api/admin/links");
    if (res.ok) {
      const body = await res.json();
      setLinks(body.links);
    }
  }

  async function handleToggleActive(link: Link) {
    await fetch(`/api/admin/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !link.active }),
    });
    await refetch();
  }

  async function handleDelete(link: Link) {
    if (!window.confirm(`"${link.title}" 링크를 삭제할까요?`)) return;
    await fetch(`/api/admin/links/${link.id}`, { method: "DELETE" });
    await refetch();
  }

  function handleFormSaved() {
    setEditingLink(null);
    setIsCreating(false);
    void refetch();
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
  }

  async function handleDrop(targetId: string) {
    if (!draggedId) return;
    const reordered = reorderLinks(links, draggedId, targetId);
    setDraggedId(null);
    setLinks(reordered);
    await fetch("/api/admin/links/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((link) => link.id) }),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-extrabold text-[var(--color-ink)]">링크 관리</h1>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="focus-glow rounded-[var(--r-sm)] bg-[var(--color-primary)] px-3 py-1.5 text-[13.5px] font-bold text-[var(--color-on-primary)]"
        >
          + 링크 추가
        </button>
      </div>

      {isCreating ? (
        <LinkForm
          mode="create"
          nextOrder={links.length + 1}
          onSaved={handleFormSaved}
          onCancel={() => setIsCreating(false)}
        />
      ) : null}

      {editingLink ? (
        <LinkForm
          mode="edit"
          link={editingLink}
          onSaved={handleFormSaved}
          onCancel={() => setEditingLink(null)}
        />
      ) : null}

      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li
            key={link.id}
            draggable
            onDragStart={() => handleDragStart(link.id)}
            onDragOver={handleDragOver}
            onDrop={() => void handleDrop(link.id)}
            className="flex items-center gap-3 rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--sh-sm)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--color-blue-50)]">
              <LinkIcon iconKey={link.icon} className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-bold text-[var(--color-ink)]">
                {link.title}
              </span>
              <span className="truncate text-[12.5px] text-[var(--color-ink-2)]">{link.url}</span>
            </span>
            <label className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink-2)]">
              <input
                type="checkbox"
                checked={link.active}
                onChange={() => void handleToggleActive(link)}
              />
              노출
            </label>
            <button
              type="button"
              onClick={() => setEditingLink(link)}
              className="focus-glow rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-ink-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(link)}
              className="focus-glow rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-danger)]"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 8: 전체 검증**

```bash
npx vitest run
npm run lint
npx next build
```

- [ ] **Step 9: 커밋**

```bash
git add src/lib/admin/reorderLinks.ts src/lib/admin/__tests__/reorderLinks.test.ts "src/app/admin/(protected)/links/LinksManager.tsx" "src/app/admin/(protected)/links/__tests__/LinksManager.test.tsx"
git commit -m "feat(S4): 드래그 앤 드롭으로 링크 순서 변경"
```

---

## Task 완료 후 (전체)

- [ ] 라이브 검증(컨트롤러): dev 서버에서 `/admin/links` 접속 → 링크 추가/수정/삭제/노출토글/드래그 정렬 후 공개 `/`에서 즉시 반영되는지 curl 또는 브라우저로 확인
- [ ] `docs/TODO.md`의 S4 체크박스를 `[x]`로 갱신
- [ ] `HANDOFF.md`·`.superpowers/sdd/progress.md` 갱신: S4 완료, S5(관리자 사이트 설정)부터 재개 지점 명시
