# 고방 링크트리 — 작업 핸드오프 (2026-07-10)

> 다른 계정/세션에서 이어받기 위한 인수인계 문서. 프로젝트 규칙은 상위 [CLAUDE.md](../../CLAUDE.md), 디자인 SoT는 [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md), 진행원장은 [.superpowers/sdd/progress.md](.superpowers/sdd/progress.md) 참조.

---

## 0. 한 줄 요약
비비드 블루 리디자인 + 코드리뷰 반영 + **S1 Supabase 실연동 + S2 통계 비콘 + S3 관리자 인증 + S4 관리자 링크 CRUD + S5 관리자 사이트 설정 + S6 요약 통계 대시보드 전부 완료 및 커밋됨**(test 178 pass, lint/build clean). **S0~S7 전체 개발 슬라이스 완료.** 다음 단계는 전체 브랜치 최종 통합 여부와 Vercel 실 배포 — 사용자 확인 대기.

---

## 1. 프로젝트 기본 정보
- **위치**: `C:\Users\user\my-claude\for_Release\gobang-linktree` (git repo, 브랜치 `feature/gobang-linktree`)
- **스택**: Next.js 16 (App Router, Turbopack) + TS + **Tailwind v4**(설정은 `src/app/globals.css`의 `@theme`, `tailwind.config.js` 없음) + Supabase + Vercel. 폰트 Pretendard 단일.
- **로컬 포트**: 3939 (`시작 3939.bat`, dev 스크립트 `next dev -p 3939` 하드코딩)
- **검증 커맨드**:
  - 테스트: `npx vitest run`
  - 린트: `npm run lint` (⚠️ `next lint`는 Next 16에서 제거됨 — `eslint` 직접 실행)
  - 빌드: `npx next build`
  - 프리뷰: launch.json 서버명 **`gobang-linktree`** (port 3939)
- **Supabase 연동 완료**: 프로젝트 `emjgjfkacaterqwvveuo` 생성됨, `.env.local`에 URL/anon/service_role/`ADMIN_PASSWORD=REDACTED` 세팅 완료(gitignore됨, 커밋 안 됨). `links`(0001)·`events`(0002) 마이그레이션 적용 완료. `getLinks()`는 env 있으면 실 조회, 없으면 SEED_LINKS 폴백.
- **Supabase 마이그레이션 적용 방법**: DB 비밀번호가 없어 CLI(`supabase db push`)는 못 씀 — 대시보드 SQL Editor(`https://supabase.com/dashboard/project/emjgjfkacaterqwvveuo/sql/new`)에 파일 내용을 직접 붙여넣어 실행하는 방식으로 진행함. **RLS 정책만으론 부족 — `grant insert/select on <table> to anon;`을 반드시 같이 실행**해야 anon이 실제로 접근 가능(0001 적용 때 이걸 빼먹어서 permission denied 겪음, 0002부터는 마이그레이션 파일에 처음부터 포함).

---

## 2. 이번에 한 일 (완료)

### 2-A. 비비드 블루 리디자인 (테마 전환)
레퍼런스 `gobangmkt.github.io/kakao-openchat-ad`("청년정보 BI 비비드 블루") 감성 이식. **기존 "비비드 블록"(틸/라임/크림/2px 블랙보더/하드오프셋) 전면 폐기.**
파이프라인 준수: grill-me → ui-ux-pro-max → to-issues(RD 분할) → 3.5 리소스(추가 없음) → frontend-design + tdd + icon-design.

