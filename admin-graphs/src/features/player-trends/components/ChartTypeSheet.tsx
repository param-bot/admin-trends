import {
  AreaChart,
  BarChart3,
  LayoutGrid,
  LineChart,
  PieChart,
  SlidersHorizontal,
  Table as TableIcon,
} from "lucide-react"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { CHART_TYPES, CHART_TYPE_META, type ChartType } from "../chart-types"

const CHART_TYPE_ICONS: Record<ChartType, typeof LineChart> = {
  LINE: LineChart,
  BAR: BarChart3,
  AREA: AreaChart,
  PIE: PieChart,
  TABLE: TableIcon,
  MINI: LayoutGrid,
}

interface ChartTypeSheetProps {
  metricTitle: string
  value: ChartType
  onChange: (chartType: ChartType) => void
}

export function ChartTypeSheet({
  metricTitle,
  value,
  onChange,
}: ChartTypeSheetProps) {
  return (
    <Sheet>
      <SheetTrigger
        aria-label={`Change ${metricTitle} chart type`}
        title="Change chart type"
        className="text-foreground transition-colors hover:text-foreground hover:bg-muted p-1 cursor-pointer rounded-md"
      >
        <SlidersHorizontal className="size-4" />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{metricTitle} — chart type</SheetTitle>
          <SheetDescription>
            A line isn't always the clearest read on this data — pick whichever
            chart fits what you're trying to see.
          </SheetDescription>
        </SheetHeader>
        <RadioGroup
          value={value}
          onValueChange={(next) => onChange(next as ChartType)}
          className="gap-3 px-4"
        >
          {CHART_TYPES.map((chartType) => {
            const Icon = CHART_TYPE_ICONS[chartType]
            const meta = CHART_TYPE_META[chartType]
            const inputId = `chart-type-${metricTitle}-${chartType}`
            return (
              <Label
                key={chartType}
                htmlFor={inputId}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-muted"
              >
                <RadioGroupItem
                  value={chartType}
                  id={inputId}
                  className="mt-0.5"
                />
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {meta.description}
                  </span>
                </span>
              </Label>
            )
          })}
        </RadioGroup>
      </SheetContent>
    </Sheet>
  )
}
