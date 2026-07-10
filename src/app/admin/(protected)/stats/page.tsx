import { getStatsSummary } from "@/lib/stats/getStatsSummary";
import { StatsDashboard } from "./StatsDashboard";

export default async function AdminStatsPage() {
  let summary;
  let errorMessage: string | null = null;
  try {
    summary = await getStatsSummary();
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
