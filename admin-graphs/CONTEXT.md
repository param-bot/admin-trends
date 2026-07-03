# Player Trends Dashboard — Context

Frontend for a single-player analytics dashboard: 5 trend graphs (Deposit, Withdraw,
Bet, Win, GGR), each with its own filters. DEPOSIT, WITHDRAW, and GGR are wired to the
real backend; BET/WIN are still Phase 2 on the backend (not built yet) and stay on mock
data until they ship — flipping them over later is meant to be a one-line change, not a
rewrite (see "Mock-to-real switch" below).

## Backend contract (as actually shipped — player-trends-api-reference.md)

This superseded an earlier design doc (`player-trends-analytics.md`) that proposed a
combined multi-metric endpoint — what actually shipped is simpler: **one metric per
call**, which is what every hook here already did anyway, so that part needed no
rework.

```
GET /api/player-trends/:accId?metric=&startDate=&endDate=&interval=&currencyType=&sliceBy=
```

- `metric` (required, singular): `DEPOSIT | WITHDRAW | BET | WIN | GGR` — `DEPOSIT`,
  `WITHDRAW`, and `GGR` return data today; `BET`/`WIN` still respond `501` (Phase 2).
- `interval`: `HOUR | DAY | WEEK | MONTH`.
- `sliceBy`: `NONE | CURRENCY | PROVIDER | VERTICAL` on the real API — note **no
  `GAME_TYPE`** (blocked server-side on a lookup table that doesn't exist yet), for any
  metric. For DEPOSIT/WITHDRAW specifically, only `NONE`/`CURRENCY` actually do
  anything — `PROVIDER`/`VERTICAL` are accepted but silently behave like `NONE`. GGR
  (from `tbl_bet_summary`) supports the full set.
- `vertical`/`providerId`: no-ops on DEPOSIT/WITHDRAW, but meaningful on GGR (and
  BET/WIN once those ship) — `api.ts` always sends them (axios drops `undefined`
  values), rather than branching per metric.
- **No `gameType` param at all** on the real API (unlike the earlier design doc), for
  any metric. Only the mock generator still reads it, for the still-mocked BET/WIN
  cards — GGR's `MetricConfig` (see `constants.ts`) intentionally omits the Game Type
  filter and `sliceBy=GAME_TYPE` now that it's live.
- Every response (success or error) is wrapped in an envelope — see
  [`src/api/types/envelope.ts`](src/api/types/envelope.ts) — read the payload off
  `data`, the error off `error.details`, never off the top level.
- Response `data` is **flat**, not the tidy/multi-metric shape the old design doc
  proposed: `{ accountId, metric, interval, range, sliceBy, points: TrendPoint[] }`
  (`TrendPoint` unchanged: `period`, `bucketStart`, `sliceKey`, `value`, `count`).
- **Public endpoint — no auth header.** The api reference doc mentions an `x-token`
  guard, but that's confirmed not to apply here; `src/api/client.ts` sends none.
- Rate limit: 10 req/60s per the backend's throttler. Not yet mitigated client-side
  (no debounce on filter changes) — noted as a real gap below, not silently ignored.

**Known data-shape gotcha**: the real endpoint omits zero-activity buckets entirely
(no zero-value points for empty days) rather than returning explicit zeros. The mock
generator is dense (a point for every bucket) — so mock and real data don't look
identical in sparsity. Not currently gap-filled client-side; see Open items.

## Mock-to-real switch

`src/features/player-trends/service.ts` decides mock vs. real, **per metric**, not
with one global switch:

```ts
const LIVE_METRICS: ReadonlySet<TrendMetric> = new Set(["DEPOSIT", "WITHDRAW", "GGR"])
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false"
```

- `LIVE_METRICS` — which metrics have somewhere real to call. BET/WIN aren't in it, so
  they **always** use mock data regardless of the env flag (the real endpoint 501s
  them today).
- `USE_MOCK_API` — a force-mock override for local dev without a reachable backend.
  Only matters for metrics that are in `LIVE_METRICS`.
- `api.ts` — real axios call to `GET /api/player-trends/:accId`, unwraps the envelope,
  throws `error.details` (or the axios error message) on failure.
- `mock-data.ts` — deterministic generator (seeded PRNG keyed on account+metric+filters,
  not `Math.random()`) so a given filter combo renders a stable-looking chart instead of
  jumping around on refetch. Still returns the same flat single-metric shape as the
  real API, just for whichever metric is requested.
- Every hook/component calls `getPlayerTrends()` from `service.ts`, never `api.ts` or
  `mock-data.ts` directly.

**To exercise the real DEPOSIT/WITHDRAW/GGR calls:** set `VITE_USE_MOCK_API=false` in
`.env` once `VITE_API_BASE_URL` points at a reachable backend. BET/WIN keep working
exactly as before (mocked) either way. **When BET/WIN ship**, add them to
`LIVE_METRICS` — no other code changes needed, same as the original one-line-change
intent, just scoped per metric now instead of globally.

One thing still faked: `mock-data.ts`'s `MOCK_GAME_TYPE_OPTIONS`, used by the Game Type
filter dropdown on the still-mocked BET/WIN cards. Swap for a real lookup call if/when a
game-types endpoint exists. **Provider is no longer mocked** — see "Provider search"
below; `MOCK_PROVIDER_OPTIONS` in `mock-data.ts` now only feeds the mock generator's
`sliceBy=PROVIDER` breakdown labels for BET/WIN, not any dropdown.

## Provider search — a second API, a second axios instance

Providers come from a genuinely different service than player-trends: the admin API
at `VITE_ADMIN_API_BASE_URL` (`GET /admin/api/game-providers`), not the
analytics-service `VITE_API_BASE_URL` player-trends talks to. Hence
[`src/api/admin-client.ts`](src/api/admin-client.ts) — a second, independent axios
instance ("api client 2"), not a second baseURL bolted onto the existing one.

**Auth is temporary**: unlike the public player-trends endpoint, the admin API needs
`Authorization: Bearer <token>` — `admin-client.ts` adds it via a request interceptor,
reading `VITE_ADMIN_ACCESS_TOKEN` from env (real value in `.env`, gitignored; blank
placeholder in `.env.example` — never commit an actual token). This is a stand-in for
the eventual flow where the admin panel redirects here with `?access_token=...`; when
that lands, the interceptor is the one place to change — nothing downstream
(`fetchGameProviders`, the hook, `ProviderSelect`) needs to know where the token comes
from.

```
src/features/providers/
  types.ts                      GameProvider ({id, name}), query/page types
  api.ts                        fetchGameProviders({page, limit, name?}) — type=PROVIDER
                                is fixed (this call is specifically for the provider
                                dropdown), name is the optional search param
  hooks/
    use-provider-search.ts      useInfiniteQuery + a 300ms-debounced search box
                                (src/hooks/use-debounced-value.ts) — 15 per page,
                                pages via the backend's own pagination.hasNextPage,
                                no client-side "page * limit < total" math needed
  components/
    ProviderSelect.tsx           thin wrapper: useProviderSearch() + SearchableSelect
```

`ProviderSelect` is intentionally the *only* provider-specific piece.
[`src/components/ui/searchable-select.tsx`](src/components/ui/searchable-select.tsx) is
a fully generic async combobox — search + infinite scroll over whatever `options` a
caller feeds it — with zero knowledge of providers, TanStack Query, or this endpoint.
It's a new component, not a modified `select.tsx` (that one stays as-is, for small fixed
option lists like interval/currency/vertical). Reuse `SearchableSelect` for any future
large/remote-searchable dropdown by writing a small `use-x-search` hook + wrapper
component, same shape as `ProviderSelect`.

