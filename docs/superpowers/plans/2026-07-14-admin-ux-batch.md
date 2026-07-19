# 2026-07-14 관리자 UX 배치 (Issues #1~#7)

브랜치: `feature/admin-ux-batch-2026-07-14`
관련 이슈: https://github.com/NFmkt/gobang-linktree/issues/1 ~ /7

## Global Constraints

- 기존 확정된 디자인 토큰(색상/타이포그래피, `globals.css`의 "비비드 블루" 테마)을 그대로 상속한다. 새 컬러 팔레트를 새로 정의하지 않는다.
- 아이콘이 필요하면 기존 `ICON_MAP`/fill 전용 다색 아이콘 세트를 재사용한다. 신규 아이콘 스타일을 만들지 않는다.
- 모든 신규 로직은 TDD(RED→GREEN→REFACTOR)로 작성하고, 기존 테스트 스위트(`npm test`)와 `npm run lint`, `next build`를 통과해야 한다.
- 동일 테스트가 3회 연속 실패하면 즉시 중단하고 에러 로그와 함께 보고한다(자율 수정 금지).
- 마이그레이션 작성 시 `anon`과 `service_role` 양쪽 GRANT를 반드시 포함한다 (과거 S1에서 GRANT 누락으로 겪은 실수, HANDOFF.md에 문서화됨).
- 공개 API 라우트(`/api/affiliate-inquiries`)는 인증 없이 호출되므로 입력 검증을 서버에서 반드시 수행한다.
- 각 태스크는 완료 후 해당 GitHub Issue에 진행 코멘트를 남긴다.
- push는 하지 않는다. 전부 완료 후 사용자 확인 후 push.

## Task 1 — 통계 탭 컴포넌트 재배치 (Issue #1)

`src/app/admin/(protected)/stats/StatsDashboard.tsx`에서 "요일별 방문 분포" 컴포넌트를 제거하고, "링크별 클릭수"를 그 자리로, 기존 "링크별 클릭수" 자리에 "링크트리 유입 출처"를 배치한다. 데이터 집계 로직(`src/lib/stats/aggregate.ts` 등)은 변경하지 않는다. `weekdayDistribution` 같은 요일별 집계가 다른 곳에서 쓰이지 않으면 죽은 코드가 남지 않게 관련 렌더 블록만 제거한다(집계 함수 자체 삭제는 사용 여부 확인 후 판단, 확실치 않으면 유지).

기존 테스트가 있다면 새 순서에 맞게 갱신한다.

## Task 2 — 사이트 설정 폼 중앙 정렬 (Issue #4)

`src/app/admin/(protected)/settings/SettingsForm.tsx`의 form 요소(현재 `max-w-[480px]`)에 `mx-auto`를 추가해 가운데 정렬한다. 트리비얼 CSS 변경, 테스트는 기존 렌더 테스트가 있으면 회귀 없는지 확인.

## Task 3 — 링크 관리 리스트 아코디언화 (Issue #3)

`src/app/admin/(protected)/links/LinksManager.tsx`의 각 링크 행 골격(세로 리스트, 가로 한 줄)은 유지하되, 상세 편집 컨트롤을 클릭 시 펼쳐지는 아코디언으로 감싼다. 기본 상태는 아이콘/제목/URL/노출 토글만 보이는 요약 뷰. 순서 이동(▲▼)·삭제·드래그(`reorderLinks`) 기능에 회귀가 없어야 한다.

## Task 4 — 방문 추이 차트 recharts 전환 (Issue #2)

`package.json`에 `recharts` 추가. `src/components/admin/LineChart.tsx`를 recharts의 `LineChart`/`XAxis`/`YAxis`/`Tooltip`/`CartesianGrid` 조합으로 재작성한다. x축에 날짜 라벨을 표시하고 (`tickFormatter`), 포인트가 많을 때 `interval`을 자동/적절히 조절해 라벨이 겹치지 않게 한다. 호버 시 툴팁에 날짜+값 표시. 기존 60개 초과 시 마커 생략 최적화는 recharts의 `dot={false}` 등으로 동등하게 처리. 기존 색상 토큰(`--color-primary` 등)만 사용.

## Task 5 — 링크별 유입경로 도넛차트 추가 (Issue #7)

`src/components/admin/LinkMediumTable.tsx` 상단에 recharts `PieChart`(donut, `innerRadius` 지정)로 전체 `utm_medium`별(미지정 포함) 비중을 표시. 기존 상세 테이블은 그대로 유지. Task 4에서 확립한 recharts 스타일(색상/폰트)을 재사용.

## Task 6 — 관리자 "제휴 문의" 탭 + 시트 링크 설정 필드 (Issue #5)

