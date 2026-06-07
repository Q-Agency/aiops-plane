// Server-only: BA agent adapter — maps BA's live API → the canonical contract.
//
// Targets BA's CURRENT endpoints (which exist today, pre-SDK): GET /runs/all,
// /agent/health, /agent/active, /agent/interrupted, and the well-known card.
// Once BA adopts `agency-agent-sdk` this adapter collapses toward identity.
//
// STATUS: mappings verified against BA's API schemas (2026-06):
//   • /runs/all              -> RunWithSessionResponse (RunResponse + teamwork_task_title + project_name)
//   • /agent/interrupted     -> { sessions: Session[] } status=waiting_for_input (clarification gates)
//   • /session/pending-approval -> { sessions: Session[] } status=spec_ready (approval gates)
//   • /agent/health          -> { status, checks } (no name/version — those come from the agent card)
// The well-known agent card is still pending on BA (served once it adopts the SDK).
//
// External API responses are untyped on the wire, so `any` is intentional here.
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  SCHEMA_VERSION,
  type AgentCard,
  type AgentHealth,
  type HITLGate,
  type LifecycleStage,
  type Run,
} from "@/contract";
import type { RegisteredSystem } from "./systems.server";

/** BA's artifact is the spec — every run is in service of one SPEC.md. */
const BA_ARTIFACT = "spec";

/** Map BA's native session status onto the shared, agent-agnostic lifecycle. */
export function lifecycleStage(status?: string): LifecycleStage | undefined {
  switch (status) {
    case "active":
    case "in_progress":
    case "running":
      return "in_progress";
    case "waiting_for_input":
      return "waiting";
    case "spec_ready":
      return "ready";
    case "approved":
      return "approved";
    case "delivered":
      return "delivered";
    case "pending":
      return "backlog";
    default:
      return undefined;
  }
}

async function baFetch(system: RegisteredSystem, path: string): Promise<any> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (system.apiKey) headers[system.authHeader ?? "X-API-Key"] = system.apiKey;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${system.baseUrl}${path}`, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`BA ${path} -> HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

