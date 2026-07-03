import { useQuery } from "@tanstack/react-query"

import { fetchUserByAccountId } from "../api"

export function useAccountUser(accountId: string) {
  return useQuery({
    queryKey: ["admin-user", accountId],
    queryFn: () => fetchUserByAccountId(accountId),
    enabled: Boolean(accountId),
    staleTime: 60_000,
  })
}
