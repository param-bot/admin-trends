import axios from "axios"

import { apiClient } from "@/api/client"
import type { ApiEnvelope } from "@/api/types/envelope"
import type {
  PlayerTrendsQuery,
  PlayerTrendsResponse,
} from "@/api/types/player-trends"

// The service's global API_PREFIX — see player-trends-api-reference.md §1.
// Public endpoint, no auth header (confirmed with backend — the doc's
// x-token mention doesn't apply to this deployment).
const PLAYER_TRENDS_PATH_PREFIX = "/api/player-trends"

function extractErrorMessage(envelope: ApiEnvelope<unknown> | undefined, fallback: string): string {
  if (envelope && !envelope.success) {
    return envelope.error?.details ?? envelope.error?.message ?? fallback
  }
  return fallback
}

export async function fetchPlayerTrends(
  accountId: string,
  query: PlayerTrendsQuery
): Promise<PlayerTrendsResponse> {
  try {
    const { data: envelope } = await apiClient.get<ApiEnvelope<PlayerTrendsResponse>>(
      `${PLAYER_TRENDS_PATH_PREFIX}/${accountId}`,
      {
        params: {
          metric: query.metric,
          startDate: query.startDate,
          endDate: query.endDate,
          interval: query.interval,
          currencyType: query.currencyType,
          sliceBy: query.sliceBy,
          // No-ops on DEPOSIT/WITHDRAW, meaningful on GGR/BET/WIN — see
          // player-trends-api-reference.md §3. Not worth branching on metric
          // here: axios drops undefined params, so this is a no-op to send
          // for the metrics that ignore it.
          vertical: query.vertical,
          providerId: query.providerId,
        },
      }
    )

    if (!envelope.success) {
      throw new Error(extractErrorMessage(envelope, "Unknown error"))
    }

    return envelope.data
  } catch (err) {
    if (axios.isAxiosError<ApiEnvelope<unknown>>(err)) {
      throw new Error(extractErrorMessage(err.response?.data, err.message), {
        cause: err,
      })
    }
    throw err
  }
}