/** POST variant — several BA reads are RPC-style POSTs (e.g. /session/get). */
async function baPost(system: RegisteredSystem, path: string, body: unknown): Promise<any> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
  };
  if (system.apiKey) headers[system.authHeader ?? "X-API-Key"] = system.apiKey;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${system.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`BA ${path} -> HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

/** BA RunWithSessionResponse → contract Run. */
function mapRun(r: any, agentId: string): Run {
  const running = !r.ended_at;
  const succeeded = r.success === true;
  return {
    id: String(r.id),
    agent_id: agentId,
    work_item_id: r.session_id ?? undefined,
    // BA joins the Teamwork task title onto /runs/all — use it for display.
    work_item_title: r.teamwork_task_title ?? undefined,
    type: r.run_type ?? "run",
    // Every BA run advances the same artifact: the spec.
    artifact_type: BA_ARTIFACT,
    status: running ? "running" : succeeded ? "succeeded" : "failed",
    started_at: r.started_at,
    ended_at: r.ended_at ?? undefined,
    duration_ms: r.duration_ms ?? undefined,
    model: r.model_id ?? undefined,
    tokens_in: r.input_tokens ?? r.tokens_in ?? undefined,
    tokens_out: r.output_tokens ?? r.tokens_out ?? undefined,
    cost_usd: r.estimated_cost_usd ?? r.cost_usd ?? undefined,
    outcome: running ? undefined : succeeded ? "success" : "error",
    error: r.error_message ?? undefined,
    parent_run_id: undefined,
    // /runs/all carries project_name (no project_id today); key the project by
    // name until BA exposes a stable id.
    project: r.project_name
      ? { id: String(r.project_id ?? r.project_name), name: String(r.project_name) }
      : undefined,
    schema_version: SCHEMA_VERSION,
    // domain payload — kept out of the kernel fields:
    metadata: {
      run_number: r.run_number,
      completeness_before: r.completeness_before,
      completeness_after: r.completeness_after,
      validation_errors: r.validation_errors,
    },
  };
}

export async function getRuns(system: RegisteredSystem): Promise<Run[]> {
  const data = await baFetch(system, "/runs/all");
  const rows: any[] = Array.isArray(data) ? data : (data?.runs ?? []);
  return rows.map((r) => mapRun(r, system.id));
}

/** Count an array-ish payload regardless of how the agent wraps it. */
function countItems(x: any): number {
  if (Array.isArray(x)) return x.length;
  if (typeof x?.count === "number") return x.count;
  for (const k of ["sessions", "active", "interrupted", "items", "runs", "data"]) {
    if (Array.isArray(x?.[k])) return x[k].length;
  }
  return 0;
}

export async function getHealth(system: RegisteredSystem): Promise<AgentHealth> {
  let healthy = true;
  let body: any = {};
  try {
    body = await baFetch(system, "/agent/health");
  } catch {
    healthy = false;
  }

  // Derive "running" from the runs themselves, so the card always agrees with
  // the runs list (rather than guessing the shape of /agent/active).
  let runningCount = 0;
  try {
    const runs = await getRuns(system);
    runningCount = runs.filter((r) => r.status === "running").length;
  } catch {
    /* non-fatal */
  }

  // Human-blocked (waiting for input) takes priority on the badge. Best-effort.
  let waitingCount = 0;
  try {
    waitingCount = countItems(await baFetch(system, "/agent/interrupted"));
  } catch {
    /* non-fatal */
  }

  const state: AgentHealth["state"] = !healthy
    ? "error"
    : waitingCount > 0
      ? "waiting"
      : runningCount > 0
        ? "running"
        : "idle";

  return {
    agent_id: system.id,
    name: body?.name ?? system.label,
    role: body?.role,
    state,
    healthy,
    active_runs: runningCount,
    version: body?.version,
    schema_version: SCHEMA_VERSION,
    last_seen: new Date().toISOString(),
  };
}

/** The agent's self-description. Null until BA serves the card (post-SDK). */
export async function getCard(system: RegisteredSystem): Promise<AgentCard | null> {
  try {
    return (await baFetch(system, "/.well-known/agent-card.json")) as AgentCard;
  } catch {
    return null;
  }
}

/** Pull the `sessions` array out of BA's various wrappers. */
function sessionsOf(data: any): any[] {
  if (Array.isArray(data)) return data;
  return data?.sessions ?? data?.interrupted ?? data?.items ?? data?.data ?? [];
}

/** One BA Session → a contract HITLGate of the given kind. */
function mapGate(system: RegisteredSystem, s: any, kind: HITLGate["kind"], i: number): HITLGate {
  const title = (s?.teamwork_task_title as string) || undefined;
  const sid = s?.id ?? s?.session_id;
  // Sessions don't carry the pending-question text (it lives in chat messages),
  // so describe the gate by the task it concerns.
  const prompt =
    kind === "approval"
      ? title
        ? `Spec ready for review — “${title}”`
        : "Spec ready for review"
      : title
        ? `Waiting for human input on “${title}”`
        : "Waiting for human input";
  return {
    id: `${system.id}:${kind}:${sid ?? i}`,
    work_item_id: sid ?? undefined,
    work_item_title: title,
    run_id: undefined,
    kind,
    state: "open",
    prompt,
    channel: kind === "clarification" ? "slack" : undefined,
    opened_at:
      (kind === "approval" ? s?.autospec_completed_at : undefined) ??
      s?.updated_at ??
      s?.created_at ??
      new Date().toISOString(),
    metadata: {
      agent_id: system.id,
      agent_name: system.label,
      teamwork_task_id: s?.teamwork_task_id ?? undefined,
      project_name: s?.project_name ?? undefined,
      slack_thread_url: s?.slack_thread_url ?? undefined,
      status: s?.status ?? undefined,
    },
  };
}

/** Open human gates → contract HITLGate[]. BA splits the two HITL moments across
 *  two endpoints, both returning { sessions: Session[] }:
 *    • /agent/interrupted     → status `waiting_for_input` (mid-pipeline
 *      clarification the agent is blocked on) → kind "clarification"
 *    • /session/pending-approval → status `spec_ready` (a finished spec awaiting
 *      human review/sign-off) → kind "approval"
 *  Best-effort: a missing endpoint (older BA) just drops that bucket. */
export async function getApprovals(system: RegisteredSystem): Promise<HITLGate[]> {
  const [interrupted, pending] = await Promise.all([
    baFetch(system, "/agent/interrupted").catch(() => null),
    baFetch(system, "/session/pending-approval").catch(() => null),
  ]);
  const clarifications = sessionsOf(interrupted).map((s, i) =>
    mapGate(system, s, "clarification", i),
  );
  const approvals = sessionsOf(pending).map((s, i) => mapGate(system, s, "approval", i));
  // Most recent first across both kinds.
  return [...approvals, ...clarifications].sort((a, b) => (a.opened_at < b.opened_at ? 1 : -1));
}

// --- Observability: logs + health checks --------------------------------------

export type AgentLogLine = {
  ts: string;
  level: string;
  logger?: string;
  message: string;
  exc?: string;
};

/** BA /agent/logs/recent → { records: [{ ts: epoch-seconds, level, logger, message, exc? }] }. */
export async function getLogs(system: RegisteredSystem, limit = 300): Promise<AgentLogLine[]> {
  let data: any;
  try {
    data = await baFetch(system, `/agent/logs/recent?limit=${limit}`);
  } catch {
    return [];
  }
  const records: any[] = Array.isArray(data) ? data : (data?.records ?? data?.logs ?? []);
  return records.map((r) => ({
    ts:
      typeof r?.ts === "number"
        ? new Date(r.ts * 1000).toISOString()
        : (r?.ts ?? r?.timestamp ?? new Date().toISOString()),
    level: String(r?.level ?? "INFO").toUpperCase(),
    logger: r?.logger ?? r?.name ?? undefined,
    message: String(r?.message ?? r?.msg ?? ""),
    exc: r?.exc ?? undefined,
  }));
}

/** BA /agent/health readiness sub-checks. Tolerant: reads the body even on a 503
 *  (BA returns `{ status, checks }` with a non-200) so we can show which check failed. */
export async function getHealthChecks(
  system: RegisteredSystem,
): Promise<{ healthy: boolean; checks: Record<string, string> }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (system.apiKey) headers[system.authHeader ?? "X-API-Key"] = system.apiKey;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${system.baseUrl}/agent/health`, { headers, signal: ctrl.signal });
    const body = await res.json().catch(() => ({}) as any);
    const checks: Record<string, string> = {};
    for (const [k, v] of Object.entries(body?.checks ?? {})) checks[k] = String(v);
    const healthy = body?.status ? body.status === "healthy" : res.ok;
    return { healthy, checks };
  } catch {
    return { healthy: false, checks: {} };
  } finally {
    clearTimeout(t);
  }
}

