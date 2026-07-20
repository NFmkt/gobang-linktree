"use client";

import { useState } from "react";
import { BarChart } from "@/components/admin/BarChart";
import { LineChart } from "@/components/admin/LineChart";
import { LinkMediumTable } from "@/components/admin/LinkMediumTable";
import { MediumDonutChart } from "@/components/admin/MediumDonutChart";
import type { StatsSummary } from "@/lib/stats/types";
import { aggregateMediumShare } from "@/lib/stats/aggregate";
import { computeCustomRange, computePresetRange, type DatePreset } from "@/lib/stats/dateRangePresets";
import { buildStatsCsv } from "@/lib/stats/buildStatsCsv";

/** Excel에서 UTF-8 CSV의 한글이 깨지지 않도록 붙이는 BOM(U+FEFF). */
const CSV_BOM = "﻿";

type SelectedRange = DatePreset | "custom";

type StatsDashboardProps = {
  summary: StatsSummary;
  /** page.tsx(서버 컴포넌트)가 초기 렌더에 사용한 프리셋 — 기본값 "7d". */
  initialPreset: DatePreset;
  /** page.tsx가 계산한 초기 from/to(ISO 문자열) — 통계 초기화 후 같은 범위로 재조회할 때 사용. */
  initialFrom: string;
  initialTo: string;
};

const PRESETS: DatePreset[] = ["today", "7d", "30d", "thisMonth", "lastMonth", "all"];

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "오늘",
  "7d": "7일",
  "30d": "30일",
  thisMonth: "이번달",
  lastMonth: "지난달",
  all: "전체",
};

/**
 * 선택 기간 대비 증감 배지. 색상만으로 증감을 전달하지 않고 화살표+텍스트를 함께 표시한다.
 * previous가 0이라 비교 불가(changePercent === null)면 아무것도 표시하지 않는다.
 */
function PeriodOverPeriodBadge({ changePercent }: { changePercent: number | null }) {
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

function buildStatsUrl(from: Date, to: Date): string {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return `/api/admin/stats?${params.toString()}`;
}

function StatsSkeleton() {
  return (
    <div data-testid="stats-loading" className="flex flex-col gap-3" aria-live="polite" aria-busy="true">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[74px] animate-pulse rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--sh-sm)]"
          />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[120px] animate-pulse rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--sh-sm)]"
        />
      ))}
    </div>
  );
}

