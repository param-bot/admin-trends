# Player Trends Dashboard

Admin dashboard for player trend analytics — Deposit, Withdraw, Bet, Win, and GGR line
charts, each with its own filters. Built against a backend endpoint that isn't live yet
(see [CONTEXT.md](CONTEXT.md) for the full design context and how the mock/real switch
works).

## Stack

React 19 + Vite + TypeScript, Tailwind v4 + shadcn/ui (style: `radix-nova`), Recharts,
TanStack Query, axios, react-router.

## Getting started

```bash
npm install
cp .env.example .env   # already done in this repo; edit values as needed
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (writes) |
| `npm run preview` | Preview a production build locally |

## Environment variables

| Var | Meaning |
|---|---|
| `VITE_API_BASE_URL` | Base URL the axios client calls for real requests |
| `VITE_USE_MOCK_API` | `true` (default) serves deterministic mock data; set to `false` once `GET /player-trends/:accId` is live |

## Routes

| Path | Renders |
|---|---|
| `/` | Dashboard grid — all 5 metric cards, each with its own filters |
| `/trends/:metric?accountId=...` | Full-viewport single-graph view. Opened via the expand icon on each card (new browser tab), so it's also directly linkable/bookmarkable |

## Adding shadcn components

The shadcn registry (`ui.shadcn.com`) wasn't reachable from this environment when this
project was scaffolded, so `src/components/ui/*` (card, select, label, input, badge,
skeleton) were hand-written to match the existing `button.tsx` conventions instead of
generated. If registry access works for you:

```bash
npx shadcn@latest add <component>
```

places new components under `src/components/ui/`. Import them as:

```tsx
import { Button } from "@/components/ui/button"
```

## Project layout

See [CONTEXT.md](CONTEXT.md) for the full `src/` breakdown, the backend contract this
was built against, and how to add a 6th metric or a new filter dimension without
touching component code.