// --- Governance: spec quality (per session) -----------------------------------

export type CompletenessMap = {
  user_roles: number;
  business_rules: number;
  acceptance_criteria: number;
  scope_boundaries: number;
  error_handling: number;
  data_model: number;
};

export const COMPLETENESS_DIMS = [
  "user_roles",
  "business_rules",
  "acceptance_criteria",
  "scope_boundaries",
  "error_handling",
  "data_model",
] as const;

export type SpecQuality = {
  session_id: string;
  title?: string;
  project?: string;
  status?: string;
  /** the BA status mapped onto the shared lifecycle */
  stage?: LifecycleStage;
  completeness?: CompletenessMap;
  completeness_avg?: number;
  judge_agreement?: number;
  persona_approval?: number;
  ambiguities: number;
  ears_coverage?: number;
  gwt_coverage?: number;
  ac_total?: number;
};

/** A session known from the runs list — used as the base (and fallback) for
 *  spec-quality enrichment so a missing /session/get doesn't blank the row. */
export type SpecBase = {
  session_id: string;
  title?: string;
  project?: string;
  completeness?: CompletenessMap;
};

function avgCompleteness(c?: CompletenessMap): number | undefined {
  if (!c) return undefined;
  const vals = COMPLETENESS_DIMS.map((d) => Number(c[d] ?? 0));
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

/** Spec-quality signals for one session, enriching a run-derived base:
 *   • POST /session/get        → status + judge/persona scores (+ completeness)
 *   • GET /session/{id}/lint   → ambiguity count
 *   • GET /session/{id}/structured-ac → EARS/GWT coverage
 *  All cheap reads/parses (no LLM). Falls back to the base if /session/get is
 *  unavailable, so the row still renders. */
export async function getSpecQuality(
  system: RegisteredSystem,
  base: SpecBase,
): Promise<SpecQuality> {
  const sid = encodeURIComponent(base.session_id);
  const [detail, lint, ac] = await Promise.all([
    baPost(system, "/session/get", { sessionId: base.session_id }).catch(() => null),
    baFetch(system, `/session/${sid}/lint`).catch(() => null),
    baFetch(system, `/session/${sid}/structured-ac`).catch(() => null),
  ]);
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  const completeness = (detail?.completeness as CompletenessMap | undefined) ?? base.completeness;
  return {
    session_id: base.session_id,
    title: detail?.teamwork_task_title ?? base.title,
    project: detail?.project_name ?? base.project,
    status: detail?.status ?? undefined,
    stage: lifecycleStage(detail?.status),
    completeness,
    completeness_avg: avgCompleteness(completeness),
    judge_agreement: num(detail?.judge_agreement),
    persona_approval: num(detail?.persona_approval_rate),
    ambiguities: Array.isArray(lint?.warnings) ? lint.warnings.length : 0,
    ears_coverage: num(ac?.ears_coverage),
    gwt_coverage: num(ac?.gwt_coverage),
    ac_total: num(ac?.total),
  };
}
