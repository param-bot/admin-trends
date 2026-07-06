import { Maximize2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ChartType } from "../chart-types"
import type { MetricConfig } from "../constants"
import { useMetricTrendState } from "../hooks/use-metric-trend-state"
import { buildMetricTrendPath } from "../utils"
import { ChartTypeSheet } from "./ChartTypeSheet"
import { DateRangePopover } from "./DateRangePopover"
import { TrendChart } from "./TrendChart"
import { TrendFilters } from "./TrendFilters"
import { TrendSummaryDialog } from "./TrendSummaryDialog"

interface MetricTrendCardProps {
  accountId: string
  config: MetricConfig
}

export function MetricTrendCard({ accountId, config }: MetricTrendCardProps) {
  const {
    filters,
    setFilters,
    rows,
    seriesKeys,
    isLoading,
    isFetching,
    isError,
  } = useMetricTrendState(accountId, config)
  const [chartType, setChartType] = useState<ChartType>("LINE")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
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
              onChange={setChartType}
            />
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
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Maximize2 className="size-4" />
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <DateRangePopover value={filters} onApply={setFilters} />
          <TrendFilters config={config} value={filters} onChange={setFilters} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : isError ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-destructive">
            Failed to load {config.title.toLowerCase()} trend.
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
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
          />
        )}
      </CardContent>
    </Card>
  )
}