export function StatsDashboard({ summary: initialSummary, initialPreset, initialFrom, initialTo }: StatsDashboardProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [selected, setSelected] = useState<SelectedRange>(initialPreset);
  const [activeRange, setActiveRange] = useState({ from: initialFrom, to: initialTo });
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const isEmpty = summary.totalPageviews === 0 && summary.totalClicks === 0;
  const trendPoints = summary.dailyTrend;
  const mediumShare = aggregateMediumShare(summary.clicksByLinkAndMedium);

  async function fetchRange(from: Date, to: Date) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildStatsUrl(from, to));
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError((body && typeof body.error === "string" ? body.error : null) ?? "통계를 불러오지 못했습니다.");
        return;
      }
      setSummary(body as StatsSummary);
      setActiveRange({ from: from.toISOString(), to: to.toISOString() });
    } catch {
      setError("통계 조회 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  function handlePresetClick(preset: DatePreset) {
    setSelected(preset);
    setCustomError(null);
    const { from, to } = computePresetRange(preset, new Date());
    void fetchRange(from, to);
  }

  function handleCustomApply() {
    if (!customStart || !customEnd) {
      setCustomError("시작일과 종료일을 모두 선택해주세요.");
      return;
    }
    if (customStart > customEnd) {
      setCustomError("시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }
    setCustomError(null);
    setSelected("custom");
    const { from, to } = computeCustomRange(customStart, customEnd);
    void fetchRange(from, to);
  }

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
      // 서버 컴포넌트를 통째로 재실행(router.refresh)하면 사용자가 선택해둔 프리셋/커스텀
      // 범위가 서버 기본값(최근 7일)으로 조용히 되돌아가는 회귀가 생긴다 — 그 대신 현재
      // 선택된 범위 그대로 클라이언트에서 재조회한다.
      await fetchRange(new Date(activeRange.from), new Date(activeRange.to));
    } catch {
      setError("통계 초기화 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setResetting(false);
    }
  }

  function handleDownloadCsv() {
    const csv = CSV_BOM + buildStatsCsv(summary);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `통계_${activeRange.from.slice(0, 10)}_${activeRange.to.slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const controlsDisabled = loading || resetting;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-extrabold text-[var(--color-ink)]">통계</h1>
        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={controlsDisabled || isEmpty}
          className="focus-glow min-h-11 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-ink-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
        >
          CSV 다운로드
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const isActive = selected === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={isActive}
                disabled={controlsDisabled}
                onClick={() => handlePresetClick(preset)}
                className={`focus-glow min-h-11 rounded-[var(--r-sm)] px-3 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                  isActive
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "border-[1.5px] border-[var(--color-border-strong)] text-[var(--color-ink-2)]"
                }`}
              >
                {PRESET_LABELS[preset]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
            시작일
            <input
              type="date"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              disabled={controlsDisabled}
              className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 text-[13.5px] text-[var(--color-ink)] outline-none disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
            종료일
            <input
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              disabled={controlsDisabled}
              className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 text-[13.5px] text-[var(--color-ink)] outline-none disabled:opacity-50"
            />
          </label>
          <button
            type="button"
            onClick={handleCustomApply}
            disabled={controlsDisabled}
            className="focus-glow min-h-11 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-3 text-[13px] font-semibold text-[var(--color-ink-2)] disabled:opacity-50"
          >
            조회
          </button>
        </div>
        {customError ? <p className="text-[12.5px] text-[var(--color-danger)]">{customError}</p> : null}
      </div>

      {summary.capped ? (
        <p className="rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-[12.5px] font-semibold text-[var(--color-danger)]">
          선택한 기간 중 일부만 집계되었을 수 있음
        </p>
      ) : null}

      {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}

      {loading ? (
        <StatsSkeleton />
      ) : isEmpty ? (
        <p className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-[13.5px] text-[var(--color-ink-2)]">
          아직 쌓인 통계가 없습니다. 공개 페이지에 방문이 생기면 여기에 표시됩니다.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
              <p className="text-[12.5px] font-semibold text-[var(--color-ink-2)]">총 방문수</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-[24px] font-extrabold tabular-nums text-[var(--color-ink)]">
                  {summary.totalPageviews}
                </p>
                <PeriodOverPeriodBadge changePercent={summary.pageviewsPeriodOverPeriod.changePercent} />
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
            <h2 className="text-[14px] font-bold text-[var(--color-ink)]">방문 추이</h2>
            <p className="mb-3 text-[12px] text-[var(--color-ink-2)]">
              선택한 기간 동안 하루 단위 방문자 수 변화입니다.
            </p>
            <LineChart points={trendPoints} emptyMessage="아직 방문 기록이 없습니다." />
          </section>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
              <h2 className="text-[14px] font-bold text-[var(--color-ink)]">링크트리 유입 출처</h2>
              <p className="mb-3 text-[12px] text-[var(--color-ink-2)]">
                방문자가 이 링크트리 페이지에 들어올 때 사용한 채널(utm_source) 또는 리퍼러 기준 방문 수입니다.
              </p>
              <BarChart
                items={summary.topReferrers.map((item) => ({ label: item.source, value: item.count }))}
                emptyMessage="아직 유입 기록이 없습니다."
              />
            </section>

            <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
              <h2 className="text-[14px] font-bold text-[var(--color-ink)]">링크별 클릭수</h2>
              <p className="mb-3 text-[12px] text-[var(--color-ink-2)]">등록된 링크별로 클릭된 횟수입니다.</p>
              <BarChart
                items={summary.clicksByLink.map((item) => ({ label: item.title, value: item.count }))}
                emptyMessage="아직 클릭 기록이 없습니다."
              />
            </section>
          </div>

          <section className="rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]">
            <h2 className="text-[14px] font-bold text-[var(--color-ink)]">링크별 유입 경로</h2>
            <p className="mb-3 text-[12px] text-[var(--color-ink-2)]">
              어떤 채널(utm_medium)로 들어온 방문자가 어떤 링크를 눌렀는지 보여줍니다. &quot;미지정&quot;은 이
              링크트리 페이지 주소에 utm_medium이 없을 때의 기본값입니다.
            </p>
            <MediumDonutChart data={mediumShare} emptyMessage="아직 클릭 기록이 없습니다." />
            <div className="mt-4">
              <LinkMediumTable
                rows={summary.clicksByLinkAndMedium}
                emptyMessage="아직 클릭 기록이 없습니다."
              />
            </div>
          </section>
        </>
      )}

      <section className="flex flex-col items-start gap-2 rounded-[var(--r)] border-[1.5px] border-[var(--color-danger)] bg-[var(--color-surface)] p-4">
        <h2 className="text-[13px] font-bold text-[var(--color-danger)]">위험 구역</h2>
        <p className="text-[12.5px] text-[var(--color-ink-2)]">
          통계 데이터를 초기화하면 되돌릴 수 없습니다. 링크·설정에는 영향을 주지 않습니다.
        </p>
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={controlsDisabled}
          className="focus-glow min-h-11 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-danger)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-danger)] disabled:opacity-50"
        >
          {resetting ? "초기화 중..." : "통계 초기화"}
        </button>
      </section>
    </div>
  );
}
