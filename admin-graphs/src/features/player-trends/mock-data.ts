import type {
  PlayerTrendsQuery,
  PlayerTrendsResponse,
  TrendInterval,
  TrendMetric,
  TrendPoint,
  TrendSliceBy,
} from "@/api/types/player-trends"

// Stand-ins for lookup data the backend doesn't expose yet (e.g. a future
// GET /providers, /game-types). Swap for real lookups once those exist —
// the filter components only consume { id, label }[].
export const MOCK_PROVIDER_OPTIONS = [
  { id: "pragmatic-play", label: "Pragmatic Play" },
  { id: "evolution", label: "Evolution Gaming" },
  { id: "netent", label: "NetEnt" },
  { id: "sportradar", label: "Sportradar" },
  { id: "param-test", label: "Param Test" },
  { id: "test-provider", label: "Test Provider" },
]

export const MOCK_GAME_TYPE_OPTIONS = [
  { id: "slots", label: "Slots" },
  { id: "live-casino", label: "Live Casino" },
  { id: "table-games", label: "Table Games" },
  { id: "sportsbook", label: "Sportsbook" },
]

export const MOCK_GAME_OPTIONS = [
  { id: "sweet-bonanza", label: "Sweet Bonanza" },
  { id: "gates-of-olympus", label: "Gates of Olympus" },
  { id: "crazy-time", label: "Crazy Time" },
  { id: "blackjack-live", label: "Blackjack Live" },
  { id: "book-of-dead", label: "Book of Dead" },
]

const SLICE_VALUES: Record<Exclude<TrendSliceBy, "NONE">, string[]> = {
  GAME_TYPE: MOCK_GAME_TYPE_OPTIONS.map((option) => option.label),
  GAME: MOCK_GAME_OPTIONS.map((option) => option.label),
  CURRENCY: ["REAL", "BONUS"],
  PROVIDER: MOCK_PROVIDER_OPTIONS.map((option) => option.label),
  VERTICAL: ["CASINO", "SPORTS"],
}

const METRIC_VALUE_RANGE: Record<TrendMetric, [number, number]> = {
  DEPOSIT: [50, 2000],
  WITHDRAW: [20, 1500],
  BET: [10, 800],
  WIN: [0, 900],
  GGR: [-100, 300],
}

function bucketStepMs(interval: TrendInterval): number {
  switch (interval) {
    case "HOUR":
      return 60 * 60 * 1000
    case "DAY":
      return 24 * 60 * 60 * 1000
    case "WEEK":
      return 7 * 24 * 60 * 60 * 1000
    case "MONTH":
      return 30 * 24 * 60 * 60 * 1000
  }
}

function periodLabel(date: Date, interval: TrendInterval): string {
  return interval === "HOUR"
    ? date.toISOString().slice(0, 13) + ":00"
    : date.toISOString().slice(0, 10)
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) || 1
}

// Deterministic PRNG (Lehmer/park-miller) so a given filter combo renders a
// stable-looking chart instead of jumping around on every refetch.
function seededRandom(seed: number): () => number {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

export function buildMockPlayerTrends(
  accountId: string,
  query: PlayerTrendsQuery
): PlayerTrendsResponse {
  const interval = query.interval ?? "DAY"
  const endDate = query.endDate ? new Date(query.endDate) : new Date()
  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sliceBy = query.sliceBy ?? "NONE"
  const sliceKeys: (string | null)[] =
    sliceBy === "NONE" ? [null] : SLICE_VALUES[sliceBy]
  const step = bucketStepMs(interval)

  const [min, max] = METRIC_VALUE_RANGE[query.metric]
  const seed = hashString(
    [
      accountId,
      query.metric,
      sliceBy,
      query.vertical ?? "",
      query.currencyType ?? "",
      query.providerId ?? "",
      query.gameType ?? "",
    ].join("|")
  )
  const rand = seededRandom(seed)
  const points: TrendPoint[] = []

  for (
    let cursor = startDate.getTime();
    cursor <= endDate.getTime();
    cursor += step
  ) {
    const bucketStart = new Date(cursor)
    const wave = Math.sin(cursor / (step * 6)) * 0.3 + 1
    for (const sliceKey of sliceKeys) {
      const value = Math.round((min + rand() * (max - min)) * wave * 100) / 100
      const count = Math.max(1, Math.round(rand() * 40))
      points.push({
        period: periodLabel(bucketStart, interval),
        bucketStart: bucketStart.toISOString(),
        sliceKey,
        value,
        count,
      })
    }
  }

  return {
    accountId,
    metric: query.metric,
    interval,
    range: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    sliceBy,
    points,
  }
}
