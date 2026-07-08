import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { TREND_INTERVALS, type TrendMetric } from "@/api/types/player-trends"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isChartType, type ChartType } from "@/features/player-trends/chart-types"
import { AccountIdSwitcher } from "@/features/player-trends/components/AccountIdSwitcher"
import { DateRangePopover } from "@/features/player-trends/components/DateRangePopover"
import { MetricKpiStrip } from "@/features/player-trends/components/MetricKpiStrip"
import { MetricTrendCard } from "@/features/player-trends/components/MetricTrendCard"
import {
  METRIC_CONFIGS,
  type MetricConfig,
} from "@/features/player-trends/constants"
import {
  useMetricTrendState,
  type MetricTrendState,
} from "@/features/player-trends/hooks/use-metric-trend-state"
import type { TrendFilterState } from "@/features/player-trends/types"
import { defaultDateRange } from "@/features/player-trends/utils"
import { AccountUserSummary } from "@/features/users/components/AccountUserSummary"
import { cn } from "@/lib/utils"

const DEFAULT_ACCOUNT_ID = "acc_mdwxhkx7jxmwF7t7PsAEhL"
const DEFAULT_FOCUSED_METRIC: TrendMetric = "GGR"

const CONFIG_BY_METRIC = Object.fromEntries(
  METRIC_CONFIGS.map((config) => [config.metric, config])
) as Record<TrendMetric, MetricConfig>

type ViewMode = "focused" | "grid"

function isTrendMetric(value: string | null): value is TrendMetric {
  return METRIC_CONFIGS.some((config) => config.metric === value)
}

// Chart type is kept per-metric ("chartType_GGR", "chartType_BET", ...)
// rather than one shared key, so switching the focused metric — or the
// grid — doesn't make one metric's chosen chart type bleed into another's.
function chartTypeParamKey(metric: TrendMetric): string {
  return `chartType_${metric}`
}

function toMetricState(
  config: MetricConfig,
  hookState: ReturnType<typeof useMetricTrendState>
): MetricTrendState {
  return {
    config,
    filters: hookState.filters,
    setFilters: hookState.setFilters,
    rows: hookState.rows,
    seriesKeys: hookState.seriesKeys,
    isLoading: hookState.isLoading,
    isFetching: hookState.isFetching,
    isError: hookState.isError,
  }
}

