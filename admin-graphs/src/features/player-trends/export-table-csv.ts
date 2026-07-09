import { UNSLICED_KEY, type ChartRow } from "./utils"

export interface ExportTableCsvOptions {
  rows: ChartRow[]
  seriesKeys: string[]
  valueLabel: string
  filename: string
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// The table chart type has no meaningful visual to rasterize — it's already
// just the raw numbers in rows. A CSV of that same data is more useful than
// a screenshot of a table would be anyway (sortable/filterable downstream,
// no PDF/image pipeline needed at all), so this is a separate, synchronous,
// dependency-free path rather than routing through exportChartToPdf.
export function exportTableToCsv({
  rows,
  seriesKeys,
  valueLabel,
  filename,
}: ExportTableCsvOptions): void {
  const isSingleSeries =
    seriesKeys.length === 1 && seriesKeys[0] === UNSLICED_KEY
  const columnLabels = isSingleSeries ? [valueLabel] : seriesKeys

  const lines = [
    ["Period", ...columnLabels].map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.period,
        ...seriesKeys.map((key) => {
          const value = row[key]
          return typeof value === "number" ? String(value) : ""
        }),
      ]
        .map(csvCell)
        .join(",")
    ),
  ]

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
