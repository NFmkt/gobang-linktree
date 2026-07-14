# S3 — 관리자 인증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin`을 단일 비밀번호(`ADMIN_PASSWORD`)로 잠그고, 인증 성공 시 세션이 재접속에도 유지되며, 미인증 접근은 관리 페이지·관리 API 양쪽에서 모두 차단된다.

**Architecture:** 비밀번호를 그대로 세션에 저장하지 않는다 — `ADMIN_PASSWORD`를 키로 한 HMAC-SHA256 값을 "세션 토큰"으로 써서 httpOnly 쿠키에 저장한다(비밀번호를 아는 사람만 같은 토큰을 재생성할 수 있음, 별도 세션 저장소/DB 불필요). Next.js Middleware가 `/admin/*`·`/api/admin/*` 요청마다 쿠키를 검증해 미인증이면 로그인 페이지로 리다이렉트(페이지)하거나 401(API)을 반환한다. **Middleware는 Edge 런타임에서도 동작해야 하므로 Node.js 전용 `crypto` 모듈이 아니라 Web Crypto API(`crypto.subtle`, Node/Edge/브라우저 어디서나 쓸 수 있는 표준 전역)를 쓴다.**

**Tech Stack:** Next.js 16 Middleware, Web Crypto API(`crypto.subtle`), httpOnly 쿠키, Vitest.

## Global Constraints

