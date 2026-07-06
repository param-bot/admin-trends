import type {
  PlayerTrendsQuery,
  PlayerTrendsResponse,
  TrendMetric,
} from "@/api/types/player-trends"
import { fetchPlayerTrends } from "./api"
import { buildMockPlayerTrends } from "./mock-data"

// All 5 metrics are live on the real backend now (DEPOSIT/WITHDRAW/GGR shipped
// first, BET/WIN followed). LIVE_METRICS stays as the single per-metric on/off
// switch rather than being deleted outright — a 6th metric, or a backend
// regression on one of these, only needs an edit here, not at every call site.
const LIVE_METRICS: ReadonlySet<TrendMetric> = new Set([
  "DEPOSIT",
  "WITHDRAW",
  "GGR",
  "BET",
  "WIN",
])

// Force-mock switch for local dev without a reachable backend. Flip to
// "false" once VITE_API_BASE_URL points at a real deployment to exercise the
// live calls.
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false"
const MOCK_LATENCY_MS = 400

function withMockLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(value), MOCK_LATENCY_MS)
  )
}

export async function getPlayerTrends(
  accountId: string,
  query: PlayerTrendsQuery
): Promise<PlayerTrendsResponse> {
  const isLive = LIVE_METRICS.has(query.metric)

  if (!isLive || USE_MOCK_API) {
    return withMockLatency(buildMockPlayerTrends(accountId, query))
  }

  return fetchPlayerTrends(accountId, query)
}
