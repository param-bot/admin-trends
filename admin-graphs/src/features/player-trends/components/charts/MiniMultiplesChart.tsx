import { useState } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { UNSLICED_KEY } from "../../utils"
import { MetricSparkline } from "../MetricSparkline"
import { getSeriesColor, type SeriesChartProps } from "./types"

const TOP_N_OPTIONS = [5, 10, 20] as const
type TopN = (typeof TOP_N_OPTIONS)[number]
const DEFAULT_TOP_N: TopN = 10

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

interface MiniSeries {
  key: string
  name: string
  total: number
  color: string
  sparkline: { value: number }[]
}

function buildMiniSeries(
  rows: SeriesChartProps["rows"],
  seriesKeys: string[]
): MiniSeries[] {
  // No positivity filter here on purpose — GGR (bet - win) can legitimately
  // go negative for a slice (e.g. Casino running at a loss while Sports is
  // up), and that's exactly the kind of thing this view exists to surface,
  // not hide. Ranked by raw total, so a big loss still sorts below a
  // smaller profit — "top" means highest value, not highest magnitude.
  return seriesKeys
    .map((key, index) => ({
      key,
      name: key,
      total: rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0),
      color: getSeriesColor(key, index),
      sparkline: rows.map((row) => ({ value: Number(row[key]) || 0 })),
    }))
    .sort((a, b) => b.total - a.total)
}

// A "Break down by" with many distinct values (Game especially — dozens of
// titles) turns every other chart type into an unreadable pile of
// overlapping lines and a legend nobody can scan. This trades that for one
// small chart per item instead, ranked and capped to a Top N you pick —
// legible regardless of how many categories the breakdown actually has.
export function MiniMultiplesChart({
  rows,
  seriesKeys,
  height = 260,
}: SeriesChartProps) {
  const [topN, setTopN] = useState<TopN>(DEFAULT_TOP_N)
  const isSingleSeries =
    seriesKeys.length === 1 && seriesKeys[0] === UNSLICED_KEY

  if (isSingleSeries) {
    return (
      <div
        className="flex items-center justify-center px-6 text-center text-sm text-muted-foreground"
        style={{ height }}
      >
        Mini charts show one small chart per breakdown item — pick a "Break
        down by" option above to use this view.
      </div>
    )
  }

  const allSeries = buildMiniSeries(rows, seriesKeys)
  const visibleSeries = allSeries.slice(0, topN)

  if (visibleSeries.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data to show for the selected filters.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Showing {visibleSeries.length} of {allSeries.length}
        </span>
        <Select
          value={String(topN)}
          onValueChange={(next) => setTopN(Number(next) as TopN)}
        >
          <SelectTrigger size="sm" className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOP_N_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                Top {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className="grid grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4"
        style={{ maxHeight: height }}
      >
        {visibleSeries.map((series) => (
          <div
            key={series.key}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-card/50 p-2.5"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: series.color }}
              />
              <span className="truncate" title={series.name}>
                {series.name}
              </span>
            </span>
            <span
              className={cn(
                "font-mono text-sm font-semibold tabular-nums",
                series.total < 0 ? "text-destructive" : "text-foreground"
              )}
            >
              {formatNumber(series.total)}
            </span>
            <div className="h-10">
              <MetricSparkline data={series.sparkline} color={series.color} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
