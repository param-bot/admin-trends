import { getSeriesColor } from "./components/charts/types"
import type { MetricConfig } from "./constants"
import type { TrendFilterState } from "./types"
import { countKeyFor, UNSLICED_KEY, type ChartRow } from "./utils"

const INTERVAL_ADJECTIVE: Record<string, string> = {
  HOUR: "hourly",
  DAY: "daily",
  WEEK: "weekly",
  MONTH: "monthly",
}

const INTERVAL_BUCKET_NOUN: Record<string, string> = {
  HOUR: "hour",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
}

const VERTICAL_LABEL: Record<string, string> = {
  CASINO: "Casino",
  SPORTS: "Sports",
}
const CURRENCY_LABEL: Record<string, string> = {
  REAL: "Real currency",
  BONUS: "Bonus currency",
}
const SLICE_NOUN: Record<string, string> = {
  CURRENCY: "currency",
  PROVIDER: "provider",
  VERTICAL: "vertical",
  GAME_TYPE: "game type",
  GAME: "game",
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export type TrendDirection = "up" | "down" | "flat"

export interface TrendInsight {
  direction: TrendDirection
  sentence: string
}

export interface BreakdownInsight {
  sentence: string
  leadingKey: string
  leadingColor: string
}

export interface TrendSummary {
  hasData: boolean
  dateRangeLabel: string
  totalLabel: string
  averageLabel: string
  averageNoun: string
  peakLabel: string
  countLabel: string
  narrative: string
  trend: TrendInsight | null
  breakdown: BreakdownInsight | null
  filterBullets: string[]
}

// Everything here is computed straight from what's already on screen (rows,
// seriesKeys, filters) — no LLM call, no extra request. "Summary" means
// "the same numbers, read out loud in a sentence" rather than a generated
// analysis, so it's exact and free to compute on every open.
export function buildTrendSummary(
  config: MetricConfig,
  filters: TrendFilterState,
  rows: ChartRow[],
  seriesKeys: string[]
): TrendSummary {
  const dateRangeLabel = `${formatDate(filters.startDate)} – ${formatDate(filters.endDate)}`
  const intervalAdjective =
    INTERVAL_ADJECTIVE[filters.interval] ?? filters.interval.toLowerCase()
  const bucketNoun = INTERVAL_BUCKET_NOUN[filters.interval] ?? "period"

  const filterBullets: string[] = [
    `${dateRangeLabel}, grouped ${intervalAdjective}`,
  ]
  if (filters.currencyType) {
    filterBullets.push(
      CURRENCY_LABEL[filters.currencyType] ?? filters.currencyType
    )
  }
  if (filters.vertical) {
    filterBullets.push(VERTICAL_LABEL[filters.vertical] ?? filters.vertical)
  }
  if (filters.providerId) {
    filterBullets.push(`Provider filter applied (${filters.providerId})`)
  }
  if (filters.gameType) {
    filterBullets.push(`Game type filter applied (${filters.gameType})`)
  }
  if (filters.sliceBy !== "NONE") {
    filterBullets.push(
      `Broken down by ${SLICE_NOUN[filters.sliceBy] ?? filters.sliceBy.toLowerCase()}`
    )
  }

  if (rows.length === 0) {
    return {
      hasData: false,
      dateRangeLabel,
      totalLabel: "—",
      averageLabel: "—",
      averageNoun: bucketNoun,
      peakLabel: "—",
      countLabel: "0",
      narrative: `No ${config.title.toLowerCase()} activity was recorded for the selected filters.`,
      trend: null,
      breakdown: null,
      filterBullets,
    }
  }

  const rowTotals = rows.map((row) => ({
    period: row.period,
    total: seriesKeys.reduce((sum, key) => sum + (Number(row[key]) || 0), 0),
    count: seriesKeys.reduce(
      (sum, key) => sum + (Number(row[countKeyFor(key)]) || 0),
      0
    ),
  }))

  const grandTotal = rowTotals.reduce((sum, r) => sum + r.total, 0)
  const grandCount = rowTotals.reduce((sum, r) => sum + r.count, 0)
  const average = grandTotal / rowTotals.length

  const peak = rowTotals.reduce(
    (best, r) => (r.total > best.total ? r : best),
    rowTotals[0]
  )

  // Trend: average of the first half of the range vs. the second half —
  // simple, explainable, and doesn't need a real regression for a summary.
  // Only stated with >= 4 buckets; too few points to call a trend otherwise.
  let trend: TrendInsight | null = null
  if (rowTotals.length >= 4) {
    const midpoint = Math.floor(rowTotals.length / 2)
    const firstHalf = rowTotals.slice(0, midpoint)
    const secondHalf = rowTotals.slice(midpoint)
    const firstAvg =
      firstHalf.reduce((sum, r) => sum + r.total, 0) / firstHalf.length
    const secondAvg =
      secondHalf.reduce((sum, r) => sum + r.total, 0) / secondHalf.length

    if (firstAvg === 0 && secondAvg === 0) {
      trend = {
        direction: "flat",
        sentence: "Activity stayed flat at zero across the range.",
      }
    } else {
      const change =
        firstAvg === 0
          ? 100
          : ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100
      if (Math.abs(change) < 5) {
        trend = {
          direction: "flat",
          sentence: "Activity has stayed roughly flat across the range.",
        }
      } else if (change > 0) {
        trend = {
          direction: "up",
          sentence: `The second half of the range ran about ${Math.abs(change).toFixed(0)}% higher than the first half.`,
        }
      } else {
        trend = {
          direction: "down",
          sentence: `The second half of the range ran about ${Math.abs(change).toFixed(0)}% lower than the first half.`,
        }
      }
    }
  }

  const isSingleSeries =
    seriesKeys.length === 1 && seriesKeys[0] === UNSLICED_KEY
  let breakdown: BreakdownInsight | null = null
  if (!isSingleSeries && grandTotal > 0) {
    const sliceTotals = seriesKeys
      .map((key, index) => ({
        key,
        index,
        total: rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0),
      }))
      .filter((slice) => slice.total > 0)
      .sort((a, b) => b.total - a.total)

    const sliceNoun = SLICE_NOUN[filters.sliceBy] ?? "category"
    if (sliceTotals.length === 1) {
      const only = sliceTotals[0]
      breakdown = {
        sentence: `All of it came from a single ${sliceNoun}: ${only.key}.`,
        leadingKey: only.key,
        leadingColor: getSeriesColor(only.key, only.index),
      }
    } else if (sliceTotals.length > 1) {
      const [top, second] = sliceTotals
      const topShare = (top.total / grandTotal) * 100
      const secondShare = (second.total / grandTotal) * 100
      breakdown = {
        sentence: `By ${sliceNoun}, ${top.key} leads with ${topShare.toFixed(0)}% of the total, followed by ${second.key} at ${secondShare.toFixed(0)}%.`,
        leadingKey: top.key,
        leadingColor: getSeriesColor(top.key, top.index),
      }
    }
  }

  const countText =
    grandCount > 0
      ? ` across ${formatNumber(grandCount)} ${config.countLabel}`
      : ""

  const narrative =
    `Over ${dateRangeLabel} (${intervalAdjective} buckets), ${config.title.toLowerCase()} totaled ` +
    `${formatNumber(grandTotal)}${countText}, averaging ${formatNumber(average)} per ${bucketNoun}. ` +
    `The highest single ${bucketNoun} was ${peak.period} at ${formatNumber(peak.total)}.`

  return {
    hasData: true,
    dateRangeLabel,
    totalLabel: formatNumber(grandTotal),
    averageLabel: formatNumber(average),
    averageNoun: bucketNoun,
    peakLabel: `${peak.period} (${formatNumber(peak.total)})`,
    countLabel: `${formatNumber(grandCount)} ${config.countLabel}`,
    narrative,
    trend,
    breakdown,
    filterBullets,
  }
}
