import { getStatsSummary } from "@/lib/stats/getStatsSummary";
import { computePresetRange } from "@/lib/stats/dateRangePresets";
import { StatsDashboard } from "./StatsDashboard";

/** 페이지 최초 진입 시 기본 선택 프리셋. B3 이후에도 "최근 7일" 기본값을 유지한다. */
const INITIAL_PRESET = "7d" as const;

export default async function AdminStatsPage() {
  // 서버에서 초기 프리셋("7일")의 from~to를 직접 계산해 getStatsSummary를 바로 호출한다
  // (HTTP 왕복 없이 SSR로 초기 데이터를 렌더 — 불필요한 최초 로딩 스피너를 피하기 위해 유지).
  // StatsDashboard에는 이 초기 from/to·프리셋도 함께 넘겨, 이후 통계 초기화 후 재조회 시
  // 서버 기본값이 아니라 사용자가 보고 있던 범위로 되돌아가지 않도록 한다.
  const { from, to } = computePresetRange(INITIAL_PRESET, new Date());

  let summary;
  let errorMessage: string | null = null;
  try {
    summary = await getStatsSummary(from, to);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
  }

  if (errorMessage !== null || !summary) {
    return (
      <p className="text-[14px] text-[var(--color-danger)]">
        통계를 불러오지 못했습니다: {errorMessage}
      </p>
    );
  }

  return (
    <StatsDashboard
      summary={summary}
      initialPreset={INITIAL_PRESET}
      initialFrom={from.toISOString()}
      initialTo={to.toISOString()}
    />
  );
}
