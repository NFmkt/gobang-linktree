# 고방 링크트리 — 디자인 시스템 (MASTER) · 확정

> 테마: **비비드 블루 (Vivid Blue)** — 레퍼런스 `gobangmkt.github.io/kakao-openchat-ad`("청년정보 BI 비비드 블루") 상속.
> 이 문서는 Source of Truth. 이후 생성되는 모든 컴포넌트(공개 페이지·관리자)는 본 팔레트/토큰을 **누락 없이 상속**한다.
> 금지: 무분별한 하드오프셋 블록, 보라색 그라데이션, 정형화된 AI 스타일, 이모지 아이콘.
>
> ⚠️ **테마 전환 이력(2026-07-08)**: 기존 "비비드 블록"(틸/라임/크림/2px 블랙보더/하드오프셋)을 폐기하고 소프트 SaaS 룩 "비비드 블루"로 전면 리디자인. 틸·라임·크림·골드 전부 제거.

## 1. 컨셉
- 20대 청년·인스타 유입 대상. 세련·신뢰·모던.
- **비비드 블루**: 블루틴트 배경 + 화이트 소프트 카드(얇은 보더 + 부드러운 블러 그림자) + 비비드 블루 포인트 + 컬러 글로우. 풀블리드 블루 히어로가 시각 앵커.

## 2. 컬러 팔레트 (비비드 블루)
| 역할 | Hex / 값 | 용도 |
|---|---|---|
| **Primary (Blue)** | `#1B4DFF` | 브랜드/주요 버튼/히어로/링크 강조 |
| Primary Press | `#163FD6` | 눌림·hover 진하게 |
| Primary Deep | `#0B2EAE` | 강조 텍스트/딥 포인트 |
| Blue 50 (tint) | `#EEF3FF` | 아이콘 칩 배경·연한 면 |
| Blue 100 (tint) | `#DCE7FF` | 배지·보조 틴트·hover 면 |
| Blue Ring | `rgba(27,77,255,.16)` | focus 글로우 링 |
| Ink | `#0E1525` | 본문·헤딩 텍스트 |
| Ink-2 | `#3A4760` | **읽는 보조 텍스트**(대비 9.4:1) |
| Muted | `#7E8AA6` | 캡션/대형/비필수 라벨 전용(대비 3.46:1 → 본문 금지) |
| Background | `#F3F6FD` | 블루틴트 페이지 배경 |
| Surface (Card) | `#FFFFFF` | 카드/버튼 면 |
| Border | `#E5EBF7` | 카드 얇은 보더(1px) |
| Border Strong | `#D3DCF0` | 입력·강한 구분선(1.5px) |
| On Primary | `#FFFFFF` | 블루 위 텍스트(대비 5.9:1 ✅) |
| Danger | `#CA2B30` / Good `#1FB07A` | 상태 |

- **대비 검증(WCAG AA)**: 화이트 on `#1B4DFF` = 5.9:1 ✅ / ink on 화이트 = 15+ ✅ / ink-2 on 화이트 = 9.4:1 ✅ / muted on 화이트 = 3.46:1 ⚠️(대형·비필수만).
- **골드/틸/라임/크림 사용 금지.** 배지 강조는 골드 대신 blue-100(`#DCE7FF`) 틴트 사용.

## 3. 타이포그래피
- **전체 단일 폰트: Pretendard** (400/500/700/800/900) — 본문·한글·브랜드명·숫자 모두 동일. 별도 디스플레이 폰트 없음.
- 기본 16px, line-height 1.6. 숫자 tabular-nums(통계 정렬용).
- 위계: 히어로 헤딩 **900**·타이트 자간(-1.6px), 섹션/카드 제목 800(-.4~-.6px), 라벨 700, 본문 400~500.
- 큰 타이포·타이트 자간이 "세련됨"의 핵심 — 헤딩에 적극 적용.

## 4. 형태 / 효과 (비비드 블루 규칙)
- **라운딩 토큰**: `--r-sm:12px` / `--r:18px` / `--r-lg:26px`. 히어로 하단 30px, 버튼 15px, 모달 24px.
- **그림자(소프트·블러)**:
  - `--sh-sm: 0 2px 8px rgba(20,40,90,.05)` — 카드 기본
  - `--sh: 0 12px 30px rgba(20,40,90,.08)` — 떠있는 카드
  - `--sh-blue: 0 14px 28px rgba(27,77,255,.30)` — 블루 버튼 **컬러 글로우** (강조 1곳)
  - ❌ 하드오프셋(`2px 2px 0`) 금지.
- **보더**: 카드 1px `#E5EBF7`, 입력/선택형 1.5px `#D3DCF0`. 선택/hover 시 `#1B4DFF` + 글로우 링.
- **글래스**: 히어로 필 링크·sticky 바에 `backdrop-filter: blur/saturate` (배경 위 반투명).
- hover: 색 진하게(press) + 살짝 lift. active: `scale(.98~.99)` 또는 `translateY(1px)`.

## 5. 레이아웃
- **모바일 우선**: 컨테이너 max-width **480px** 중앙 정렬(링크트리 프로필 관례). 히어로는 풀블리드(화면 폭) 후 내부 콘텐츠만 480 정렬.
- 세로 스택, 링크 버튼 full-width, 터치 타깃 ≥44px, 버튼 간격 ≥8px(권장 12px).
- 4/8px 스페이싱 리듬. 섹션 간 16~24px.

