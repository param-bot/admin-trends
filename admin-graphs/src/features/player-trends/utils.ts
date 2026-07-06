import {
  TREND_CURRENCY_TYPES,
  TREND_INTERVALS,
  TREND_SLICE_BY,
  TREND_VERTICALS,
  type TrendCurrencyType,
  type TrendInterval,
  type TrendMetric,
  type TrendPoint,
  type TrendSliceBy,
  type TrendVertical,
} from "@/api/types/player-trends"
import type { ChartType } from "./chart-types"
import type { TrendFilterState } from "./types"

export const UNSLICED_KEY = "value"

// Each seriesKey's transaction count rides along in the same row under this
// derived key, so tooltips can show "value (N txns)" using real backend data
// instead of inventing a count — see countKeyFor.
const COUNT_KEY_SUFFIX = "__count"

export function countKeyFor(seriesKey: string): string {
  return `${seriesKey}${COUNT_KEY_SUFFIX}`
}

export interface ChartRow {
  period: string
  [sliceKey: string]: string | number
}

// Pivots the backend's tidy/long point list into wide rows Recharts can plot
// directly — one row per period, one column per distinct sliceKey (plus a
// parallel count column per sliceKey, for tooltips).
export function pivotPointsForChart(points: TrendPoint[]): {
  rows: ChartRow[]
  seriesKeys: string[]
} {
  const rowsByPeriod = new Map<string, ChartRow>()
  const seriesKeys = new Set<string>()

  for (const point of points) {
    const key = point.sliceKey ?? UNSLICED_KEY
    seriesKeys.add(key)
    const row = rowsByPeriod.get(point.period) ?? { period: point.period }
    row[key] = point.value
    row[countKeyFor(key)] = point.count
    rowsByPeriod.set(point.period, row)
  }

  const rows = Array.from(rowsByPeriod.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  )

  return { rows, seriesKeys: Array.from(seriesKeys) }
}

export function defaultDateRange(days = 30): {
  startDate: string
  endDate: string
} {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }
}

// Opening the full view carries the card's current filters AND chart type over
// as query params, so the new tab starts on the same view instead of resetting
// to defaults — parseFiltersFromSearchParams below (and the ?chartType= read in
// metric-trend-page.tsx) is the other half of this round-trip, kept in the same
// file so the two can't drift out of sync.
export function buildMetricTrendPath(
  metric: TrendMetric,
  accountId: string,
  filters?: TrendFilterState,
  chartType?: ChartType
): string {
  const params = new URLSearchParams({ accountId })

  if (filters) {
    params.set("startDate", filters.startDate)
    params.set("endDate", filters.endDate)
    params.set("interval", filters.interval)
    params.set("sliceBy", filters.sliceBy)
    if (filters.currencyType) params.set("currencyType", filters.currencyType)
    if (filters.vertical) params.set("vertical", filters.vertical)
    if (filters.providerId) params.set("providerId", filters.providerId)
    if (filters.gameType) params.set("gameType", filters.gameType)
  }

  if (chartType) {
    params.set("chartType", chartType)
  }

  return `/trends/${metric}?${params.toString()}`
}

// The reverse trip: the full-view page's "Back to dashboard" link uses this
// so returning preserves the account being viewed, instead of landing on "/"
// with no accountId and falling back to the dashboard's own hardcoded default.
export function buildDashboardPath(accountId: string): string {
  return `/?${new URLSearchParams({ accountId }).toString()}`
}

// Reads the filters back out of the full view's URL. Returns undefined if
// the required fields are missing/invalid, so the caller can fall back to
// its normal defaults instead of seeding broken state (e.g. a bookmarked or
// hand-edited URL missing startDate).
export function parseFiltersFromSearchParams(
  searchParams: URLSearchParams
): TrendFilterState | undefined {
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const interval = searchParams.get("interval")
  const sliceBy = searchParams.get("sliceBy")

  if (
    !startDate ||
    !endDate ||
    !interval ||
    !sliceBy ||
    !TREND_INTERVALS.includes(interval as TrendInterval) ||
    !TREND_SLICE_BY.includes(sliceBy as TrendSliceBy)
  ) {
    return undefined
  }

  const currencyType = searchParams.get("currencyType")
  const vertical = searchParams.get("vertical")

  return {
    startDate,
    endDate,
    interval: interval as TrendInterval,
    sliceBy: sliceBy as TrendSliceBy,
    currencyType:
      currencyType && TREND_CURRENCY_TYPES.includes(currencyType as TrendCurrencyType)
        ? (currencyType as TrendCurrencyType)
        : undefined,
    vertical:
      vertical && TREND_VERTICALS.includes(vertical as TrendVertical)
        ? (vertical as TrendVertical)
        : undefined,
    providerId: searchParams.get("providerId") ?? undefined,
    gameType: searchParams.get("gameType") ?? undefined,
  }
}
