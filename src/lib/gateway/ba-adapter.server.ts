// Server-only: BA agent adapter — maps BA's live API → the canonical contract.
//
// Targets BA's CURRENT endpoints (which exist today, pre-SDK): GET /runs/all,
// /agent/health, /agent/active, /agent/interrupted, and the well-known card.
// Once BA adopts `agency-agent-sdk` this adapter collapses toward identity.
//
// ⚠️ STATUS: the field mappings below are best-effort from the BA API
// exploration and are NOT verified end-to-end (no reachable BA here). Point this
// at a live BA, inspect a real response, and adjust the mapped field names.
//
// External API responses are untyped on the wire, so `any` is intentional here.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { SCHEMA_VERSION, type AgentCard, type AgentHealth, type Run } from "@/contract";
import type { RegisteredSystem } from "./systems.server";

async function baFetch(system: RegisteredSystem, path: string): Promise<any> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (system.apiKey) headers[system.authHeader ?? "X-API-Key"] = system.apiKey;
  const res = await fetch(`${system.baseUrl}${path}`, { headers });
  if (!res.ok) throw new Error(`BA ${path} -> HTTP ${res.status}`);
  return res.json();
}

/** BA RunResponse → contract Run. VERIFY field names against a live response. */
function mapRun(r: any, agentId: string): Run {
  const running = !r.ended_at;
  const succeeded = r.success === true;
  return {
    id: String(r.id),
    agent_id: agentId,
    work_item_id: r.session_id ?? undefined,
    type: r.run_type ?? "run",
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

export async function getHealth(system: RegisteredSystem): Promise<AgentHealth> {
  let healthy = true;
  let body: any = {};
  try {
    body = await baFetch(system, "/agent/health");
  } catch {
    healthy = false;
  }

  let activeRuns = 0;
  try {
    const active = await baFetch(system, "/agent/active");
    activeRuns = Array.isArray(active) ? active.length : (active?.count ?? 0);
  } catch {
    /* non-fatal */
  }

  return {
    agent_id: system.id,
    name: body?.name ?? system.label,
    role: body?.role,
    state: !healthy ? "error" : activeRuns > 0 ? "running" : "idle",
    healthy,
    active_runs: activeRuns,
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
