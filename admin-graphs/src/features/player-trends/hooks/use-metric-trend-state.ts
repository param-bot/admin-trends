import { useState } from "react"

import type { MetricConfig } from "../constants"
import type { TrendFilterState } from "../types"
import { defaultDateRange, pivotPointsForChart, type ChartRow } from "../utils"
import { usePlayerTrend } from "./use-player-trend"

// The slice of a metric's state that its presentation components (the
// KPI strip, the compact/full trend cards) actually need. Kept separate from
// the hook's real return value (which also carries the rest of TanStack
// Query's result) so components fetching-agnostic — the dashboard lifts one
// of these per metric and hands it down as a plain prop.
export interface MetricTrendState {
  config: MetricConfig
  filters: TrendFilterState
  setFilters: (next: TrendFilterState) => void
  rows: ChartRow[]
  seriesKeys: string[]
  isLoading: boolean
  isFetching: boolean
  isError: boolean
}

// Called once per metric by TrendsDashboard (which lifts the state so the KPI
// strip and detail card can share it) and once by MetricTrendPage (the full
// view), so filter state and the tidy->chart pivot only live in one place.
// `initialFilters` lets the full view seed itself from the URL (see
// parseFiltersFromSearchParams) instead of always falling back to the
// hardcoded defaults.
export function useMetricTrendState(
  accountId: string,
  config: MetricConfig,
  initialFilters?: TrendFilterState
) {
  const [filters, setFilters] = useState<TrendFilterState>(
    () =>
      initialFilters ?? {
        ...defaultDateRange(),
        interval: "DAY",
        sliceBy: "NONE",
      }
  )

  const query = usePlayerTrend(accountId, config.metric, filters)
  const points = query.data?.points ?? []
  const { rows, seriesKeys } = pivotPointsForChart(points)

  // console.log('filters: ', filters);
  return { filters, setFilters, rows, seriesKeys, ...query }
}
