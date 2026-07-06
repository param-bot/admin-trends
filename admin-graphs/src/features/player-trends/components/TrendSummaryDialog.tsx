import {
  FileTextIcon,
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { MetricConfig } from "../constants"
import type { TrendDirection } from "../trend-summary"
import { buildTrendSummary } from "../trend-summary"
import type { TrendFilterState } from "../types"
import type { ChartRow } from "../utils"

interface TrendSummaryDialogProps {
  config: MetricConfig
  filters: TrendFilterState
  rows: ChartRow[]
  seriesKeys: string[]
}

const TREND_STYLE: Record<
  TrendDirection,
  { icon: typeof TrendingUpIcon; badgeClassName: string; label: string }
> = {
  up: {
    icon: TrendingUpIcon,
    badgeClassName:
      "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400",
    label: "Trending up",
  },
  down: {
    icon: TrendingDownIcon,
    badgeClassName:
      "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    label: "Trending down",
  },
  flat: {
    icon: MinusIcon,
    badgeClassName: "border-border bg-muted text-muted-foreground",
    label: "Flat",
  },
}

// Turns whatever's currently on screen — filters + the same rows the chart
// itself plots — into a short written readout, for someone who wants the
// takeaway without reading the chart. Computed on the fly from data already
// in hand, not a generated/AI summary — every number here is exact.
export function TrendSummaryDialog({
  config,
  filters,
  rows,
  seriesKeys,
}: TrendSummaryDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Summarize ${config.title}`}
          title="Summary"
        >
          <FileTextIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <SummaryBody
          config={config}
          filters={filters}
          rows={rows}
          seriesKeys={seriesKeys}
        />
      </DialogContent>
    </Dialog>
  )
}

// Split out so buildTrendSummary only runs while the dialog is actually
// mounted (Radix Dialog unmounts DialogContent when closed by default).
function SummaryBody({
  config,
  filters,
  rows,
  seriesKeys,
}: TrendSummaryDialogProps) {
  const summary = buildTrendSummary(config, filters, rows, seriesKeys)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: config.color }}
          />
          {config.title} summary
        </DialogTitle>
        <DialogDescription>{summary.dateRangeLabel}</DialogDescription>
      </DialogHeader>

      {summary.hasData ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatTile
              label="Total"
              value={summary.totalLabel}
              accentColor={config.color}
            />
            <StatTile
              label="Peak"
              value={summary.peakLabel}
              variant="highlight"
            />
            <StatTile
              label={`Avg / ${summary.averageNoun}`}
              value={summary.averageLabel}
            />
            <StatTile label="Volume" value={summary.countLabel} />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-sm leading-relaxed text-foreground">
              {summary.narrative}
            </p>

            {summary.trend && (
              <div className="flex items-center gap-2">
                <TrendBadge direction={summary.trend.direction} />
                <p className="text-sm leading-relaxed text-foreground">
                  {summary.trend.sentence}
                </p>
              </div>
            )}

            {summary.breakdown && (
              <div className="flex items-start gap-2">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ background: summary.breakdown.leadingColor }}
                />
                <p className="text-sm leading-relaxed text-foreground">
                  {summary.breakdown.sentence}
                </p>
              </div>
            )}
          </div>

          {summary.filterBullets.length > 1 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Filters applied
              </p>
              <div className="flex flex-wrap gap-1.5">
                {summary.filterBullets.map((line) => (
                  <Badge key={line} variant="outline" className="font-normal">
                    {line}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{summary.narrative}</p>
      )}
    </>
  )
}

function TrendBadge({ direction }: { direction: TrendDirection }) {
  const { icon: Icon, badgeClassName, label } = TREND_STYLE[direction]
  return (
    <Badge variant="outline" className={cn("shrink-0 gap-1", badgeClassName)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  )
}

function StatTile({
  label,
  value,
  variant = "default",
  accentColor,
}: {
  label: string
  value: string
  variant?: "default" | "highlight"
  accentColor?: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5",
        variant === "highlight"
          ? "border-amber-500/25 bg-amber-500/10"
          : "border-border bg-muted/30"
      )}
      style={
        accentColor
          ? { borderLeftColor: accentColor, borderLeftWidth: 3 }
          : undefined
      }
    >
      <p
        className={cn(
          "truncate text-[10px] tracking-wide uppercase",
          variant === "highlight"
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground"
        )}
      >
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  )
}
