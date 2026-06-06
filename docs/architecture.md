# Agency OS — Architecture Decisions

> **Status:** internal tool for Q Agency (not productized). Living document.
> **Last updated:** 2026-06-04

This captures the decisions from the design discussions so they don't live only
in chat history. It records _what_ we decided and _why_, plus open questions —
it is intentionally not a full spec for things we haven't validated yet.

---

## 1. What Agency OS is (and isn't)

Agency OS is the **control plane / mission control** for a fleet of autonomous
agents — it **observes, governs, and routes between** them. It is **not** an
agent runtime. The agents (BA on LangGraph, future SA, etc.) run as independent
services; Agency OS **federates a normalized view** over them.

Two framing decisions:

- **Internal for now.** Multi-org tenancy, RBAC, billing, and data-residency are
  explicitly **out of scope** while this is an internal tool. (See Open Questions.)
- **The fleet is heterogeneous — not every agent is SDLC.** Therefore the core is
  **domain-agnostic**; SDLC is the _first domain pack_, not the foundation.

---

## 2. Core principle: agnostic kernel + domain packs

The product splits into two layers:

- **Universal kernel (fixed):** agents & status, runs/traces/tool-calls,
  tokens/cost/latency, the event stream, human-in-the-loop (HITL) gates,
  economics, audit, accountability, health. True of _any_ agentic system.
- **Domain pack (declarative, pluggable):** unit-of-work, stages, artifact types
  - renderers, gate types, roles, KPIs, vocabulary. The SDLC-specific layer is
    thinner than it looks.

**Stance:** design the kernel/domain _seam_ now (we know non-SDLC agents are
coming), but only **build the SDLC pack first**. Keep the pack minimal but real;
add a second pack when a non-SDLC agent actually lands — that's the real test of
the seam.

---

## 3. The three agnostic layers

| Layer                 | Answers                                                       | Home                                                                 |
| --------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Agent contract**    | "How do I observe one agent?" (runs / events / HITL / health) | Neutral, versioned package. Agents **emit**; dashboard **consumes**. |
| **Topology manifest** | "How are agents wired?" (nodes / artifact-edges / sources)    | Platform config, or composed from agents' self-declared I/O.         |
| **Domain manifest**   | "What do the artifacts mean?" (vocab / renderers / KPIs)      | Platform config + an artifact-renderer registry.                     |

All three are **decoupled from runtimes**. Adding an agent = it speaks the
contract + declares its topology I/O (+ brings any domain renderers) → it
auto-appears, wired, in its slot.

### 3a. Agent contract

- Two tiers: a **kernel** (Run, Event, Step/Trace, HITLGate, AgentHealth,
  WorkItem) we commit to hard, and **domain payloads** (e.g. spec completeness,
  EARS) that ride in `data`/`metadata` and are typed-but-evolvable.
- **Dependency direction points inward:** agents and dashboard both depend on the
  contract, never on each other. The contract is **not** owned by BA or by the
  dashboard.
- **Cross-language:** agents are Python, dashboard is TypeScript → contract is
  **schema-first** (Pydantic → exported JSON Schema → generated TS types). Seed it
  from BA's existing `schemas/*.py`.

### 3b. Topology manifest

- Three element types: **nodes** (agents/stages), **edges** (artifact hand-offs,
  typed: `spec → design → tasks → code → qa`), **connections** (each node ↔
  Slack/Teamwork/GitHub, with direction).
- **Auto-wire** by matching `produces` ↔ `consumes` on artifact type, so a newly
  registered agent slots into its place with no edits to existing agents.
- Powers: the pipeline view, traceability (= walking artifact-edges for a work
  item), impact analysis, onboarding, and orchestration triggers.

### 3c. Agent registration & discovery

Every agent self-describes via an **A2A-aligned Agent Card**, served by the SDK at:

    GET <agent_base_url>/.well-known/agent-card.json

It reuses A2A field names where they fit (`name`, `description`, `version`,
`url`, `capabilities.streaming`, `authentication`, `skills`) **plus an
`x-agency` extension** carrying the topology metadata A2A doesn't model
(`id`, `domain`, `contractVersion`, `produces`, `consumes`, `sources`,
`endpoints`). We adopt the **Agent Card convention only — not** the full A2A
task/RPC protocol; the dashboard federates via each agent's own REST + SSE.

**Registration is via config, not a dashboard (for now).** The dashboard keeps a
small **server-side registry** — one `{ baseUrl, apiKeyRef }` entry per agent in
`config.server.ts` / a `systems.ts` (the key value stays server-side) — and on
startup fetches each agent's card to auto-fill name / role / produces / consumes
/ sources. **Adding an agent = add a config entry + its key.** A dashboard
"Add agent" UI (paste URL → discover → confirm) is **deferred to v2**, when the
control-plane DB exists. Principle either way: **the agent declares; the platform
confirms and places.**

### 3d. The platform SDK

