// GENERATED from agent-contract.schema.json by scripts/gen-contract.mjs — DO NOT EDIT.
// Run `bun run gen:contract` after changing the schema.

/**
 * Shared, agent-agnostic lifecycle every work item/artifact moves through. Happy path backlog→in_progress→waiting→ready→approved→delivered; the rest are exceptional: `reset` (artifact discarded, fresh run needed), `blocked` (stuck, needs intervention), `error` (a run failed). Agents map native statuses onto these (BA: active→in_progress, waiting_for_input→waiting, spec_ready→ready, approved→approved, reset→reset, blocked→blocked, error→error).
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "LifecycleStage".
 */
export type LifecycleStage =
  | "backlog"
  | "in_progress"
  | "waiting"
  | "ready"
  | "approved"
  | "delivered"
  | "reset"
  | "blocked"
  | "error";
/**
 * What an agent produces. Open enum — well-known SDLC types get a bespoke facet + UI card; anything else falls back to a generic renderer.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "ArtifactType".
 */
export type ArtifactType = string;
/**
 * Per-agent craft + focus metrics, discriminated on `kind`.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "ArtifactFacet".
 */
export type ArtifactFacet = SpecFacet | DesignFacet | TasksFacet | CodeFacet | ReviewFacet | TestFacet | GenericFacet;
/**
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "EventType".
 */
export type EventType =
  | "run.started"
  | "run.completed"
  | "run.error"
  | "step.started"
  | "step.completed"
  | "tool.called"
  | "tool.result"
  | "hitl.requested"
  | "hitl.resolved"
  | "lifecycle.changed"
  | "metric.update"
  | "log";

/**
 * Canonical, language-neutral wire contract a conformant SDLC agent emits. The dashboard's TS types and the Python SDK's Pydantic models both derive from this. Two layers: a shared ENVELOPE (run lifecycle, health, gates, events, work-item ref) the dashboard renders generically, and a per-agent FACET (`Run.artifact.facet`) carrying each agent's craft + focus metrics (spec/design/code/review/test). Truly freeform extras still ride in `metadata`/`data`.
 */
export interface AgencyOSSDLCAgentContract {
  [k: string]: unknown;
}
/**
 * Scope a work item/run belongs to (SDLC: a project/codebase).
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "ProjectRef".
 */
export interface ProjectRef {
  id: string;
  name: string;
}
/**
 * Link to the system of record for a work item — source-neutral (Teamwork, GitHub, Jira, Linear, …). `system` is an open string; well-known values can get richer UI.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "ExternalRef".
 */
export interface ExternalRef {
  /**
   * teamwork | github | jira | linear | … (open)
   */
  system: string;
  external_id: string;
  /**
   * deep link out to the tracker
   */
  url?: string;
  project?: string;
  /**
   * mirrored external status (advisory, may lag)
   */
  status?: string;
  assignee?: string;
}
/**
 * Lightweight, denormalized reference to the work item a run/gate advances — enough to display + deep-link without fetching the full WorkItem.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "WorkItemRef".
 */
export interface WorkItemRef {
  id: string;
  title?: string;
  /**
   * ticket | session | incident | …
   */
  type?: string;
  source?: ExternalRef;
}
/**
 * The thing an agent produces and advances (BA: SPEC.md). `type` matches the producer's agent-card `produces`.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "ArtifactRef".
 */
export interface ArtifactRef {
  id: string;
  /**
   * spec | design | tests | … (matches producer's `produces`)
   */
  type: string;
  title?: string;
  work_item_id?: string;
  producer_agent_id?: string;
  stage: LifecycleStage;
  version?: number;
  /**
   * overall 0–100, if scored
   */
  completeness?: number;
  /**
   * deep-link into the producing agent's own tool
   */
  url?: string;
  updated_at?: string;
}
/**
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "WorkItem".
 */
export interface WorkItem {
  id: string;
  /**
   * ticket | session | incident | … (domain-defined)
   */
  type: string;
  title?: string;
  stage?: LifecycleStage;
  /**
   * agent-native status (e.g. BA spec_ready), kept for reference
   */
  status?: string;
  /**
   * the artifact this work item produces, e.g. spec
   */
  artifact_type?: string;
  project?: ProjectRef;
  source?: ExternalRef;
  metadata?: { [k: string]: unknown };
}
/**
 * The structural validator gate (8 zero-LLM validators; V3 retired) — the real spec-quality signal.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "StructuralSummary".
 */
export interface StructuralSummary {
  /**
   * validators that produced no failures
   */
  passed?: number;
  /**
   * validators run
   */
  total?: number;
}
/**
 * BA — the specification. Quality is assessed by the structural validator gate (8 zero-LLM validators; V3 retired); the 6-dimension `completeness` is DERIVED from those checks (per-check score caps), not LLM-judged.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "SpecFacet".
 */
export interface SpecFacet {
  kind: "spec";
  structural?: StructuralSummary;
  /**
   * % of acceptance criteria in EARS format (0–100)
   */
  ears_coverage?: number;
  /**
   * canonical sections absent from the spec
   */
  missing_sections?: string[];
  /**
   * overall, structurally-derived (0–100)
   */
  completeness?: number;
  /**
   * the 6 structurally-derived dimension scores (user_roles, business_rules, acceptance_criteria, scope_boundaries, error_handling, data_model)
   */
  dimensions?: {
    [k: string]: number;
  };
  validation_errors?: string[];
  /**
   * why the run ended: all_validators_pass | max_turns | max_fix_attempts | timeout | budget_exceeded | already_passing_no_op | …
   */
  completion_reason?: string;
  /**
   * first_try | fallback | langgraph
   */
  finalize_method?: string;
  /**
   * decisions logged this turn
   */
  decisions?: number;
}
/**
 * SA — the technical design.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "DesignFacet".
 */
