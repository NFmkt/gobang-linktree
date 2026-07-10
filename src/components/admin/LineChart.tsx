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

export function LineChart({ points, emptyMessage }: LineChartProps) {
  if (points.length === 0) {
    return <p className="text-[13px] text-[var(--color-ink-2)]">{emptyMessage}</p>;
  }

  const max = Math.max(...points.map((point) => point.count), 1);
  const stepX = points.length > 1 ? (CHART_WIDTH - CHART_PADDING * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: CHART_PADDING + index * stepX,
    y: CHART_HEIGHT - CHART_PADDING - (point.count / max) * (CHART_HEIGHT - CHART_PADDING * 2),
  }));

  const polylinePoints = coords.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <svg
      role="img"
      aria-label="일별 방문 추이"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="h-40 w-full"
    >
      <polyline points={polylinePoints} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      {coords.map((coord, index) => (
        <circle key={points[index].date} cx={coord.x} cy={coord.y} r={3} fill="var(--color-primary)" />
      ))}
    </svg>
  );
}
