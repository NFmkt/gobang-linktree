# 고방 링크트리 — 디자인 시스템 (MASTER) · 확정

> 테마: **B · 비비드 블록 (Vivid Block)**. 이 문서는 Source of Truth.
> 이후 생성되는 모든 컴포넌트(공개 페이지·관리자)는 본 팔레트/토큰을 **누락 없이 상속**한다.
> 금지: 무분별한 라운딩, 보라색 그라데이션, 정형화된 AI 스타일.

## 1. 컨셉
- 20대 청년·인스타 유입 대상. 활기·개성·Gen-Z.
- **비비드 블록**: 크림 배경 + 두꺼운(2px) 다크 테두리 블록 + 하드 오프셋(그림자 블러 X, `2px 2px 0` 방식) + 틸/라임 포인트.

## 2. 컬러 팔레트 (틸 브랜드 기준)
| 역할 | Hex | 용도 |
|---|---|---|
| **Primary (Teal)** | `#14B8A6` | 브랜드/주요 버튼/링크 |
| Primary Deep | `#0E9488` | hover, 아이콘 |
| **Accent (Lime)** | `#B9F227` | 강조 CTA/포인트 (과용 금지, 1~2곳) |
| Ink (다크) | `#14201E` | 테두리·본문 텍스트 |
| Ink Soft | `#3E4B48` | 보조 텍스트 |
| Background | `#FBFAF3` | 크림 페이지 배경 |
| Surface (Card) | `#FFFFFF` | 버튼/카드 |
| Border | `#14201E` (2px) | 블록 테두리 |
| On Primary | `#FFFFFF` | 틸 위 텍스트 |
| Success | `#1D9E75` / Danger `#E24B4A` / Warning `#EF9F27` | 상태 |

- **대비**: 본문 텍스트 `#14201E` on `#FBFAF3`/`#FFFFFF` → WCAG AA 이상.
- 라임(`#B9F227`) 위 텍스트는 반드시 다크(`#14201E`) 사용.

## 3. 타이포그래피
- **전체 단일 폰트: Pretendard** (400/500/700) — 본문·한글·브랜드명·숫자 모두 동일. 별도 디스플레이 폰트 없음.
- 기본 16px, line-height 1.6. 숫자는 tabular-nums 적용(통계 정렬용).
- 위계: 헤딩 700, 라벨 500, 본문 400.

## 4. 형태 / 효과 (비비드 블록 규칙)
- **버튼/카드**: `border: 2px solid #14201E`, `border-radius: 12~14px`, `box-shadow: 2px 2px 0 #14201E` (하드 오프셋, 블러 없음).
- hover: 오프셋 축소(`1px 1px 0`) + 살짝 translate → "눌리는" 느낌. active: `scale(0.98)`.
- 프로필 로고: 라운드 사각(14px) 또는 원형, 2px 다크 테두리.
- **모션**: 150~300ms, ease-out 진입. `prefers-reduced-motion` 존중. transform/opacity만 애니메이션.
- 링크 목록 진입 시 stagger 30~50ms (선택).

## 5. 레이아웃
- **모바일 우선**: 컨테이너 max-width ~480px 중앙 정렬. 데스크톱은 동일 폭 카드 중앙.
- 세로 스택, 링크 버튼 full-width, 터치 타깃 ≥44px, 버튼 간격 ≥8px.
- 4/8px 스페이싱 리듬.

## 6. 아이콘
- **icon-design 스킬**로 틸 라인 아이콘 세트 제작. 스트로크 굵기 통일, outline 일관.
- 이모지 금지. 링크별 아이콘은 드롭다운 선택.

## 7. 관리자 대시보드 상속
- 동일 틸 팔레트 상속하되 **데이터 밀도 높은 톤**: 배경 `#FBFAF3`, KPI 카드 흰색 2px 테두리, 차트 색 = 틸 계열(#14B8A6/#5DCAA5/#0E9488) + 라임 강조.
- 스타일: Data-Dense Dashboard (KPI 카드 + 막대/라인/파이). 표는 정렬·hover 하이라이트.
- 차트 라이브러리: Recharts (Next.js 궁합) 또는 경량 대안 — 3.5단계 리소스 승인에서 확정.

## 8. 접근성 체크(공통)
- 대비 4.5:1, focus ring 표시, 아이콘 버튼 aria-label, 색상 단독 의미전달 금지, reduced-motion 대응.
