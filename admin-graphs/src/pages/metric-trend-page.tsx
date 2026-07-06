import { ArrowLeft } from "lucide-react"
import { Link, useParams, useSearchParams } from "react-router-dom"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CHART_TYPES,
  type ChartType,
} from "@/features/player-trends/chart-types"
import { ChartTypeSheet } from "@/features/player-trends/components/ChartTypeSheet"
import { DateRangePopover } from "@/features/player-trends/components/DateRangePopover"
import { METRIC_CONFIGS } from "@/features/player-trends/constants"
import { TrendChart } from "@/features/player-trends/components/TrendChart"
import { TrendFilters } from "@/features/player-trends/components/TrendFilters"
import { TrendSummaryDialog } from "@/features/player-trends/components/TrendSummaryDialog"
import { useMetricTrendState } from "@/features/player-trends/hooks/use-metric-trend-state"
import {
  buildDashboardPath,
  parseFiltersFromSearchParams,
} from "@/features/player-trends/utils"

const DEFAULT_ACCOUNT_ID = "acc_mdwxhkx7jxmwF7t7PsAEhL"
const FULL_VIEW_CHART_HEIGHT = 560

function isChartType(value: string | null): value is ChartType {
  return CHART_TYPES.includes(value as ChartType)
}

export function MetricTrendPage() {
  const { metric } = useParams<{ metric: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const accountId = searchParams.get("accountId") ?? DEFAULT_ACCOUNT_ID
  const chartTypeParam = searchParams.get("chartType")
  const chartType: ChartType = isChartType(chartTypeParam)
    ? chartTypeParam
    : "LINE"

  const isValidMetric = METRIC_CONFIGS.some(
    (candidate) => candidate.metric === metric
  )
  const config =
    METRIC_CONFIGS.find((candidate) => candidate.metric === metric) ??
    METRIC_CONFIGS[0]
  const initialFilters = parseFiltersFromSearchParams(searchParams)
  const { filters, setFilters, rows, seriesKeys, isLoading, isError } =
    useMetricTrendState(accountId, config, initialFilters)

  const handleChartTypeChange = (next: ChartType) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set("chartType", next)
      return nextParams
    })
  }

  if (!isValidMetric) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background p-6">
        <p className="text-sm text-muted-foreground">
          Unknown metric "{metric}".
        </p>
        <Link
          to={buildDashboardPath(accountId)}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col gap-4 bg-background p-6">
      <div className="flex items-center justify-between">
        <Link
          to={buildDashboardPath(accountId)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
        <span className="text-xs text-muted-foreground">
          Account: {accountId}
        </span>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xl">{config.title}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <TrendSummaryDialog
                config={config}
                filters={filters}
                rows={rows}
                seriesKeys={seriesKeys}
              />
              <ChartTypeSheet
                metricTitle={config.title}
                value={chartType}
                onChange={handleChartTypeChange}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <DateRangePopover value={filters} onApply={setFilters} />
            <TrendFilters
              config={config}
              value={filters}
              onChange={setFilters}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton
              className="w-full"
              style={{ height: FULL_VIEW_CHART_HEIGHT }}
            />
          ) : isError ? (
            <div
              className="flex items-center justify-center text-sm text-destructive"
              style={{ height: FULL_VIEW_CHART_HEIGHT }}
            >
              Failed to load {config.title.toLowerCase()} trend.
            </div>
          ) : rows.length === 0 ? (
            <div
              className="flex items-center justify-center text-sm text-muted-foreground"
              style={{ height: FULL_VIEW_CHART_HEIGHT }}
            >
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
              height={FULL_VIEW_CHART_HEIGHT}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
