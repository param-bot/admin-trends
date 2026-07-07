import { Line, LineChart, ResponsiveContainer } from "recharts"

interface MetricSparklineProps {
  data: { value: number }[]
  color: string
}

// A tiny, axis-free trend line for the KPI strip — just enough shape to
// suggest "up/down over the range" without competing with the real charts.
export function MetricSparkline({ data, color }: MetricSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 2, right: 1, bottom: 2, left: 1 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