- **R1 토큰** (`src/app/globals.css`): `#1B4DFF`(primary)/`#163FD6`/`#0B2EAE` + blue-50/100 틴트 + ink `#0E1525`/ink-2 `#3A4760`/muted `#7E8AA6` + bg `#F3F6FD` + border `#E5EBF7`/border-strong `#D3DCF0`. radius 12/18/26, 소프트 그림자(`--sh-sm`/`--sh`) + 블루 글로우(`--sh-blue`), `.reveal` 스태거 애니메이션.
- **R2 히어로** (`ProfileHeader.tsx` + `page.tsx`): 풀블리드 블루 블록 + 둥근 하단(30px) + 떠있는 반투명 도형 + 900 헤딩. 히어로만 풀블리드, 나머지는 max-w-480 컨테이너 + 섹션별 stagger delay.
- **R3 아이콘** (`src/components/icons/*`): icon-design 스킬(TOSSFACE) **fill 전용 다색, viewBox 0 0 20 20**. `IconBase`가 stroke→fill 래퍼로 전환, `TI` 팔레트 export.
- **R4 링크카드** (`LinkButton.tsx`): 흰 소프트 카드(1.5px 보더 + 소프트 그림자) + blue-50 아이콘칩 + 제목/부제 + 셰브론. hover 시 블루 보더 + 글로우 링.
- **R4 소셜** (`SocialRow.tsx`): blue-50 라운드 칩 + hover blue-100/리프트.
- **R5 제휴 CTA** (`AffiliateButton.tsx`): 아웃라인(블루 보더 + 블루 텍스트), hover blue-50. Footer muted.
- **R6 브랜드 자산**: `icon.svg`·`apple-icon.tsx`(블루 + 흰 하우스 마크), `opengraph-image.tsx`(풀블리드 블루 히어로 OG).
- 접근성 대비 검산: 화이트 on `#1B4DFF`=5.9:1, ink-2=9.4:1, muted=3.46:1(캡션 전용). focus=블루 글로우 링(box-shadow), reduced-motion 존중.
- ✅ 데스크톱/375px 라이브 렌더 검증 완료(1차 리디자인분).

### 2-B. 사용자 추가 수정
1. ✅ 히어로 텍스트(고방, bio) + 로고 박스 **가운데 정렬** (`items-center text-center`)
2. ✅ 로고 박스: GYI 텍스트 제거 → **원본 PNG `public/bi.png`(450×450 정사각)** 를 흰 박스 안에 `<img>` object-contain으로 렌더 (사용자가 직접 배치)
3. ✅ **공식 홈페이지 CTA(글래스 필) 삭제** (남은 "공식 홈페이지"는 홈 소셜 아이콘의 aria-label일 뿐)
4. ✅ **블로그 아이콘** → 네이버 블로그 인지형(그린 `#03C75A` 라운드 스퀘어 + 흰 'b')
5. ✅ **인스타그램** 추가 (블로그–유튜브 사이): `InstagramIcon.tsx`, url `https://www.instagram.com/gobang.kr`
6. ✅ **카카오톡 오픈채팅** 추가 (유튜브 오른쪽): `KakaoIcon.tsx`, url `https://open.kakao.com/o/gspAuZ5`
   - `config.ts` social 순서: **home → blog → instagram → youtube → kakao (5개)**
   - `getLinkIcon.tsx` ICON_MAP에 instagram/kakao 등록
   - 브랜드 인지 위해 소셜 아이콘은 브랜드색 사용(네이버 그린/인스타 마젠타/유튜브 레드/카카오 옐로우) — icon-design의 flat·fill·no-gradient 원칙 유지, 팔레트만 브랜드색으로 확장(의도된 예외).

**검증 상태**: `npx vitest run` = **42 pass**, `npm run lint` = clean, `npx next build` = 성공(전 라우트 정적 생성).
실서버(3939) 렌더 HTML 구조·치수 검증 완료: bi.png(`src="/bi.png"`) 렌더 / 히어로 `items-center text-center` / CTA 제거 / 소셜 5개 순서·href 정확 / 소셜 칩 48px×5 + gap 12px×4 = 288px ≤ 375px 가용폭(335) → 한 줄 fit, 오버플로우 없음 / bi.png 정사각이라 박스에 여백 없이 안착.
- ⚠️ 신규 fill-only 아이콘 3종(블로그 b / 인스타 카메라 / 카카오 말풍선)은 재현 도형이라, 실제 화면에서 취향에 맞게 **미세 튜닝 여지** 있음(선택).

---

## 3. 남은 일 / 후속 (우선순위 순)