1. 마이그레이션 `supabase/migrations/0005_site_settings_affiliate_sheet_url.sql` — `site_settings`에 `affiliate_sheet_url text` 컬럼 추가. **anon(select)과 service_role(전체) 양쪽 GRANT 확인 및 포함** (기존 0003 마이그레이션 패턴 참고).
2. `src/lib/site/config.ts`의 사이트 설정 타입/기본값에 `affiliateSheetUrl` 필드 추가.
3. `src/app/api/admin/settings/route.ts`의 GET/PATCH에 `affiliate_sheet_url` 필드 추가.
4. `SettingsForm.tsx`에 이 URL을 입력하는 필드 추가 (일반 텍스트/URL input, 필수 아님).
5. `src/app/admin/(protected)/layout.tsx`의 `AdminNav`에 "제휴 문의" 탭 추가. 이 탭은 별도 페이지를 렌더하지 않고, 클릭 시 설정된 `affiliate_sheet_url`을 `target="_blank"`로 새 탭 오픈. 값이 비어있으면 클릭 시 "관리자 설정에서 시트 링크를 먼저 등록하세요" 안내(alert 또는 disabled 스타일 + 툴팁).

## Task 7 — 제휴 문의 API 라우트 (스팸 방지 + 웹훅 포워딩) (Issue #6 part 1)

신규 `src/app/api/affiliate-inquiries/route.ts` (공개 POST, 인증 없음).

입력 스키마: `companyName`(필수), `phone`(선택), `email`(선택, `phone`/`email` 중 최소 1개 필수), `inquiryType`(`"ad" | "content" | "other"` 중 하나, 필수), `message`(필수), `honeypot`(문자열, 비어있어야 함), `formRenderedAt`(ISO timestamp 또는 epoch ms, 폼이 렌더된 시각).

검증 로직:
- `honeypot`이 비어있지 않으면 400 없이 그냥 200 반환(봇에게 성공처럼 보이게 해서 재시도 유도 방지) 하지만 실제로는 웹훅을 호출하지 않는다.
- `Date.now() - formRenderedAt < 3000`(3초 미만)이면 같은 방식으로 조용히 무시(200 반환, 웹훅 미호출).
- `companyName`/`inquiryType`/`message` 누락 시 400.
- `phone`과 `email`이 둘 다 없으면 400.
- `inquiryType`이 허용값 밖이면 400.

통과 시 `process.env.GAS_AFFILIATE_WEBHOOK_URL`로 `fetch` POST (JSON body: companyName/phone/email/inquiryType/message + 서버 타임스탬프). env 변수가 없으면 500 + 로그. 웹훅 호출이 실패(네트워크 오류, non-2xx)하면 502 반환.

성공 시 200 `{ ok: true }`.

## Task 8 — 제휴 문의 폼 프론트엔드 (아코디언 + mailto 병기) (Issue #6 part 2)

`src/components/public/AffiliateButton.tsx`를 확장(또는 옆에 신규 `AffiliateInquiryForm.tsx` 클라이언트 컴포넌트 추가):
- 버튼 클릭 시 아코디언이 펼쳐지며, 그 안에 기존 mailto 이메일 주소 표시 + Task 7의 API로 제출하는 폼이 함께 보임.
- 폼 필드: 회사명/소속(text, required), 전화번호(tel, optional), 이메일(email, optional), 문의유형(select: 광고 문의/콘텐츠 제휴/기타), 문의내용(textarea, required). 클라이언트 사이드로 전화/이메일 중 최소 1개 필수 검증(제출 전 막기).
- 허니팟: 화면에 보이지 않는 hidden input(`honeypot`), CSS로 시각적으로 숨김(스크린리더에도 숨김: `aria-hidden` + `tabIndex={-1}` + off-screen). `formRenderedAt`은 컴포넌트 마운트 시점의 `Date.now()`를 hidden input 또는 state로 보관해 제출 시 함께 전송.
- 제출 중 로딩 상태, 성공 시 폼 영역이 "문의가 접수되었습니다" 완료 문구로 교체, 실패 시 폼 유지 + 에러 메시지 + 재시도 가능(재제출 버튼은 그냥 폼을 다시 보여주는 것으로 충분).
- 기존 클릭 비콘(`sendEventBeacon`) 로직은 유지.
- 기존 테마 토큰만 사용(신규 색상 금지), 기존 버튼/폼 스타일 상속.

## Task 9 — Apps Script 배포 가이드 + docs/SPEC.md 갱신 (Issue #6 part 3)

리포지토리에 커밋할 파일이 아니라, 사용자에게 전달할 Google Apps Script 코드와 배포 가이드를 별도 문서(`docs/affiliate-inquiry-apps-script.md`)로 작성한다:
- 구글시트 생성 방법, 헤더 행 구성(제출일시/회사명/전화/이메일/문의유형/문의내용)
- Apps Script 코드 전체(`doPost(e)` — JSON 파싱 → 시트에 행 추가 → `MailApp.sendEmail`로 알림 발송)
- 웹앱으로 배포하는 단계(실행 사용자: 나, 액세스 권한: 모든 사용자)
- 배포 후 발급된 웹앱 URL을 `.env.local`(로컬)과 Vercel 프로덕션 환경변수에 `GAS_AFFILIATE_WEBHOOK_URL`로 등록하는 방법

`docs/SPEC.md` 5절("서버 발송/폼 없음")을 새 동작(폼 + Apps Script 웹훅 + 시트 백업 + 이메일 알림)으로 갱신한다.
