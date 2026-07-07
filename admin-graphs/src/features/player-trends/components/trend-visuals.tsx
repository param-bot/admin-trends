import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { TrendDirection } from "../trend-summary"

const TREND_ICON: Record<TrendDirection, typeof TrendingUpIcon> = {
  up: TrendingUpIcon,
  down: TrendingDownIcon,
  flat: MinusIcon,
}

const TREND_CLASS: Record<TrendDirection, string> = {
  up: "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400",
  down: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  flat: "border-border bg-muted text-muted-foreground",
}

// A small icon-only trend indicator shared by the KPI strip tiles and the
// trend cards' headline stat — both want "up/down/flat" at a glance without
// the full "Trending up" sentence TrendSummaryDialog's badge spells out.
export function TrendDirectionChip({ direction }: { direction: TrendDirection }) {
  const Icon = TREND_ICON[direction]
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
        TREND_CLASS[direction]
      )}
    >
      <Icon className="size-3" />
    </span>
  )
}
