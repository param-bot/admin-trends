import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react"

import type { TrendMetric, TrendSliceBy } from "@/api/types/player-trends"

// A filter field a graph's card can expose to the user.
export type FilterField =
  "vertical" | "currencyType" | "providerId" | "gameType" | "sliceBy"

export interface MetricConfig {
  metric: TrendMetric
  title: string
  description: string
  color: string
  icon: LucideIcon
  availableFilters: FilterField[]
  sliceByOptions: TrendSliceBy[]
  // What a point's `count` field actually counts — shown in chart tooltips
  // ("87.46 (26 txns)"). Deposit/Withdraw come from the wallet ledger
  // (transactions); Bet/Win/GGR come from tbl_bet_summary (settled bets) —
  // calling both "txns" reads as wrong for the gameplay metrics.
  countLabel: string
}

// DEPOSIT/WITHDRAW come from the wallet ledger rollup — no game/provider/vertical
// dimension exists on that data, so only sliceBy=CURRENCY is meaningful (backend
// rejects vertical/providerId/gameType and other sliceBy values for these). The
// currencyType filter itself is intentionally left off these two cards — use
// "Break down by: Currency" to see the REAL/BONUS split instead.
const CASHFLOW_FILTERS: FilterField[] = ["sliceBy"]
const CASHFLOW_SLICE_BY: TrendSliceBy[] = ["NONE", "CURRENCY"]

// BET/WIN/GGR all come from tbl_bet_summary and are all live now — same
// dimension set, minus gameType/GAME_TYPE: the real backend has no gameType
// param or lookup table at all yet, for any metric (see
// player-trends-api-reference.md §9). mock-data.ts still has GAME_TYPE mock
// support (SLICE_VALUES.GAME_TYPE, MOCK_GAME_TYPE_OPTIONS) in case a future
// metric needs the mock path again, but nothing here exposes it in the UI.
const GAMEPLAY_FILTERS: FilterField[] = [
  "vertical",
  "currencyType",
  "providerId",
  "sliceBy",
]
const GAMEPLAY_SLICE_BY: TrendSliceBy[] = [
  "NONE",
  "CURRENCY",
  "PROVIDER",
  "VERTICAL",
]

export const METRIC_CONFIGS: MetricConfig[] = [
  {
    metric: "DEPOSIT",
    title: "Deposits",
    description: "Cash-in volume from the wallet ledger",
    color: "var(--chart-1)",
    icon: ArrowDownToLine,
    availableFilters: CASHFLOW_FILTERS,
    sliceByOptions: CASHFLOW_SLICE_BY,
    countLabel: "txns",
  },
  {
    metric: "WITHDRAW",
    title: "Withdrawals",
    description: "Cash-out volume from the wallet ledger",
    color: "var(--chart-2)",
    icon: ArrowUpFromLine,
    availableFilters: CASHFLOW_FILTERS,
    sliceByOptions: CASHFLOW_SLICE_BY,
    countLabel: "txns",
  },
  {
    metric: "BET",
    title: "Bet Volume",
    description: "Total amount wagered",
    color: "var(--chart-3)",
    icon: Coins,
    availableFilters: GAMEPLAY_FILTERS,
    sliceByOptions: GAMEPLAY_SLICE_BY,
    countLabel: "bets",
  },
  {
    metric: "WIN",
    title: "Win Volume",
    description: "Total amount won",
    color: "var(--chart-4)",
    icon: Trophy,
    availableFilters: GAMEPLAY_FILTERS,
    sliceByOptions: GAMEPLAY_SLICE_BY,
    countLabel: "wins",
  },
  {
    metric: "GGR",
    title: "GGR",
    description: "Gross gaming revenue (bet − win)",
    color: "var(--chart-5)",
    icon: TrendingUp,
    availableFilters: GAMEPLAY_FILTERS,
    sliceByOptions: GAMEPLAY_SLICE_BY,
    countLabel: "bets",
  },
]
