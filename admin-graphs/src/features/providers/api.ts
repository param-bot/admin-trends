import { adminApiClient } from "@/api/admin-client"
import type { ApiEnvelope } from "@/api/types/envelope"
import type { GameProvider, GameProvidersPage, GameProvidersQuery } from "./types"

const GAME_PROVIDERS_PATH = "/admin/api/game-providers"

interface GameProvidersResponseData {
  items: GameProvider[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export async function fetchGameProviders(
  query: GameProvidersQuery
): Promise<GameProvidersPage> {
  const { data: envelope } = await adminApiClient.get<ApiEnvelope<GameProvidersResponseData>>(
    GAME_PROVIDERS_PATH,
    {
      params: {
        page: query.page,
        limit: query.limit,
        // Fixed — this call is specifically for the provider dropdown, not a
        // general game-collection browser.
        type: "PROVIDER",
        name: query.name || undefined,
      },
    }
  )

  if (!envelope.success) {
    throw new Error(envelope.error?.details ?? envelope.error?.message ?? "Failed to load providers")
  }

  const { items, pagination } = envelope.data
  return { items, hasMore: pagination.hasNextPage }
}
