// Agency OS — SDLC agent contract (v0.5).
//
// WIRE shapes: `snake_case` fields, ISO-8601 date-time strings — what a conformant
// SDLC agent emits over JSON. Two layers:
//   • the ENVELOPE — run lifecycle, health, HITL gates, events, work-item ref — is
//     identical for every agent; the dashboard renders it generically (the fleet
//     rollup, lifecycle strip, gates queue). This is the reusable seam.
//   • the FACET — `Run.artifact.facet` — is each agent's craft + focus metrics: a
//     typed union keyed by artifact type (BA→spec, SA→design, Dev→code, QA→test…).
//     Unknown agents fall back to a generic facet. Add a role = add a facet here +
//     one UI renderer; the envelope never moves.
// Truly freeform extras still ride in `metadata` / event `data`.
//
// CANONICAL SOURCE: ./agent-contract.schema.json. These TS types mirror it (by hand
// for now; codegen later). The Python SDK's Pydantic models conform to the same
// schema — verified by the conformance suite. See README.md.

export const SCHEMA_VERSION = "0.5" as const;

/** ISO-8601 timestamp, e.g. "2026-06-04T12:00:00Z". */
export type ISODateTime = string;

/** The scope a work item / run belongs to. SDLC calls this a "project"
 *  (product / codebase); a shared agent serves many. */
export interface ProjectRef {
  id: string;
  name: string;
}

/** A link to the system of record for a work item — source-neutral, so the same
 *  dashboard works whether the tracker is Teamwork, GitHub, Jira, Linear, … The
 *  `system` is an open string; well-known values can get richer UI (icon, status
 *  mapping, deep link). */
export interface ExternalRef {
  /** "teamwork" | "github" | "jira" | "linear" | … (open) */
  system: string;
  external_id: string;
  /** deep link out to the item in its tracker */
  url?: string;
  project?: string;
  /** mirrored external status (advisory — may lag the tracker) */
  status?: string;
  assignee?: string;
}

/** A lightweight, denormalized reference to the work item a run/gate advances —
 *  enough to display + deep-link without fetching the full WorkItem. */
export interface WorkItemRef {
  id: string;
  title?: string;
  /** "ticket" | "session" | "incident" | … */
  type?: string;
  /** linkage to the external tracker that owns this work item, if any */
  source?: ExternalRef;
}

/** The shared, agent-agnostic lifecycle every work item / artifact moves through.
 *  This is the backbone the dashboard renders generically; only the *artifact
 *  type* differs per agent (BA → spec, SA → design, QA → tests). Each agent maps
 *  its native status onto a stage (BA: active→in_progress, waiting_for_input→
 *  waiting, spec_ready→ready, approved→approved, reset→reset, blocked→blocked,
 *  error→error).
 *
 *  `backlog → in_progress → waiting → ready → approved → delivered` is the happy
 *  path. The rest are exceptional: `reset` (artifact discarded, fresh run needed),
 *  `blocked` (stuck, needs intervention), `error` (a run failed) — any can occur
 *  off the happy path. */
export type LifecycleStage =
  | "backlog" // known, not started
  | "in_progress" // an agent run is actively advancing the artifact
  | "waiting" // awaiting a human reply (clarification)
  | "ready" // artifact produced, awaiting human approval
  | "approved" // signed off
  | "delivered" // handed off downstream / done
  | "reset" // artifact discarded/cleared — a fresh run is needed (loop-back from any stage)
  | "blocked" // stuck — cannot proceed without intervention
  | "error"; // a run failed

/** The thing an agent produces and advances (BA: `SPEC.md`). A work item carries
 *  one artifact per producing agent; that agent's runs advance it through the
 *  lifecycle. `type` matches the producer's agent-card `produces`. */
export interface ArtifactRef {
  id: string;
  /** "spec" | "design" | "tests" | … (matches the producer's `produces`) */
  type: string;
  title?: string;
  work_item_id?: string;
  producer_agent_id?: string;
  stage: LifecycleStage;
  version?: number;
  /** overall 0–100, if the agent scores it */
  completeness?: number;
  /** deep-link into the producing agent's own tool */
  url?: string;
  updated_at?: ISODateTime;
}

