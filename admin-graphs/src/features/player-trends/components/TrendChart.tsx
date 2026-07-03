import type { ChartType } from "../chart-types"
import { AreaTrendChart } from "./charts/AreaTrendChart"
import { BarTrendChart } from "./charts/BarTrendChart"
import { LineTrendChart } from "./charts/LineTrendChart"
import { PieTrendChart } from "./charts/PieTrendChart"
import { TrendTable } from "./charts/TrendTable"
import type { SeriesChartProps } from "./charts/types"

interface TrendChartProps extends SeriesChartProps {
  chartType: ChartType
}

export function TrendChart({ chartType, ...props }: TrendChartProps) {
  switch (chartType) {
    case "BAR":
      return <BarTrendChart {...props} />
    case "AREA":
      return <AreaTrendChart {...props} />
    case "PIE":
      return <PieTrendChart {...props} />
    case "TABLE":
      return <TrendTable {...props} />
    case "LINE":
      return <LineTrendChart {...props} />
  }
}
