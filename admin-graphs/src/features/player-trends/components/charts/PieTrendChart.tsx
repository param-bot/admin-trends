import { useState } from "react"
import {
  Cell,
  Label as RechartsLabel,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

import { countKeyFor, UNSLICED_KEY } from "../../utils"
import { getSeriesColor, type SeriesChartProps } from "./types"

// Beyond this many distinct slices a pie stops being readable regardless of
// color — group the smallest ones into "Other" instead. This is a stricter
// cap than the backend's own top-20+OTHER cardinality guard (§3 of the
// player-trends design doc): 20 wedges is unreadable long before it's an
// invalid request, so the pie caps itself well under that ceiling.
const MAX_VISIBLE_SLICES = 6
const OTHER_KEY = "__other__"

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

interface PieSlice {
  key: string
  name: string
  value: number
  count: number
  fill: string
}

function buildSlices(
  rows: SeriesChartProps["rows"],
  seriesKeys: string[],
  isSingleSeries: boolean,
  color: string,
  valueLabel: string
): PieSlice[] {
  // Color assignment happens on the *original* seriesKeys order (matching
  // every other chart type) before sorting by value, so a given sliceKey
  // keeps the same color whether you're looking at the bar, line, or pie.
  const slices = seriesKeys
    .map((key, index) => ({
      key,
      name: isSingleSeries ? valueLabel : key,
      value: rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0),
      count: rows.reduce((sum, row) => sum + (Number(row[countKeyFor(key)]) || 0), 0),
      fill: isSingleSeries ? color : getSeriesColor(key, index),
    }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value)

  if (slices.length <= MAX_VISIBLE_SLICES) {
    return slices
  }

  const visible = slices.slice(0, MAX_VISIBLE_SLICES - 1)
  const rest = slices.slice(MAX_VISIBLE_SLICES - 1)
  const otherValue = rest.reduce((sum, slice) => sum + slice.value, 0)
  const otherCount = rest.reduce((sum, slice) => sum + slice.count, 0)

  return [
    ...visible,
    {
      key: OTHER_KEY,
      name: `Other (${rest.length})`,
      value: otherValue,
      count: otherCount,
      fill: "var(--muted-foreground)",
    },
  ]
}

interface CenterLabelViewBox {
  viewBox?: { cx?: number; cy?: number }
}

export function PieTrendChart({
  rows,
  seriesKeys,
  color,
  valueLabel,
  height = 260,
  countLabel = "txns",
}: SeriesChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const isSingleSeries = seriesKeys.length === 1 && seriesKeys[0] === UNSLICED_KEY

  const data = buildSlices(rows, seriesKeys, isSingleSeries, color, valueLabel)
  const total = data.reduce((sum, slice) => sum + slice.value, 0)

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No positive totals to show as a pie for the selected filters.
      </div>
    )
  }

  const renderCenterLabel = (props: unknown) => {
    const { viewBox } = props as CenterLabelViewBox
    if (viewBox?.cx == null || viewBox?.cy == null) return null
    const { cx, cy } = viewBox
    return (
      <text x={cx} y={cy} textAnchor="middle">
        <tspan x={cx} y={cy - 6} className="fill-foreground text-lg font-semibold">
          {formatNumber(total)}
        </tspan>
        <tspan
          x={cx}
          y={cy + 14}
          className="fill-muted-foreground text-[10px] tracking-wide uppercase"
        >
          Total
        </tspan>
      </text>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Tooltip
              formatter={(value, name, item: { payload?: PieSlice }) => {
                const numericValue = typeof value === "number" ? value : Number(value) || 0
                const count = item.payload?.count
                const countSuffix = typeof count === "number" ? `, ${count} ${countLabel}` : ""
                return [
                  `${formatNumber(numericValue)} (${((numericValue / total) * 100).toFixed(1)}%${countSuffix})`,
                  name,
                ]
              }}
              contentStyle={{
                background: "var(--popover)",
                borderColor: "var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={data.length > 1 ? 2 : 0}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
              onMouseEnter={(_, index) => setActiveKey(data[index]?.key ?? null)}
              onMouseLeave={() => setActiveKey(null)}
            >
              {data.map((slice) => (
                <Cell
                  key={slice.key}
                  fill={slice.fill}
                  stroke="var(--card)"
                  strokeWidth={2}
                  opacity={activeKey === null || activeKey === slice.key ? 1 : 0.35}
                />
              ))}
              <RechartsLabel content={renderCenterLabel} position="center" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul
        className="flex flex-col gap-1.5 overflow-y-auto sm:w-44 sm:shrink-0"
        style={{ maxHeight: height }}
      >
        {data.map((slice) => (
          <li
            key={slice.key}
            className="flex cursor-default items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-opacity"
            style={{ opacity: activeKey === null || activeKey === slice.key ? 1 : 0.5 }}
            onMouseEnter={() => setActiveKey(slice.key)}
            onMouseLeave={() => setActiveKey(null)}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: slice.fill }}
            />
            <span className="flex-1 truncate text-foreground">{slice.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {((slice.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
