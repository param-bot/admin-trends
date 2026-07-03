import { BadgeCheckIcon, CircleAlertIcon, MailIcon } from "lucide-react"
import ReactCountryFlag from "react-country-flag"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAccountUser } from "../hooks/use-account-user"

type StatusVariant = "success" | "warning" | "destructive" | "secondary"

// Anything not explicitly mapped falls back to "secondary" (neutral gray) —
// new/unknown status values shouldn't silently render as a misleading color.
const STATUS_VARIANT: Record<string, StatusVariant> = {
  pending: "warning",
  active: "success",
  success: "success",
  inactive: "destructive",
  suspended: "destructive",
  banned: "destructive",
}

function getStatusVariant(status: string): StatusVariant {
  return STATUS_VARIANT[status.toLowerCase()] ?? "secondary"
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase()
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
]

// "3 hours ago" reads as "how recently were they active" much faster than a
// bare timestamp — exactly the question a last-login field exists to answer.
function formatRelativeTime(iso: string | null): string | null {
  if (!iso) return null
  const diffSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

  for (const [unit, secondsInUnit] of RELATIVE_TIME_UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return formatter.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }
  return formatter.format(diffSeconds, "second")
}

// A colored dot reads faster than text alone for a state that's fundamentally
// "which of a few buckets is this in" — status. Verification below uses an
// icon instead, since a checkmark communicates "verified" more directly than
// a color would.
function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={getStatusVariant(status)} className="gap-1.5 capitalize">
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {status}
    </Badge>
  )
}

function EmailVerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge variant="success">
      <BadgeCheckIcon />
      Verified
    </Badge>
  ) : (
    <Badge variant="warning">
      <CircleAlertIcon />
      Unverified
    </Badge>
  )
}

interface AccountUserSummaryProps {
  accountId: string
}

// Sits at the top of the dashboard so whoever's looking at trend graphs for
// an account can confirm at a glance whose data it actually is — an
// account_id alone doesn't mean much to a human.
export function AccountUserSummary({ accountId }: AccountUserSummaryProps) {
  const { data: user, isLoading, isError } = useAccountUser(accountId)

  if (!accountId) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        No user found for account <span className="font-mono text-xs">{accountId}</span>
      </div>
    )
  }

  const joined = formatDate(user.created_at)
  const lastLogin = formatRelativeTime(user.last_login)

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2 ring-background">
        {getInitials(user.username)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="mr-1 truncate text-sm font-semibold">{user.username}</p>
          <StatusBadge status={user.status} />
          <EmailVerifiedBadge verified={Boolean(user.is_email_verified)} />
          {Boolean(user.is_internal) && <Badge variant="outline">Internal</Badge>}
        </div>
        <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <MailIcon className="size-3 shrink-0" />
          {user.email}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
        {user.country_code && (
          <span className="flex items-center gap-1.5">
            <ReactCountryFlag
              countryCode={user.country_code.toUpperCase()}
              svg
              style={{ width: "1em", height: "1em" }}
              aria-label={user.country_name ?? user.country_code}
            />
            {user.country_name}
          </span>
        )}
        {joined && <span>Joined {joined}</span>}
        {lastLogin && <span>Last login {lastLogin}</span>}
      </div>
    </div>
  )
}
