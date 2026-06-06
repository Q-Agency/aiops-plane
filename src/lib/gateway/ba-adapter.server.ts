// Server-only: BA agent adapter — maps BA's live API → the canonical contract.
//
// Targets BA's CURRENT endpoints (which exist today, pre-SDK): GET /runs/all,
// /agent/health, /agent/active, /agent/interrupted, and the well-known card.
// Once BA adopts `agency-agent-sdk` this adapter collapses toward identity.
//
// STATUS: mappings verified against BA's API schemas (2026-06):
//   • /runs/all          -> RunWithSessionResponse (RunResponse + teamwork_task_title + project_name)
//   • /agent/interrupted -> { sessions: Session[] } (Session has teamwork_task_title, no question text)
//   • /agent/health      -> { status, checks } (no name/version — those come from the agent card)
// The well-known agent card is still pending on BA (served once it adopts the SDK).
//
// External API responses are untyped on the wire, so `any` is intentional here.
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  SCHEMA_VERSION,
  type AgentCard,
  type AgentHealth,
  type HITLGate,
  type Run,
} from "@/contract";
import type { RegisteredSystem } from "./systems.server";

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

/** Open human gates → contract HITLGate[]. Maps BA's /agent/interrupted, which
 *  returns { sessions: Session[] } — sessions paused waiting for a human reply
 *  (in Slack). The pending question text lives in chat messages, not on the
 *  session, so we surface the task it's blocked on instead. */
export async function getApprovals(system: RegisteredSystem): Promise<HITLGate[]> {
  let data: any;
  try {
    data = await baFetch(system, "/agent/interrupted");
  } catch {
    return [];
  }
  const items: any[] = Array.isArray(data)
    ? data
    : (data?.sessions ?? data?.interrupted ?? data?.items ?? data?.data ?? []);
  return items.map((s: any, i: number): HITLGate => {
    const title = (s?.teamwork_task_title as string) || undefined;
    return {
      id: String(s?.id ?? s?.session_id ?? `${system.id}-gate-${i}`),
      work_item_id: s?.id ?? s?.session_id ?? undefined,
      work_item_title: title,
      run_id: undefined,
      kind: "clarification",
      state: "open",
      prompt: title ? `Waiting for human input on “${title}”` : "Waiting for human input",
      channel: "slack",
      opened_at: s?.updated_at ?? s?.created_at ?? new Date().toISOString(),
      metadata: {
        agent_id: system.id,
        agent_name: system.label,
        teamwork_task_id: s?.teamwork_task_id ?? undefined,
        project_name: s?.project_name ?? undefined,
        slack_thread_url: s?.slack_thread_url ?? undefined,
        status: s?.status ?? undefined,
      },
    };
  });
}