- 환경변수: `ADMIN_PASSWORD` (이미 `.env.local`에 설정됨, 값은 코드에 하드코딩 금지)
- 세션 쿠키명: 정확히 `admin_session`, `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `secure: process.env.NODE_ENV === "production"`, `maxAge: 60*60*24*7`(7일 — "재접속 시 유지" 요건)
- 인증 없는 예외 경로(미들웨어가 통과시켜야 함): 정확히 `/admin/login`, `/api/admin/login`
- 보호 대상: `/admin/*`(로그인 페이지 제외) → 미인증 시 `/admin/login`으로 **리다이렉트**. `/api/admin/*`(로그인 제외) → 미인증 시 **401** JSON.
- 비밀번호/토큰 비교는 타이밍 공격 방지를 위해 상수 시간 비교를 쓴다(단순 `===` 금지)
- 로그인 실패 시 401, 잘못된 JSON body는 400
- 새 Supabase 클라이언트나 외부 세션 저장소(Redis 등)를 도입하지 않는다 — 이 태스크 범위 밖(YAGNI)
- 관리자 UI는 `docs/DESIGN_SYSTEM.md` §2/§4의 비비드 블루 토큰(`--color-primary` `#1B4DFF`, `--color-bg` `#F3F6FD`, `--color-surface` `#FFFFFF`, `--color-border`/`--color-border-strong`, `--r-sm`/`--r`/`--r-lg`, `--sh`, `.focus-glow` 클래스)을 그대로 상속한다 — 새 색/그림자 값을 만들지 않는다
- 테스트: `npx vitest run` · 린트: `npm run lint` · 빌드: `npx next build`
- 커밋 메시지 접두사: `feat(S3): ...`

---

### Task 1: 관리자 세션 토큰 유틸 (`adminSession`)

**Files:**
- Create: `src/lib/auth/adminSession.ts`
- Test: `src/lib/auth/__tests__/adminSession.test.ts`

**Interfaces:**
- Produces: `createAdminSessionToken(): Promise<string>`, `verifyAdminSessionToken(token: string | undefined | null): Promise<boolean>`, `constantTimeEqual(a: string, b: string): boolean` — Task 2·3·4가 이 세 함수를 그대로 import해서 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/auth/__tests__/adminSession.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("adminSession", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ADMIN_PASSWORD: "test-password-123" };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("createAdminSessionToken은 같은 비밀번호에 대해 항상 같은 토큰을 생성한다", async () => {
    const { createAdminSessionToken } = await import("../adminSession");
    const a = await createAdminSessionToken();
    const b = await createAdminSessionToken();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("verifyAdminSessionToken은 올바른 토큰에 대해 true를 반환한다", async () => {
    const { createAdminSessionToken, verifyAdminSessionToken } = await import("../adminSession");
    const token = await createAdminSessionToken();
    expect(await verifyAdminSessionToken(token)).toBe(true);
  });

  it("verifyAdminSessionToken은 잘못된 토큰에 대해 false를 반환한다", async () => {
    const { verifyAdminSessionToken } = await import("../adminSession");
    expect(await verifyAdminSessionToken("bogus-token")).toBe(false);
  });

  it("verifyAdminSessionToken은 undefined/null에 대해 false를 반환한다", async () => {
    const { verifyAdminSessionToken } = await import("../adminSession");
    expect(await verifyAdminSessionToken(undefined)).toBe(false);
    expect(await verifyAdminSessionToken(null)).toBe(false);
  });

  it("ADMIN_PASSWORD가 다르면 다른 토큰을 생성한다", async () => {
    const { createAdminSessionToken } = await import("../adminSession");
    const tokenA = await createAdminSessionToken();

    process.env.ADMIN_PASSWORD = "different-password";
    const tokenB = await createAdminSessionToken();

    expect(tokenA).not.toBe(tokenB);
  });

  it("ADMIN_PASSWORD가 없으면 createAdminSessionToken이 에러를 던진다", async () => {
    delete process.env.ADMIN_PASSWORD;
    const { createAdminSessionToken } = await import("../adminSession");
    await expect(createAdminSessionToken()).rejects.toThrow(/ADMIN_PASSWORD/);
  });

  it("constantTimeEqual은 길이가 다르면 false, 같은 문자열이면 true를 반환한다", async () => {
    const { constantTimeEqual } = await import("../adminSession");
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/auth/__tests__/adminSession.test.ts`
Expected: FAIL — `Cannot find module '../adminSession'`

- [ ] **Step 3: 최소 구현 작성**

`src/lib/auth/adminSession.ts`:
```ts
const SESSION_LABEL = "gobang-admin-session-v1";

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD 환경변수가 설정되지 않았습니다. .env.example을 참고해 .env.local을 구성하세요.",
    );
  }
  return password;
}

/**
 * 상수 시간 문자열 비교 — 타이밍 공격 방지.
 * 길이가 다르면 즉시 false (길이 자체는 비밀이 아니므로 조기 반환해도 안전).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * ADMIN_PASSWORD를 키로 한 결정적 HMAC 값을 "세션 토큰"으로 쓴다.
 * 비밀번호를 아는 사람만 같은 토큰을 재생성할 수 있어, 별도 세션 저장소 없이도
 * httpOnly 쿠키에 넣어 "로그인 상태"를 증명할 수 있다.
 * Web Crypto API(crypto.subtle) 사용 — Node.js 전용 crypto 모듈은 Edge 런타임에서
 * 동작하지 않으므로 Next.js Middleware와 호환되도록 반드시 이 API를 쓴다.
 */
export async function createAdminSessionToken(): Promise<string> {
  return hmacHex(getAdminPassword(), SESSION_LABEL);
}

export async function verifyAdminSessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const expected = await createAdminSessionToken();
  return constantTimeEqual(token, expected);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/auth/__tests__/adminSession.test.ts`
Expected: PASS (7/7)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/auth/adminSession.ts src/lib/auth/__tests__/adminSession.test.ts
git commit -m "feat(S3): 관리자 세션 토큰 유틸 (HMAC, Web Crypto)"
```

---

### Task 2: 로그인/로그아웃 API 라우트

**Files:**
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`
- Test: `src/app/api/admin/login/__tests__/route.test.ts`
- Test: `src/app/api/admin/logout/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `createAdminSessionToken()`, `constantTimeEqual()` from `@/lib/auth/adminSession` (Task 1)
- Produces: `POST /api/admin/login` (body `{password: string}` → 200 + `Set-Cookie: admin_session=...` | 401 | 400), `POST /api/admin/logout` (→ 200 + 즉시 만료 쿠키). Task 5(로그인 페이지)가 `/api/admin/login`을 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/api/admin/login/__tests__/route.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createAdminSessionToken } from "@/lib/auth/adminSession";

