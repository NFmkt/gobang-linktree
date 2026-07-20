"use client";

import { useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export type LineChartPoint = {
  date: string;
  count: number;
};

type LineChartProps = {
  points: LineChartPoint[];
  emptyMessage: string;
};

const CHART_HEIGHT = 160;
/** 이 개수 이하일 때만(7일 뷰) 포인트마다 값을 직접 라벨로 표시한다. 30일 뷰는 라벨이 겹쳐 캡션으로 대체. */
const DIRECT_LABEL_THRESHOLD = 10;
/**
 * 이 개수를 넘으면 포인트별 dot(원형 마커) 렌더를 생략하고 라인만 그린다.
 * "전체"/넓은 커스텀 범위 선택 시 dailyTrend가 수천 개까지 늘어날 수 있어(예: 2000-01-01~오늘),
 * 포인트마다 DOM 노드를 만들면 렌더가 무거워지고 점들이 뭉개져 판독도 안 된다.
 */
const MAX_MARKER_POINTS = 60;
/** x축에 표시할 눈금 개수의 대략적인 목표치(넓은 컨테이너 기준). 포인트가 많아질수록 interval을 키워 라벨 겹침을 막는다. */
const TARGET_TICK_COUNT_WIDE = 8;
/**
 * 모바일 등 좁은 컨테이너에서는 같은 눈금 개수라도 라벨 하나당 가용 폭이 줄어 겹치기 쉽다.
 * `TARGET_TICK_COUNT_WIDE`는 jsdom 테스트에서 쓰던 ~600px 폭 기준으로만 검증되어 있었으므로,
 * 실측 컨테이너 폭이 이 임계값보다 좁으면 눈금 목표치를 더 줄인다.
 */
const NARROW_CONTAINER_WIDTH = 420;
const TARGET_TICK_COUNT_NARROW = 4;
/** ResponsiveContainer가 아직 실측 폭을 보고하지 않은 첫 렌더에서 쓰는 기본값(넓은 화면으로 가정). */
const DEFAULT_CONTAINER_WIDTH = 600;

function getTargetTickCount(containerWidth: number): number {
  return containerWidth < NARROW_CONTAINER_WIDTH
    ? TARGET_TICK_COUNT_NARROW
    : TARGET_TICK_COUNT_WIDE;
}

function formatShortDate(dateKey: string): string {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return dateKey;
  const [, month, day] = parts;
  return `${Number(month)}/${Number(day)}`;
}

/**
 * recharts <Tooltip content={...}>로 전달되는 커스텀 툴팁.
 * jsdom에서는 마우스 hover로 recharts의 내부 좌표 계산을 재현하기 어려워
 * 이 컴포넌트를 단독으로 export해 payload/label을 직접 주입하는 단위 테스트로 검증한다.
 */
export function LineChartTooltipContent({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const value = payload[0]?.value;

  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] shadow-[var(--sh-sm)]">
      <p className="font-semibold text-[var(--color-ink)]">{String(label)}</p>
      <p className="tabular-nums text-[var(--color-ink-2)]">{String(value)}</p>
    </div>
  );
}

export function LineChart({ points, emptyMessage }: LineChartProps) {
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH);

  if (points.length === 0) {
    return <p className="text-[13px] text-[var(--color-ink-2)]">{emptyMessage}</p>;
  }

  const showDirectLabels = points.length <= DIRECT_LABEL_THRESHOLD;
  const showMarkers = points.length <= MAX_MARKER_POINTS;
  const targetTickCount = getTargetTickCount(containerWidth);
  const tickInterval = Math.max(0, Math.ceil(points.length / targetTickCount) - 1);

  const peakIndex = points.reduce(
    (best, point, index) => (point.count > points[best].count ? index : best),
    0,
  );
  const lastIndex = points.length - 1;

  return (
    <div role="img" aria-label="일별 방문 추이">
      <ResponsiveContainer
        width="100%"
        height={CHART_HEIGHT}
        onResize={(width) => setContainerWidth(width)}
      >
        <RechartsLineChart
          data={points}
          margin={{ top: showDirectLabels ? 18 : 8, right: 8, bottom: 0, left: -20 }}
        >
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            interval={tickInterval}
            tick={{ fill: "var(--color-ink-2)", fontSize: 10.5 }}
            axisLine={{ stroke: "var(--color-border-strong)" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--color-ink-2)", fontSize: 10.5 }}
            width={30}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={LineChartTooltipContent} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-primary)"
            strokeWidth={2}
            isAnimationActive={false}
            dot={showMarkers ? { r: 3, fill: "var(--color-primary)", strokeWidth: 0 } : false}
            activeDot={{ r: 4, fill: "var(--color-primary)" }}
          >
            {showDirectLabels ? (
              <LabelList
                dataKey="count"
                position="top"
                style={{ fill: "var(--color-ink-2)", fontSize: 10, fontWeight: 600 }}
              />
            ) : null}
          </Line>
        </RechartsLineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-[12.5px] font-semibold tabular-nums text-[var(--color-ink-2)]">
        최고 {points[peakIndex].count} ({formatShortDate(points[peakIndex].date)}) · 최근{" "}
        {points[lastIndex].count}
      </p>
    </div>
  );
}