### 3-A. 리디자인 마감
- [x] **문서 드리프트 정리**: `docs/DESIGN_SYSTEM.md` §6·§8을 가운데 정렬/CTA 삭제/소셜 5개(브랜드색 예외)/로고 이미지/fill-only 아이콘 실태에 맞게 갱신 완료
- [x] **OG 이미지 bi.png로 통일**: `opengraph-image.tsx`가 "GYI" 텍스트 대신 `public/bi.png`를 base64 data URI로 인라인해 히어로와 동일 아이덴티티로 렌더(라이브 렌더 확인 완료)
- [x] **신규 소셜 아이콘 3종**: 칩 배경 rect를 `IconChipBg` 공유 프리미티브로 추출, `InstagramIcon`의 `#FFFFFF` 하드코딩을 `TI.white`로 교체. 픽셀 단위 시각 미세 튜닝은 로컬 3939 포트가 사용자 기존 dev 서버로 점유돼 preview 스크린샷 도구를 못 붙여 **미실시** — 필요 시 그 서버 종료 후 재검증.
- [x] `/code-review high` 실행 → 10건 findings 전부 수정(stroke 아이콘 위반, 본문 텍스트 대비 위반, 죽은 토큰, 아이콘/포커스링/그림자 중복, 문서 드리프트 등). `npx vitest run`=42 pass, lint clean, build clean(경고 0)으로 재검증.
- [x] **버그 발견 및 수정(리뷰 범위 밖)**: Tailwind v4가 프로젝트 전체(md 파일 포함)를 스캔하다 이 문서의 예시 텍스트 `bg-[var(--color-...)]`를 후보 클래스로 오인해 CSS 파싱 실패 → 로컬 dev 서버가 500 에러 상태였음. `globals.css`에 `@import "tailwindcss" source("..")`로 스캔 범위를 `src/`로 제한해 해결.
- [x] **커밋 완료** (`17e23ca` 리디자인+리뷰수정, `4368531` getLinks Supabase 연동).

### 3-B. S2 통계 축적(비콘) — 완료 (2026-07-09)
계획: [docs/superpowers/plans/2026-07-09-s2-events-tracking.md](docs/superpowers/plans/2026-07-09-s2-events-tracking.md), 진행원장: [.superpowers/sdd/progress.md](.superpowers/sdd/progress.md).
- `supabase/migrations/0002_events.sql` — `events` 테이블, anon insert-only RLS(읽기는 S6에서 service_role).
- `src/lib/events/{types,sendBeacon}.ts` — `sendEventBeacon()`, `navigator.sendBeacon` 우선 + fetch keepalive 폴백.
- `src/app/api/events/route.ts` — `POST /api/events`, IP 헤더 전혀 미접근, type enum 검증, click→link_id 필수.
- `src/components/public/PageviewBeacon.tsx` — 마운트 1회 pageview 비콘, page.tsx에 연동.
- `LinkButton`·`AffiliateButton` — `"use client"` 전환 + onClick 비콘(link.id / `"affiliate"`), preventDefault 없음(즉시 이동 유지).
- whole-slice 최종 리뷰(opus) = Ready to merge, Critical/Important 0건.
- **⚠️ S6에서 반드시 지킬 것**: 아그리게이션 쿼리는 `WHERE type = 'click'`로 필터해야 함 — pageview 행도 구조상 link_id를 받을 수 있어 필터 없이 group by하면 클릭 카운트가 오염됨.
- Minor 하드닝 후보(비차단): `/api/events`에 레이트리밋/페이로드 길이 제한 없음, `sendBeacon()`이 false 리턴할 때 fetch 폴백 없음.

