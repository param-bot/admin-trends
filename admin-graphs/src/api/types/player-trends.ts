// Mirrors GET /api/player-trends/:accId — see player-trends-api-reference.md.
// All 5 metrics are live now — see service.ts's LIVE_METRICS gate, kept as a
// single per-metric switch in case a future metric or a backend regression
// needs one flipped back to mock.

export const TREND_METRICS = [
  "DEPOSIT",
  "WITHDRAW",
  "BET",
  "WIN",
  "GGR",
] as const
export type TrendMetric = (typeof TREND_METRICS)[number]

export const TREND_INTERVALS = ["HOUR", "DAY", "WEEK", "MONTH"] as const
export type TrendInterval = (typeof TREND_INTERVALS)[number]

// GAME_TYPE isn't in the real backend's sliceBy enum at all yet (blocked on a
// lookup table — see the api reference doc's §9 roadmap), for any metric. No
// live MetricConfig (constants.ts) offers it as a "Break down by" option —
// it only still exists here/in mock-data.ts in case a future metric needs
// the mock path. Never sent to the real endpoint.
export const TREND_SLICE_BY = [
  "NONE",
  "GAME_TYPE",
  "CURRENCY",
  "PROVIDER",
  "VERTICAL",
] as const
export type TrendSliceBy = (typeof TREND_SLICE_BY)[number]

export const TREND_VERTICALS = ["CASINO", "SPORTS"] as const
export type TrendVertical = (typeof TREND_VERTICALS)[number]

export const TREND_CURRENCY_TYPES = ["REAL", "BONUS"] as const
export type TrendCurrencyType = (typeof TREND_CURRENCY_TYPES)[number]

// One metric per request — the real API takes a single `metric`, not a CSV
// (that was an earlier design-doc proposal; the api reference doc that
// actually shipped is one call per metric, which is what every hook here
// already did anyway).
export interface PlayerTrendsQuery {
  metric: TrendMetric
  startDate?: string
  endDate?: string
  interval?: TrendInterval
  currencyType?: TrendCurrencyType
  sliceBy?: TrendSliceBy
  // Accepted by the real endpoint but a no-op on DEPOSIT/WITHDRAW — meaningful
  // on BET/WIN/GGR, which all carry the full tbl_bet_summary dimension set.
  vertical?: TrendVertical
  providerId?: string
  // Not a real query param at all (no GAME_TYPE lookup table server-side, for
  // any metric) — only ever read by the mock generator, and no live
  // MetricConfig exposes a UI control that would set this.
  gameType?: string
}

export interface TrendPoint {
  period: string
  bucketStart: string
  sliceKey: string | null
  value: number
  count: number
}

export interface PlayerTrendsResponse {
  accountId: string
  metric: TrendMetric
  interval: TrendInterval
  range: { startDate: string; endDate: string }
  sliceBy: TrendSliceBy
  points: TrendPoint[]
}
