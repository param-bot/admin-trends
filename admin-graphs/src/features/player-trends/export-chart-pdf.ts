export interface ExportChartPdfOptions {
  element: HTMLElement
  metricTitle: string
  dateRangeLabel: string
  totalLabel?: string
  trendSentence?: string
  filename: string
}

// One-page PDF per metric: a crisp, vector text header (title, date range,
// headline stat, trend) above a high-resolution (3x — well past typical
// screen DPI, so it stays sharp printed or zoomed) capture of the chart.
//
// Captured with modern-screenshot's domToCanvas rather than html2canvas.
// html2canvas re-implements CSS parsing/layout from scratch and throws on
// this app's oklch-based theme ("Attempting to parse an unsupported color
// function") — even after normalizing every element's own computed color,
// it still walks referenced stylesheet text (e.g. the `:root`/`.dark`
// custom-property declarations backing those colors) with the same parser.
// modern-screenshot instead clones the DOM, inlines each node's computed
// style, and rasterizes the result via an SVG <foreignObject> that the
// *browser itself* paints — so oklch/color-mix are resolved natively,
// the same way they already are on screen, with no reimplemented parser
// to trip over them.
//
// jsPDF + modern-screenshot are dynamically imported — together they're a
// meaningful chunk of bundle weight that most sessions never trigger (not
// everyone downloads a chart), so it's only fetched on first click here
// instead of shipping in everyone's initial page load.
export async function exportChartToPdf({
  element,
  metricTitle,
  dateRangeLabel,
  totalLabel,
  trendSentence,
  filename,
}: ExportChartPdfOptions): Promise<void> {
  const [{ domToCanvas }, { jsPDF }] = await Promise.all([
    import("modern-screenshot"),
    import("jspdf"),
  ])

  const canvas = await domToCanvas(element, {
    scale: 3,
    backgroundColor: getComputedStyle(element).backgroundColor || "#ffffff",
  })

  const imageData = canvas.toDataURL("image/png", 1.0)

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "letter",
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 36
  const contentWidth = pageWidth - margin * 2

  let cursorY = margin

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(18)
  pdf.setTextColor(20, 20, 20)
  pdf.text(metricTitle, margin, cursorY)
  cursorY += 20

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(10)
  pdf.setTextColor(110, 110, 110)
  pdf.text(dateRangeLabel, margin, cursorY)
  cursorY += 22

  if (totalLabel) {
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(13)
    pdf.setTextColor(20, 20, 20)
    pdf.text(`Total: ${totalLabel}`, margin, cursorY)
    cursorY += 16
  }

  if (trendSentence) {
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(110, 110, 110)
    pdf.text(trendSentence, margin, cursorY, { maxWidth: contentWidth })
    cursorY += 20
  }

  cursorY += 8

  const naturalImageHeight = (canvas.height / canvas.width) * contentWidth
  const maxImageHeight = pageHeight - cursorY - margin
  const imageHeight = Math.min(naturalImageHeight, maxImageHeight)
  const imageWidth = (canvas.width / canvas.height) * imageHeight

  pdf.addImage(imageData, "PNG", margin, cursorY, imageWidth, imageHeight)

  pdf.save(filename)
}
