import type { TrendMetric, TrendSliceBy } from "@/api/types/player-trends"

// A filter field a graph's card can expose to the user.
export type FilterField =
  "vertical" | "currencyType" | "providerId" | "gameType" | "sliceBy"

export interface MetricConfig {
  metric: TrendMetric
  title: string
  description: string
  color: string
  availableFilters: FilterField[]
  sliceByOptions: TrendSliceBy[]
}

// DEPOSIT/WITHDRAW come from the wallet ledger rollup — no game/provider/vertical
// dimension exists on that data, so only sliceBy=CURRENCY is meaningful (backend
// rejects vertical/providerId/gameType and other sliceBy values for these). The
// currencyType filter itself is intentionally left off these two cards — use
// "Break down by: Currency" to see the REAL/BONUS split instead.
const CASHFLOW_FILTERS: FilterField[] = ["sliceBy"]
const CASHFLOW_SLICE_BY: TrendSliceBy[] = ["NONE", "CURRENCY"]

// BET/WIN/GGR come from tbl_bet_summary, which carries the full dimension set.
// BET/WIN are still mock-only (Phase 2 on the backend), so they keep the full
// theoretical set including gameType/GAME_TYPE for the mock generator.
const GAMEPLAY_FILTERS: FilterField[] = [
  "vertical",
  "currencyType",
  "providerId",
  "gameType",
  "sliceBy",
]
const GAMEPLAY_SLICE_BY: TrendSliceBy[] = [
  "NONE",
  "GAME_TYPE",
  "CURRENCY",
  "PROVIDER",
  "VERTICAL",
]

// GGR is live now — same dimension set minus gameType/GAME_TYPE: the real
// backend has no gameType param or lookup table at all yet, for any metric
// (see player-trends-api-reference.md §9), unlike the mock-only BET/WIN above.
const LIVE_GAMEPLAY_FILTERS: FilterField[] = [
  "vertical",
  "currencyType",
  "providerId",
  "sliceBy",
]
const LIVE_GAMEPLAY_SLICE_BY: TrendSliceBy[] = ["NONE", "CURRENCY", "PROVIDER", "VERTICAL"]

export const METRIC_CONFIGS: MetricConfig[] = [
  {
    metric: "DEPOSIT",
    title: "Deposits",
    description: "Cash-in volume from the wallet ledger",
    color: "var(--chart-1)",
    availableFilters: CASHFLOW_FILTERS,
    sliceByOptions: CASHFLOW_SLICE_BY,
  },
  {
    metric: "WITHDRAW",
    title: "Withdrawals",
    description: "Cash-out volume from the wallet ledger",
    color: "var(--chart-2)",
    availableFilters: CASHFLOW_FILTERS,
    sliceByOptions: CASHFLOW_SLICE_BY,
  },
  {
    metric: "BET",
    title: "Bet Volume",
    description: "Total amount wagered",
    color: "var(--chart-3)",
    availableFilters: GAMEPLAY_FILTERS,
    sliceByOptions: GAMEPLAY_SLICE_BY,
  },
  {
    metric: "WIN",
    title: "Win Volume",
    description: "Total amount won",
    color: "var(--chart-4)",
    availableFilters: GAMEPLAY_FILTERS,
    sliceByOptions: GAMEPLAY_SLICE_BY,
  },
  {
    metric: "GGR",
    title: "GGR",
    description: "Gross gaming revenue (bet − win)",
    color: "var(--chart-5)",
    availableFilters: LIVE_GAMEPLAY_FILTERS,
    sliceByOptions: LIVE_GAMEPLAY_SLICE_BY,
  },
]
