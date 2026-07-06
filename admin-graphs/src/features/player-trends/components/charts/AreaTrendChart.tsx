import {
  Area,
  AreaChart,
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

export function AreaTrendChart({
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
      <AreaChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11 }}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis tick={{ fontSize: 11 }} width={48} />
        <Tooltip content={<TrendTooltipContent countLabel={countLabel} />} />
        {!isSingleSeries && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {seriesKeys.map((key, index) => {
          const strokeColor = isSingleSeries ? color : getSeriesColor(key, index)
          return (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={isSingleSeries ? valueLabel : key}
              stroke={strokeColor}
              fill={strokeColor}
              fillOpacity={0.25}
              strokeWidth={2}
              stackId={isSingleSeries ? undefined : "1"}
              isAnimationActive={false}
            />
          )
        })}
      </AreaChart>
    </ResponsiveContainer>
  )
}
