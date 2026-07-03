import { useState } from "react"

import type { MetricConfig } from "../constants"
import type { TrendFilterState } from "../types"
import { defaultDateRange, pivotPointsForChart } from "../utils"
import { usePlayerTrend } from "./use-player-trend"

// Shared by MetricTrendCard (dashboard grid) and MetricTrendPage (full view) so
// filter state and the tidy->chart pivot only live in one place. `initialFilters`
// lets the full view seed itself from the URL (see parseFiltersFromSearchParams)
// instead of always falling back to the hardcoded defaults.
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
