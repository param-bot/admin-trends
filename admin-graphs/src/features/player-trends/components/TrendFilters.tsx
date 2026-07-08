import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TREND_CURRENCY_TYPES,
  TREND_INTERVALS,
  TREND_VERTICALS,
} from "@/api/types/player-trends"
import { ProviderSelect } from "@/features/providers/components/ProviderSelect"
import { MOCK_GAME_TYPE_OPTIONS } from "../mock-data"
import type { MetricConfig } from "../constants"
import type { TrendFilterState } from "../types"

const ALL_VALUE = "ALL"

const SLICE_BY_LABELS: Record<string, string> = {
  NONE: "No breakdown",
  GAME_TYPE: "Game type",
  GAME: "Game",
  CURRENCY: "Currency",
  PROVIDER: "Provider",
  VERTICAL: "Vertical",
}

// Breaking down by a specific game (or game type) already implies a
// vertical — Vertical stops being a meaningful filter alongside it, so it's
// hidden rather than left showing a control that no longer does anything.
function hidesVertical(sliceBy: TrendFilterState["sliceBy"]): boolean {
  return sliceBy === "GAME" || sliceBy === "GAME_TYPE"
}

interface TrendFiltersProps {
  config: MetricConfig
  value: TrendFilterState
  onChange: (next: TrendFilterState) => void
  // Grid view shows one shared Interval control above all 5 cards instead —
  // set when that control is in play so this card doesn't show a second,
  // conflicting one.
  hideInterval?: boolean
}

// Everything except the date range — these apply live, straight to the query,
// on every change. Start/End live in DateRangePopover instead, gated behind
// an Apply button, since a datetime picker fires far more intermediate
// values than a Select ever would.
export function TrendFilters({
  config,
  value,
  onChange,
  hideInterval = false,
}: TrendFiltersProps) {
  const has = (field: MetricConfig["availableFilters"][number]) =>
    config.availableFilters.includes(field)

  return (
    <div className="flex flex-wrap items-end gap-3">
      {!hideInterval && (
        <FilterField label="Interval">
          <Select
            value={value.interval}
            onValueChange={(interval) =>
              onChange({
                ...value,
                interval: interval as TrendFilterState["interval"],
              })
            }
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TREND_INTERVALS.map((interval) => (
                <SelectItem key={interval} value={interval}>
                  {interval}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      )}

      {has("vertical") && !hidesVertical(value.sliceBy) && (
        <FilterField label="Vertical">
          <Select
            value={value.vertical ?? ALL_VALUE}
            onValueChange={(vertical) =>
              onChange({
                ...value,
                vertical:
                  vertical === ALL_VALUE
                    ? undefined
                    : (vertical as TrendFilterState["vertical"]),
              })
            }
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All</SelectItem>
              {TREND_VERTICALS.map((vertical) => (
                <SelectItem key={vertical} value={vertical}>
                  {vertical}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      )}

      {has("currencyType") && (
        <FilterField label="Currency">
          <Select
            value={value.currencyType ?? ALL_VALUE}
            onValueChange={(currencyType) =>
              onChange({
                ...value,
                currencyType:
                  currencyType === ALL_VALUE
                    ? undefined
                    : (currencyType as TrendFilterState["currencyType"]),
              })
            }
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All</SelectItem>
              {TREND_CURRENCY_TYPES.map((currencyType) => (
                <SelectItem key={currencyType} value={currencyType}>
                  {currencyType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      )}

      {has("providerId") && (
        <FilterField label="Provider">
          <ProviderSelect
            value={value.providerId ?? null}
            onChange={(providerId) =>
              onChange({ ...value, providerId: providerId ?? undefined })
            }
          />
        </FilterField>
      )}

      {has("gameType") && (
        <FilterField label="Game type">
          <Select
            value={value.gameType ?? ALL_VALUE}
            onValueChange={(gameType) =>
              onChange({
                ...value,
                gameType: gameType === ALL_VALUE ? undefined : gameType,
              })
            }
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All</SelectItem>
              {MOCK_GAME_TYPE_OPTIONS.map((gameType) => (
                <SelectItem key={gameType.id} value={gameType.id}>
                  {gameType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      )}

      {has("sliceBy") && (
        <FilterField label="Break down by">
          <Select
            value={value.sliceBy}
            onValueChange={(sliceBy) => {
              const nextSliceBy = sliceBy as TrendFilterState["sliceBy"]
              onChange({
                ...value,
                sliceBy: nextSliceBy,
                vertical: hidesVertical(nextSliceBy)
                  ? undefined
                  : value.vertical,
              })
            }}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.sliceByOptions.map((sliceBy) => (
                <SelectItem key={sliceBy} value={sliceBy}>
                  {SLICE_BY_LABELS[sliceBy]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      )}
    </div>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
