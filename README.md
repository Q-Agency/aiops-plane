# Agency OS — AI Ops Dashboard

Mission control for **governed agent–human software delivery**. Fire up a pod. Run it. Prove it.

This repo holds two things:

1. **The product mock** (standard mode) — the working frontend vision for the Agency OS product: the FIRE UP / RUN / MONITOR shell, the New-Pod wizard, gates, incidents, reports, billing. Built screen-by-screen from [`docs/product-vision-screens.md`](docs/product-vision-screens.md). This is the reference implementation for the product build.
2. **The internal fleet cockpit** (real mode) — federates live agents (BA today) over the versioned agent contract ([`src/contract/`](src/contract/)), with a dashboard-owned append-only audit ledger.

## Start here

**New to the project? Read [`docs/README.md`](docs/README.md)** — the starter kit: the doc map in read order, locked decisions, the mock→product map, and the suggested build sequence.

## Run it

```sh
bun install
bun run dev          # http://localhost:3000 (or --port 5180)
```

- **Mock / product vision:** log in as `qai@q.agency` / `demo`
- **Real mode (live BA federation):** log in as the real-mode user; requires `BA_AGENT_URL` + audit-DB env (see `.env.example`)
- **Management buy-in brief:** open `/pitch` — no login, print-friendly, deep-links into the demo

```sh
bun run build        # production build
bunx tsc --noEmit    # typecheck
bun run gen:contract # regenerate contract TS from the canonical JSON Schema
```

## Repo map

| Path | What |
|---|---|
| `docs/` | The product planning set — vision, screen specs, deep-dive review, control-plane data model, architecture, SDK brief. **Front door: `docs/README.md`.** |
| `src/routes/` | TanStack Start file routes (the pillar IA: FIRE UP / RUN / MONITOR / ADVANCED) |
| `src/components/` | Views — `shell/` (nav, pod switcher), `fireup/` (the wizard), `gates/`, `incidents/`, `monitor/`, plus the original mock dashboard views |
| `src/mock/` | Mock datasets — draft v0 of the [control-plane data model](docs/control-plane-data-model.md); `chain.ts` is the single source of truth for the agent chain |
| `src/contract/` | Agent contract v0.5 (canonical schema + generated types) |
| `src/lib/gateway/` | Real-mode federation (BA adapter, system registry) |
| `db/` | Audit-ledger migrations (dashboard-owned Supabase) |

Deployed via `redeploy.sh` (Docker, port 8555). The sibling **BA repo** holds the live BA agent + the `agency-agent-sdk` that serves the contract.
