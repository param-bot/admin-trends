import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"

import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MetricTrendCard } from "@/features/player-trends/components/MetricTrendCard"
import { METRIC_CONFIGS } from "@/features/player-trends/constants"
import { AccountUserSummary } from "@/features/users/components/AccountUserSummary"

const DEFAULT_ACCOUNT_ID = "acc_mdwxhkx7jxmwF7t7PsAEhL"

export function TrendsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const accountId = searchParams.get("accountId") ?? DEFAULT_ACCOUNT_ID

  // Writes the default into the URL on first load (rather than just falling
  // back silently) so the address bar always reflects a complete, correct
  // link — copying it before typing anything still points at the right account.
  useEffect(() => {
    if (!searchParams.has("accountId")) {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev)
          nextParams.set("accountId", DEFAULT_ACCOUNT_ID)
          return nextParams
        },
        { replace: true }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAccountIdChange = (next: string) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set("accountId", next)
      return nextParams
    })
  }

  return (
    <div className="min-h-svh bg-background p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Player Trends</h1>
          <p className="text-sm text-muted-foreground">
            Deposit, withdraw, bet, win and GGR trends for a single player
            account.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-id">Account ID</Label>
            <Input
              id="account-id"
              className="w-64"
              value={accountId}
              placeholder="Enter account_id"
              onChange={(event) => handleAccountIdChange(event.target.value)}
            />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mb-6">
        <AccountUserSummary accountId={accountId} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {METRIC_CONFIGS.map((config) => (
          <MetricTrendCard
            key={config.metric}
            accountId={accountId}
            config={config}
          />
        ))}
      </div>
    </div>
  )
}
