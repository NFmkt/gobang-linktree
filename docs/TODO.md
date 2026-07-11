# 고방 링크트리 — 개발 TODO (수직 슬라이스)

> `@to-issues`로 분할·승인 완료. 스펙: [SPEC.md](./SPEC.md) · 디자인: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
> 각 슬라이스 = 스키마→API→UI→테스트 관통하는 트레이서 불릿. 완료 시 단독 데모·검증 가능.
> 개발 순서: S0 → S1 → (S2·S3 병렬) → (S4·S5 병렬) → S6 → S7

## 진행 현황
- [x] **B — 통계 커스텀 날짜 범위 (2026-07-10)** — B1~B3 3개 슬라이스 전부 완료·머지. 아래 "통계 커스텀 날짜 범위" 섹션 참조.
- [x] **A — 관리자 UX 개선 (2026-07-10)** — `/ui-ux-pro-max` 리뷰 기반, A1~A4 4개 슬라이스 전부 완료. 아래 "관리자 UX 개선" 섹션 참조.
- [x] **RD 비비드 블루 리디자인 (2026-07-08)** — 테마 전환 완료. 아래 "리디자인" 섹션 참조.
- [x] S0 워킹 스켈레톤 (HITL) — 리뷰 통과. 실 Supabase/Vercel 연결은 키 확보 후 잔여.
- [x] S1 공개 링크페이지 (AFK) — 리뷰 통과. 로컬 우선(시드 기반), 실 DB 연결은 키 확보 후 스왑.
- [x] S2 통계 축적(비콘) (AFK) — 리뷰 통과. Route Handler(`/api/events`) + sendBeacon(fetch keepalive 폴백) + PageviewBeacon + LinkButton·AffiliateButton 클릭 연동.
- [x] S3 관리자 인증 (AFK) — 리뷰 통과. 비번 게이트(HMAC 세션) + `src/proxy.ts` 보호 + 로그아웃.
- [x] S4 관리자 링크 CRUD + 드래그 정렬 (AFK) — 리뷰 통과(보안 수정 반영). 링크 CRUD·아이콘 선택·active 토글·드래그 정렬.
- [x] S5 관리자 사이트 설정 (AFK) — 리뷰 통과. `/admin/settings` 편집 → 공개 헤더/소셜/제휴 mailto/메타데이터/OG 즉시 반영.
- [x] S6 요약 통계 대시보드 (AFK) — 리뷰 통과(Important 1건 반영 후 merge). KPI+클릭순위+7/30일 추이+유입출처+초기화.
- [x] S7 브랜드 마감 (AFK) — 리뷰 통과. 파비콘·OG(한글 렌더 OK)·아이콘세트 확정·접근성 점검.

---

## RD — 비비드 블루 리디자인 (2026-07-08, 완료)

> 레퍼런스 `gobangmkt.github.io/kakao-openchat-ad` 상속. 기존 "비비드 블록"(틸/라임/크림/하드오프셋) 폐기 → 소프트 SaaS "비비드 블루". 스펙: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

- [x] R1 디자인 토큰 전환 — `globals.css` 비비드 블루(radius·소프트 그림자·블루 글로우·reveal)
- [x] R2 히어로 — `ProfileHeader` 풀블리드 블루(떠있는 도형·글래스 로고칩·900 헤딩·글래스 필) + `page.tsx` 레이아웃/스태거
- [x] R3 아이콘 세트 — icon-design(TOSSFACE) fill 전용 다색, ICON_MAP 6키 + default 재제작
- [x] R4 링크카드+소셜 — 흰 소프트 카드(아이콘칩·셰브론·hover 글로우), 소셜 블루틴트 칩
- [x] R5 제휴 CTA — 아웃라인(블루 보더+블루 텍스트) + Footer muted
- [x] R6 S7 브랜드 자산 — `icon.svg`·`apple-icon`·`opengraph-image` 블루 하우스 마크/풀블리드 블루 OG
- [x] R7 검증 — vitest 41 pass, lint clean, build 성공, 라이브 렌더(데스크톱/375px) 확인, 접근성 대비 검산

---

## S0 — 워킹 스켈레톤 (HITL)

