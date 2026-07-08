import { Area, AreaChart, ResponsiveContainer } from "recharts"

interface MetricSparklineProps {
  data: { value: number }[]
  color: string
}

// A tiny, axis-free trend area for the KPI strip — just enough shape to
// suggest "up/down over the range" without competing with the real charts.
export function MetricSparkline({ data, color }: MetricSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 1, bottom: 2, left: 1 }}>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.18}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