**Known limitation, accepted deliberately**: `SearchableSelect` shows the selected
option's label by finding it in the *currently loaded* `options` array — there's no
"fetch this one item by id" call to resolve a label once it scrolls out of the loaded
page(s) (e.g. selected, then searched for something else, then cleared the search — page
1 might not include it). It falls back to showing the raw id in that case. A ref/state
cache to paper over this was tried and reverted: this project's lint config
(`eslint-plugin-react-hooks`, React Compiler-oriented) forbids reading *or* writing refs
during render, which is what that cache needed — see the comment above
`selectedOption` in `searchable-select.tsx`.

## Account identity banner — resolving accountId to a human

`account_id` alone doesn't mean anything to whoever's reading the dashboard, so
[`AccountUserSummary`](src/features/users/components/AccountUserSummary.tsx) sits at
the top of `trends-dashboard.tsx` and resolves it to a username/email/status via the
same admin API providers use (`GET /admin/api/users/v2?search=<accountId>`, same
`adminApiClient`, same envelope shape).

```
src/features/users/
  types.ts                       AdminUser — full shape from a real sample response
  api.ts                         fetchUserByAccountId(accountId)
  hooks/use-account-user.ts       useQuery wrapper, enabled only when accountId is set
  components/AccountUserSummary.tsx   the banner itself — loading skeleton, "no user
                                      found" state, or the identity card (avatar
                                      initials, status dot-badge, email-verified
                                      icon-badge, email, country flag via
                                      react-country-flag, join date, relative
                                      "last login" time via Intl.RelativeTimeFormat)
```

