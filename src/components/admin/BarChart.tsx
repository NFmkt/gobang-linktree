export type BarChartItem = {
  label: string;
  value: number;
};

type BarChartProps = {
  items: BarChartItem[];
  emptyMessage: string;
};

export function BarChart({ items, emptyMessage }: BarChartProps) {
  if (items.length === 0) {
    return <p className="text-[13px] text-[var(--color-ink-2)]">{emptyMessage}</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-[12.5px] font-semibold text-[var(--color-ink-2)]">
            {item.label}
          </span>
          <span className="flex h-6 flex-1 items-center rounded-[var(--r-sm)] bg-[var(--color-blue-50)]">
            <span
              data-bar-fill
              className="h-6 rounded-[var(--r-sm)] bg-[var(--color-primary)]"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </span>
          <span className="w-10 shrink-0 text-right text-[12.5px] font-bold text-[var(--color-ink)]">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
