"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart } from "@/components/admin/BarChart";
import { LineChart } from "@/components/admin/LineChart";
import type { StatsSummary } from "@/lib/stats/types";

type StatsDashboardProps = {
  summary: StatsSummary;
};

/**
 * 전주 대비 증감 배지. 색상만으로 증감을 전달하지 않고 화살표+텍스트를 함께 표시한다.
 * previous가 0이라 비교 불가(changePercent === null)면 아무것도 표시하지 않는다.
 */
function WeekOverWeekBadge({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) return null;
  const isUp = changePercent >= 0;
  return (
    <span
      className={`text-[12.5px] font-bold tabular-nums ${
        isUp ? "text-[var(--color-primary)]" : "text-[var(--color-danger)]"
      }`}
    >
      {isUp ? "▲" : "▼"} {Math.abs(changePercent)}%
    </span>
  );
}

export function StatsDashboard({ summary }: StatsDashboardProps) {
  const router = useRouter();
  const [trendRange, setTrendRange] = useState<7 | 30>(7);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const isEmpty = summary.totalPageviews === 0 && summary.totalClicks === 0;
  const trendPoints = trendRange === 7 ? summary.dailyTrend7 : summary.dailyTrend30;

  async function handleReset() {
    if (!window.confirm("모든 통계 데이터를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;

    setResetting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { method: "DELETE" });
      if (!res.ok) {
        setError("통계 초기화에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("통계 초기화 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-extrabold text-[var(--color-ink)]">통계</h1>
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={resetting}
          className="focus-glow rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-danger)] disabled:opacity-50"
        >
          {resetting ? "초기화 중..." : "통계 초기화"}
        </button>
      </div>

      {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}

      {isEmpty ? (
        <p className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-[13.5px] text-[var(--color-ink-2)]">
          아직 쌓인 통계가 없습니다. 공개 페이지에 방문이 생기면 여기에 표시됩니다.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
              <p className="text-[12.5px] font-semibold text-[var(--color-ink-2)]">총 방문수</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-[24px] font-extrabold tabular-nums text-[var(--color-ink)]">
                  {summary.totalPageviews}
                </p>
                <WeekOverWeekBadge changePercent={summary.pageviewsWeekOverWeek.changePercent} />
              </div>
            </div>
            <div className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
              <p className="text-[12.5px] font-semibold text-[var(--color-ink-2)]">총 클릭수</p>
              <p className="text-[24px] font-extrabold tabular-nums text-[var(--color-ink)]">
                {summary.totalClicks}
              </p>
            </div>
            <div className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
              <p className="text-[12.5px] font-semibold text-[var(--color-ink-2)]">클릭률</p>
              <p className="text-[24px] font-extrabold tabular-nums text-[var(--color-ink)]">
                {summary.clickThroughRate === null ? "-" : `${summary.clickThroughRate}%`}
              </p>
            </div>
          </div>

          <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
            <h2 className="mb-3 text-[14px] font-bold text-[var(--color-ink)]">링크별 클릭수 순위</h2>
            <BarChart
              items={summary.clicksByLink.map((item) => ({ label: item.title, value: item.count }))}
              emptyMessage="아직 클릭 기록이 없습니다."
            />
          </section>

          <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-[var(--color-ink)]">방문 추이</h2>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTrendRange(7)}
                  className={`focus-glow rounded-[var(--r-sm)] px-2.5 py-1 text-[12.5px] font-semibold ${
                    trendRange === 7
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-ink-2)]"
                  }`}
                >
                  7일
                </button>
                <button
                  type="button"
                  onClick={() => setTrendRange(30)}
                  className={`focus-glow rounded-[var(--r-sm)] px-2.5 py-1 text-[12.5px] font-semibold ${
                    trendRange === 30
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-ink-2)]"
                  }`}
                >
                  30일
                </button>
              </div>
            </div>
            <LineChart points={trendPoints} emptyMessage="아직 방문 기록이 없습니다." />
          </section>

          <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
            <h2 className="mb-3 text-[14px] font-bold text-[var(--color-ink)]">요일별 방문 분포</h2>
            <BarChart
              items={summary.weekdayDistribution.map((item) => ({
                label: item.weekday,
                value: item.count,
              }))}
              emptyMessage="아직 방문 기록이 없습니다."
            />
          </section>

          <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
            <h2 className="mb-3 text-[14px] font-bold text-[var(--color-ink)]">유입출처 TOP</h2>
            <BarChart
              items={summary.topReferrers.map((item) => ({ label: item.source, value: item.count }))}
              emptyMessage="아직 유입 기록이 없습니다."
            />
          </section>

          <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
            <h2 className="mb-3 text-[14px] font-bold text-[var(--color-ink)]">캠페인별 유입 TOP</h2>
            <BarChart
              items={summary.topCampaigns.map((item) => ({ label: item.campaign, value: item.count }))}
              emptyMessage="아직 캠페인 유입 기록이 없습니다."
            />
          </section>
        </>
      )}
    </div>
  );
}