const ORIGINAL_ENV = { ...process.env };

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ADMIN_PASSWORD: "correct-password" };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("올바른 비밀번호면 200과 admin_session 쿠키를 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ password: "correct-password" }));

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");

    const expectedToken = await createAdminSessionToken();
    expect(setCookie).toContain(`admin_session=${expectedToken}`);
  });

  it("잘못된 비밀번호면 401을 반환하고 쿠키를 설정하지 않는다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ password: "wrong-password" }));

    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("password 필드가 없으면 401을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
  });
});
```

`src/app/api/admin/logout/__tests__/route.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("POST /api/admin/logout", () => {
  it("200을 반환하고 admin_session 쿠키를 즉시 만료시킨다", async () => {
    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("admin_session=");
    expect(setCookie.toLowerCase()).toContain("max-age=0");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/app/api/admin/login/__tests__/route.test.ts src/app/api/admin/logout/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '../route'` (양쪽 다)

- [ ] **Step 3: 최소 구현 작성**

`src/app/api/admin/login/route.ts`:
```ts
import { NextResponse } from "next/server";
import { constantTimeEqual, createAdminSessionToken } from "@/lib/auth/adminSession";

const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7일

type LoginRequestBody = {
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD가 설정되지 않았습니다" },
      { status: 500 },
    );
  }

  if (!body.password || !constantTimeEqual(body.password, adminPassword)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  const token = await createAdminSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
```

`src/app/api/admin/logout/route.ts`:
```ts
import { NextResponse } from "next/server";

const SESSION_COOKIE = "admin_session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/app/api/admin/login/__tests__/route.test.ts src/app/api/admin/logout/__tests__/route.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/admin/login/route.ts src/app/api/admin/logout/route.ts src/app/api/admin/login/__tests__/route.test.ts src/app/api/admin/logout/__tests__/route.test.ts
git commit -m "feat(S3): 로그인/로그아웃 API 라우트"
```

---

### Task 3: Middleware (라우트 보호)

> **⚠️ 실행 시 정정(2026-07-09)**: Next.js 16.2.10부터 `middleware.ts` 파일 컨벤션이 deprecated이고 `proxy.ts`로 바뀌었다(export 함수명도 `middleware` → `proxy`). 실제 구현은 아래 `src/middleware.ts`가 아니라 **`src/proxy.ts`**(export 함수명 `proxy`)로, 테스트는 `src/__tests__/proxy.test.ts`로 적용됨. 나머지 로직은 동일.

**Files:**
- Create: `src/middleware.ts` (실제: `src/proxy.ts`)
- Test: `src/__tests__/middleware.test.ts` (실제: `src/__tests__/proxy.test.ts`)

**Interfaces:**
- Consumes: `verifyAdminSessionToken()` from `@/lib/auth/adminSession` (Task 1)
- Produces: 없음(엔드포인트가 아니라 요청 파이프라인 훅) — Task 4·5의 페이지들이 이 미들웨어에 의해 보호받는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/middleware.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { createAdminSessionToken } from "@/lib/auth/adminSession";

const ORIGINAL_ENV = { ...process.env };

describe("middleware", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ADMIN_PASSWORD: "correct-password" };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("/admin/login은 인증 없이 통과한다 (리다이렉트 없음)", async () => {
    const { middleware } = await import("../middleware");
    const req = new NextRequest("http://localhost/admin/login");
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("/api/admin/login은 인증 없이 통과한다", async () => {
    const { middleware } = await import("../middleware");
    const req = new NextRequest("http://localhost/api/admin/login", { method: "POST" });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("유효한 세션 쿠키가 있으면 /admin을 통과시킨다", async () => {
    const token = await createAdminSessionToken();
    const { middleware } = await import("../middleware");
    const req = new NextRequest("http://localhost/admin", {
      headers: { Cookie: `admin_session=${token}` },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("세션 쿠키가 없으면 /admin을 /admin/login으로 리다이렉트한다", async () => {
    const { middleware } = await import("../middleware");
    const req = new NextRequest("http://localhost/admin");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/admin/login");
  });

  it("세션 쿠키가 잘못됐으면 /admin/links를 /admin/login으로 리다이렉트한다", async () => {
    const { middleware } = await import("../middleware");
    const req = new NextRequest("http://localhost/admin/links", {
      headers: { Cookie: "admin_session=bogus" },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/admin/login");
  });

  it("세션 쿠키가 없으면 /api/admin/*는 401을 반환한다 (리다이렉트 아님)", async () => {
    const { middleware } = await import("../middleware");
    const req = new NextRequest("http://localhost/api/admin/links");
    const res = await middleware(req);
    expect(res.status).toBe(401);
    expect(res.headers.get("location")).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/__tests__/middleware.test.ts`
Expected: FAIL — `Cannot find module '../middleware'`

- [ ] **Step 3: 최소 구현 작성**

`src/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminSessionToken } from "@/lib/auth/adminSession";

const SESSION_COOKIE = "admin_session";
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifyAdminSessionToken(token);

  if (authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/__tests__/middleware.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: 전체 스위트 + 빌드 확인**

```bash
npx vitest run
npx next build
```
Expected: 전부 통과/성공. 빌드 출력에 `ƒ Middleware` 항목이 새로 나타나는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/middleware.ts src/__tests__/middleware.test.ts
git commit -m "feat(S3): 관리자 라우트 보호 미들웨어"
```

---

### Task 4: 관리자 보호 셸 (레이아웃 + 로그아웃 버튼 + 홈)

**Files:**
- Create: `src/app/admin/(protected)/layout.tsx`
- Create: `src/app/admin/(protected)/LogoutButton.tsx`
- Create: `src/app/admin/(protected)/page.tsx`
- Test: `src/app/admin/(protected)/__tests__/adminShell.test.tsx`

**Interfaces:**
- Produces: `/admin` 페이지(레이아웃+홈). `(protected)`는 Next.js 라우트 그룹 — URL에는 나타나지 않으므로 `src/app/admin/(protected)/page.tsx`는 정확히 `/admin`으로 매핑된다. `login/`은 이 그룹 밖에 있어 이 레이아웃을 상속하지 않는다(Task 5).

**디자인 토큰 (docs/DESIGN_SYSTEM.md §2/§4, 그대로 사용):** `--color-primary:#1B4DFF`, `--color-bg:#F3F6FD`, `--color-surface:#FFFFFF`, `--color-border:#E5EBF7`, `--color-ink:#0E1525`, `--color-ink-2:#3A4760`, `--r-sm:12px`, `--r:18px`, `--sh: 0 12px 30px rgba(20,40,90,.08)`, 포커스는 기존 `.focus-glow` 클래스(globals.css에 이미 정의됨) 재사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/admin/(protected)/__tests__/adminShell.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("클릭 시 /api/admin/logout을 POST하고 로그인 페이지로 이동한다", async () => {
    const { LogoutButton } = await import("../LogoutButton");
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin/login");
    });
    expect(fetch).toHaveBeenCalledWith("/api/admin/logout", { method: "POST" });
    expect(refreshMock).toHaveBeenCalled();
  });
});

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

