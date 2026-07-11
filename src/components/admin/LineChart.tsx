export type LineChartPoint = {
  date: string;
  count: number;
};

type LineChartProps = {
  points: LineChartPoint[];
  emptyMessage: string;
};

const CHART_WIDTH = 560;
const CHART_HEIGHT = 160;
const CHART_PADDING = 16;
/** 이 개수 이하일 때만(7일 뷰) 포인트마다 값을 직접 라벨로 표시한다. 30일 뷰는 라벨이 겹쳐 캡션으로 대체. */
const DIRECT_LABEL_THRESHOLD = 10;
/**
 * 이 개수를 넘으면 포인트별 circle/title 렌더를 생략하고 폴리라인만 그린다.
 * "전체"/넓은 커스텀 범위 선택 시 dailyTrend가 수천 개까지 늘어날 수 있어(예: 2000-01-01~오늘),
 * 포인트마다 DOM 노드를 만들면 렌더가 무거워지고 점들이 뭉개져 판독도 안 된다.
 */
const MAX_MARKER_POINTS = 60;

function formatShortDate(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function LineChart({ points, emptyMessage }: LineChartProps) {
  if (points.length === 0) {
    return <p className="text-[13px] text-[var(--color-ink-2)]">{emptyMessage}</p>;
  }

  const max = Math.max(...points.map((point) => point.count), 1);
  const stepX = points.length > 1 ? (CHART_WIDTH - CHART_PADDING * 2) / (points.length - 1) : 0;
  const showDirectLabels = points.length <= DIRECT_LABEL_THRESHOLD;
  const showMarkers = points.length <= MAX_MARKER_POINTS;

  const coords = points.map((point, index) => ({
    x: CHART_PADDING + index * stepX,
    y: CHART_HEIGHT - CHART_PADDING - (point.count / max) * (CHART_HEIGHT - CHART_PADDING * 2),
  }));

  const polylinePoints = coords.map(({ x, y }) => `${x},${y}`).join(" ");

  const peakIndex = points.reduce(
    (best, point, index) => (point.count > points[best].count ? index : best),
    0,
  );
  const lastIndex = points.length - 1;

  return (
    <div>
      <svg
        role="img"
        aria-label="일별 방문 추이"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-40 w-full overflow-visible"
      >
        <polyline points={polylinePoints} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
        {showMarkers
          ? coords.map((coord, index) => (
              <g key={points[index].date}>
                <circle cx={coord.x} cy={coord.y} r={3} fill="var(--color-primary)">
                  <title>{`${points[index].date}: ${points[index].count}`}</title>
                </circle>
                {showDirectLabels ? (
                  <text
                    x={coord.x}
                    y={Math.max(coord.y - 8, 10)}
                    textAnchor="middle"
                    className="fill-[var(--color-ink-2)] text-[10px] font-semibold tabular-nums"
                  >
                    {points[index].count}
                  </text>
                ) : null}
              </g>
            ))
          : null}
      </svg>
      <p className="mt-1 text-center text-[12.5px] font-semibold tabular-nums text-[var(--color-ink-2)]">
        최고 {points[peakIndex].count} ({formatShortDate(points[peakIndex].date)}) · 최근{" "}
        {points[lastIndex].count}
      </p>
    </div>
  );
}
