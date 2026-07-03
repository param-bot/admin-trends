import { CalendarClock } from "lucide-react"
import { useState } from "react"
import { createStaticRanges, DateRangePicker, type Range } from "react-date-range"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DATE_PRESETS, endOfDay, matchDatePreset, startOfDay } from "../date-presets"
import type { TrendFilterState } from "../types"

const RANGE_KEY = "selection"

// Adapts our own library-agnostic DATE_PRESETS (also used for the trigger
// label match) into react-date-range's StaticRange shape — this is the only
// place that couples the two, so swapping the picker library again later
// only means rewriting this component, not date-presets.ts.
const STATIC_RANGES = createStaticRanges(
  DATE_PRESETS.map((preset) => ({
    label: preset.label,
    range: () => {
      const { startDate, endDate } = preset.getRange()
      return { startDate: new Date(startDate), endDate: new Date(endDate) }
    },
  }))
)

interface DateRangePopoverProps {
  value: TrendFilterState
  onApply: (next: TrendFilterState) => void
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function triggerLabel(value: TrendFilterState): string {
  const preset = matchDatePreset(value.startDate, value.endDate)
  return preset ? preset.label : `${formatShort(value.startDate)} – ${formatShort(value.endDate)}`
}

// Presets + a full calendar in one widget (react-date-range's DateRangePicker)
// so "Today"/"Last 7 days"/etc. and a custom drag-select range live side by
// side. Either kind of change only updates local draft state — nothing hits
// onApply, and therefore nothing refetches, until the Apply button is clicked.
export function DateRangePopover({ value, onApply }: DateRangePopoverProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Range>({
    startDate: new Date(value.startDate),
    endDate: new Date(value.endDate),
    key: RANGE_KEY,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft({
        startDate: new Date(value.startDate),
        endDate: new Date(value.endDate),
        key: RANGE_KEY,
      })
    }
    setOpen(nextOpen)
  }

  const handleApply = () => {
    if (!draft.startDate) return
    onApply({
      ...value,
      startDate: startOfDay(draft.startDate).toISOString(),
      endDate: endOfDay(draft.endDate ?? draft.startDate).toISOString(),
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock className="size-3.5" />
          {triggerLabel(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DateRangePicker
          ranges={[draft]}
          onChange={(rangesByKey) => setDraft(rangesByKey[RANGE_KEY])}
          staticRanges={STATIC_RANGES}
          inputRanges={[]}
          months={2}
          direction="horizontal"
          showDateDisplay={false}
          rangeColors={["var(--chart-1)"]}
        />
        <div className="flex justify-end border-t border-border p-2">
          <Button size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
