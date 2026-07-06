export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

function daysAgo(days: number): Date {
  const result = new Date()
  result.setDate(result.getDate() - days)
  return result
}

export interface DatePreset {
  label: string
  getRange: () => { startDate: string; endDate: string }
}

export const DATE_PRESETS: DatePreset[] = [
  {
    label: "Today",
    getRange: () => {
      const now = new Date()
      return {
        startDate: startOfDay(now).toISOString(),
        endDate: now.toISOString(),
      }
    },
  },
  {
    label: "Yesterday",
    getRange: () => {
      const yesterday = daysAgo(1)
      return {
        startDate: startOfDay(yesterday).toISOString(),
        endDate: endOfDay(yesterday).toISOString(),
      }
    },
  },
  {
    label: "Last 7 days",
    getRange: () => {
      const now = new Date()
      return {
        startDate: startOfDay(daysAgo(6)).toISOString(),
        endDate: now.toISOString(),
      }
    },
  },
  {
    label: "This month",
    getRange: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: start.toISOString(), endDate: now.toISOString() }
    },
  },
  {
    label: "Last month",
    getRange: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      )
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    },
  },
  {
    label: "Last 3 months",
    getRange: () => {
      const now = new Date()
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        now.getDate()
      )
      return {
        startDate: startOfDay(start).toISOString(),
        endDate: now.toISOString(),
      }
    },
  },
  // {
  //   label: "last 6 month",
  //   getRange: () => {
  //     const now = new Date()
  //     const start = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  //     const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  //     return { startDate: start.toISOString(), endDate: end.toISOString() }
  //   }
  // },
  {
    label: "last 1 year",
    getRange: () => {
      const now = new Date()
      const start = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate()
      )
      return {
        startDate: startOfDay(start).toISOString(),
        endDate: now.toISOString(),
      }
    },
  },
]

// Lets the popover trigger show "Last 7 days" instead of a raw date range
// when the applied filters happen to match a preset. Presets whose range ends
// at "now" (Today, Last N days) drift by however long the popover's been
// open, so end dates get a few seconds of tolerance rather than exact match.
export function matchDatePreset(
  startDate: string,
  endDate: string
): DatePreset | undefined {
  return DATE_PRESETS.find((preset) => {
    const range = preset.getRange()
    return (
      range.startDate === startDate &&
      Math.abs(
        new Date(range.endDate).getTime() - new Date(endDate).getTime()
      ) < 5000
    )
  })
}