### 3-C. S3 관리자 인증 — 완료 (2026-07-09)
계획: [docs/superpowers/plans/2026-07-09-s3-admin-auth.md](docs/superpowers/plans/2026-07-09-s3-admin-auth.md).
- `src/lib/auth/adminSession.ts` — `ADMIN_PASSWORD` 키의 결정적 HMAC(Web Crypto, Edge 호환) 세션 토큰 + `constantTimeEqual`(비번·토큰 비교 둘 다 상수시간).
- `src/app/api/admin/{login,logout}/route.ts` — httpOnly `admin_session` 쿠키(sameSite=lax, path=/, maxAge 7일/0).
- **`src/proxy.ts`**(주의: `middleware.ts` 아님, 아래 §4 참조) — `/admin/*`·`/api/admin/*` 보호, `/admin/login`·`/api/admin/login`만 예외.
- `src/app/admin/(protected)/{layout,LogoutButton,page}.tsx` — 인증된 셸(라우트 그룹, `/admin/login`은 이 레이아웃 미상속).
- `src/app/admin/login/page.tsx` — 로그인 폼.
- whole-slice 최종 리뷰(opus) = Ready to merge, Critical/Important 0건. 리뷰 도중 fetch 에러 미처리 버그 2건(LogoutButton, 로그인 페이지) 발견·수정·재검증 완료.
- **⚠️ 세션 모델 한계(S4+ 인지 필요)**: 개별 세션 폐기 불가(비번 변경=전원 로그아웃), 서버 측 만료 없음(토큰 자체는 비번 로테이션 전까지 영구 유효, 쿠키 maxAge는 브라우저 측 제한일 뿐). "이 기기만 로그아웃"이 필요해지면 타임스탬프+HMAC 재설계 필요.
- Minor(비차단): 쿠키명/옵션 상수가 login/logout/proxy.ts 3곳에 중복 — S4에서 관리 라우트 늘면 공유 헬퍼로 추출 고려.

### 3-D. S4 관리자 링크 CRUD + 드래그 정렬 — 완료 (2026-07-09)
계획: [docs/superpowers/plans/2026-07-09-s4-admin-links-crud.md](docs/superpowers/plans/2026-07-09-s4-admin-links-crud.md).
- `src/app/api/admin/links/{route.ts,[id]/route.ts,reorder/route.ts}` — GET/POST/PATCH/DELETE + 순서 일괄변경, 전부 `createServiceSupabaseClient()`(service_role) 사용, 인증은 기존 `src/proxy.ts`가 담당.
- `src/components/admin/IconSelect.tsx` — ICON_MAP 8키 드롭다운 + 라이브 미리보기.
- `src/app/admin/(protected)/links/{page,LinksManager,LinkForm}.tsx` — 목록/토글/삭제/추가/수정 + 드래그 정렬(네이티브 HTML5 DnD, 신규 패키지 없음). `layout.tsx`에 "링크 관리" 네비 링크 추가.
- `src/lib/admin/reorderLinks.ts` — 드래그 순서 재계산 순수함수.
- whole-slice 최종 리뷰(opus) = With fixes → 반영 후 커밋 완료. 리뷰 중 발견·수정된 것:
  - **보안(Important)**: `link.url`이 검증 없이 공개 페이지 `<a href>`로 렌더돼 `javascript:` 스킴 저장형 XSS 경로였음 → `src/lib/links/isSafeLinkUrl.ts`로 http/https/mailto 화이트리스트 검증 추가(POST/PATCH 양쪽).
  - handleToggleActive/handleDelete/refetch에 가드 없는 fetch(S3에서 두 번 겪은 미처리 예외 패턴 재발) → try/catch + res.ok 체크 + 에러 배너로 수정.
- Minor 하드닝 후보(비차단): icon 필드 서버측 ICON_MAP 검증 없음(UI만 제약), 드래그 재정렬 API 실패 시 낙관적 업데이트 롤백 없음(에러 배너만 표시).

### 3-E. S5 관리자 사이트 설정 — 완료 (2026-07-10)
계획: [docs/superpowers/plans/2026-07-09-s5-admin-site-settings.md](docs/superpowers/plans/2026-07-09-s5-admin-site-settings.md).
- `supabase/migrations/0003_site_settings.sql` — 싱글턴 1행(`id='default'`), anon select-only, 브랜드명/bio/소셜 5종(jsonb)/제휴 이메일·라벨 시드.
- `src/lib/site/getSiteConfig.ts` — `getLinks()`와 동일 패턴(env 있으면 DB, 없으면 정적 `SITE_CONFIG` 폴백). `SiteConfig`(camelCase, 앱)·`SiteSettingsRow`(snake_case, DB) 두 타입의 유일한 변환 지점.
- `src/app/api/admin/settings/route.ts` — GET/PATCH, `isSafeLinkUrl()`(S4 재사용)로 소셜 URL 5종 검증, 이메일 정규식 검증, PATCH는 항상 `id='default'` 고정.
- `src/app/admin/(protected)/settings/{page,SettingsForm}.tsx` — social은 key/label 고정·url만 편집. `layout.tsx`에 "사이트 설정" 네비 추가.
- `src/app/{page,layout,opengraph-image}.tsx` — `SITE_CONFIG` 직접 참조 전부 `getSiteConfig()`로 교체, `layout.tsx`는 `generateMetadata()` 비동기 전환. 저장 시 공개 헤더·소셜·mailto·메타데이터·OG 이미지 3곳 모두 즉시 반영(`/opengraph-image`는 이 변경으로 static→dynamic 전환, 캐싱은 향후 과제).
- whole-slice 최종 리뷰(opus) = With fixes(Minor만) → 영어 에러 메시지 1건 한국어로 수정 후 merge(`0fb0741`).
- Minor 하드닝 후보(비차단): PATCH가 소셜 배열의 key/label 고정을 서버측에서 강제하지 않음(정상 플로우는 안전), `GET /api/admin/settings`는 관리 UI가 서버 컴포넌트 직접 조회를 쓰므로 현재 미사용.

