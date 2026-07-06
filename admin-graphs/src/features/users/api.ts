import { adminApiClient } from "@/api/admin-client"
import type { ApiEnvelope } from "@/api/types/envelope"
import type { AdminUser } from "./types"

const USERS_PATH = "/admin/api/users/v2"

interface UsersResponseData {
  items: AdminUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

// `search` isn't account-id-exclusive server-side (likely also matches
// username/email), so this only trusts an exact account_id match among the
// returned items rather than assuming items[0] is the right one.
export async function fetchUserByAccountId(
  accountId: string
): Promise<AdminUser | null> {
  const { data: envelope } = await adminApiClient.get<
    ApiEnvelope<UsersResponseData>
  >(USERS_PATH, {
    params: { page: 1, limit: 10, search: accountId },
  })

  if (!envelope.success) {
    throw new Error(
      envelope.error?.details ??
        envelope.error?.message ??
        "Failed to load user"
    )
  }

  return (
    envelope.data.items.find((user) => user.account_id === accountId) ?? null
  )
}