**`search` isn't account-id-exclusive** — it's a general user search param, so it could
plausibly match on username/email too. `fetchUserByAccountId` only trusts an *exact*
`account_id` match among the returned `items`, rather than assuming `items[0]` is
correct — returns `null` (rendered as "No user found") if no exact match, instead of
risking showing the wrong person's info.

**Status color mapping** lives in `AccountUserSummary.tsx` (`STATUS_VARIANT`), not in
the `Badge` component itself — `pending` → amber/warning, `active`/`success` → green,
`inactive`/`suspended`/`banned` → red/destructive, anything unrecognized → neutral
`secondary` rather than guessing. `Badge` itself just gained two new generic color
variants (`success`, `warning`) in `components/ui/badge.tsx`, using Tailwind's stock
green/amber palette (soft `bg-color/10` + solid text, same pattern as the existing
`destructive` variant) since this app's own token set doesn't define green/yellow.

Two badge *styles* on top of those color variants, picked per what they're
communicating: `StatusBadge` (account status) uses a `bg-current` dot, since status is
fundamentally "which of a few buckets," which a color reads faster than text for.
`EmailVerifiedBadge` uses an icon (`BadgeCheckIcon`/`CircleAlertIcon`) instead, since a
checkmark communicates "verified" more directly than a dot's color would.

Same "why a second axios instance" reasoning as providers applies here too — this hits
the admin API, not the analytics-service, so it goes through `adminApiClient`
(`admin-client.ts`), inheriting the temporary hardcoded bearer token from there.

## Layout

```
src/
  api/
    client.ts                    axios instance, reads VITE_API_BASE_URL, no auth header
    admin-client.ts               second axios instance, reads VITE_ADMIN_API_BASE_URL —
                                  a genuinely different service (see "Provider search")
    types/
      envelope.ts                 ApiEnvelope<T> — every analytics-service response's
                                  success/error wrapper, not just this endpoint
      player-trends.ts           types mirroring the real single-metric DTO
  features/player-trends/
    api.ts                       real fetch call — unwraps the envelope, throws
                                 error.details on failure (see extractErrorMessage)
    mock-data.ts                 mock generator + placeholder lookup lists — same flat
                                 single-metric response shape as the real API
    service.ts                   per-metric mock/real routing (LIVE_METRICS +
                                 USE_MOCK_API) — call this, not api.ts/mock-data.ts
    constants.ts                 per-metric config: title, color, which filters apply
    types.ts                     TrendFilterState
    utils.ts                     tidy points -> wide Recharts rows (+ a parallel
                                  countKeyFor column per series, for tooltips), default
                                  date range, buildMetricTrendPath /
                                  parseFiltersFromSearchParams — paired encode/decode
                                  for carrying filters into the full-view URL, kept in
                                  the same file so they can't drift out of sync
    date-presets.ts               DATE_PRESETS (Today/Yesterday/Last 7 days/...),
                                  startOfDay/endOfDay, matchDatePreset — library-
                                  agnostic; DateRangePopover is the only place that
                                  adapts these into react-date-range's shape
    hooks/
      use-player-trend.ts        TanStack Query hook
      use-metric-trend-state.ts  filters state + query + chart pivot, shared by the
                                 dashboard card and the full-view page
    chart-types.ts                CHART_TYPES (LINE/BAR/AREA/PIE/TABLE) + per-type label/description
    components/
      TrendChart.tsx             dispatches to the chart matching `chartType`, all five
                                 share the same rows/seriesKeys/color/height props
      charts/
        LineTrendChart.tsx        one line per seriesKey
        BarTrendChart.tsx         grouped bars per seriesKey
        AreaTrendChart.tsx        stacked areas when sliceBy is active
        PieTrendChart.tsx         aggregates each seriesKey to a total (not per-period —
                                  a pie is share-of-total, not a timeline); drops
                                  non-positive totals (GGR can go negative); groups
                                  everything past the top 6 slices into "Other (N)" —
                                  a pie is unreadable well before the backend's own
                                  20+OTHER cardinality cap, so this caps tighter
        TrendTable.tsx            raw period x seriesKey table, for reading exact values
        types.ts                  shared SeriesChartProps + getSeriesColor(key, index):
                                  - named currency sliceKeys (SATS/USDC/USDT) always get
                                    their own fixed color regardless of position, so a
                                    given currency reads the same across chart types
                                  - otherwise, the first 5 slices use the curated
                                    --chart-1..5 tokens, and beyond that colors are
                                    generated via golden-angle hue rotation so they stay
                                    distinct instead of repeating every 5 (matters
                                    because the backend caps sliceBy cardinality at 20 +
                                    an "OTHER" bucket, see player-trends-analytics.md §3)
      ChartTypeSheet.tsx          slide-over (shadcn Sheet) to pick chart type per graph
      TrendFilters.tsx           every filter EXCEPT the date range (interval, vertical,
                                 currencyType, providerId via ProviderSelect, gameType,
                                 sliceBy), driven by constants.ts config — applies live,
                                 straight to `filters` on every change, same as before
                                 Apply-gating existed
      DateRangePopover.tsx        popover combining react-date-range's DateRangePicker
                                 (presets + a 2-month calendar for a custom range) with
                                 our own Apply button — only the date range is gated
                                 (see "Date range is Apply-gated" below)
      MetricTrendCard.tsx        card = date popover + live filters + chart-type + query
                                 + chart for one metric, plus an expand icon for the
                                 full view
  pages/
    trends-dashboard.tsx         `/` — grid of the 5 cards, account-id input
    metric-trend-page.tsx        `/trends/:metric?accountId=...` — single graph,
                                 full viewport, own filters, opened via the expand icon
  lib/query-client.ts            TanStack QueryClient instance
```