describe("AdminHomePage", () => {
  it("인증 완료 메시지를 렌더한다", async () => {
    const AdminHomePage = (await import("../page")).default;
    render(<AdminHomePage />);
    expect(screen.getByText(/인증되었습니다/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run "src/app/admin/(protected)/__tests__/adminShell.test.tsx"`
Expected: FAIL — `Cannot find module '../LogoutButton'`(등)

- [ ] **Step 3: 최소 구현 작성**

`src/app/admin/(protected)/LogoutButton.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="focus-glow rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-3 py-1.5 text-[13.5px] font-semibold text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
    >
      로그아웃
    </button>
  );
}
```

`src/app/admin/(protected)/layout.tsx`:
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

`src/app/admin/(protected)/page.tsx`:
```tsx
export default function AdminHomePage() {
  return (
    <p className="text-[14px] text-[var(--color-ink-2)]">
      인증되었습니다. 링크·통계 관리 기능은 다음 단계(S4~S6)에서 추가됩니다.
    </p>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run "src/app/admin/(protected)/__tests__/adminShell.test.tsx"`
Expected: PASS (3/3)

- [ ] **Step 5: 커밋**

```bash
git add "src/app/admin/(protected)"
git commit -m "feat(S3): 관리자 보호 셸 (레이아웃/로그아웃/홈)"
```

---

### Task 5: 로그인 페이지

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Test: `src/app/admin/login/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/login` (Task 2, body `{password: string}`, 200 성공 / 401 실패)
- Produces: `/admin/login` 페이지. `(protected)` 그룹 밖에 있으므로 Task 4의 레이아웃을 상속하지 않는다(로그아웃 버튼 등이 로그인 화면에 뜨지 않음).

**디자인 토큰**: Task 4와 동일 팔레트. 신규로 `--color-danger`(`#E5484D`, 에러 텍스트)를 처음 소비한다 — globals.css에 이미 정의돼 있고 지금까지 미사용이었던 토큰(2026-07-09 코드리뷰에서 "예약 스와치"로 문서화됨).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/admin/login/__tests__/page.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

describe("AdminLoginPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("올바른 비밀번호 제출 시 /api/admin/login을 호출하고 /admin으로 이동한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    const AdminLoginPage = (await import("../page")).default;
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByPlaceholderText("비밀번호"), { target: { value: "test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin");
    });
    expect(fetch).toHaveBeenCalledWith("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "test-password" }),
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("틀린 비밀번호 제출 시 에러 메시지를 보여주고 이동하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "no" }), { status: 401 })));
    const AdminLoginPage = (await import("../page")).default;
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByPlaceholderText("비밀번호"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(screen.getByText("비밀번호가 올바르지 않습니다.")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("비밀번호가 비어 있으면 로그인 버튼이 비활성화된다", async () => {
    const AdminLoginPage = (await import("../page")).default;
    render(<AdminLoginPage />);
    expect(screen.getByRole("button", { name: "로그인" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/app/admin/login/__tests__/page.test.tsx`
Expected: FAIL — `Cannot find module '../page'`

- [ ] **Step 3: 최소 구현 작성**

`src/app/admin/login/page.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("비밀번호가 올바르지 않습니다.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[360px] flex-col gap-4 rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--sh)]"
      >
        <h1 className="text-[20px] font-extrabold text-[var(--color-ink)]">관리자 로그인</h1>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          autoFocus
          className="focus-glow h-[46px] rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 text-[15px] text-[var(--color-ink)] outline-none"
        />
        {error ? <p className="text-[13.5px] text-[var(--color-danger)]">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="focus-glow flex h-[46px] items-center justify-center rounded-[var(--r-sm)] bg-[var(--color-primary)] text-[15px] font-bold text-[var(--color-on-primary)] transition-opacity disabled:opacity-50"
        >
          {submitting ? "확인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/app/admin/login/__tests__/page.test.tsx`
Expected: PASS (3/3)

- [ ] **Step 5: 전체 검증 + 라이브 확인**

```bash
npx vitest run
npm run lint
npx next build
```
전부 clean 확인. 추가로 컨트롤러(사람)가 실제 dev 서버(3939)에서 라이브 확인:
1. `curl -i http://localhost:3939/admin` → 307 리다이렉트로 `/admin/login`인지 확인
2. `curl -i -X POST http://localhost:3939/api/admin/login -H "Content-Type: application/json" -d '{"password":"wrong"}'` → 401 확인
3. `curl -i -X POST http://localhost:3939/api/admin/login -H "Content-Type: application/json" -d '{"password":"test-password"}'` → 200 + `Set-Cookie: admin_session=...` 확인
4. 받은 쿠키로 `curl -i http://localhost:3939/admin --cookie "admin_session=<값>"` → 200 확인

- [ ] **Step 6: 커밋**

```bash
git add src/app/admin/login/page.tsx src/app/admin/login/__tests__/page.test.tsx
git commit -m "feat(S3): 관리자 로그인 페이지"
```

---

## Task 완료 후 (전체)

- [ ] `docs/TODO.md`의 S3 체크박스를 `[x]`로 갱신
- [ ] `HANDOFF.md`·`.superpowers/sdd/progress.md` 갱신: S3 완료, S4(관리자 링크 CRUD)부터 재개 지점 명시