### What to build
Next.js(App Router) + Tailwind + Pretendard 폰트 기반 프로젝트를 세우고, Supabase 연결과 Vercel 배포까지 전 구간을 관통시킨다. `/`에 "고방" 텍스트 한 줄이 뜨고, 로컬(`시작 3939.bat`)과 배포 URL 양쪽에서 확인 가능해야 한다.

### Acceptance criteria
- [ ] `npm run dev`로 localhost:3939 구동, `시작 3939.bat` 동작
- [ ] Tailwind + Pretendard 웹폰트 적용, 디자인 토큰(틸/라임/크림/잉크) 변수화
- [ ] Supabase 클라이언트 연결 확인(환경변수 `.env` + Vercel 환경변수)
- [ ] Vercel 배포 성공, `xxx.vercel.app`에서 "/" 렌더
- [ ] `/`에 "고방" 렌더

### Blocked by
- None — can start immediately (Supabase 프로젝트·Vercel 계정·환경변수 준비 필요 = 3.5단계 리소스 승인과 연계)

---

## S1 — 공개 링크페이지 (AFK)

### What to build
`links` 테이블을 만들고 초기 시드(청년주택 공고확인/청년혜택 모아보기/자취 꿀정보 + 제휴)를 넣는다. 공개 `/`가 DB에서 링크를 읽어 **비비드 블록** 스타일로 렌더한다: 프로필 헤더(로고/브랜드명 "고방"/bio "청년주택 청년혜택 자취 꿀정보") + 소셜 아이콘 3(홈페이지/블로그/유튜브) + 링크 버튼 목록 + 하단 제휴 mailto 버튼. 방문자가 각 링크를 눌러 실제로 이동할 수 있다.

### Acceptance criteria
- [ ] `links` 스키마: title, url, icon, subtitle, order, active, thumbnail
- [ ] 초기 3링크 시드 + URL 연결 (youth/feed/feed/series)
- [ ] 헤더·소셜3·링크버튼 비비드블록 스타일 렌더 (2px 테두리+하드오프셋, 틸/라임)
- [ ] `active=false` 링크는 비노출
- [ ] 제휴 버튼 = `mailto:` (기본 neoflatworks2@gmail.com)
- [ ] 모바일 우선 반응형(≤480 중앙), 터치타깃 ≥44px
- [ ] 링크 렌더/노출로직 테스트

### Blocked by
- S0

---

## S2 — 통계 축적 (비콘) (AFK)

### What to build
`events` 테이블을 만들고, 공개페이지 로드 시 pageview 이벤트(referrer + utm 파라미터 포함)를 기록한다. 링크 클릭 시 `navigator.sendBeacon`으로 click 이벤트(링크 id)를 백그라운드 전송하고 즉시 원래 URL로 이동한다. IP 원문은 저장하지 않는다(익명 집계).

### Acceptance criteria
- [ ] `events` 스키마: type(pageview/click), link_id, referrer, utm_source/medium/campaign, created_at (IP 원문 미저장)
- [ ] 페이지 로드 시 pageview 기록 (referrer+utm 파싱)
- [ ] 링크 클릭 시 sendBeacon 전송 → 즉시 이동 (지연 체감 없음)
- [ ] 제휴 mailto 클릭도 click 이벤트로 집계
- [ ] 이벤트 수집 API 및 기록 로직 테스트

### Blocked by
- S1

### 구현 메모 (2026-07-09 완료)
- `events` 테이블(`supabase/migrations/0002_events.sql`): anon insert-only RLS (읽기는 S6에서 service_role). **S6 아그리게이션 시 반드시 `WHERE type = 'click'`로 필터** — pageview 행도 구조상 link_id를 받을 수 있어 필터 없이 group by하면 카운트가 오염된다(최종 리뷰 소견).
- 브라우저가 Supabase에 직접 쓰지 않고, 자체 `POST /api/events` Route Handler를 거친다 (`navigator.sendBeacon`이 커스텀 헤더를 못 보내서 apikey 인증 불가).
- 공개 write 엔드포인트라 레이트리밋/페이로드 길이 제한은 아직 없음(MVP 의도적 유예, 최종 리뷰 소견 — 실 트래픽 받기 전 하드닝 후보).

---

## S3 — 관리자 인증 (AFK) — 완료 (2026-07-09)