No barrel `index.ts` files anywhere — import from the concrete file.

**Card <-> full view**: `MetricTrendCard` and `MetricTrendPage` both call
`useMetricTrendState(accountId, config, initialFilters?)` rather than duplicating
filter/query logic — adding a field to `TrendFilterState` or changing the pivot only
means touching that one hook. Neither `accountId` nor the current filters live in
global state; both are passed through the URL query string since the full view opens
in a separate tab/document:

- `MetricTrendCard` builds the expand link with `buildMetricTrendPath(metric,
  accountId, filters)` — the card's *currently applied* filters (not just accountId)
  are serialized into the URL, so the new tab opens already showing the same view
  instead of resetting to defaults.
- `MetricTrendPage` reads them back with `parseFiltersFromSearchParams(searchParams)`
  and passes the result as `useMetricTrendState`'s `initialFilters` — this only seeds
  the *initial* state (a `useState` lazy initializer), it isn't a continuous two-way
  sync. Filter changes made afterward on the full-view page don't write back to its
  own URL (chart type does, via `?chartType=`, but filters intentionally don't — kept
  narrow to "carry over on expand", not "always shareable").
- If the required fields are missing or an enum value doesn't match a known
  `TrendInterval`/`TrendSliceBy` (e.g. a hand-edited or stale URL), parsing returns
  `undefined` and the page falls back to `useMetricTrendState`'s normal defaults rather
  than seeding broken state.

**Chart type is presentation-only**, not a query param — it never touches
`useMetricTrendState`/the backend request, it only picks which of the five chart
components renders the same `rows`/`seriesKeys`. On the dashboard card it's local
`useState` (defaults to `LINE`, resets on refresh). On the full-view page it lives in
the URL (`?chartType=`) instead, via `useSearchParams`, so a chosen chart type survives
a reload/share of that tab — same data, different question answered per component.

## Adding a 6th metric, or moving BET/WIN to live

GGR went through exactly this recently — a good reference if BET/WIN follow:

1. Extend the enums in `src/api/types/player-trends.ts` if the backend adds a new
   `TrendMetric`/`TrendSliceBy` value.
2. Add (or update) its entry in `METRIC_CONFIGS` in `constants.ts` — title, color, which
   `availableFilters`/`sliceByOptions` it actually supports on the real API. GGR got its
   own `LIVE_GAMEPLAY_FILTERS`/`LIVE_GAMEPLAY_SLICE_BY` pair instead of reusing BET/WIN's
   `GAMEPLAY_FILTERS`, because it drops `gameType`/`GAME_TYPE` (no real backend support)
   that the still-mocked BET/WIN configs keep for their mock generator.
3. `mock-data.ts`'s `METRIC_VALUE_RANGE` needs a range for the new metric so the mock
   generator doesn't throw (harmless to leave in place even after the metric goes live —
   it's just unreachable unless `VITE_USE_MOCK_API` forces mock).