### 3-F. S6 요약 통계 대시보드 — 완료 (2026-07-10)
계획: [docs/superpowers/plans/2026-07-10-s6-stats-dashboard.md](docs/superpowers/plans/2026-07-10-s6-stats-dashboard.md) (커밋 `c8c141b`). 차트는 신규 npm 패키지 없이 커스텀 SVG로 구현(사용자 사전 승인, AskUserQuestion으로 확인).

- `src/lib/stats/{types,aggregate}.ts`(커밋 `3903c27`) — `countByType`/`aggregateClicksByLink`/`aggregateDailyTrend`/`aggregateTopReferrers`/`buildStatsSummary` 순수 함수. `type='click'`/`type='pageview'` 필터링 정확(S2 이월 주의사항 §3-B 준수), `utm_source > referrer hostname > "직접 방문"` 우선순위, 삭제된 링크는 "삭제된 링크"로 표시.
- `src/lib/stats/getStatsSummary.ts`(커밋 `82f2b64` + 수정 `bbddf5b`) — service_role로 `events`(전량, limit 10000)+`links`(id,title) 병렬 조회 후 위 순수 함수로 집계. **태스크 리뷰에서 발견·수정**: 원래 `.order("created_at",{ascending:true}).limit(10000)`이라 10000건 초과 시 최신 이벤트가 잘려나가 최근 추이가 비는 결함이었음(계획서 예시 코드 자체의 결함) → `ascending:false`로 수정. Map 기반 집계라 정렬 방향이 결과 정확성에는 영향 없음(잘리는 대상만 달라짐).
- `src/app/api/admin/stats/route.ts`(커밋 `ad19c81`) — `DELETE`, service_role, `.not("id","is",null)`로 WHERE 없는 delete 우회. 인증은 기존 `src/proxy.ts`가 처리.
- `src/components/admin/{BarChart,LineChart}.tsx`(커밋 `0cd5ad1`) — 신규 패키지 없이 SVG/div 기반, `--color-primary` 단독 사용(신규 CSS 토큰 추가 없음).
- `src/app/admin/(protected)/stats/{page,StatsDashboard}.tsx`(커밋 `5666915`) — KPI 카드(총 방문수/총 클릭수) + 링크별 클릭 순위 BarChart + 7/30일 토글 LineChart + 유입출처 top BarChart + empty state + 통계 초기화(confirm→DELETE→`router.refresh()`, try/catch/finally 정확). `layout.tsx`에 "통계" 네비 추가. **브리프에서 의도적으로 벗어난 부분(태스크 리뷰에서 정당성 검증 완료)**: `page.tsx`가 ESLint `react-hooks/error-boundaries` 룰 때문에 try/catch 안에서 JSX를 반환하지 않도록 구조 조정(결과를 지역 변수에 담아 try/catch 밖에서 조건 분기) — 동작·문구는 원래 계획과 완전 동일.
- **whole-slice 최종 리뷰(opus, base=`c8c141b` head=`5666915`) = With fixes.**
  - **Important 1건(반영·커밋 완료 `be312d7`)**: `BarChart`의 `key={item.label}`이 라벨 중복 시 React key 충돌. 관리자가 클릭 실적 있던 링크를 2개 이상 삭제하면 둘 다 `title:"삭제된 링크"`로 집계돼(`aggregateClicksByLink`) label이 겹치므로 **거의 확실히 발생**. `key={`${item.label}-${index}`}`로 수정, `npm run lint`/`npx next build` 재검증(clean) 후 커밋.
  - Minor 3건(비차단, 후속과제로 보류 결정): (a) `limit(10000)` 초과 시 "총 방문수/총 클릭수" 라벨이 실제로는 "최근 1만 건 내 집계"로 캡되는 의미 괴리(개인 링크트리 규모에선 도달 어려움), (b) `aggregateClicksByLink`/`aggregateTopReferrers`의 동점 정렬이 삽입 순서에 의존해 비결정적, (c) 서로 다른 삭제 링크가 "삭제된 링크" 막대 여러 개로 각각 표시됨(합산 안 됨).
  - 과거 반복 실수 패턴(RLS grant 누락/fetch catch 누락/API 인증 경로 누락/S2 클릭 필터) **전부 재발 없음** 확인됨.

