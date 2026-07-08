# Player Trends Dashboard — Context

Frontend for a single-player analytics dashboard: 5 trend graphs (Deposit, Withdraw,
Bet, Win, GGR), each with its own filters. **All 5 are wired to the real backend now**
— Deposit/Withdraw/GGR shipped first, Bet/Win followed. The mock system (see
"Mock-to-real switch" below) stays in the codebase as a local-dev fallback and as the
template for whatever the *next* metric turns out to be, not because anything is
still mocked today.

## Backend contract (as actually shipped — player-trends-api-reference.md)

This superseded an earlier design doc (`player-trends-analytics.md`) that proposed a
combined multi-metric endpoint — what actually shipped is simpler: **one metric per
call**, which is what every hook here already did anyway, so that part needed no
rework.

```
GET /api/player-trends/:accId?metric=&startDate=&endDate=&interval=&currencyType=&sliceBy=
```

- `metric` (required, singular): `DEPOSIT | WITHDRAW | BET | WIN | GGR` — all 5 return
  real data today.
- `interval`: `HOUR | DAY | WEEK | MONTH`.
- `sliceBy`: `NONE | CURRENCY | PROVIDER | VERTICAL` on the real API — note **no
  `GAME_TYPE`** (blocked server-side on a lookup table that doesn't exist yet), for any
  metric. For DEPOSIT/WITHDRAW specifically, only `NONE`/`CURRENCY` actually do
  anything — `PROVIDER`/`VERTICAL` are accepted but silently behave like `NONE`.
  BET/WIN/GGR (all from `tbl_bet_summary`) support the full set.
- `vertical`/`providerId`: no-ops on DEPOSIT/WITHDRAW, meaningful on BET/WIN/GGR —
  `api.ts` always sends them (axios drops `undefined` values), rather than branching
  per metric.
- **No `gameType` param at all** on the real API (unlike the earlier design doc), for
  any metric. `constants.ts`'s `MetricConfig`s all omit the Game Type filter and
  `sliceBy=GAME_TYPE` accordingly — only the mock generator still knows how to
  produce GAME_TYPE data, unreachable through the UI as it stands (see "Adding a 6th
  metric" below for why it's still there).
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
const LIVE_METRICS: ReadonlySet<TrendMetric> = new Set([
  "DEPOSIT", "WITHDRAW", "GGR", "BET", "WIN",
])
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false"
```

- `LIVE_METRICS` — which metrics have somewhere real to call. All 5 are in it now, but
  it's kept rather than deleted: a 6th metric starts here, and it's the one flag to
  flip back if a metric ever needs to fall back to mock (a backend regression, a
  staging environment missing one endpoint, etc.).
- `USE_MOCK_API` — a force-mock override for local dev without a reachable backend.
  Applies to any/all metrics in `LIVE_METRICS` when set.
- `api.ts` — real axios call to `GET /api/player-trends/:accId`, unwraps the envelope,
  throws `error.details` (or the axios error message) on failure.
- `mock-data.ts` — deterministic generator (seeded PRNG keyed on account+metric+filters,
  not `Math.random()`) so a given filter combo renders a stable-looking chart instead of
  jumping around on refetch. Still returns the same flat single-metric shape as the
  real API, just for whichever metric is requested. Kept in full (not deleted now that
  nothing's mocked) as the fastest path to a working UI for whatever metric #6 turns
  out to be, and as the local-dev fallback via `USE_MOCK_API`.
- Every hook/component calls `getPlayerTrends()` from `service.ts`, never `api.ts` or
  `mock-data.ts` directly.

**To exercise the real calls:** set `VITE_USE_MOCK_API=false` in `.env` once
`VITE_API_BASE_URL` points at a reachable backend — this now applies to all 5 metrics.

`mock-data.ts`'s `MOCK_GAME_TYPE_OPTIONS`/`SLICE_VALUES.GAME_TYPE` are unreachable
through the current UI (no live `MetricConfig` sets `sliceBy: "GAME_TYPE"` or exposes
a Game Type filter — see `constants.ts`), left in place only in case a future metric
needs the mock path for that dimension. `MOCK_PROVIDER_OPTIONS` similarly only feeds
the mock generator's `sliceBy=PROVIDER` breakdown labels now — the actual Provider
*filter* dropdown is real (see "Provider search" below), not mocked, for every metric.

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
    constants.ts                 per-metric config: title, color, which filters apply,
                                  countLabel (what a point's count means in a tooltip —
                                  "txns" for the cashflow metrics, "bets" for the
                                  gameplay ones, since they come from different tables)
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
    trend-summary.ts              buildTrendSummary(config, filters, rows, seriesKeys)
                                  — pure function, no request, see "Trend summary" below
    hooks/
      use-player-trend.ts        TanStack Query hook
      use-metric-trend-state.ts  filters state + query + chart pivot, shared by the
                                 dashboard card and the full-view page
    chart-types.ts                CHART_TYPES (LINE/BAR/AREA/PIE/TABLE/MINI) + per-type
                                  label/description + isChartType() type guard (shared by
                                  the dashboard and MetricTrendPage's URL parsing)
    components/
      TrendChart.tsx             dispatches to the chart matching `chartType`, all six
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
        MiniMultiplesChart.tsx    one small chart per seriesKey instead of one big chart
                                  with N overlapping lines + a legend — the fix for
                                  breakdowns with many values (Game especially, easily
                                  dozens of titles) where every other chart type turns
                                  into noise. Ranks by total and caps to a user-picked
                                  Top 5/10/20 (own local `useState`, not wired into
                                  TrendFilterState — it reshapes the *display* of already-
                                  fetched rows, it doesn't change the query). Each tile
                                  reuses MetricSparkline for its own per-item trend line.
                                  With no breakdown active (isSingleSeries) it shows a
                                  hint to pick one instead of a single, pointless tile.
        TrendTable.tsx            raw period x seriesKey table, for reading exact values
        TrendTooltipContent.tsx    custom Tooltip `content` (not the default renderer)
                                  shared by Line/Bar/Area — scrolls past ~4 rows
                                  instead of listing every sliceBy value unbounded
                                  (a `sliceBy=PROVIDER` breakdown can be 20+ series),
                                  and labels each value's count with the metric's
                                  countLabel ("bets" vs "txns") instead of one
                                  hardcoded word for every metric
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
      TrendSummaryDialog.tsx      centered modal (new Dialog primitive) with a written
                                 readout of the current view — see "Trend summary" below
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

**Card <-> full view**: both call `useMetricTrendState(accountId, config,
initialFilters?)` rather than duplicating filter/query logic — adding a field to
`TrendFilterState` or changing the pivot only means touching that one hook — but they
call it at different levels. `MetricTrendPage` (the full view, its own route/tab) calls
it directly. `TrendsDashboard` calls it once per metric (five fixed, named calls — not
a loop, so the Rules of Hooks stay happy) and lifts the results into a
`MetricTrendState[]`, handing each one down as a plain prop; `MetricTrendCard` itself
is purely presentational and owns no fetch state at all. That lift is what lets the
KPI strip and whichever detail card is on screen (focused or grid) share one fetch per
metric instead of each re-fetching independently.

Neither `accountId` nor the current filters live in global state; both are passed
through the URL query string since the full view opens in a separate tab/document:

- `MetricTrendCard` builds the expand link with `buildMetricTrendPath(metric,
  accountId, filters, chartType)` — the card's *currently applied* filters and its
  currently selected chart type (not just accountId) are serialized into the URL, so
  the new tab opens already showing the same view instead of resetting to Line/defaults.
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

**Chart type is presentation-only**, not a filter — it never touches
`useMetricTrendState`/the backend request, it only picks which of the five chart
components renders the same `rows`/`seriesKeys`. `MetricTrendCard` no longer owns any
chart-type state itself (it did originally, as local `useState`) — both the dashboard
and the full-view page now keep it in the URL, and `MetricTrendCard` takes it as a
required `chartType`/`onChartTypeChange` prop pair instead. This was a deliberate
fix: local `useState` inside the card reset to `LINE` on every remount, and the
dashboard's Focused/Grid toggle remounts cards on every switch (they're two different
branches of a ternary) — so a chosen chart type would silently "disappear" going back
and forth. On `TrendsDashboard` the key is per metric (`chartType_GGR`,
`chartType_BET`, ...), not one shared key, so switching the focused metric — or
looking at the grid — doesn't leak one metric's chart choice into another's. On
`MetricTrendPage` it's the simpler single `?chartType=`, since that page only ever
shows one metric. `buildMetricTrendPath` reads the card's current chart type from
this same URL-backed value and writes it into the expand link, so opening the full
view still shows whatever chart the card was already on.

## Adding a 6th metric

GGR, then BET/WIN, went live in exactly this sequence — a good reference for whatever
comes next:

1. Extend the enums in `src/api/types/player-trends.ts` if the backend adds a new
   `TrendMetric`/`TrendSliceBy` value.
2. Add (or update) its entry in `METRIC_CONFIGS` in `constants.ts` — title, color, which
   `availableFilters`/`sliceByOptions` it actually supports on the real API. If it
   shares `tbl_bet_summary`'s dimension set (like BET/WIN/GGR all do), it can reuse the
   existing `GAMEPLAY_FILTERS`/`GAMEPLAY_SLICE_BY` — those already exclude
   `gameType`/`GAME_TYPE` since no real metric supports it yet.
3. `mock-data.ts`'s `METRIC_VALUE_RANGE` needs a range for the new metric so the mock
   generator doesn't throw (harmless to leave in place even after the metric goes live —
   it's just unreachable unless `VITE_USE_MOCK_API` forces mock).
4. **If the metric is real, not mocked**: add it to `LIVE_METRICS` in `service.ts`.
   That's the step that actually flips a metric from mock to real.
5. Check `api.ts` already forwards every param the newly-live metric needs. GGR needed
   `vertical`/`providerId` added to the request — they were previously omitted since
   only DEPOSIT/WITHDRAW were live and neither uses them. BET/WIN reused the same
   params without further changes once they shipped, since they'd already been added.

Nothing else changes — `MetricTrendCard`, `TrendFilters`/`DateRangePopover`, and the
dashboard grid are all driven off `METRIC_CONFIGS`, not hardcoded per metric.

## Date range: presets + custom calendar, via react-date-range

`DateRangePopover` wraps `react-date-range`'s `DateRangePicker` (chosen over
`react-day-picker`, tried first — swapped out since it didn't hold up visually).
Everything the date range needs lives in one widget:

- **Presets** — Today, Yesterday, Last 7 days, Last 3 months, This month, Last month, last 1 year —
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

## Trend summary — a written readout, not an AI summary

`TrendSummaryDialog` (the small document icon next to the chart-type picker) opens a
centered `Dialog` with a plain-English readout of whatever's currently on screen.
**Important: this is not an LLM-generated summary.** `trend-summary.ts`'s
`buildTrendSummary()` is a pure, synchronous function over data already in memory
(`rows`/`seriesKeys` from the same pivot the chart itself renders, plus `filters` and
`config`) — no request, no external call, every number in it is an exact
recomputation of what the chart is already showing, just phrased as sentences instead
of a chart.

What it computes — `buildTrendSummary()` returns structured data (`trend: { direction,
sentence }`, `breakdown: { sentence, leadingKey, leadingColor }`), not pre-baked HTML,
so `TrendSummaryDialog` can color-code them rather than just printing plain sentences:

- **Stat tiles**: total (left-bordered in the metric's own `config.color`, tying it
  back to the chart), average per bucket, peak bucket (amber-highlighted — value + its
  `period` label, used as-is rather than reformatted, per the api reference doc's own
  guidance that `period` is already the right display label per interval), and total
  volume in the metric's `countLabel` unit (bets vs. txns).
- **Trend**: compares the average of the first half of the loaded rows against the
  second half — a deliberately simple heuristic (not a regression) chosen because it's
  easy to state in one sentence and easy to verify by eye against the chart. Rendered
  as a colored badge (green "Trending up" / rose "Trending down" / gray "Flat") next
  to its sentence — direction only, not a judgment about whether up is good for this
  particular metric. Only stated when there are ≥4 buckets; too few points to call a
  trend otherwise.
- **Breakdown**: only when `sliceBy != NONE` — names the leading and runner-up slice
  by share of total, prefixed with a dot in the leading slice's actual chart color
  (`getSeriesColor(key, index)`, the same function every chart uses) so it visually
  matches the legend.
- **Filter bullets**: rendered as outline `Badge` chips, not a bulleted list — the
  applied date range/interval/currency/vertical/sliceBy in plain English, plus
  provider/game-type filters shown by raw id (no "fetch by id" lookup exists to
  resolve a provider's name here — same limitation noted for `SearchableSelect`).

`SummaryBody` is split out from `TrendSummaryDialog` specifically so
`buildTrendSummary()` only runs while the dialog is actually open/mounted, not on
every parent re-render.

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
  (per api reference doc §9), for any metric. Don't build a real Game Type filter
  against this API until that ships — the mock path is the only thing that still
  understands it, and no live `MetricConfig` exposes it in the UI.
- `vertical`/`providerId` are no-ops on DEPOSIT/WITHDRAW specifically (meaningful on
  BET/WIN/GGR) — worth remembering they won't silently start filtering
  DEPOSIT/WITHDRAW even if someone adds those filter fields to `CASHFLOW_FILTERS`
  later.
- No game-type lookup endpoint exists yet — that filter still uses the mock list
  above (provider lookup is real now, see "Provider search").
