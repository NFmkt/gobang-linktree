# 고방 링크트리 — 개발 TODO (수직 슬라이스)

> `@to-issues`로 분할·승인 완료. 스펙: [SPEC.md](./SPEC.md) · 디자인: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
> 각 슬라이스 = 스키마→API→UI→테스트 관통하는 트레이서 불릿. 완료 시 단독 데모·검증 가능.
> 개발 순서: S0 → S1 → (S2·S3 병렬) → (S4·S5 병렬) → S6 → S7

## 진행 현황
- [x] **RD 비비드 블루 리디자인 (2026-07-08)** — 테마 전환 완료. 아래 "리디자인" 섹션 참조.
- [x] S0 워킹 스켈레톤 (HITL) — 리뷰 통과. 실 Supabase/Vercel 연결은 키 확보 후 잔여.
- [x] S1 공개 링크페이지 (AFK) — 리뷰 통과. 로컬 우선(시드 기반), 실 DB 연결은 키 확보 후 스왑.
- [x] S2 통계 축적(비콘) (AFK) — 리뷰 통과. Route Handler(`/api/events`) + sendBeacon(fetch keepalive 폴백) + PageviewBeacon + LinkButton·AffiliateButton 클릭 연동.
- [ ] S3 관리자 인증 (AFK)
- [ ] S4 관리자 링크 CRUD + 드래그 정렬 (AFK)
- [ ] S5 관리자 사이트 설정 (AFK)
- [ ] S6 요약 통계 대시보드 (AFK)
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

## S3 — 관리자 인증 (AFK)

### What to build
`/admin`은 단일 비밀번호(환경변수)로 잠근다. 접속 시 비번 입력 → 통과하면 세션 유지되고 빈 관리자 레이아웃(네비 포함)이 표시된다. 미인증 시 관리 라우트/관리 API 접근 차단.

### Acceptance criteria
- [ ] `/admin` 비번 입력 게이트 (환경변수 비교)
- [ ] 인증 성공 시 세션 유지(쿠키/세션), 재접속 시 유지
- [ ] 미인증 시 관리 페이지·관리 API 접근 차단(리다이렉트/401)
- [ ] 로그아웃 기능
- [ ] 인증 통과/차단 테스트

### Blocked by
- S0

---

## S4 — 관리자 링크 CRUD + 드래그 정렬 (AFK)

### What to build
`/admin/links`에서 링크를 추가·수정·삭제하고, 아이콘을 드롭다운으로 선택, active 토글로 노출 on/off, 드래그로 순서(order)를 변경한다. 변경은 공개 `/`에 즉시 반영된다.

### Acceptance criteria
- [ ] 링크 추가/수정/삭제 (title, url, icon, subtitle, active, thumbnail)
- [ ] 아이콘 드롭다운 선택 (S7 아이콘 세트 연동, 초기엔 기본 세트)
- [ ] active 토글로 노출 제어
- [ ] 드래그 앤 드롭 순서변경 → order 저장
- [ ] 공개페이지 즉시 반영 확인
- [ ] CRUD·정렬 로직 테스트

### Blocked by
- S1, S3

---

## S5 — 관리자 사이트 설정 (AFK)

### What to build
`site_settings`(브랜드명, bio, 로고, 소셜 URL 3종, **제휴 수신 이메일**)를 두고 `/admin/settings`에서 편집한다. 저장 시 공개페이지 헤더·소셜·제휴 `mailto:` 주소에 반영된다. 제휴 이메일은 아무 주소로나 자유롭게 변경 가능(기본 neoflatworks2@gmail.com).

### Acceptance criteria
- [ ] `site_settings` 스키마: brand_name, bio, logo, social(home/blog/youtube), affiliate_email
- [ ] `/admin/settings` 편집 폼 (라벨·검증·저장 피드백)
- [ ] 저장 → 공개 헤더/소셜/mailto 즉시 반영
- [ ] 제휴 이메일 자유 변경 → mailto 버튼에 반영 확인
- [ ] 설정 저장·반영 테스트

### Blocked by
- S1, S3

---

## S6 — 요약 통계 대시보드 (AFK)

### What to build
`/admin/stats`에서 축적된 이벤트를 요약 시각화한다: 총 방문수, 링크별 클릭수 순위(막대), 최근 7/30일 추이(라인), 유입출처 top(막대). 통계 수동 삭제/초기화 기능 포함.

### Acceptance criteria
- [ ] 총 방문수 + 링크별 클릭수 순위(막대)
- [ ] 최근 7일/30일 추이(라인) 전환
- [ ] 유입출처 top(referrer/utm 기준, 막대)
- [ ] 통계 수동 삭제/초기화 (확인 다이얼로그)
- [ ] 데이터 없을 때 empty state
- [ ] 집계 쿼리 테스트

### Blocked by
- S2, S3

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