export interface WorkItem {
  id: string;
  /** "ticket" | "session" | "incident" | … (domain-defined) */
  type: string;
  title?: string;
  /** where it is in the shared lifecycle */
  stage?: LifecycleStage;
  /** the agent's native status (e.g. BA "spec_ready"), kept for reference */
  status?: string;
  /** the artifact this work item is producing, e.g. "spec" */
  artifact_type?: ArtifactType;
  project?: ProjectRef;
  /** linkage to the external tracker that owns this work item (Teamwork/GitHub/…) */
  source?: ExternalRef;
  metadata?: Record<string, unknown>;
}

// --- SDLC artifacts + facets ---------------------------------------------------
// The differentiator. The envelope (below) is shared by every agent; each agent's
// craft + focus metrics live in a typed facet keyed by `kind`. Add a role = add a
// facet + one UI renderer; nothing else moves.

/** Target codebase for code-producing agents. Open for new surfaces. */
export type Codebase = "backend" | "web" | "mobile" | (string & {});

/** What an agent produces. Open enum — well-known SDLC types get a bespoke facet +
 *  UI card; anything else falls back to the generic renderer. */
export type ArtifactType =
  | "spec"
  | "design"
  | "tasks"
  | "code"
  | "review"
  | "test"
  | "doc"
  | (string & {});

/** BA — the specification. */
export interface SpecFacet {
  kind: "spec";
  /** overall completeness, 0–100 */
  completeness?: number;
  /** per-dimension completeness, e.g. { user_roles: 90, acceptance: 80 } */
  dimensions?: Record<string, number>;
  acceptance?: { met: number; total: number };
  open_questions?: number;
  validation_errors?: string[];
}

/** SA — the technical design. */
export interface DesignFacet {
  kind: "design";
  components?: number;
  /** architecture decisions (ADRs) recorded */
  decisions?: number;
  risks?: number;
  /** diagram deep-links */
  diagrams?: string[];
}

/** Tasklist — the work breakdown. */
export interface TasksFacet {
  kind: "tasks";
  count?: number;
  by_codebase?: Partial<Record<Codebase, number>>;
  /** estimate in points */
  estimate?: number;
}

/** Dev — the code change. */
export interface CodeFacet {
  kind: "code";
  pr?: { number?: number; url?: string; branch?: string };
  codebase?: Codebase;
  additions?: number;
  deletions?: number;
  files?: number;
  build?: "passing" | "failing" | "unknown";
}

/** Code Review — the review report. */
export interface ReviewFacet {
  kind: "review";
  findings?: { blocker?: number; major?: number; minor?: number };
  verdict?: "approve" | "changes_requested" | "comment";
}

/** QA — the test report. */
export interface TestFacet {
  kind: "test";
  suites?: number;
  passed?: number;
  failed?: number;
  flaky?: number;
  /** coverage, 0–100 */
  coverage?: number;
  defects?: number;
  /** self-heal attempts (QA Healer) */
  healer_runs?: number;
}

/** Fallback for agents whose artifact type has no bespoke facet — a flat map of
 *  scalar metrics the generic renderer lists as-is. Keeps every agent renderable. */
export interface GenericFacet {
  kind: "generic";
  values?: Record<string, string | number | boolean>;
}

/** Discriminated on `kind` — narrow with `facet.kind === "spec"`, etc. */
export type ArtifactFacet =
  | SpecFacet
  | DesignFacet
  | TasksFacet
  | CodeFacet
  | ReviewFacet
  | TestFacet
  | GenericFacet;

/** The run-level artifact: what this run produced/advanced + its typed facet. */
export interface RunArtifact {
  type: ArtifactType;
  version?: number;
  /** deep-link into the producing agent's own tool/output */
  url?: string;
  facet?: ArtifactFacet;
}

/** Upstream/downstream artifact or work-item ids — powers the traceability graph
 *  (e.g. a design run cites the spec it derived from). */
export interface Lineage {
  upstream?: string[];
  downstream?: string[];
}

export type RunStatus = "running" | "succeeded" | "failed" | "cancelled";
export type RunOutcome = "success" | "error" | "cancelled";