### What to build
`/admin`은 단일 비밀번호(환경변수)로 잠근다. 접속 시 비번 입력 → 통과하면 세션 유지되고 빈 관리자 레이아웃(네비 포함)이 표시된다. 미인증 시 관리 라우트/관리 API 접근 차단.

### Acceptance criteria
- [x] `/admin` 비번 입력 게이트 (환경변수 비교) — `constantTimeEqual` 상수시간 비교
- [x] 인증 성공 시 세션 유지(쿠키/세션), 재접속 시 유지 — httpOnly 쿠키 7일
- [x] 미인증 시 관리 페이지·관리 API 접근 차단(리다이렉트/401)
- [x] 로그아웃 기능
- [x] 인증 통과/차단 테스트

### Blocked by
- S0

### 구현 메모 (2026-07-09 완료)
- 계획: `docs/superpowers/plans/2026-07-09-s3-admin-auth.md`. whole-slice 최종 리뷰(opus) = Ready to merge, Critical/Important 0건.
- 세션 모델: `ADMIN_PASSWORD`를 키로 한 결정적 HMAC(`src/lib/auth/adminSession.ts`, Web Crypto — Edge 런타임 호환) — 별도 세션 저장소 없음. **한계(최종 리뷰 소견, S4+ 인지 필요)**: 개별 세션 폐기 불가(비번 변경만이 전원 로그아웃 방법), 서버 측 만료 없음(쿠키 maxAge만 브라우저 측 제한, 토큰 자체는 비번 로테이션 전까지 영구 유효). "이 기기만 로그아웃"이나 "N시간 후 강제 재로그인"이 필요해지면 타임스탬프+HMAC 재설계 필요.
- **Next.js 16.2.10부터 `middleware.ts`(export `middleware`)가 deprecated → `proxy.ts`(export `proxy`)로 변경됨.** 실제 파일은 `src/proxy.ts`. 신규 프로젝트도 이 컨벤션으로 시작할 것.
- 쿠키명 `admin_session` 상수/옵션 객체가 `login`/`logout`/`proxy.ts` 3곳에 중복(현재는 사소, S4에서 관리 라우트가 늘면 `src/lib/auth/adminCookie.ts` 공유 헬퍼로 추출 고려).

---

## S4 — 관리자 링크 CRUD + 드래그 정렬 (AFK) — 완료 (2026-07-09)

### What to build
`/admin/links`에서 링크를 추가·수정·삭제하고, 아이콘을 드롭다운으로 선택, active 토글로 노출 on/off, 드래그로 순서(order)를 변경한다. 변경은 공개 `/`에 즉시 반영된다.

### Acceptance criteria
- [x] 링크 추가/수정/삭제 (title, url, icon, subtitle, active, thumbnail)
- [x] 아이콘 드롭다운 선택 (IconSelect, ICON_MAP 8키)
- [x] active 토글로 노출 제어
- [x] 드래그 앤 드롭 순서변경 → order 저장 (네이티브 HTML5 DnD, 신규 패키지 없음)
- [x] 공개페이지 즉시 반영 확인 (getLinks()가 매 요청 실 조회 — 별도 캐시 무효화 불필요)
- [x] CRUD·정렬 로직 테스트

### Blocked by
- S1, S3

### 구현 메모 (2026-07-09 완료)
- 계획: `docs/superpowers/plans/2026-07-09-s4-admin-links-crud.md`. whole-slice 최종 리뷰(opus) = With fixes(Important 1건 반영 후 merge 가능).
- 관리 API(`/api/admin/links*`)는 전부 `createServiceSupabaseClient()`(service_role, RLS 우회) 사용, 인증은 기존 `src/proxy.ts`가 처리.
- **보안 수정(최종 리뷰 발견)**: `link.url`이 검증 없이 공개 페이지 `<a href>`로 렌더돼 `javascript:` 스킴 저장형 XSS 경로였음 → `isSafeLinkUrl()`로 http/https/mailto 화이트리스트 검증을 POST/PATCH 양쪽에 추가.
- 신규 링크 생성 시 `id`는 서버가 `crypto.randomUUID()`로 생성, `order`는 클라이언트가 `links.length + 1`로 계산해 전달(서버 max-order 조회 없음 — 저트래픽 단일 관리자 도구라 완벽한 원자성 불필요, delete 후 순서 충돌 가능성은 드래그 재정렬로 자연 치유됨).
- Minor 하드닝 후보(비차단): icon 필드 서버측 ICON_MAP 검증 없음(UI만 제약), 드래그 재정렬 실패 시 롤백/refetch 없음(에러 배너만 표시).

