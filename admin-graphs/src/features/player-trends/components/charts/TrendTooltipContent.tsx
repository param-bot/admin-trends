import { countKeyFor, type ChartRow } from "../../utils"

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

interface TooltipPayloadEntry {
  dataKey?: string | number
  name?: React.ReactNode
  value?: number | string
  color?: string
  payload?: ChartRow
}

interface TrendTooltipContentProps {
  active?: boolean
  label?: React.ReactNode
  payload?: TooltipPayloadEntry[]
  countLabel: string
}

// Recharts' default tooltip content has no height cap — with a large sliceBy
// breakdown (e.g. 20 providers) hovering a single x-axis point lists every
// series in an unbounded column that can run off-screen. This custom content
// scrolls instead, and shows the real count that rides along with each
// value (see countKeyFor) using a metric-appropriate label ("bets" vs
// "txns") rather than one hardcoded word for every metric.
export function TrendTooltipContent({
  active,
  label,
  payload,
  countLabel,
}: TrendTooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="max-w-64 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label != null && (
        <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      )}
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto pr-1">
        {payload.map((entry, index) => {
          const numericValue =
            typeof entry.value === "number"
              ? entry.value
              : Number(entry.value) || 0
          const dataKey =
            entry.dataKey != null ? String(entry.dataKey) : undefined
          const count = dataKey
            ? entry.payload?.[countKeyFor(dataKey)]
            : undefined

          return (
            <div key={dataKey ?? index} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: entry.color }}
              />
              <span className="min-w-0 flex-1 truncate text-popover-foreground">
                {entry.name}
              </span>
              <span className="shrink-0 text-popover-foreground tabular-nums">
                {formatNumber(numericValue)}
                {typeof count === "number" && ` (${count} ${countLabel})`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