export interface Run {
  id: string;
  agent_id: string;
  /** @deprecated v0.5 — use `work_item.id`. Kept for back-compat during migration. */
  work_item_id?: string;
  /** @deprecated v0.5 — use `work_item.title`. */
  work_item_title?: string;
  /** the work item this run advances — source-neutral, links to Teamwork/GitHub/… */
  work_item?: WorkItemRef;
  /** agent-defined run type, e.g. "autospec" */
  type: string;
  /** @deprecated v0.5 — use `artifact.type`. */
  artifact_type?: string;
  /** what this run produced/advanced + the agent's typed focus metrics (the facet).
   *  This is where per-agent differentiation lives; the rest of Run is the shared
   *  envelope. */
  artifact?: RunArtifact;
  /** where the work item sits in the shared pipeline, if the agent reports it */
  stage?: LifecycleStage;
  /** traceability links (e.g. a design run cites the spec it derived from) */
  lineage?: Lineage;
  status: RunStatus;
  started_at: ISODateTime;
  ended_at?: ISODateTime;
  duration_ms?: number;
  model?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  outcome?: RunOutcome;
  error?: string;
  parent_run_id?: string;
  /** project this run belongs to (one shared agent serves many projects) */
  project?: ProjectRef;
  schema_version: string;
  /** domain payload, e.g. { completeness: 92 } */
  metadata?: Record<string, unknown>;
}

export type StepKind = "tool" | "llm" | "stage";

export interface Step {
  id: string;
  run_id: string;
  name: string;
  kind: StepKind;
  started_at: ISODateTime;
  duration_ms?: number;
  tokens?: number;
  cost_usd?: number;
  input?: unknown;
  output?: unknown;
  parent_id?: string;
  metadata?: Record<string, unknown>;
}

export const EVENT_TYPES = [
  "run.started",
  "run.completed",
  "run.error",
  "step.started",
  "step.completed",
  "tool.called",
  "tool.result",
  "hitl.requested",
  "hitl.resolved",
  // artifact moved to a LifecycleStage (reset / approved / blocked / …); the new
  // stage rides in `data.stage` (+ work_item_id/title, artifact_type).
  "lifecycle.changed",
  "metric.update",
  "log",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type EventLevel = "info" | "warning" | "error";

/** Named `AgentEvent` to avoid clashing with the DOM `Event` type. */
export interface AgentEvent {
  ts: ISODateTime;
  agent_id: string;
  type: EventType;
  run_id?: string;
  level?: EventLevel;
  /** domain-specific payload rides here */
  data?: Record<string, unknown>;
  schema_version: string;
}

export type HITLKind = "approval" | "clarification";
export type HITLState = "open" | "resolved" | "expired";

export interface HITLGate {
  id: string;
  /** @deprecated v0.5 — use `work_item.id`. */
  work_item_id?: string;
  /** @deprecated v0.5 — use `work_item.title`. */
  work_item_title?: string;
  /** the work item this gate blocks — source-neutral (Teamwork/GitHub/…) */
  work_item?: WorkItemRef;
  run_id?: string;
  kind: HITLKind;
  state: HITLState;
  prompt: string;
  /** "slack" | "dashboard" | … */
  channel?: string;
  opened_at: ISODateTime;
  resolved_at?: ISODateTime;
  resolved_by?: string;
  decision?: string;
  metadata?: Record<string, unknown>;
}

export type AgentState = "idle" | "running" | "waiting" | "error";

export interface AgentHealth {
  agent_id: string;
  name: string;
  role?: string;
  state: AgentState;
  healthy: boolean;
  active_runs: number;
  version?: string;
  schema_version: string;
  last_seen: ISODateTime;
}

// --- Discovery: the A2A-aligned Agent Card -------------------------------------
// Served by each agent at GET <base_url>/.well-known/agent-card.json.

export interface AgencyCardExtension {
  id: string;
  domain: string;
  contractVersion: string;
  produces: string[];
  consumes: string[];
  sources: { system: string; mode: string }[];
  endpoints: Record<string, string>;
  /** Optional UI affordances the control plane can deep-link to (it stays a
   *  read-only viewer; the deep observability tool lives with the agent). */
  ui?: AgencyCardUi;
}

export interface AgencyCardUi {
  /** URL template for a per-run deep-observability view the agent owns (e.g. a
   *  Flow Observer). The consumer substitutes `{work_item_id}` and/or `{run_id}`.
   *  Omitted when the agent ships no such tool — then no link is shown. */
  runUrlTemplate?: string;
}

export interface AgentCard {
  name: string;
  description: string;
  version: string;
  url: string;
  capabilities?: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
  };
  authentication?: { schemes: string[] };
  skills?: { id: string; name: string; description?: string }[];
  "x-agency": AgencyCardExtension;
}