---

## S5 — 관리자 사이트 설정 (AFK) — 완료 (2026-07-10)

### What to build
`site_settings`(브랜드명, bio, 로고, 소셜 URL 3종, **제휴 수신 이메일**)를 두고 `/admin/settings`에서 편집한다. 저장 시 공개페이지 헤더·소셜·제휴 `mailto:` 주소에 반영된다. 제휴 이메일은 아무 주소로나 자유롭게 변경 가능(기본 neoflatworks2@gmail.com).

### Acceptance criteria
- [x] `site_settings` 스키마: brand_name, bio, social(home/blog/instagram/youtube/kakao 5종 jsonb), affiliate_email, affiliate_label — 싱글턴 1행(`id='default'`). `logo`는 별도 컬럼 없음(로고는 정적 `public/bi.png`, `logoLabel`은 DB 미저장·정적값 유지, S7에서 확정된 결정)
- [x] `/admin/settings` 편집 폼 (라벨·검증·저장 피드백) — social은 key/label 고정·url만 편집
- [x] 저장 → 공개 헤더/소셜/mailto/메타데이터/OG 이미지 즉시 반영 (`getSiteConfig()` 단일 소스)
- [x] 제휴 이메일 자유 변경 → mailto 버튼에 반영 확인
- [x] 설정 저장·반영 테스트

### Blocked by
- S1, S3

### 구현 메모 (2026-07-10 완료)
- 계획: `docs/superpowers/plans/2026-07-09-s5-admin-site-settings.md`. whole-slice 최종 리뷰(opus) = With fixes(Minor만, 병합 차단 없음) → 영어 에러 메시지 1건 한국어로 수정 후 merge(`0fb0741`).
- 데이터 레이어: `src/lib/site/getSiteConfig.ts` — `getLinks()`와 동일 패턴(env 있으면 DB, 없으면 정적 `SITE_CONFIG` 폴백). `SiteConfig`(camelCase, 앱 레이어)·`SiteSettingsRow`(snake_case, DB 레이어) 두 타입의 경계가 이 함수 하나로만 지켜짐 — 관리 API/UI는 snake_case, 공개 페이지/OG/메타데이터는 camelCase.
- 관리 API(`/api/admin/settings`)는 `createServiceSupabaseClient()`(service_role) + `src/proxy.ts` 보호, `isSafeLinkUrl()`(S4 재사용, 재구현 안 함)로 소셜 URL 5종 서버측 검증. PATCH는 항상 `id='default'` 고정(body의 id 무시), INSERT/DELETE 엔드포인트 없음 — 싱글턴 무결성 유지.
- 공개 페이지·`layout.tsx`(`generateMetadata` 비동기 전환)·`opengraph-image.tsx` 3곳 전부 `getSiteConfig()`로 연동 → 관리자 저장 시 즉시 반영(단, `/opengraph-image`는 이번 변경으로 static→dynamic 전환, 캐싱은 향후 과제).
- Minor 하드닝 후보(비차단): PATCH가 social 배열의 key/label 고정을 서버측에서 강제하지 않음(정상 플로우는 클라이언트가 보존하므로 안전, 방어적으로 서버 병합 고려 가능), `GET /api/admin/settings`는 관리 UI가 서버 컴포넌트에서 직접 조회해 실제로는 미사용(데드코드는 아니고 향후 클라이언트 전용 확장 대비용으로 유지).

---

## S6 — 요약 통계 대시보드 (AFK) — 완료 (2026-07-10)

### What to build
`/admin/stats`에서 축적된 이벤트를 요약 시각화한다: 총 방문수, 링크별 클릭수 순위(막대), 최근 7/30일 추이(라인), 유입출처 top(막대). 통계 수동 삭제/초기화 기능 포함.

### Acceptance criteria
- [x] 총 방문수 + 링크별 클릭수 순위(막대)
- [x] 최근 7일/30일 추이(라인) 전환
- [x] 유입출처 top(referrer/utm 기준, 막대)
- [x] 통계 수동 삭제/초기화 (확인 다이얼로그)
- [x] 데이터 없을 때 empty state
- [x] 집계 쿼리 테스트

