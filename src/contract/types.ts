// Agency OS — agent contract (v0).
//
// WIRE shapes: `snake_case` fields, ISO-8601 date-time strings — i.e. exactly
// what a contract-compliant agent emits over JSON. Domain-specific data rides in
// `metadata` / event `data`; never add domain fields to these core types.
//
// CANONICAL SOURCE: ./agent-contract.schema.json. These TS types mirror it (kept
// in sync by hand for now; codegen later). The Python SDK's Pydantic models must
// conform to the same schema — verified by the conformance suite. See README.md.

export const SCHEMA_VERSION = "0.3" as const;

/** ISO-8601 timestamp, e.g. "2026-06-04T12:00:00Z". */
export type ISODateTime = string;

/** The scope a work item / run belongs to. SDLC calls this a "project"
 *  (product / codebase); a shared agent serves many. */
export interface ProjectRef {
  id: string;
  name: string;
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
  artifact_type?: string;
  project?: ProjectRef;
  metadata?: Record<string, unknown>;
}

export type RunStatus = "running" | "succeeded" | "failed" | "cancelled";
export type RunOutcome = "success" | "error" | "cancelled";

export interface Run {
  id: string;
  agent_id: string;
  work_item_id?: string;
  /** denormalized title of the referenced work item, for display when the
   *  dashboard doesn't fetch the WorkItem itself (falls back to work_item_id) */
  work_item_title?: string;
  /** agent-defined run type, e.g. "autospec" */
  type: string;
  /** the artifact this run produces / advances, e.g. "spec" — ties a run to the
   *  artifact lifecycle (an autospec run is a step in one spec's life) */
  artifact_type?: string;
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
  work_item_id?: string;
  /** denormalized title of the referenced work item, for display (falls back
   *  to work_item_id) */
  work_item_title?: string;
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