### 3-G. 남은 개발 슬라이스 ([docs/TODO.md](docs/TODO.md))
**S0~S7 전체 개발 슬라이스 완료.**
- 관리자 UI는 본 비비드 블루 디자인 시스템을 상속(DESIGN_SYSTEM §9), `/admin` 로그인은 `.env.local`의 `ADMIN_PASSWORD=REDACTED`로 가능. `/admin/links`·`/admin/settings`·`/admin/stats`에서 실제 CRUD·설정 편집·통계 확인 가능.

**대기 중 사용자 입력**: Vercel 계정(실 배포 시점에만 필요, 로컬 개발은 이미 가능). 전체 브랜치(`feature/gobang-linktree`) 최종 통합 여부도 사용자 확인 필요.

---

## 4. 알아두면 좋은 맥락 / 함정
- **디자인 토큰은 전부 `src/app/globals.css`**의 `:root` + `@theme`. 컴포넌트는 `bg-[var(--color-...)]` 형태 arbitrary value로 참조. 색 바꾸려면 여기부터.
- **아이콘 스타일 결정 이력**: `@icon-design` 스킬은 **stroke 금지·TOSSFACE fill 다색**을 강제. 기존(S7) Lucide식 stroke 라인 세트는 실은 스킬 위반이었음 → 사용자 결정으로 fill 전용 다색으로 전면 교체함. 새 아이콘도 반드시 fill-only·viewBox 0 0 20 20로.
- **focus 스타일**: 기존 `outline-[var(--color-ink)]` → 신규 **블루 글로우 링** `focus-visible:shadow-[0_0_0_4px_var(--color-blue-ring)]` + `focus-visible:outline-none`. 테스트도 이 계약으로 갱신됨.
- **`.reveal`**: globals.css의 stagger 진입 클래스. `animationDelay` 인라인 스타일로 순차. `prefers-reduced-motion`에서 즉시 표시.
- **브라우저 검증 도구**: preview MCP는 자체 서버(port 3939)를 띄워야 동작 → 3939에 이미 dev 서버가 떠 있으면 기동 실패(자체 인스턴스가 필요, 외부 서버엔 부착 불가). claude-in-chrome은 확장 연결 필요. 둘 다 막히면 `curl`로 SSR HTML 구조검증 대체 가능(이번에 그렇게 함).
- **OG 한글 렌더**: Satori 기본 폰트에 한글 없음 → `src/app/fonts/`의 Pretendard **.otf**(비-woff2)를 fs로 읽어 넘김. node_modules 직접 참조 금지(서버리스 번들 누락 위험).
- **로고 파일**: 원본 `public/bi.png`(사용자 제공, 450×450). 이전 벡터 재현본 `public/logo.svg`는 삭제함.
- **Tailwind 스캔 범위**: `globals.css`가 `@import "tailwindcss" source("..")`로 `src/`만 스캔하도록 제한돼 있음(2026-07-09 수정). 이 줄을 지우면 리포 루트의 `.md` 문서에 적힌 Tailwind 아무 문법 예시(예: `bg-[var(--color-...)]`)를 후보 클래스로 오인해 CSS 파싱이 깨지고 dev 서버가 500을 낼 수 있다.
- **`middleware.ts`가 아니라 `proxy.ts`**: Next.js 16.2.10부터 "middleware" 파일 컨벤션이 deprecated고 "proxy"로 바뀜(파일명·export 함수명 둘 다: `middleware.ts`/`export function middleware` → `proxy.ts`/`export function proxy`). `next build` 시 경고 없이 `ƒ Proxy (Middleware)`가 라우트 목록에 뜨는지로 확인 가능. 이 프로젝트의 관리자 라우트 보호 로직은 `src/proxy.ts`에 있다.
- **`.env.local`**: Supabase URL/anon/service_role + `ADMIN_PASSWORD=REDACTED`. gitignore됨, 새 세션/계정에서는 이 파일이 없으므로 `.env.example` 참고해 재구성하거나 기존 값을 전달받아야 함.
- **사용자 입력 URL을 `<a href>`로 렌더할 때는 항상 `src/lib/links/isSafeLinkUrl.ts` 같은 스킴 화이트리스트 검증을 거칠 것**: `javascript:`/`data:` 등은 React가 자동으로 막아주지 않는다(escape는 텍스트 콘텐츠에만 적용됨). S5(사이트 설정)에서 소셜 URL 등 새 입력 필드를 추가할 때도 동일 패턴 적용 필요.
- **ESLint `react-hooks/error-boundaries` 룰**: Server Component에서 `try { ... return <JSX/> ... } catch { return <JSX/> }` 형태로 JSX 반환을 try/catch 블록 안에 두면 lint 에러가 난다(React가 JSX를 즉시 렌더링하지 않아 try/catch가 렌더 에러를 못 잡는다는 규칙, `eslint-config-next`의 `core-web-vitals`에 포함). S6에서 발견됨 — 해결 패턴: try 블록 안에서는 데이터 fetch/에러 캡처만 하고 결과를 지역 변수에 담은 뒤, JSX 반환은 try/catch 블록 밖에서 조건 분기로 처리할 것(`src/app/admin/(protected)/stats/page.tsx` 참고).
- **`react`의 list `key`는 실제로 유일한 값을 써야 한다**: `aggregateClicksByLink`처럼 삭제된 항목을 공통 폴백 라벨("삭제된 링크")로 표시하는 집계에서는 라벨이 중복될 수 있어 `key={label}`이 위험하다 — `key={`${label}-${index}`}` 같이 인덱스를 섞을 것(S6 `BarChart.tsx`에서 발견, whole-slice 리뷰 Important).