### Blocked by
- S2, S3

### 구현 메모 (2026-07-10 완료)
- 계획: `docs/superpowers/plans/2026-07-10-s6-stats-dashboard.md`. 차트는 신규 npm 패키지 없이 커스텀 SVG로 구현(사용자 사전 승인, AskUserQuestion으로 확인).
- `src/lib/stats/{types,aggregate}.ts` — 순수 집계 함수. `type='click'`으로 필터해 S2 이월 주의사항(pageview 오염 방지) 준수, utm_source > referrer hostname > "직접 방문" 우선순위, 삭제된 링크는 "삭제된 링크"로 표시.
- `src/lib/stats/getStatsSummary.ts` — service_role로 events(limit 10000, `ascending:false`)+links 병렬 조회 후 집계. **태스크 리뷰에서 발견·수정**: 원래 계획서 예시가 `ascending:true`라 10000건 초과 시 최신 이벤트가 잘려나가는 결함이었음.
- `src/app/api/admin/stats/route.ts` — DELETE, service_role, `.not("id","is",null)`로 WHERE 없는 delete 우회.
- `src/components/admin/{BarChart,LineChart}.tsx` — SVG/div 기반, `--color-primary` 단독 사용. **whole-slice 리뷰 Important 반영**: `key={item.label}`이 "삭제된 링크" 라벨 중복 시 React key 충돌 → `key={`${item.label}-${index}`}`로 수정.
- `src/app/admin/(protected)/stats/{page,StatsDashboard}.tsx` — KPI 카드+클릭순위+7/30일 토글+유입출처+empty state+초기화(confirm→DELETE→router.refresh).
- whole-slice 최종 리뷰(opus) = With fixes → Important 1건(위 BarChart key) 반영 후 커밋.
- Minor 하드닝 후보(비차단, 후속 과제로 보류): (a) `limit(10000)` 초과 시 "총 방문수/총 클릭수" 라벨이 실제로는 "최근 1만 건 내 집계"로 캡되는 의미 괴리, (b) 동점 정렬이 삽입 순서에 의존해 비결정적, (c) 서로 다른 삭제 링크가 "삭제된 링크" 막대 여러 개로 각각 표시(합산 안 됨).
- **이 시점에 S0~S7 전체 개발 슬라이스 완료.**

---

## S7 — 브랜드 마감 (AFK)

### What to build
icon-design 스킬로 틸 라인 아이콘 세트(링크 드롭다운용)와 GYI 파비콘을 제작하고, OG 메타 태그(공유 미리보기: 로고+제목+bio)를 넣는다. 접근성(대비/focus/aria)과 prefers-reduced-motion 최종 점검.

### Acceptance criteria
- [ ] icon-design 틸 라인 아이콘 세트 (스트로크·스타일 통일)
- [ ] GYI 청록 파비콘
- [ ] OG 태그(og:title/description/image) — 카톡/SNS 공유 미리보기 정상
- [ ] 접근성: 대비 4.5:1, focus ring, 아이콘 버튼 aria-label
- [ ] prefers-reduced-motion 대응 확인

### Blocked by
- S1

---

## 관리자 UX 개선 (2026-07-10) — 완료

> `/ui-ux-pro-max` 리뷰(2026-07-10) → `@grill-me`로 4개 결정 분기 확정 → `@to-issues`로 A1~A4 분할·승인 → `@subagent-driven-development`로 순차 TDD 구현. 전부 AFK, 상호 독립(A3·A4만 같은 파일이라 순차 진행).

