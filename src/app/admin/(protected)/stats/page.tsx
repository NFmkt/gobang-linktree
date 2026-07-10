import { getStatsSummary } from "@/lib/stats/getStatsSummary";
import { StatsDashboard } from "./StatsDashboard";

/** 7일(오늘 포함) 밀리초 길이. dailyTrend7이 today-6..today를 보여주던 과거 기본값과 동일한 창을 유지한다. */
const DEFAULT_RANGE_MS = 6 * 24 * 60 * 60 * 1000;

export default async function AdminStatsPage() {
  // TODO(B3): 프리셋/커스텀 날짜 피커 UI에서 from~to를 받아오도록 교체 예정.
  // 지금은 기존 페이지 동작(최근 7일)을 그대로 유지하기 위한 최소 배선.
  const to = new Date();
  const from = new Date(to.getTime() - DEFAULT_RANGE_MS);

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

  return <StatsDashboard summary={summary} />;
}