A shared Python package (working name `agency-agent-sdk`) that implements the
**producer side** of the contract so agents don't hand-roll it: the contract
Pydantic types, a FastAPI app factory serving the standard endpoints (`/runs`,
`/agent/watch` SSE, `/agent/health`, and the Agent Card), the event bus/SSE, and
a run/event/HITL API (`agent.run(...)`, `run.emit(...)`, `run.request_approval(...)`,
`run.finish(...)`). It is **runtime-agnostic** (wraps the seam, not the brain) and
**domain-agnostic** (domain payloads like spec completeness ride in `metadata`).
**BA is the first implementation** (extracted from its existing plumbing); KA and
SA adopt it. Build brief: [`agent-sdk-brief.md`](./agent-sdk-brief.md).

**Packaging & ownership (sequenced):**

- **Now:** build it as a **standalone, extractable package inside the BA repo**
  (`packages/agency-agent-sdk/`, zero BA-specific imports) — clean boundaries, but
  no separate-repo/CI ceremony for an N=1 consumer.
- **At agent #2** (SA/KA): **extract it to its own git repo** and `pip install` it
  version-pinned. Because it was built extractable, that's a `git mv` + publish,
  not a refactor.
- **The canonical schema travels with it:** `agent-contract.schema.json` lives in
  this repo today and is copied into the SDK version-pinned; when the SDK gets its
  own repo, the canonical schema moves there (or a tiny `agent-contract` package)
  and the dashboard pins/copies it. One source of truth — everyone derives.

---

## 4. Deployment & data

- **Federated.** One dashboard, many agent backends. The dashboard reads each
  agent's **live API** (REST + SSE); each agent owns its data.
- **Database:**
  - **Agent/runtime data → no dashboard DB.** Federate; BA's **Supabase stays the
    system of record.**
  - **Dashboard control-plane data** (real users/auth, the system registry,
    memberships/roles) → a **small Postgres**: reuse **Supabase** (a _separate_
    project) + **Supabase Auth**. Only at the real-auth milestone.
- **API-first, never direct-DB** into an agent's tables (couples to internals,
  bypasses its auth, doesn't generalize to agents we don't own). If a query is
  missing, add an endpoint to the agent.
- **Caveat:** BA's SSE event bus is **in-memory / single-replica** → good for the
  live tail, not deep historical timelines. Durable history comes from `/runs`.

---

## 5. Boundary: agent tool vs. fleet cockpit

