// Server-only: BA agent adapter — consumes BA's CANONICAL Agency OS surface (/agency/*).
//
// BA adopted `agency-agent-sdk` and serves the contract directly, so the canonical
// reads are now near-identity: the wire payloads already ARE contract shapes
// (snake_case, `schema_version` stamped). This adapter just re-keys `agent_id` to the
// dashboard's registry id and stamps gate ownership the agent can't know about.
//
//   • GET /agency/runs            -> Run[]        (the run ledger, newest-first; includes
//                                                  in-flight runs as status "running")
//   • GET /agency/health          -> AgentHealth  (state + active_runs computed agent-side;
//                                                  503 body is still a valid AgentHealth)
//   • GET /agency/gates           -> HITLGate[]   (BOTH kinds: clarification + approval)
//   • GET /agency/events/recent   -> AgentEvent[] (lifecycle.changed: resets/approvals)
//   • GET /.well-known/agent-card.json -> AgentCard
//
// Governance + Observability extras are NOT part of the contract, so they stay BA-native
// (read-time projections the dashboard composes itself):
//   • getSpecQuality  -> POST /session/get + /session/{id}/lint + /structured-ac
//   • getLogs         -> /agent/logs/recent
//   • getHealthChecks -> /agent/health (rich readiness sub-checks)
//
// External API responses are untyped on the wire, so `any` is intentional here.
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  SCHEMA_VERSION,
  type AgentCard,
  type AgentEvent,
  type AgentHealth,
  type HITLGate,
  type LifecycleStage,
  type Run,
} from "@/contract";
import type { RegisteredSystem } from "./systems.server";

/** Map BA's native session status onto the shared, agent-agnostic lifecycle.
 *  Used by the BA-native spec-quality enrichment (the canonical surface already
 *  carries lifecycle stages where relevant). */
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
    case "reset":
      return "reset"; // spec cleared — a fresh run is needed
    case "blocked":
      return "blocked";
    case "error":
    case "failed":
      return "error";
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

/** POST variant — several BA-native reads are RPC-style POSTs (e.g. /session/get). */
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

// --- Canonical contract surface (/agency/*) -----------------------------------

/** The run ledger. `/agency/runs` is already contract-shaped and newest-first; it
 *  includes in-flight runs (status "running"). We request the canonical max so the
 *  economics/governance windows see a fuller history. */
export async function getRuns(system: RegisteredSystem): Promise<Run[]> {
  const data = await baFetch(system, "/agency/runs?limit=500");
  const rows: Run[] = Array.isArray(data) ? (data as Run[]) : [];
  // The agent self-reports its own id; key by the dashboard's registry id so the
  // fleet/runs/deep-dive surfaces line up (env BA is "ba"; a cookie system may differ).
  return rows.map((r) => ({ ...r, agent_id: system.id }));
}

export async function getHealth(system: RegisteredSystem): Promise<AgentHealth> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (system.apiKey) headers[system.authHeader ?? "X-API-Key"] = system.apiKey;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    // The agent computes `state` + `active_runs` itself; `/agency/health` returns a
    // valid AgentHealth even on a 503 (unhealthy) — read the body regardless of status.
    const res = await fetch(`${system.baseUrl}/agency/health`, { headers, signal: ctrl.signal });
    const body = (await res.json()) as AgentHealth;
    return {
      ...body,
      agent_id: system.id,
      name: body.name ?? system.label,
      last_seen: body.last_seen ?? new Date().toISOString(),
    };
  } catch {
    // Unreachable/timeout/parse error → synthesize an unhealthy snapshot so the rest
    // of the fleet still renders.
    return {
      agent_id: system.id,
      name: system.label,
      state: "error",
      healthy: false,
      active_runs: 0,
      schema_version: SCHEMA_VERSION,
      last_seen: new Date().toISOString(),
    };
  } finally {
    clearTimeout(t);
  }
}

/** The agent's self-description (A2A card + `x-agency`). Null if unreachable. */
export async function getCard(system: RegisteredSystem): Promise<AgentCard | null> {
  try {
    return (await baFetch(system, "/.well-known/agent-card.json")) as AgentCard;
  } catch {
    return null;
  }
}

const _tplCache = new Map<string, { tpl?: string; exp: number }>();
const TPL_TTL_MS = 5 * 60_000;

/** The agent's advertised per-run deep-observability URL template
 *  (`x-agency.ui.runUrlTemplate`, e.g. a Flow Observer), or undefined if it ships
 *  none. Cached briefly — the card is near-static and this rides the poll path. The
 *  control plane only *links* to it; the deep tool lives with the agent. */
export async function getObservabilityTemplate(
  system: RegisteredSystem,
): Promise<string | undefined> {
  const now = Date.now();
  const hit = _tplCache.get(system.baseUrl);
  if (hit && hit.exp > now) return hit.tpl;
  let tpl: string | undefined;
  try {
    const card = await getCard(system);
    const t = card?.["x-agency"]?.ui?.runUrlTemplate;
    tpl = typeof t === "string" && t ? t : undefined;
  } catch {
    tpl = undefined;
  }
  _tplCache.set(system.baseUrl, { tpl, exp: now + TPL_TTL_MS });
  return tpl;
}

/** Open human gates → contract HITLGate[]. `/agency/gates` already merges BOTH HITL
 *  moments (clarification + approval) and shapes them; we only stamp ownership (the
 *  agent can't know which dashboard registry id it's filed under) and sort newest-first.
 *  Tolerant: an unreachable endpoint yields no gates rather than blanking the queue. */
export async function getApprovals(system: RegisteredSystem): Promise<HITLGate[]> {
  const data = await baFetch(system, "/agency/gates").catch(() => null);
  const gates: HITLGate[] = Array.isArray(data) ? (data as HITLGate[]) : [];
  return gates
    .map((g) => ({
      ...g,
      // The deep-dive filter (metadata.agent_id) + activity attribution (metadata.agent_name)
      // depend on these; the canonical gate doesn't carry them.
      metadata: { ...g.metadata, agent_id: system.id, agent_name: system.label },
    }))
    .sort((a, b) => ((a.opened_at ?? "") < (b.opened_at ?? "") ? 1 : -1));
}

/** Recent lifecycle events (resets, approvals) for the activity feed. Already
 *  contract-shaped (`lifecycle.changed`, stage in `data.stage`). Tolerant: a missing
 *  endpoint just yields nothing (the feed falls back to runs+gates). */
export async function getEvents(system: RegisteredSystem, limit = 50): Promise<AgentEvent[]> {
  let data: unknown;
  try {
    data = await baFetch(system, `/agency/events/recent?limit=${limit}`);
  } catch {
    return [];
  }
  const items: AgentEvent[] = Array.isArray(data) ? (data as AgentEvent[]) : [];
  return items.map((e) => ({ ...e, agent_id: system.id }));
}

// --- Observability: logs + health checks (BA-native, not in the contract) -----

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

// --- Governance: spec quality (per session, BA-native) ------------------------

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
