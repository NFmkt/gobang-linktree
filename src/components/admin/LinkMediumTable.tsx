import type { LinkMediumBreakdown } from "@/lib/stats/types";

type LinkMediumTableProps = {
  rows: LinkMediumBreakdown[];
  emptyMessage: string;
};

/** 링크x유입경로(utm_medium) 교차 집계 테이블. 링크 제목은 첫 행에만 표시한다. */
export function LinkMediumTable({ rows, emptyMessage }: LinkMediumTableProps) {
  if (rows.length === 0) {
    return <p className="text-[13px] text-[var(--color-ink-2)]">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-ink-2)]">
            <th scope="col" className="py-2 pr-3 font-semibold">
              링크
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              유입 경로
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              클릭수
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((row) =>
            row.mediums.map((item, index) => (
              <tr
                key={`${row.linkId}-${item.medium}`}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                <td className="py-2 pr-3 font-semibold text-[var(--color-ink)]">
                  {index === 0 ? row.title : ""}
                </td>
                <td className="py-2 pr-3 text-[var(--color-ink-2)]">{item.medium}</td>
                <td className="py-2 text-right font-bold tabular-nums text-[var(--color-ink)]">
                  {item.count}
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
