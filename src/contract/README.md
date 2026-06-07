# Agent contract (v0)

The wire contract between **agents** (producers) and **Agency OS** (consumer).
This is the kernel — universal agent-ops shapes. Domain-specific data (spec
completeness, EARS, story points, …) rides in `metadata` / event `data`, never as
core fields.

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

v0, internal. Lives in `src/` for convenient imports, but is meant to be a
**neutral artifact** — extract into a standalone, versioned package once a second
agent (KA/SA) consumes it, so neither the dashboard nor any agent "owns" it.

**Changelog**

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