|                                                             | **flow-observer** (the agent's own UI)                       | **Agency OS** (fleet cockpit)                         |
| ----------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| Role                                                        | Deep **operate + configure** for one agent                   | Cross-agent **oversight**, read-mostly                |
| Artifact approval                                           | ✅ here — review/edit the real `SPEC.md`, EARS, completeness | shows the gate in a queue; **deep-links** down to act |
| Agent config (Slack channel, Teamwork, model, constitution) | ✅ here (BA's **Admin Backend** already does this)           | not its job                                           |
| Run control / full event timeline                           | ✅ here                                                      | drill-down link                                       |
| Owns                                                        | the agent's internals                                        | the **system registry** + cross-agent rollups         |

**Rule:** deep, artifact-heavy, agent-specific actions stay in the agent's own
UI; the fleet view federates a normalized read + lightweight actions + deep-links.
This keeps Agency OS **mostly read-only** (small blast radius, simple v1).

**HITL is two moments, one contract type.** Every human gate is a `HITLGate`
distinguished by `kind`, and this is **agent-agnostic** — only the artifact noun
changes per agent:

- `clarification` — the agent is **blocked mid-run** and needs an answer to
  continue (BA: `waiting_for_input` ← LangGraph interrupt → Slack reply).
- `approval` — an **artifact the agent produced is ready for review/sign-off**
  (BA: `spec_ready` → spec). SA → "design ready", QA → "tests ready", etc.

Both render in one Human-gates queue; the actual artifact review (edit the real
`SPEC.md`, EARS, …) stays in the agent's tool per the boundary above. The
dashboard standardizes the **gate**, not the artifact's content. (BA predates the
SDK and exposes these on two endpoints — `/agent/interrupted` + `/session/pending-approval`
— which the adapter merges; SDK agents serve one unified gate list. See agent-sdk-brief §A.3–A.4.)

---

## 6. The fleet is derived, not declared

Show **only connected agents** (from the registry + contract health) — BA first,
SA when added. The **topology** defines the intended order/wiring (including
not-yet-built stages, optionally shown ghosted as "planned"). Status surfaces
(agent grid, activity, approvals) render connected agents only. No ghost tiles.

---

## 7. Substitutability

Agents are **replaceable implementations behind a stable interface** — rebuild,
re-platform, or swap one and the dashboard + neighbors don't notice. The
commitment is to a **versioned kernel contract + a conformance suite + a shared
SDK**, _not_ a frozen file:

- Version with semver; additive changes only within a major; dashboard is a
  **tolerant reader**.
- A **conformance test suite (TCK)** certifies any agent as pluggable.
- A **shared platform SDK** implements the contract surface, so new agents are
  compliant by construction (and you only author their logic).
- **Two contracts** must be honored: observability (→ dashboard) and artifact (→
  downstream consumer).
- Honest limits: structure ≠ semantics; swapping an agent does **not** migrate its
  historical data.

---

## 8. DevOps (two senses, both land here)

- **As a pipeline stage:** a future **DevOps/Release agent** — plan → approve →
  apply, DORA metrics (deploy freq, lead time, change-fail rate, MTTR), closing
  the observe→react loop. Highest blast radius → strongest human gates.
- **As platform ops (LLMOps):** CI/CD + envs + IaC for the fleet; **eval-gates in
  CI**; prompt/model version pinning + rollout; a shared **deploy harness**. The
  dashboard can also govern fleet health/versions (extends the existing
  Orchestration / Agent-API Health view).

---

## 9. Phasing

| Phase              | Scope                                                                                                                                                                                 | Dashboard DB                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **v1 (now)**       | Wire **BA as system #1**, federated. Light up BA-covered views (agent deep-dive, approvals, activity, health); show others as **not connected**.                                      | none                               |
| **v2**             | Real auth (**Supabase Auth**) + control-plane DB (system registry, memberships). Add **SA as system #2** (validates the contract) and the **Knowledge Agent** for the Knowledge view. | small Postgres (separate Supabase) |
| **v3 (if needed)** | Durable cross-system event/analytics store (ingest) — only if federation limits actually bite.                                                                                        | + event store                      |

**Build order within v1:** decisions doc (this) → v0 `agent-contract` + topology
schemas → thin BA vertical slice (`gateway/` + `adapters/ba.ts`, flip `real` mode).

---

## 10. Current state

- **Dashboard:** TanStack Start (SSR). Two modes via the auth seam
  (`dataMode: "standard" | "real"`; prototype cookie auth, 2 hardcoded users):
  - **standard / mock** — the original full mock dashboard (unchanged).
  - **real** — federates live agents through the gateway. Built so far: contract
    **v0.2** (`src/contract/`, incl. `work_item_title`), the gateway + BA adapter
    (`src/lib/gateway/`, `src/lib/api/fleet.functions.ts`), a real Command Center
    (KPI strip, rich agent cards with success-ring / "working on", human-gates
    queue, activity feed) that **polls near-live** (TanStack Query
    `refetchInterval`, SSR-seeded, pauses while the tab is hidden), a real
    **agent deep-dive** (`/agents/$agentId` + the agents sidebar: KPIs, charts
    derived from real runs, gate queue, a clickable runs table → run-detail
    drawer), a real project switcher (TopBar), and a throwaway **Connections**
    page for registering agent URLs (`aiops_systems` cookie).
- **BA Agent — federated and live.** Adapter mappings **verified** against BA's
  real schemas (`RunWithSessionResponse`, `Session`, `/agent/health`):
  - runs + gates surface the human **task title** (`teamwork_task_title` →
    `work_item_title`) instead of raw session UUIDs.
  - **Both HITL kinds** are surfaced (§5): `/agent/interrupted`
    (`waiting_for_input` → clarification) **and** `/session/pending-approval`
    (`spec_ready` → approval, i.e. a finished spec awaiting review). The agent's
    `waiting` badge tracks only `waiting_for_input`; the gate queue includes both.
    The `agency-agent-sdk` refactor is in progress on the agent side per the brief;
    once adopted, the adapter collapses toward identity.
- **Next:** live **SSE activity** (push instead of polling — needs a server-side
  SSE proxy + a verified fleet-wide event stream from BA), and run-level **step
  traces** in the deep-dive (light up once BA emits `step.*` events via the SDK).

---

## 11. Project scope

SDLC agents are **project-scoped** (model **B**): one shared agent instance
serves many projects, and each run/work-item carries the project it belongs to
(e.g. BA tags every session with `project_id`/`project_name`). So "project" is a
**scoping dimension orthogonal to "agent"** — a run belongs to _(agent, project)_.

- **Contract:** `Run` and `WorkItem` carry an optional `project { id, name }`
  (`ProjectRef`, schema v0.2). Each adapter populates it (BA from its
  `project_id`/`project_name`).
- **Derived, not declared:** the dashboard derives the project list from the
  federated runs (distinct projects + counts) — no project registry.
- **Scoping:** the TopBar **project switcher** sets the selected project (an
  `aiops_project` cookie, read server-side); the gateway filters runs to it.
  Fleet/agent health shows across all projects (a shared agent serves many); the
  project-specific data (runs, pipeline, traceability) is filtered.
- **Naming:** `project` is the SDLC name for a general **scope**; the domain
  manifest relabels it for non-SDLC agents (or it's simply unset).
- **Per-project deployments (model A)** still work: such an agent declares its
  project in its card; nothing else changes.

---

## Open questions / deferred

- **Productization** (multi-org tenancy, RBAC, billing, data-residency) — deferred
  while internal; revisit if this becomes a product.
- **Topology source** — start with a central manifest; evolve to self-declared +
  auto-composed as the fleet grows.
- **The first non-SDLC agent** — when it lands it forces the _second_ domain pack;
  that's the real test of the agnostic seam.
- **Infra/GPU telemetry** — needs a real source (Prometheus/host metrics), not an
  agent; the Observability view's infra dials are mock until then.
- **Auth hardening** — replace the prototype cookie before any external exposure
  (Supabase Auth in v2 is the path).
