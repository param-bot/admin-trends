# Player Trends Dashboard — Product Requirements Document

**Status:** In development, partial backend rollout
**Owner:** Admin tooling
**Related docs:** [README.md](README.md) (setup), [CONTEXT.md](CONTEXT.md) (engineering/architecture reference — read that instead of this if you're about to change code)

## 1. Summary

An internal admin tool that shows how a single player's account behaves over time —
deposits, withdrawals, betting, winnings, and gross gaming revenue — as filterable,
switchable graphs. One account at a time, one page, linkable.

It exists so that support/ops/analytics staff investigating a player don't have to
piece the answer together from raw database queries or several disconnected tools.
Paste in an account ID, see who they are, see their money movement and gameplay shape
over whatever window matters, slice it by currency/provider/vertical, done.

## 2. Problem

Before this tool, answering a question like *"has this player been depositing more
than withdrawing over the last week?"* or *"what share of this player's bets go
through one provider?"* meant someone technical running ad-hoc queries. That's slow,
error-prone (sign conventions, timezones, bucket boundaries are easy to get subtly
wrong by hand), and not something a non-technical support agent can do themselves.

## 3. Goals

- One dashboard, one account at a time, showing five trend lines: **Deposit,
  Withdraw, Bet, Win, GGR** (Gross Gaming Revenue = bet − win, the operator's
  perspective).
- Filterable by date range, time bucket (hour/day/week/month), currency
  (real/bonus), vertical (casino/sports), provider, and game type — whichever of
  these actually apply to a given metric (see §5.2).
- More than one way to *look* at the same data — a line isn't always the right
  answer to "what does this data mean" (see §5.3).
- Every view is a real, shareable URL — a support agent should be able to paste a
  link to a teammate that opens on the exact same account, date range, and chart.
- Ship against a backend that's rolling out in phases, without blocking frontend
  work on backend readiness (see §7).

## 4. Non-goals

- **Not** a cross-player or aggregate analytics tool. This is always exactly one
  account at a time — there's no "top 100 players by GGR" view here.
- **Not** an action/moderation tool. It's read-only: no editing a player's balance,
  no banning, no adjusting anything. If a future need for that surfaces, it's a
  separate tool or a deliberate, separately-scoped addition — not a natural extension
  of this one.
- **Not** real-time/streaming. Data refreshes when a filter changes, not via a
  live socket. A player transacting mid-session won't move the chart until you
  reapply a filter.

## 5. Users

Internal admin/support/analytics staff who already have an account ID in hand
(from a support ticket, a fraud flag, a VIP review, etc.) and need to understand
that one player's behavior quickly.

## 6. Features

### 6.1 The five metrics

| Metric | What it means | Status |
|---|---|---|
| Deposit | Cash-in volume, wallet ledger | **Live** |
| Withdraw | Cash-out volume, wallet ledger | **Live** |
| GGR | Gross gaming revenue (bet − win) | **Live** |
| Bet | Total amount wagered | Mocked — backend not built yet |
| Win | Total amount won | Mocked — backend not built yet |

"Mocked" means the graph works today with realistic-looking generated data, so the
UI/UX can be reviewed and used now, but the numbers aren't real. Flipping a mocked
metric to live is intentionally a small, low-risk change on our end once the backend
ships it (see CONTEXT.md if you need the mechanics).

### 6.2 Filters

Not every filter makes sense for every metric — Deposit/Withdraw come from the wallet
ledger (no concept of "provider" or "game type"), while Bet/Win/GGR come from actual
gameplay events (which do). Each graph only shows the filters that are meaningful for
it:

| Filter | Applies to | Notes |
|---|---|---|
| Date range | All | Presets (Today, Yesterday, Last 7/30 days, This/Last month) or a custom calendar range |
| Time bucket | All | Hour / Day / Week / Month |
| Break down by | All | Turns a dimension into a breakdown — e.g. one line per currency instead of one filtered line |
| Currency (Real/Bonus) | Bet, Win, GGR | Not exposed as a direct filter on Deposit/Withdraw — use "Break down by: Currency" there instead |
| Vertical (Casino/Sports) | Bet, Win, GGR | |
| Provider | Bet, Win, GGR | Real, searchable dropdown (see §6.5) |
| Game type | Bet, Win (mocked only) | No real backend lookup exists yet — see §8 |

The date range is the one filter gated behind an explicit **Apply** — every other
filter (a Select with a handful of fixed options) applies the moment you change it.
The reasoning: a calendar or date picker can go through several intermediate values
before you land on the range you actually meant, and firing a request per
intermediate value would be wasteful and would risk hitting the backend's rate limit
faster than necessary.

### 6.3 Visualization types

Every graph can be viewed as **Line, Bar, Area, Pie, or Table**, switched per-graph
via a small chart-type picker. Rationale per type:

- **Line** — trend direction over time (the default).
- **Bar** — comparing discrete periods against each other.
- **Area** — reading volume/magnitude over time.
- **Pie** — share-of-total; most useful paired with "Break down by." Caps at the top
  6 slices and groups the rest into "Other," since a pie stops being readable well
  before it stops being a valid request.
- **Table** — exact values, for when a chart is the wrong tool and you need to
  reconcile a number against another system.

### 6.4 Full-page view

Every graph card has an expand icon that opens it full-viewport in a new tab —
useful when you want to actually study one graph instead of eyeballing a small card.
That new tab opens on the *same* account, date range, and filters the card was
showing, not a reset view — it's meant to be a "zoom in," not a "start over."

### 6.5 Provider search

Providers are looked up live from the real provider list (searchable, paginated)
instead of a fixed hardcoded set — so the dropdown reflects whatever providers
actually exist, and stays usable even as that list grows.

### 6.6 Account identity

Because an account ID alone means nothing to a human, the dashboard resolves it to
an actual person: username, email (+ verified/unverified), account status
(active/pending/inactive — color-coded), country, join date, and last login, shown
as a card at the top of the page. This exists purely so whoever's reading the trends
below can first confirm *whose* data they're looking at.

## 7. Rollout status (as of this writing)

| Piece | Status |
|---|---|
| Deposit / Withdraw / GGR trend data | Live |
| Bet / Win trend data | Mocked, pending backend (Phase 2) |
| Game type filter + lookup | Not available — no backend endpoint yet |
| Provider lookup | Live |
| Account identity lookup | Live |
| Admin API authentication | **Temporary** — hardcoded token, pending a real redirect flow from the admin panel |

## 8. Known gaps / open questions

- **Game type**: no backend lookup table exists yet for either the filter dropdown
  or `sliceBy=GAME_TYPE` on real data. Don't assume this works until the backend
  ships it.
- **Sparse real data**: the real backend omits zero-activity time buckets rather
  than returning explicit zeros, so a Bar/Area chart over a quiet period will show
  fewer bars rather than a flat line at zero. Not currently smoothed over.
- **Admin API auth is a placeholder.** It works today via a hardcoded token; it
  needs to become a real flow (the admin panel redirecting in with a token) before
  this can be trusted in front of a wider audience.
- **Rate limits**: the live analytics endpoint allows 10 requests/minute. The date
  filter is Apply-gated specifically to stay well under this, but it hasn't been
  stress-tested under heavy rapid filter-flipping.
- **Provider dropdown edge case**: if you pick a provider, then search for
  something else, then clear the search, the previously-picked provider can
  disappear from view (there's no "look this one provider up by id" endpoint to
  re-resolve it) — the filter still applies correctly, it just may show the raw id
  instead of the provider's name in that specific sequence.

## 9. Glossary

- **GGR** — Gross Gaming Revenue. Operator's perspective: `bet − win`. (Not to be
  confused with the player's own net profit, which is the inverse sign.)
- **sliceBy / "Break down by"** — turns a single filtered line into one line per
  distinct value of a dimension (e.g. one line per currency instead of filtering to
  just one currency).
- **Vertical** — Casino or Sports, the two top-level gameplay categories.
- **Real vs. Bonus (currency)** — whether the wagered currency was actual funds or a
  bonus credit.
