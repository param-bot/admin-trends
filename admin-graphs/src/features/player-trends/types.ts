import type { PlayerTrendsQuery } from "@/api/types/player-trends"

export type TrendFilterState = Omit<PlayerTrendsQuery, "metric"> & {
  startDate: string
  endDate: string
  interval: NonNullable<PlayerTrendsQuery["interval"]>
  sliceBy: NonNullable<PlayerTrendsQuery["sliceBy"]>
}
