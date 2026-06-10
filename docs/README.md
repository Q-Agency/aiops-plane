# Agency OS — Product Starter Kit

> **Start here.** This is the front door for the team building the Agency OS **product** — the governed agent–human SDLC pod platform. Everything you need exists in this repo and the BA repo; this document tells you what to read in which order, what is already decided, what the mock is (and isn't), and what to build first.

---

## 1. The product in one paragraph

Agency OS is the operating system for **agent–human SDLC pods**: a curated team of AI agents (BA · SA · UI/UX · Developer · QA · DevOps/Release · Knowledge) paired with **one accountable human per agent**, delivering software through a governed, gated, auditable pipeline. A PM — client-side, or Q-side on Q-led projects (the internal-first adoption track) — **fires up** a pod (picks agents, connects Teamwork/Slack/GitHub, assigns accountable people), **runs** it day-to-day (gates, incidents, comms), and **monitors** it (ROI, governance, SLA, compliance). One-liner: *not an autonomous coder you must trust — a governed agent–human pipeline you can prove.*

**Locked decisions** (do not relitigate — context in [`product-vision.md`](./product-vision.md)):

| Decision | Locked value |
|---|---|
| Catalog | Curated Q SDLC catalog (7 roles + Tasklist/Review intermediates). No third-party BYO agents. |
| Tenancy | **Dedicated per client** (isolated infra/DB). Tenant stand-up is Q-operated; pod fire-up is fast in-tenant config. |
| IA | Three pillars are the navigation: **FIRE UP / RUN / MONITOR** (+ demoted ADVANCED). |
| Quality moat | The **8 zero-LLM structural validators** (V1, V2, V4–V9 — V3 retired), visually walled from any LLM signal. |
| HITL | Two gate kinds (`approval` / `clarification`), one queue; in-app client-grade review with **required reason on reject**. |
| Chain | `spec → design → uix-ui-spec → tasks → code → review → test → release`; edges by `produces ∈ consumes`. |

## 2. The documentation set — read in this order

| # | Document | What it is | Read when |
|---|---|---|---|
| 1 | [`product-vision.md`](./product-vision.md) | **The north-star.** Pitch, operating model, personas, the product in three acts, IA, mock build order (§7), deferred under-the-hood decision register (§8). | First — everyone. |
| 2 | [`product-vision-screens.md`](./product-vision-screens.md) | **The frontend contract.** 43 build-ready screen specs (layout, components, states, mock data, interactions, copy) + coverage review + mock-data appendix. | Before building any screen. |
| 3 | [`product-vision-deep-dive.md`](./product-vision-deep-dive.md) | **The review.** P1/P2 upgrade backlog (gate policies & autonomy ladder, human capacity, Pod Copilot, pricing), cutting-edge moves with market citations, the **contract evolution register** (v0.5 → v0.6), blind spots. | When planning beyond the first slice. |
| 4 | [`control-plane-data-model.md`](./control-plane-data-model.md) | **The backend schema starting point.** 21 entities (Pod, PodAgentConfig, GatePolicy, Connection, Incident, ArtifactSnapshot…), durable-vs-derived discipline, audit-write paths. The mock shapes in `src/mock/*` are draft v0 of this. | Before designing the control plane. |
| 5 | [`architecture.md`](./architecture.md) | The **internal-tool** architecture (federation, envelope+facet contract, audit ledger) with explicit *"Superseded for the product SKU"* blocks where the product diverges. | For the federation/contract seam. |
| 6 | [`agent-sdk-brief.md`](./agent-sdk-brief.md) | The agent-side SDK (`agency-agent-sdk`): the contract surface agents serve, the Agent Card, and the **planned v0.6 control ops** (gate resolve, pause/resume, config push). Byte-identical copy lives in the BA repo. | When touching agents or the contract. |
| 7 | [`../src/contract/`](../src/contract/) | Contract **v0.5** (canonical `agent-contract.schema.json` + generated TS). The federation seam between dashboard and agents. | When binding mock → real. |

**BA repo** (`BA_Agent`): the **live, federated** agent. `docs/platform-overview.md` (how BA works), `ONBOARDING.md` (dev onboarding), `packages/agency-agent-sdk/` (the SDK BA serves the contract through). BA's API is the reference producer implementation. Fleet status beyond BA (2026-06-10): the **Knowledge Base agent is operating** (dashboard federation next); **SA + Development agents under construction**; **UI/UX + QA in preparation**; the same flow also ships as the **spec-first AI-driven SDLC** Cursor/Claude Code plugin workflow.

## 3. The mock — the frontend reference implementation

This repo's **standard mode** (login `qai@q.agency` / `demo`; `bun install && bun run dev`) is the working frontend vision: look & feel, interaction patterns, copy, and information architecture, built screen-by-screen from the screens doc.

**The experience is gated by login** (`src/lib/experience.ts`): the standard user gets the full mock product; the **real-mode** user (live BA federation) gets ONLY live-connected surfaces — every mock-only route redirects real-mode to `/`, and mock TopBar chrome (bell, ⌘K, copilot, spend/digest chips) unmounts. The mock cannot leak into the live cockpit, and live behavior is never altered by mock work.

**What's built** (vision §7 build order): the pillar-grouped shell, multi-pod switcher + tenancy badge, the complete **FIRE UP wizard** (blueprints → agent catalog with the chain-closure pipeline preview → connector OAuth-style dialogs with status write-back → accountability matrix → Slack wiring → readiness/launch), the **ROI hero** + economics reframe, the **governance moat panel** (deterministic validators walled from LLM signals), the **client-grade gate review** (`/approvals/$gateId`), **Incidents & Recovery**, **notifications** (bell + inbox + prefs) and the **⌘K palette**, **SLA & client reports**, **roles & members**, **usage & billing**, and **work intake**. The original mock dashboard views (pipeline, comms, compliance, observability…) fill the rest.

**Wave 2 (also built):** `/welcome` accountability handshake, `/memory` constitution & amendments (absorbs `/knowledge`, which now redirects), the **Pod Copilot** (⌘J — ask-with-receipts + confirm-first proposed actions, canned/no-LLM and badged as such), `/pilot` scorecard, `/org` portfolio rollup, `/artifacts` deliverables shelf (rejected-iteration diffs, snapshot-at-clearance stamp), `/status` platform status, and the chrome-less **`/share/$token`** client report viewer. All wave-2 mutations write to a **session audit overlay** (`src/mock/audit-bridge.ts`) that surfaces in Compliance under "this session" — the demo's actions provably land on the ledger UI.

**The buy-in brief (`/pitch`):** a no-login, chrome-less, print-friendly **management product brief** served by the app itself — executive summary (incl. the two-phase arc: SDLC harness now, generic agents later), the competitive wedge, the product in three acts (every feature deep-linking into the demo), the moat (harness → shared context via the Knowledge Base agent → proactive agents in native channels → provable accountability → deterministic floor last), the "what is real today" honesty section (agent-fleet status + the spec-first Cursor/Claude Code workflow), the pilot plan, and the roadmap whose deliverables table doubles as the post-greenlight deliverable list (economics & pricing deliberately parked to the backlog). Send `<host>/pitch` to management; the same page prints to PDF as the approval pack.

**Wave 2 completion (also built):** the **Settings trust surface** (tenancy posture, per-agent **models & subprocessors** disclosure, connected-tool scopes, data & retention, export) with the **Gate policies & autonomy** tab — per-artifact policy table + the L0→L3 **autonomy ladder** (system-proposed, human-granted on validator-streak evidence, with the auto-clear preview stat; every change → `policy.changed`); **policy chips** on the gates queue and review header; **capacity & coverage** on `/pod` (working hours, OOO + deputy, the 24h coverage strip, saturation, audited reassignment) and SLA clock modes; the **Demo Director** (⌘⇧D presenter overlay staging the 3-minute script into the real mock stores); **role-scoped landings** (view-as: Exec Digest, QA queue, read-only rail, `/settings/roles`); and **responsive gates** (mobile card stack + sticky decision bar — no `/m/` fork).

**Where things live:**

| Concern | Location |
|---|---|
| The chain (single source of truth) | `src/mock/chain.ts` — roles, artifact kinds, edge rule, gap/auto-fix helpers |
| Pod state (drafts, launched pods, active pod) | `src/lib/pods/pod-store.tsx` (localStorage `aiops_pods_v1`) |
| Navigation / pillars | `src/components/shell/nav.ts` |
| FIRE UP wizard | `src/routes/pods.new.tsx` + `src/components/fireup/*` (WizardShell owns chrome; steps are body-only) |
| Validators (the 8 real ids) | `src/mock/validators.ts` — ids match BA's `_STRUCTURAL_CHECK_IDS` verbatim |
| Mock datasets | `src/mock/*` — **draft v0 of the control-plane data model** |
| Design system | shadcn/ui (`src/components/ui/*`) + Tailwind v4 tokens in `src/styles.css` (glass/neon; `agent-*` colors; client-clean style only on sponsor-facing report) |

**What the mock is NOT:** there is no auth beyond a 2-user prototype cookie, no RBAC enforcement, state is localStorage, all writes are toasts, connectors are mock-OAuth, and only BA exists as a real agent (the dashboard's separate **real mode** federates it live). Treat the mock as the **spec made tangible** — not as code to harden.

## 4. Mock → product map

| Layer | Verdict | Notes |
|---|---|---|
| Contract v0.5 (`src/contract/`) + agency-agent-sdk | **Keep** | The federation seam. Evolve via the deep-dive's contract register (v0.6 adds gate-resolve w/ CAS, pause/resume, config push, artifact read). |
| Audit ledger (dashboard-owned Supabase, append-only) | **Keep** | Already real & running. Extend the action vocabulary (deep-dive P1-G4); stamp `actor` once auth lands. |
| Screens, components, theme, copy | **Adapt** | The frontend foundation. Port screens as their data binds to real backends; keep the screens doc as the acceptance spec. |
| Mock data shapes (`src/mock/*`) | **Adapt** | Draft v0 of the control-plane entities — reconcile against `control-plane-data-model.md`, never silently. |
| Control plane (DB, auth/RBAC via Supabase Auth, pod config, connector **vault**, notifications fanout, SLA engine, billing) | **Build new** | The data-model doc is the schema starting point; §8 of the vision registers what must be answered when. |
| Agent runtime & provisioning (who runs SA/UI-UX/Dev/QA…) | **Build new — decision first** | Deliberately deferred behind the mock; architecture-blocking before the first pilot runs downstream agents. See vision §8. |

## 5. Suggested build sequence (the real product)

1. **Tenant shell + identity** — Supabase Auth, the role model (`src/mock/roles.ts` is the draft), audit `actor` stamping. *Identity is product-blocking, not a nicety.*
2. **Control plane v1** — the data-model doc's durable entities (Pod, PodAgentConfig, Member, Connection, SlaDefinition…); the wizard writes real drafts.
3. **FIRE UP real** — connector vault + real OAuth (Teamwork/Slack/GitHub first — they exist in BA today), pod provisioning as a Q-operated applier.
4. **Federate BA** — the real mode already does this; scope it per-pod (`Pod.projectIds`) and light up RUN with live data.
5. **Gate resolve write-back** — contract v0.6's `POST /agency/gates/{id}/resolve` (CAS semantics); the in-app gate review goes live; decisions land in the ledger with actor + reason.
6. **Incidents + notifications fanout** — derive incidents from federated health/run/gate signals; persist notification fanout control-plane-side (agent buses are ephemeral).
7. **MONITOR money** — real economics from federated runs + `roiAssumptions`; SLA engine; reports; billing once pricing is decided (deep-dive P1-C1 has the hypothesis).

## 6. Working agreements (carry these into the new project)

- **Doc-staleness rule:** the contract is mirrored (3 schema copies + TS + Pydantic + 2 byte-identical brief copies across both repos). Any contract/SDK change → sweep all copies, both repos.
- **Validator truth:** 8 zero-LLM structural validators (V3 retired). Never "V1–V9 / 9".
- **Canonical URLs:** one URL per entity (`/approvals/$gateId`, `/incidents/$id`); `?param=` is for list filters only.
- **Chain truth:** `src/mock/chain.ts` (product: the topology service) is the only place the chain is defined; everything derives.
- **Honesty discipline:** Live vs Roadmap badges everywhere capability is promised; "when-only" until attribution is real; deterministic vs LLM-advisory always visually walled.
- **Nothing dropped silently:** hard decisions go into the vision §8 register with a trigger, not into the void.

---

*Updated 2026-06-10. Companion commits: the planning set (3c9d5f1), P0 application (bfb8dff and siblings), mock slice 1 (f76ee4a), mock slice 2 (69014e0), wave 2 + experience gate (see git log). Questions start at [`product-vision.md`](./product-vision.md).*