---

## 5. 이번 세션에서 변경된 주요 파일
```
docs/DESIGN_SYSTEM.md            비비드 블루로 전면 갱신 (일부 §6 드리프트 잔존)
docs/TODO.md                     RD 리디자인 섹션 추가
.superpowers/sdd/progress.md     RD 완료 기록
src/app/globals.css              토큰 전면 교체 (비비드 블루)
src/app/page.tsx                 히어로 풀블리드 레이아웃 + 스태거
src/app/icon.svg                 블루 하우스 마크
src/app/apple-icon.tsx           블루 하우스 마크
src/app/opengraph-image.tsx      풀블리드 블루 OG (로고는 아직 GYI 텍스트)
src/components/public/ProfileHeader.tsx   히어로: 가운데 정렬 + bi.png 로고 + CTA 삭제
src/components/public/LinkButton.tsx      흰 소프트 카드 + 셰브론
src/components/public/SocialRow.tsx       블루 칩 (5개 소셜)
src/components/public/AffiliateButton.tsx 아웃라인 CTA
src/components/public/Footer.tsx          muted
src/components/icons/IconBase.tsx         fill-only 래퍼 + TI 팔레트
src/components/icons/{Home,Youth,Feed,Series,Youtube,DefaultLink}Icon.tsx  fill 다색 재제작
src/components/icons/BlogIcon.tsx         네이버 그린 b (신규 디자인)
src/components/icons/InstagramIcon.tsx    신규
src/components/icons/KakaoIcon.tsx        신규
src/components/icons/getLinkIcon.tsx      ICON_MAP에 instagram/kakao 추가
src/lib/site/config.ts                    social 5개 (instagram/kakao 추가)
public/bi.png                             원본 로고 (사용자 배치)
+ 관련 __tests__ 갱신 (focus 계약, social 5개, 로고 이미지 등)
```
