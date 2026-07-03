import { useQuery } from "@tanstack/react-query"

import type { PlayerTrendsQuery, TrendMetric } from "@/api/types/player-trends"
import { getPlayerTrends } from "../service"

export function usePlayerTrend(
  accountId: string,
  metric: TrendMetric,
  filters: Omit<PlayerTrendsQuery, "metric">
) {
  return useQuery({
    queryKey: ["player-trends", accountId, metric, filters],
    queryFn: () => getPlayerTrends(accountId, { ...filters, metric }),
    enabled: Boolean(accountId),
    staleTime: 60_000,
  })
}
