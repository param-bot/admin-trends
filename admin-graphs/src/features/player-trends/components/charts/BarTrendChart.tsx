import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { UNSLICED_KEY } from "../../utils"
import { TrendTooltipContent } from "./TrendTooltipContent"
import { getSeriesColor, type SeriesChartProps } from "./types"

export function BarTrendChart({
  rows,
  seriesKeys,
  color,
  valueLabel,
  height = 260,
  countLabel = "txns",
}: SeriesChartProps) {
  const isSingleSeries =
    seriesKeys.length === 1 && seriesKeys[0] === UNSLICED_KEY

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11 }}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis tick={{ fontSize: 11 }} width={48} />
        <Tooltip
          content={<TrendTooltipContent countLabel={countLabel} />}
          cursor={{ fill: "var(--muted)" }}
        />
        {!isSingleSeries && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {seriesKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            name={isSingleSeries ? valueLabel : key}
            fill={isSingleSeries ? color : getSeriesColor(key, index)}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
