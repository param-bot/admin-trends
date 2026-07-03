import type {
  PlayerTrendsQuery,
  PlayerTrendsResponse,
  TrendMetric,
} from "@/api/types/player-trends"
import { fetchPlayerTrends } from "./api"
import { buildMockPlayerTrends } from "./mock-data"

// DEPOSIT/WITHDRAW/GGR are live on the real backend. BET/WIN are still
// Phase 2 — the real endpoint 501s them — so they always use mock data
// regardless of VITE_USE_MOCK_API, until the backend ships them too.
const LIVE_METRICS: ReadonlySet<TrendMetric> = new Set(["DEPOSIT", "WITHDRAW", "GGR"])

// Force-mock switch for local dev without a reachable backend. Flip to
// "false" once VITE_API_BASE_URL points at a real deployment to exercise the
// live calls — BET/WIN ignore this and stay mocked.
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