## 6. 컴포넌트 스펙 (공개 페이지)
- **히어로(풀블리드 블루)**: `background:#1B4DFF`, 하단 라운드 `0 0 30px 30px`, `overflow:hidden`. ::before/::after로 떠있는 반투명 라운드 도형(`rgba(255,255,255,.08)`, 회전). **가운데 정렬**(`items-center text-center`): 흰 로고 박스(원본 `public/bi.png`, 450×450을 `<img>` object-contain으로 렌더 — 텍스트 로고마크 아님) + 브랜드명 "고방"(34px/900/-1.6px) + bio(15.5px/500, `rgba(255,255,255,.88)`). 카피 유지: "청년주택 청년혜택 자취 꿀정보". **글래스 필 CTA는 삭제됨**(공식 홈페이지 CTA 제거 — 해당 링크는 소셜 로우의 홈 아이콘으로만 존재).
- **링크 카드(흰 소프트)**: `background:#fff`, `border:1.5px solid #D3DCF0`, `border-radius:18px`, `box-shadow:--sh-sm`, 좌측 **아이콘 칩**(46px, `#EEF3FF` 배경, blue 아이콘) + 제목(16px/800) + 부제(13.5px/muted) + 우측 셰브론. hover: 보더 `#1B4DFF` + 글로우 링 + 셰브론 이동. active: `scale(.99)`.
- **제휴 CTA(아웃라인)**: 배경 없음, `border:1.5px solid #1B4DFF`, blue 텍스트/아이콘, 라운드 15px. hover: blue-50 채움. (유일한 강조지만 조용하게.)
- **소셜 로우**: 아이콘 버튼 **5개**(홈 → 블로그 → 인스타그램 → 유튜브 → 카카오톡 오픈채팅, 이 순서 고정), 44px 타깃, `#EEF3FF` 원형/라운드 칩. 브랜드 인지를 위해 **아이콘 자체는 브랜드색**(네이버 그린 `#03C75A` / 인스타 마젠타 / 유튜브 레드 / 카카오 옐로우) 사용 — icon-design의 flat·fill·no-gradient 원칙은 유지하되 팔레트만 브랜드색으로 확장한 의도된 예외. hover: blue-100 채움 + 리프트. aria-label 필수.
- **배지**: `#DCE7FF` 배경 + `#0B2EAE` 텍스트, 라운드 7px, '신규/추천/핫' 극소 사용.
- **Footer**: muted 텍스트, 브랜드명.

## 7. 모션 / 애니메이션
- **진입(stagger reveal)**: `opacity:0; transform:translateY(14px)` → `up .5s ease forwards`, 항목별 `animation-delay` 0.02→0.32s 스태거(30~50ms 간격). 히어로 먼저, 링크 순차.
- **마이크로 인터랙션**: transition 150~200ms, ease-out. hover 셰브론 `translateX(3px)`, 아이콘 칩 미세 반응, press `scale`/`translateY`.
- **focus**: `box-shadow: 0 0 0 4px var(--blue-ring)` 글로우 링(outline 대체 아님 — 항상 보이게).
- transform/opacity만 애니메이션(레이아웃 리플로우 금지). 지속 ≤400ms.
- **`prefers-reduced-motion` 존중**: reveal/트랜지션 비활성 또는 즉시 표시.

## 8. 아이콘
- **icon-design 스킬(TOSSFACE) 기준 fill 전용 다색 아이콘 세트**, `viewBox 0 0 20 20`. `IconBase`가 stroke→fill 래퍼로 동작. (초기 S7 산출물은 stroke 라인 세트였으나 이는 스킬 위반으로 판정되어 전면 fill 다색으로 교체됨 — stroke/outline 아이콘 금지.)
- ICON_MAP: 기존 6키(home/youth/feed/series/youtube/default) + 3키(blog/instagram/kakao) + 범용 콘텐츠 6키(map/phone/notice/calendar/shop/document, 2026-07-14 추가) 총 15키.
- 칩/버튼 배경은 `#EEF3FF`(blue-50) 고정, 소셜 아이콘만 브랜드색 예외(§6 참조). 이모지 금지. 링크별 아이콘은 관리자 드롭다운 선택(S4).

## 9. 관리자 대시보드 상속
- 동일 비비드 블루 팔레트 상속, **데이터 밀도 높은 톤**: 배경 `#F3F6FD`, KPI 카드 흰색 1px 보더 + `--sh-sm`.
- 스타일: Data-Dense Dashboard(KPI 카드 + 막대/라인/도넛). 표는 정렬·hover 하이라이트.
- **차트 라이브러리**: **Recharts**(확정, 2026-07-19). 방문 추이(라인)·유입경로(도넛)에 사용. 링크별 클릭수 등 단순 막대는 신규 패키지 없이 커스텀 SVG(`BarChart.tsx`) 유지.
- **차트 색상**:
  - 단일 계열(라인차트 등): `--color-primary` 단독.
  - **다범주 카테고리 팔레트**(유입경로 도넛차트 등, 카테고리 8개까지 색 겹침 없음): `--color-primary`(슬롯1) + `--chart-cat-2`~`--chart-cat-8`(신규, `globals.css`). dataviz 스킬 `validate_palette.js`로 CVD-safe 검증된 고정 순서 — 순서를 섞지 말 것. 상태색(`--color-good`/`--color-danger`)과는 의도적으로 분리된 별도 토큰.

## 10. 접근성 체크(공통)
- 대비 4.5:1(본문)·3:1(대형/글리프), muted는 본문 금지.
- focus 글로우 링 항상 표시, 아이콘 버튼 aria-label, 색상 단독 의미전달 금지.
- 터치 44px, cursor-pointer(웹), reduced-motion 대응, 이모지 아이콘 금지.
