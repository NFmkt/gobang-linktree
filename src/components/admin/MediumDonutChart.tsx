"use client";

import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import type { MediumShare } from "@/lib/stats/types";

type MediumDonutChartProps = {
  data: MediumShare[];
  emptyMessage: string;
};

const CHART_HEIGHT = 180;
const INNER_RADIUS = 52;
const OUTER_RADIUS = 80;

/**
 * 도넛 슬라이스에 순환 적용하는 색상. globals.css에 이미 정의된 토큰만 재사용한다
 * (2026-07-14 배치 작업 제약: 새 컬러 팔레트를 새로 정의하지 않음). utm_medium 종류가
 * 이 배열보다 많아지면 색상이 순환 재사용된다 — 인접 슬라이스가 같은 색이 될 수 있지만
 * 범례의 라벨/퍼센트 텍스트로 여전히 구분 가능하다.
 */
const SLICE_COLORS = [
  "var(--color-primary)",
  "var(--color-good)",
  "var(--color-danger)",
  "var(--color-primary-deep)",
  "var(--color-primary-press)",
  "var(--color-muted)",
];

function formatPercent(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((count / total) * 1000) / 10}%`;
}

/**
 * recharts <Tooltip content={...}>로 전달되는 커스텀 툴팁.
 * jsdom에서는 mouse hover로 recharts 내부 좌표 계산을 재현하기 어려워, LineChart와 동일하게
 * 이 컴포넌트를 단독 export해 payload를 직접 주입하는 단위 테스트로 검증한다.
 */
export function MediumDonutChartTooltipContent({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const item = payload[0];

  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] shadow-[var(--sh-sm)]">
      <p className="font-semibold text-[var(--color-ink)]">{String(item?.name ?? "")}</p>
      <p className="tabular-nums text-[var(--color-ink-2)]">{String(item?.value ?? "")}</p>
    </div>
  );
}

/** 전체 utm_medium(유입 경로) 비중을 보여주는 도넛차트 + 색상 범례. */
export function MediumDonutChart({ data, emptyMessage }: MediumDonutChartProps) {
  if (data.length === 0) {
    return <p className="text-[13px] text-[var(--color-ink-2)]">{emptyMessage}</p>;
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div>
      <div role="img" aria-label="유입 경로별 비중">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <RechartsPieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="medium"
              innerRadius={INNER_RADIUS}
              outerRadius={OUTER_RADIUS}
              paddingAngle={data.length > 1 ? 2 : 0}
              isAnimationActive={false}
              stroke="none"
            >
              {data.map((item, index) => (
                <Cell key={item.medium} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={MediumDonutChartTooltipContent} />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((item, index) => (
          <li key={item.medium} className="flex items-center gap-1.5 text-[12.5px]">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}
            />
            <span className="font-semibold text-[var(--color-ink-2)]">{item.medium}</span>
            <span className="tabular-nums font-bold text-[var(--color-ink)]">
              {formatPercent(item.count, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