export function TrendsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const accountId = searchParams.get("accountId") ?? DEFAULT_ACCOUNT_ID

  // Writes the defaults into the URL on first load (rather than just falling
  // back silently) so the address bar always reflects a complete, correct
  // link — copying it before touching anything still points at the same
  // account and focused metric.
  useEffect(() => {
    if (!searchParams.has("accountId") || !searchParams.has("metric")) {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev)
          if (!nextParams.has("accountId")) {
            nextParams.set("accountId", DEFAULT_ACCOUNT_ID)
          }
          if (!nextParams.has("metric")) {
            nextParams.set("metric", DEFAULT_FOCUSED_METRIC)
          }
          return nextParams
        },
        { replace: true }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAccountIdChange = (next: string) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set("accountId", next)
      return nextParams
    })
  }

  // Every metric's fetch + filter state is owned here, once, so the KPI
  // strip and whichever detail card is on screen (focused or grid) always
  // read the same data instead of each fetching it independently.
  const depositState = useMetricTrendState(accountId, CONFIG_BY_METRIC.DEPOSIT)
  const withdrawState = useMetricTrendState(accountId, CONFIG_BY_METRIC.WITHDRAW)
  const betState = useMetricTrendState(accountId, CONFIG_BY_METRIC.BET)
  const winState = useMetricTrendState(accountId, CONFIG_BY_METRIC.WIN)
  const ggrState = useMetricTrendState(accountId, CONFIG_BY_METRIC.GGR)

  const metricStates: MetricTrendState[] = [
    toMetricState(CONFIG_BY_METRIC.DEPOSIT, depositState),
    toMetricState(CONFIG_BY_METRIC.WITHDRAW, withdrawState),
    toMetricState(CONFIG_BY_METRIC.BET, betState),
    toMetricState(CONFIG_BY_METRIC.WIN, winState),
    toMetricState(CONFIG_BY_METRIC.GGR, ggrState),
  ]

  const metricParam = searchParams.get("metric")
  const focusedMetric: TrendMetric = isTrendMetric(metricParam)
    ? metricParam
    : DEFAULT_FOCUSED_METRIC
  const [viewMode, setViewMode] = useState<ViewMode>("focused")

  const focusedState =
    metricStates.find((state) => state.config.metric === focusedMetric) ??
    metricStates[0]

  // Picking a metric from the strip always jumps back to the focused panel
  // — that's the point of clicking it — even if you were looking at the grid.
  const handleFocusChange = (metric: TrendMetric) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set("metric", metric)
      return nextParams
    })
    setViewMode("focused")
  }

  // Chart type lives in the URL (per metric) instead of component state —
  // a card's local state resets whenever it remounts, which happens on
  // every Focused/Grid toggle, making a chosen chart type seem to
  // randomly "disappear". Reading it from the URL survives that.
  const getChartType = (metric: TrendMetric): ChartType => {
    const raw = searchParams.get(chartTypeParamKey(metric))
    return isChartType(raw) ? raw : "LINE"
  }

  const handleChartTypeChange = (metric: TrendMetric) => (next: ChartType) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set(chartTypeParamKey(metric), next)
      return nextParams
    })
  }

  // Grid view's one shared date range + interval control — provider,
  // breakdown, vertical and currency stay per-metric since those genuinely
  // differ per card (and don't even apply to Deposit/Withdraw at all).
  // Focused mode never reads this — each metric keeps its own independent
  // filters there.
  const [sharedFilters, setSharedFilters] = useState<TrendFilterState>(() => ({
    ...defaultDateRange(),
    interval: "DAY",
    sliceBy: "NONE",
  }))

  const applySharedFilters = (
    next: Pick<TrendFilterState, "startDate" | "endDate" | "interval">
  ) => {
    setSharedFilters((prev) => ({ ...prev, ...next }))
    metricStates.forEach((entry) => {
      entry.setFilters({ ...entry.filters, ...next })
    })
  }

  // Switching into grid mode re-applies the shared date/interval to every
  // metric — otherwise a card that diverged while focused (its own date
  // range edited independently) would silently keep showing a different
  // range than its neighbors once the grid puts them side by side.
  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === "grid") {
      applySharedFilters(sharedFilters)
    }
    setViewMode(mode)
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b border-border/70 bg-background/80 px-6 py-4 backdrop-blur-md supports-backdrop-filter:bg-background/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              {/* <LineChartIcon className="size-4.5" /> */}
              <img 
                src="Logo.svg"
                alt="Minibet Logo"
                className="size-4.5"
              />
            </span>
            <div>
              <h1 className="font-heading text-base leading-tight font-semibold">
                Player Trends
              </h1>
              <p className="text-xs text-muted-foreground">
                Deposit, withdraw, bet, win and GGR trends for a single
                player account
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AccountIdSwitcher
              value={accountId}
              defaultValue={DEFAULT_ACCOUNT_ID}
              onChange={handleAccountIdChange}
            />
            <div className="h-8 w-px shrink-0 bg-border" aria-hidden />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-6 p-6">
        <AccountUserSummary accountId={accountId} />

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Overview
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {viewMode === "grid" && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Common:
                    </span>
                    <DateRangePopover
                      value={sharedFilters}
                      onApply={(next) =>
                        applySharedFilters({
                          startDate: next.startDate,
                          endDate: next.endDate,
                          interval: sharedFilters.interval,
                        })
                      }
                    />
                    <Select
                      value={sharedFilters.interval}
                      onValueChange={(interval) =>
                        applySharedFilters({
                          startDate: sharedFilters.startDate,
                          endDate: sharedFilters.endDate,
                          interval: interval as TrendFilterState["interval"],
                        })
                      }
                    >
                      <SelectTrigger size="sm" className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TREND_INTERVALS.map((interval) => (
                          <SelectItem key={interval} value={interval}>
                            {interval}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="h-5 w-px shrink-0 bg-border" aria-hidden />
                </>
              )}
              <ViewModeToggle
                value={viewMode}
                onChange={handleViewModeChange}
              />
            </div>
          </div>
          <MetricKpiStrip
            metrics={metricStates}
            focusedMetric={focusedMetric}
            onFocusChange={handleFocusChange}
          />
        </div>

        {viewMode === "focused" ? (
          <MetricTrendCard
            accountId={accountId}
            state={focusedState}
            chartHeight={420}
            chartType={getChartType(focusedMetric)}
            onChartTypeChange={handleChartTypeChange(focusedMetric)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {metricStates.map((state, index) => {
              const isTrailingOdd =
                metricStates.length % 2 !== 0 &&
                index === metricStates.length - 1
              return (
                <MetricTrendCard
                  key={state.config.metric}
                  accountId={accountId}
                  state={state}
                  hideDateAndInterval
                  className={isTrailingOdd ? "lg:col-span-2" : undefined}
                  chartType={getChartType(state.config.metric)}
                  onChartTypeChange={handleChartTypeChange(state.config.metric)}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
      {(["focused", "grid"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === mode
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {mode === "focused" ? "Focused" : "All metrics"}
        </button>
      ))}
    </div>
  )
}