### 구현 메모 (2026-07-10 완료)
- 태스크별 구현 + 리뷰(spec+quality) + 전체 브랜치 최종 리뷰(opus) "Ready to merge: Yes" 통과 후 main에 병합(merge commit `f328368`).
- A1 리뷰에서 Important 1건(`docs/DESIGN_SYSTEM.md`에 옛 danger 색상값 잔존) 발견 → 수정 후 재리뷰 승인.
- A3 리뷰에서 Important 1건(`ToggleSwitch`가 기존 `<label>` 대비 접근성 이름 손실) 발견 → `aria-label`을 필수 prop으로 만들어 재발 방지 → 재리뷰 승인.
- 전체 브랜치 최종 리뷰에서 Important 2건 추가 발견: (a) A2가 만든 `AdminNav`의 nav 링크가 A3의 44px 버튼 스윕 대상(`<button>`)에서 빠짐(둘 다 `<Link>`라 사각지대) → `min-h-11` 추가로 통일, (b) 이 TODO 섹션이 워크트리에 반영이 안 돼 계획 추적성이 끊김 → cherry-pick으로 반영.
- 신규 파일: `src/lib/color/contrastRatio.ts`(대비 검증 유틸), `src/app/admin/(protected)/AdminNav.tsx`(active tab), `src/components/admin/ToggleSwitch.tsx`(커스텀 토글).

## A1 — danger 색상 토큰 교체 (AFK) — 완료

