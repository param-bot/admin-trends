export const CHART_TYPES = ["LINE", "BAR", "AREA", "PIE", "TABLE"] as const
export type ChartType = (typeof CHART_TYPES)[number]

export const CHART_TYPE_META: Record<
  ChartType,
  { label: string; description: string }
> = {
  LINE: {
    label: "Line",
    description: "Best for reading trend direction over time",
  },
  BAR: {
    label: "Bar",
    description: "Best for comparing discrete periods against each other",
  },
  AREA: {
    label: "Area",
    description: "Best for reading volume/magnitude over time",
  },
  PIE: {
    label: "Pie",
    description:
      'Best for share-of-total — pairs well with a "Break down by" filter',
  },
  TABLE: {
    label: "Table",
    description:
      "Best for reading exact values instead of estimating off a chart",
  },
}
