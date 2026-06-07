# SDLC agent contract (v0.5)

The wire contract between the **SDLC agent fleet** (producers — BA, SA, Dev, QA, …)
and **Agency OS** (consumer). It's specialized for software delivery, in two layers:

- the **envelope** — run lifecycle, health, HITL gates, events, work-item ref — is
  identical for every agent; the dashboard renders it generically (the fleet rollup,
  lifecycle, gates). This is the reusable seam.
- the **facet** (`Run.artifact.facet`) — each agent's craft + focus metrics, typed per
  artifact (`SpecFacet`, `DesignFacet`, `CodeFacet`, `TestFacet`, …), with a
  `GenericFacet` fallback so any agent still renders.

The rule of thumb: anything the dashboard compares **across** agents lives in the
envelope; anything that's a single agent's craft lives in its facet. Truly freeform
extras still ride in `metadata` / event `data`.

## Files

- **`agent-contract.schema.json`** — **canonical source of truth** (JSON Schema,
  language-neutral). Both sides derive from this.
- **`types.ts`** — TypeScript types the dashboard imports (mirror the schema).
- **`index.ts`** — barrel (`import { Run, AgentEvent } from "@/contract"`).

## The one rule that makes this a real contract

Both ends must **derive from / validate against `agent-contract.schema.json`** —
not maintain look-alike copies:

- **Dashboard (this repo, TS):** `types.ts` mirrors the schema (hand-synced for
  now; wire `json-schema-to-typescript` codegen later).
- **Agent SDK (Python, `agency-agent-sdk`):** its Pydantic models must conform to
  this schema, enforced by the SDK's **conformance suite** in each agent's CI.

If both sides conform to this one schema, producer and consumer cannot silently
drift. The schema guarantees **shape agreement**; the conformance suite proves an
agent actually honors it. (You still build the producer + the gateway/adapter —
the schema just makes the handshake safe.)

## Conventions

- **Wire format:** `snake_case` fields, ISO-8601 date-time strings.
- **Versioning:** every payload carries `schema_version` (and the Agent Card
  carries `x-agency.contractVersion`). Evolve **additively** within a major;
  bump on breaking changes; the dashboard is a **tolerant reader**.

## Status / intent

v0.5, internal. Specialized for the SDLC fleet — **not** a universal agent standard —
but still a **stable internal boundary**: the dashboard reads this projection, never an
agent's raw DB, so an agent's runtime can change without breaking the dashboard. Lives
in `src/` for convenient imports; shared by every SDLC agent, owned by none. Extract
into a standalone, versioned package once a second agent (SA/Dev) consumes it.

**Changelog**

- **0.5** — **SDLC specialization (envelope + facet).** The contract is now explicitly
  for an SDLC fleet. Two layers: a shared **envelope** (run lifecycle, health, gates,
  events, work-item ref) the dashboard renders generically, and a per-agent **facet**
  (`Run.artifact.facet`) carrying each agent's craft + focus metrics — a union keyed by
  `kind`: `SpecFacet` (BA), `DesignFacet` (SA), `TasksFacet`, `CodeFacet` (Dev),
  `ReviewFacet`, `TestFacet` (QA), and a `GenericFacet` fallback so unknown agents still
  render. Added `WorkItemRef` + `ExternalRef` — the work item is **source-neutral but
  PM-aware** (links to Teamwork/GitHub/Jira/… via `source.system`). `Run` gained typed
  `work_item`, `artifact` (`RunArtifact`), `stage`, `lineage` (traceability); `HITLGate`
  gained `work_item`; `WorkItem` gained `source`. The flat `work_item_id` /
  `work_item_title` / `artifact_type` are **deprecated** (kept during migration). BA
  emits v0.5 natively (its SDK + run projection build `work_item`/`artifact.facet`); the
  dashboard adapter still tolerantly lifts a v0.4 agent's flat payload onto the typed
  fields. Reframed as the _SDLC_ agent contract.
- **0.4** — optional `x-agency.ui.runUrlTemplate` on the Agent Card — a per-run
  deep-observability URL the agent owns (e.g. a Flow Observer) that the control plane
  deep-links to (`{work_item_id}`/`{run_id}` placeholders). The dashboard stays
  read-only; deep per-run UI lives with the agent.
- **0.3** — made the **artifact lifecycle** first-class: a shared `LifecycleStage`
  vocabulary (`backlog → in_progress → waiting → ready → approved → delivered`, plus
  the exceptional `reset` / `blocked` / `error`) and an `ArtifactRef` (the thing an
  agent produces). `WorkItem.stage` now uses `LifecycleStage`; `Run`/`WorkItem`
  gained `artifact_type` (ties a run to the artifact it advances). Also added
  `work_item_title` to `Run`/`HITLGate` for display.
- **0.2** — added optional `project` (`ProjectRef`) to `Run`/`WorkItem` for
  project scoping (SDLC agents are shared but tag each run with its project).
- **0.1** — initial kernel.

See `docs/architecture.md` (§3a–3d) and `docs/agent-sdk-brief.md` for the full
design and the producer-side build brief.
