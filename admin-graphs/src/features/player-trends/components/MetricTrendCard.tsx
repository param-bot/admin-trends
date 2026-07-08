import { CircleAlertIcon, InboxIcon, Maximize2 } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ChartType } from "../chart-types"
import type { MetricTrendState } from "../hooks/use-metric-trend-state"
import { buildTrendSummary } from "../trend-summary"
import { buildMetricTrendPath } from "../utils"
import { ChartTypeSheet } from "./ChartTypeSheet"
import { DateRangePopover } from "./DateRangePopover"
import { TrendChart } from "./TrendChart"
import { TrendFilters } from "./TrendFilters"
import { TrendSummaryDialog } from "./TrendSummaryDialog"
import { TrendDirectionChip } from "./trend-visuals"

interface MetricTrendCardProps {
  accountId: string
  state: MetricTrendState
  // Lets the dashboard render this same card small (grid view) or large
  // (the focused detail panel) without two separate components.
  chartHeight?: number
  // Grid view drives date range + interval from one shared control above
  // all 5 cards — this card still owns (and shows) its own provider/
  // breakdown/vertical/currency filters either way.
  hideDateAndInterval?: boolean
  // Lets the grid give a trailing odd-one-out card a col-span, instead of
  // leaving it stranded next to empty grid space.
  className?: string
  // Owned by the dashboard (URL-backed, keyed per metric) rather than local
  // state, so a chosen chart type survives view-mode toggles and refreshes
  // instead of resetting whenever this card remounts.
  chartType: ChartType
  onChartTypeChange: (chartType: ChartType) => void
}

// Purely presentational — the dashboard owns each metric's fetch/filter
// state (so the KPI strip and this card can share it without double
// fetching) and hands it down as `state`.
export function MetricTrendCard({
  accountId,
  state,
  chartHeight = 260,
  hideDateAndInterval = false,
  className,
  chartType,
  onChartTypeChange,
}: MetricTrendCardProps) {
  const {
    config,
    filters,
    setFilters,
    rows,
    seriesKeys,
    isLoading,
    isFetching,
    isError,
  } = state
  const Icon = config.icon

  // The same numbers TrendSummaryDialog computes, surfaced right on the card
  // so the headline total + direction are visible without opening it.
  const summary = useMemo(
    () =>
      !isLoading && rows.length > 0
        ? buildTrendSummary(config, filters, rows, seriesKeys)
        : null,
    [config, filters, rows, seriesKeys, isLoading]
  )

  return (
    <Card className={className}>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: `color-mix(in oklch, ${config.color} 16%, transparent)`,
                color: config.color,
              }}
            >
              <Icon className="size-4.5" />
            </span>
            <div>
              <CardTitle>{config.title}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isFetching && !isLoading && (
              <span className="text-xs text-muted-foreground">Refreshing…</span>
            )}
            <TrendSummaryDialog
              config={config}
              filters={filters}
              rows={rows}
              seriesKeys={seriesKeys}
            />
            <ChartTypeSheet
              metricTitle={config.title}
              value={chartType}
              onChange={onChartTypeChange}
            />
            <Button variant="ghost" size="icon-sm" asChild>
              <Link
                to={buildMetricTrendPath(
                  config.metric,
                  accountId,
                  filters,
                  chartType
                )}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${config.title} in full view`}
                title="Open full view"
              >
                <Maximize2 className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {summary?.hasData && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {summary.totalLabel}
            </span>
            <span className="text-[11px] text-muted-foreground">total</span>
            {summary.trend && (
              <TrendDirectionChip direction={summary.trend.direction} />
            )}
          </div>
        )}

        <div className="h-px bg-border/70" />

        <div className="flex flex-wrap items-end gap-3">
          {!hideDateAndInterval && (
            <DateRangePopover value={filters} onApply={setFilters} />
          )}
          <TrendFilters
            config={config}
            value={filters}
            onChange={setFilters}
            hideInterval={hideDateAndInterval}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full" style={{ height: chartHeight }} />
        ) : isError ? (
          <div
            className="flex flex-col items-center justify-center gap-2 text-sm text-destructive"
            style={{ height: chartHeight }}
          >
            <CircleAlertIcon className="size-5" />
            Failed to load {config.title.toLowerCase()} trend.
          </div>
        ) : rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
            style={{ height: chartHeight }}
          >
            <InboxIcon className="size-5 text-muted-foreground/50" />
            No data for the selected filters.
          </div>
        ) : (
          <TrendChart
            chartType={chartType}
            rows={rows}
            seriesKeys={seriesKeys}
            color={config.color}
            valueLabel={config.title}
            countLabel={config.countLabel}
            height={chartHeight}
          />
        )}
      </CardContent>
    </Card>
  )
}