export interface DesignFacet {
  kind: "design";
  components?: number;
  /**
   * ADRs recorded
   */
  decisions?: number;
  risks?: number;
  diagrams?: string[];
}
/**
 * Tasklist — the work breakdown.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "TasksFacet".
 */
export interface TasksFacet {
  kind: "tasks";
  count?: number;
  by_codebase?: {
    [k: string]: number;
  };
  /**
   * points
   */
  estimate?: number;
}
/**
 * Dev — the code change.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "CodeFacet".
 */
export interface CodeFacet {
  kind: "code";
  pr?: {
    number?: number;
    url?: string;
    branch?: string;
  };
  /**
   * backend | web | mobile | … (open)
   */
  codebase?: string;
  additions?: number;
  deletions?: number;
  files?: number;
  build?: "passing" | "failing" | "unknown";
}
/**
 * Code Review — the review report.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "ReviewFacet".
 */
export interface ReviewFacet {
  kind: "review";
  findings?: {
    blocker?: number;
    major?: number;
    minor?: number;
  };
  verdict?: "approve" | "changes_requested" | "comment";
}
/**
 * QA — the test report.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "TestFacet".
 */
export interface TestFacet {
  kind: "test";
  suites?: number;
  passed?: number;
  failed?: number;
  flaky?: number;
  /**
   * 0–100
   */
  coverage?: number;
  defects?: number;
  healer_runs?: number;
}
/**
 * Fallback for agents without a bespoke facet — flat scalar metrics the generic renderer lists.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "GenericFacet".
 */
export interface GenericFacet {
  kind: "generic";
  values?: {
    [k: string]: string | number | boolean;
  };
}
/**
 * What a run produced/advanced + its typed facet (the per-agent differentiator).
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "RunArtifact".
 */
export interface RunArtifact {
  type: ArtifactType;
  version?: number;
  /**
   * deep-link into the producing agent's own tool/output
   */
  url?: string;
  facet?: ArtifactFacet;
}
/**
 * Upstream/downstream artifact or work-item ids — powers the traceability graph.
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "Lineage".
 */
export interface Lineage {
  upstream?: string[];
  downstream?: string[];
}
/**
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "Run".
 */
export interface Run {
  id: string;
  agent_id: string;
  /**
   * DEPRECATED v0.5 — use work_item.id
   */
  work_item_id?: string;
  /**
   * DEPRECATED v0.5 — use work_item.title
   */
  work_item_title?: string;
  work_item?: WorkItemRef;
  /**
   * agent-defined run type, e.g. autospec
   */
  type: string;
  /**
   * DEPRECATED v0.5 — use artifact.type
   */
  artifact_type?: string;
  artifact?: RunArtifact;
  stage?: LifecycleStage;
  lineage?: Lineage;
  status: "running" | "succeeded" | "failed" | "cancelled";
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  model?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  outcome?: "success" | "error" | "cancelled";
  error?: string;
  parent_run_id?: string;
  project?: ProjectRef;
  schema_version: string;
  /**
   * domain payload, e.g. { completeness: 92 }
   */
  metadata?: { [k: string]: unknown };
}
/**
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "Step".
 */
export interface Step {
  id: string;
  run_id: string;
  name: string;
  kind: "tool" | "llm" | "stage";
  started_at: string;
  duration_ms?: number;
  tokens?: number;
  cost_usd?: number;
  input?: unknown;
  output?: unknown;
  parent_id?: string;
  metadata?: { [k: string]: unknown };
}
/**
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "AgentEvent".
 */
export interface AgentEvent {
  ts: string;
  agent_id: string;
  type: EventType;
  run_id?: string;
  level?: "info" | "warning" | "error";
  /**
   * domain-specific payload
   */
  data?: { [k: string]: unknown };
  schema_version: string;
}
/**
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "HITLGate".
 */
export interface HITLGate {
  id: string;
  /**
   * DEPRECATED v0.5 — use work_item.id
   */
  work_item_id?: string;
  /**
   * DEPRECATED v0.5 — use work_item.title
   */
  work_item_title?: string;
  work_item?: WorkItemRef;
  run_id?: string;
  kind: "approval" | "clarification";
  state: "open" | "resolved" | "expired";
  prompt: string;
  channel?: string;
  opened_at: string;
  resolved_at?: string;
  resolved_by?: string;
  decision?: string;
  metadata?: { [k: string]: unknown };
}
/**
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "AgentHealth".
 */
export interface AgentHealth {
  agent_id: string;
  name: string;
  role?: string;
  state: "idle" | "running" | "waiting" | "error";
  healthy: boolean;
  active_runs: number;
  version?: string;
  schema_version: string;
  last_seen: string;
}
/**
 * A2A-aligned discovery doc at /.well-known/agent-card.json
 *
 * This interface was referenced by `AgencyOSSDLCAgentContract`'s JSON-Schema
 * via the `definition` "AgentCard".
 */
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
  authentication?: {
    schemes?: string[];
  };
  skills?: {
    id: string;
    name: string;
    description?: string;
  }[];
  "x-agency": {
    id: string;
    domain: string;
    contractVersion: string;
    produces: string[];
    consumes: string[];
    sources: {
      system: string;
      mode: string;
    }[];
    endpoints: {
      [k: string]: string;
    };
    /**
     * Optional UI affordances the control plane can deep-link to.
     */
    ui?: {
      /**
       * Per-run deep-observability URL template; consumer substitutes {work_item_id} and/or {run_id}.
       */
      runUrlTemplate?: string;
    };
  };
}

/** The contract version this build targets (from the schema's x-contract-version). */
export const SCHEMA_VERSION = "0.5" as const;
