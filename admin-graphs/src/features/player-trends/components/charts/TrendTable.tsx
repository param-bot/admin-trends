import { UNSLICED_KEY } from "../../utils"
import type { SeriesChartProps } from "./types"

function formatValue(value: number | string | undefined): string {
  if (typeof value !== "number") return "—"
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// A chart estimates, a table lets you read the exact number for one period —
// useful once someone needs to reconcile a spike against another system.
export function TrendTable({
  rows,
  seriesKeys,
  valueLabel,
  height = 260,
}: SeriesChartProps) {
  const isSingleSeries =
    seriesKeys.length === 1 && seriesKeys[0] === UNSLICED_KEY

  return (
    <div
      className="overflow-auto rounded-lg border border-border"
      style={{ maxHeight: height }}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Period</th>
            {seriesKeys.map((key) => (
              <th key={key} className="px-3 py-2 text-right font-medium">
                {isSingleSeries ? valueLabel : key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.period}
              className="border-b border-border last:border-0"
            >
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {row.period}
              </td>
              {seriesKeys.map((key) => (
                <td key={key} className="px-3 py-2 text-right tabular-nums">
                  {formatValue(row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