4. **If the metric is real, not mocked**: add it to `LIVE_METRICS` in `service.ts`.
   That's the step that actually flips a metric from mock to real.
5. Check `api.ts` already forwards every param the newly-live metric needs. GGR needed
   `vertical`/`providerId` added to the request — they were previously omitted since
   only DEPOSIT/WITHDRAW were live and neither uses them.

Nothing else changes — `MetricTrendCard`, `TrendFilters`/`DateRangePopover`, and the
dashboard grid are all driven off `METRIC_CONFIGS`, not hardcoded per metric.

## Date range: presets + custom calendar, via react-date-range

`DateRangePopover` wraps `react-date-range`'s `DateRangePicker` (chosen over
`react-day-picker`, tried first — swapped out since it didn't hold up visually).
Everything the date range needs lives in one widget:

- **Presets** — Today, Yesterday, Last 7 days, Last 30 days, This month, Last month —
  come from `date-presets.ts`'s `DATE_PRESETS`, a plain library-agnostic array of
  `{ label, getRange() }`. `DateRangePopover` is the *only* place that adapts them into
  react-date-range's `StaticRange` shape (via `createStaticRanges`) — if the picker
  library gets swapped again, only this component needs to change, not the preset
  definitions or the trigger-label matching.
- **Custom range** — the same widget's calendar (2 months, `direction="horizontal"`).
  Both presets and calendar drag-selects only update local `draft` state; nothing calls
  `onApply` — and therefore nothing refetches — until the Apply button underneath is
  clicked. Every preset/custom pick still resolves to full-day boundaries
  (`startOfDay`/`endOfDay` from `date-presets.ts`) before being sent as ISO, same as
  before — there's no time-of-day picker anymore, this library's UX is date-grain by
  design (matches how virtually every preset-based date filter works elsewhere).
- **Trigger label**: `matchDatePreset(startDate, endDate)` (in `date-presets.ts`) checks
  whether the *applied* range matches a preset's computed range (with a few seconds of
  tolerance on "now"-based end dates like Today/Last N days) and shows that preset's
  name; otherwise it shows a short formatted range (`Jul 1 – Jul 8`).
- **Dark mode**: `react-date-range` ships one fixed light theme with no dark variant.
  `index.css` has a block of `.dark .rdrXxx` overrides mapping its class names onto our
  existing tokens (`--popover`, `--border`, `--muted`, etc.) — narrow, targeted
  overrides, not a full re-theme. The range/selected-day color itself is set via the
  `rangeColors` prop to `var(--primary)` directly (React accepts a CSS var string as an
  inline style value), so that part already adapts without a CSS override.
- **`TrendFilters`** (everything except the date range: interval, vertical,
  currencyType, providerId, gameType, sliceBy) stays live/instant — these are plain
  `Select`s with a small fixed option set, so a "change" is already one deliberate
  action, unlike a date range which can involve multiple clicks before landing on the
  intended value.

## Open items

- **Rate limit (10 req/60s)** on the real endpoint: the date range (the field most
  likely to fire many intermediate values) is Apply-gated — see "Date range is
  Apply-gated" above. The remaining Select-based filters still apply live, which is
  fine for a single deliberate change, but stacking several quick filter changes right
  after a date Apply could still add up. No debounce implemented; not expected to be a
  real issue, but noted rather than assumed away.
- **Gap-filling**: the real API omits zero-activity buckets; charts currently just plot
  whatever `points` come back, so a Bar/Area chart over a sparse range will show fewer
  bars rather than explicit zero-bars. The api reference doc itself suggests filling
  gaps client-side if a "no gaps" look is wanted — not implemented, noted per §5 there.
  Would live in `pivotPointsForChart` (`utils.ts`) if picked up later.
- `gameType`/`GAME_TYPE` sliceBy: no real backend param or lookup table exists at all
  (per api reference doc §9), for any metric — only the mock path for BET/WIN uses it.
  Don't build a real Game Type filter against this API until that ships.
- `vertical`/`providerId` are no-ops on DEPOSIT/WITHDRAW specifically (meaningful on
  GGR, and on BET/WIN once those ship) — worth remembering they won't silently start
  filtering DEPOSIT/WITHDRAW even if someone adds those filter fields to
  `CASHFLOW_FILTERS` later.
- No provider/game-type lookup endpoint exists yet — filters use the mock lists above.
