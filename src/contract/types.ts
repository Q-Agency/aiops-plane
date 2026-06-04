// Agency OS — agent contract (v0).
//
// WIRE shapes: `snake_case` fields, ISO-8601 date-time strings — i.e. exactly
// what a contract-compliant agent emits over JSON. Domain-specific data rides in
// `metadata` / event `data`; never add domain fields to these core types.
//
// CANONICAL SOURCE: ./agent-contract.schema.json. These TS types mirror it (kept
// in sync by hand for now; codegen later). The Python SDK's Pydantic models must
// conform to the same schema — verified by the conformance suite. See README.md.

export const SCHEMA_VERSION = "0.2" as const;

/** ISO-8601 timestamp, e.g. "2026-06-04T12:00:00Z". */
export type ISODateTime = string;

/** The scope a work item / run belongs to. SDLC calls this a "project"
 *  (product / codebase); a shared agent serves many. */
export interface ProjectRef {
  id: string;
  name: string;
}

export interface WorkItem {
  id: string;
  /** "ticket" | "session" | "incident" | … (domain-defined) */
  type: string;
  title?: string;
  stage?: string;
  status?: string;
  project?: ProjectRef;
  metadata?: Record<string, unknown>;
}

export type RunStatus = "running" | "succeeded" | "failed" | "cancelled";
export type RunOutcome = "success" | "error" | "cancelled";

export interface Run {
  id: string;
  agent_id: string;
  work_item_id?: string;
  /** agent-defined, e.g. "spec" */
  type: string;
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
