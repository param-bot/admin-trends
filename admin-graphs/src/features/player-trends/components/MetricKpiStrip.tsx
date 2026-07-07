import { useMemo } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { TrendMetric } from "@/api/types/player-trends"
import { cn } from "@/lib/utils"
import type { MetricTrendState } from "../hooks/use-metric-trend-state"
import { buildTrendSummary } from "../trend-summary"
import { MetricSparkline } from "./MetricSparkline"
import { TrendDirectionChip } from "./trend-visuals"

interface MetricKpiStripProps {
  metrics: MetricTrendState[]
  focusedMetric: TrendMetric
  onFocusChange: (metric: TrendMetric) => void
}

// The dashboard's "command strip" — one glanceable tile per metric (headline
// total, trend, sparkline). Clicking a tile drives the focused detail panel
// below, so this strip doubles as navigation rather than just decoration.
export function MetricKpiStrip({
  metrics,
  focusedMetric,
  onFocusChange,
}: MetricKpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((state) => (
        <KpiTile
          key={state.config.metric}
          state={state}
          focused={state.config.metric === focusedMetric}
          onSelect={() => onFocusChange(state.config.metric)}
        />
      ))}
    </div>
  )
}

function KpiTile({
  state,
  focused,
  onSelect,
}: {
  state: MetricTrendState
  focused: boolean
  onSelect: () => void
}) {
  const { config, filters, rows, seriesKeys, isLoading } = state
  const Icon = config.icon

  const summary = useMemo(
    () =>
      !isLoading && rows.length > 0
        ? buildTrendSummary(config, filters, rows, seriesKeys)
        : null,
    [config, filters, rows, seriesKeys, isLoading]
  )

  const sparklineData = useMemo(
    () =>
      rows.map((row) => ({
        value: seriesKeys.reduce((sum, key) => sum + (Number(row[key]) || 0), 0),
      })),
    [rows, seriesKeys]
  )

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 text-left shadow-sm transition-all outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        focused
          ? "shadow-md"
          : "border-border bg-card/60 hover:bg-card hover:shadow-md"
      )}
      style={
        focused
          ? {
              borderColor: config.color,
              background: `color-mix(in oklch, ${config.color} 8%, var(--color-card))`,
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="size-3.5" style={{ color: config.color }} />
          {config.title}
        </span>
        {summary?.trend && <TrendDirectionChip direction={summary.trend.direction} />}
      </div>

      {isLoading ? (
        <Skeleton className="h-6 w-20" />
      ) : (
        <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
          {summary?.totalLabel ?? "—"}
        </span>
      )}

      <div className="h-8">
        {sparklineData.length >= 2 && (
          <MetricSparkline data={sparklineData} color={config.color} />
        )}
      </div>
    </button>
  )
}