### What to build
`--color-danger`(#e5484d)가 흰 배경 대비 약 3.9:1로 WCAG AA(4.5:1) 미달. 색상값 자체를 더 어두운 톤(#d1373c 부근)으로 교체해 폰트 굵기와 무관하게 전역에서 대비를 확보한다.

### Acceptance criteria
- [x] `globals.css`의 `--color-danger` 토큰 교체
- [x] 교체 색상이 흰 배경(`--color-surface`/`--color-bg`) 대비 4.5:1 이상
- [x] 로그인/링크폼/설정폼 에러 메시지, 삭제 버튼, 통계 초기화 버튼에 자동 반영 확인 (별도 하드코딩 없음)

### Blocked by
- None — can start immediately

---

## A2 — 관리자 헤더 active 탭 표시 (AFK) — 완료

### What to build
관리자 헤더의 3개 탭(링크 관리/사이트 설정/통계)에 현재 위치를 표시하는 active state가 없다. `usePathname()`으로 현재 경로를 비교해 활성 탭에 `text-[var(--color-primary)] font-bold`를 적용한다.

### Acceptance criteria
- [x] 각 탭 클릭 시 해당 경로에서 자신만 active 스타일로 표시
- [x] 비활성 탭은 기존 hover 스타일 유지
- [x] 레이아웃이 서버 컴포넌트라 필요 시 탭 네비게이션만 클라이언트 컴포넌트로 분리 (`AdminNav.tsx` 신설)

### Blocked by
- None — can start immediately

---

## A3 — 터치 타깃 확대 + 노출 토글 스위치 (AFK) — 완료

### What to build
관리자 페이지 전반의 버튼(헤더 탭, 수정/삭제, 저장/취소, 통계 초기화 등)이 44px 미만으로 터치 타깃 기준 미달. 전체 버튼에 `min-h-11`(44px) 이상을 적용하고, "노출" 체크박스(네이티브)를 디자인 토큰 기반 커스텀 토글 스위치 컴포넌트로 교체한다.

### Acceptance criteria
- [x] 관리자 페이지 내 모든 클릭 가능 버튼이 44×44px 이상 (헤더 nav 링크 포함, 최종 리뷰에서 사각지대 발견 후 반영)
- [x] 커스텀 토글 스위치 컴포넌트 신설(디자인 토큰 사용, 키보드 접근 가능 — Enter/Space 토글, `aria-label` 필수 prop)
- [x] `LinksManager`의 "노출" 체크박스를 신규 토글로 교체, 기존 `handleToggleActive` 로직과 연동
- [x] 토글 컴포넌트 단위 테스트

### Blocked by
- None — can start immediately

---

## A4 — 링크 재정렬 키보드 대안 (AFK) — 완료

### What to build
`LinksManager`의 드래그 앤 드롭 재정렬은 키보드/스크린리더 대안이 없다. 각 링크 행에 위/아래 이동 버튼을 추가해 기존 드래그 기능과 병행 유지한다. 삭제/통계초기화의 `window.confirm()`은 변경하지 않는다.

### Acceptance criteria
- [x] 각 링크 행에 위/아래 이동 버튼 추가 (맨 위/맨 아래에서는 해당 방향 버튼 비활성화)
- [x] 버튼 클릭 시 기존 `reorderLinks` + `/api/admin/links/reorder` 흐름 재사용 (`performReorder` 헬퍼로 드래그 경로와 통합)
- [x] 기존 드래그 앤 드롭 기능은 그대로 유지 (회귀 없음)
- [x] 재정렬 로직 테스트 (위/아래 버튼 기준)

### Blocked by
- None — can start immediately (A4 완료)

---

## 통계 커스텀 날짜 범위 (2026-07-10)

> `/ui-ux-pro-max` 리뷰 후속 논의 → `@grill-me`로 6개 결정 분기 확정 → `@to-issues`로 B1~B3 분할·승인. 데이터 레이어→API→UI 순차 의존(각 슬라이스는 유닛/통합/컴포넌트 테스트로 독립 검증 가능).

## B1 — 통계 집계 데이터 레이어 — 날짜 범위 지원 (AFK)

### What to build
`src/lib/stats/aggregate.ts`·`getStatsSummary.ts`를 `from~to` 날짜 범위 기반으로 확장한다. 현재 `dailyTrend7`/`dailyTrend30` 이분법 대신 선택 범위 전체의 일별 포인트를 생성하고, `pageviewsWeekOverWeek`(고정 7일 비교)는 "선택 기간 vs 직전 동일 길이 기간" 비교로 일반화한다. events 조회가 limit(10000)에 도달했는지를 나타내는 `capped: boolean` 플래그를 결과에 추가한다.

### Acceptance criteria
- [x] 일별 추이 집계가 임의의 `from~to` 범위에 대해 하루 단위 포인트를 생성 (기존 `dailyTrend7`/`dailyTrend30` 이분 API는 제거하거나 이 범위 기반 함수로 대체)
- [x] 기간 대비 배지 로직이 "선택 기간 vs 직전 동일 길이 기간"으로 일반화 (예: 7일 범위면 기존과 동일, 30일이면 직전 30일과 비교)
- [x] KPI(총 방문/총 클릭/클릭률), 링크별 순위, 요일분포, 유입출처, 캠페인 전부 `from~to` 범위로 필터링된 이벤트 기준으로 재계산
- [x] events 조회 결과 건수가 limit(10000)과 같으면 `capped: true` 반환
- [x] 순수 함수 유닛 테스트로 범위 필터링·일반화된 배지 로직·capped 플래그 검증

### Blocked by
- None — can start immediately

---

## B2 — API 라우트 — GET /api/admin/stats?from=&to= (AFK)

### What to build
B1의 확장된 집계 함수를 호출하는 Route Handler를 신설한다. 쿼리 파라미터로 `from`/`to`(ISO 날짜)를 받아 검증하고, 결과를 기존 `StatsSummary` 형태 + `capped` 필드로 응답한다.

### Acceptance criteria
- [x] `GET /api/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD` — 인증된 관리자만 접근 가능 (기존 `src/proxy.ts` 보호 재사용)
- [x] 날짜 파라미터 누락·형식 오류·`from > to` 등 잘못된 범위는 400 응답
- [x] 응답 바디에 B1의 `capped` 플래그 포함
- [x] Route Handler 통합 테스트 (정상 범위, 잘못된 파라미터, 캡 도달 케이스)

### Blocked by
- B1

---

## B3 — 클라이언트 UI — 프리셋+커스텀 피커, 재조회, 캡 배너 (AFK)

### What to build
`StatsDashboard.tsx`의 기존 7일/30일 토글을 프리셋(오늘/7일/30일/이번달/지난달/전체) + 커스텀 시작~종료일 피커로 대체한다. 날짜 범위가 바뀔 때마다 B2 API를 재조회하고, 로딩 상태를 표시하며, `capped: true`면 "선택한 기간 중 일부만 집계되었을 수 있음" 경고 배너를 보여준다. 페이지 진입 시 기본값은 최근 7일.

### Acceptance criteria
- [x] 프리셋 6종(오늘/7일/30일/이번달/지난달/전체) 버튼 + 커스텀 시작~종료일 입력
- [x] 범위 변경 시 B2 API 재조회, 재조회 중 로딩 상태 표시
- [x] `capped: true` 응답 시 경고 배너 표시
- [x] 기본 진입 시 최근 7일 범위로 초기 로드
- [x] 기존 7/30일 토글 완전히 대체 (제거)
- [x] 컴포넌트 테스트 (프리셋 전환, 커스텀 범위 입력, 캡 배너 표시) + 브라우저 수동 확인

### Blocked by
- B2
