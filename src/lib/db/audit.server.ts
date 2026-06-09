// The control plane's append-only audit ledger, backed by the dashboard's OWN Supabase
// (project "Q AI Ops Plane") — separate from any agent's database so the trail survives even
// when an agent deletes its data (e.g. BA's reset wipes the spec). Server-only: it talks to
// Supabase over PostgREST with the service-role key, which bypasses the table's RLS. The key
// NEVER reaches the browser. Unset env → every call is a graceful no-op (feature shows as
// "not configured"), exactly like the optional agent URLs.
import type { AgentEvent } from "@/contract";

const URL_ENV = "DASHBOARD_SUPABASE_URL";
const KEY_ENV = "DASHBOARD_SUPABASE_SERVICE_ROLE_KEY";
const REST = "/rest/v1/audit_log";
// Must match the unique constraint columns (audit_log_natural_key) for idempotent ingest.
const CONFLICT = "agent_id,action,target_id,occurred_at";

function config(): { url: string; key: string } | null {
  const url = process.env[URL_ENV]?.replace(/\/+$/, "");
  const key = process.env[KEY_ENV];
  return url && key ? { url, key } : null;
}

/** Whether the audit ledger is configured (both env vars present). */
export function auditEnabled(): boolean {
  return config() !== null;
}

export type AuditRow = {
  occurred_at: string;
  agent_id: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  target_title?: string | null;
  project?: string | null;
  actor?: string | null;
  source?: string;
  detail?: Record<string, unknown>;
};

/** A stored audit row as returned to the client — explicitly JSON-serializable (no `detail`
 *  bag, whose `unknown` values the server-fn serialization validator rejects, and which the
 *  UI doesn't render anyway). */
export type AuditEntry = {
  id: number;
  recorded_at: string;
  occurred_at: string;
  agent_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_title: string | null;
  project: string | null;
  actor: string | null;
  source: string;
};

// Columns returned to the client (everything except the freeform `detail` jsonb).
const SELECT_COLS =
  "id,recorded_at,occurred_at,agent_id,action,target_type,target_id,target_title,project,actor,source";

async function sb(cfg: { url: string; key: string }, path: string, init: RequestInit) {
  return fetch(`${cfg.url}${path}`, {
    ...init,
    headers: {
      apikey: cfg.key,
      authorization: `Bearer ${cfg.key}`,
      ...(init.headers ?? {}),
    },
  });
}

/** A reset/approval lifecycle event → an audit row. Returns null for anything we don't
 *  audit (only the durable, state-changing actions: reset = spec wiped, approved = sign-off).
 *  `actor` is left null for now — "when-only" until per-user identity is wired in. */
export function eventToAuditRow(e: AgentEvent): AuditRow | null {
  const stage = e.type === "lifecycle.changed" ? (e.data?.stage as string | undefined) : undefined;
  const action = stage === "reset" ? "reset" : stage === "approved" ? "approved" : null;
  if (!action || !e.ts || !e.agent_id) return null;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    occurred_at: e.ts,
    agent_id: e.agent_id,
    action,
    target_type: str(e.data?.artifact_type) ?? "spec",
    target_id: str(e.data?.work_item_id),
    target_title: str(e.data?.work_item_title),
    project: str(e.data?.project_name),
    actor: null,
    source: "agent-event",
    detail: {},
  };
}

/** Append audit rows idempotently (ON CONFLICT DO NOTHING on the natural key) — safe to
 *  call repeatedly with overlapping event windows. Returns the count submitted. */
export async function recordAuditRows(rows: AuditRow[]): Promise<number> {
  const cfg = config();
  if (!cfg || rows.length === 0) return 0;
  const res = await sb(cfg, `${REST}?on_conflict=${CONFLICT}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`audit insert ${res.status}: ${await res.text()}`);
  return rows.length;
}

/** The ledger, newest action first. Empty when not configured. */
export async function listAuditLog(limit = 200): Promise<AuditEntry[]> {
  const cfg = config();
  if (!cfg) return [];
  const res = await sb(cfg, `${REST}?select=${SELECT_COLS}&order=occurred_at.desc&limit=${limit}`, {
    method: "GET",
  });
  if (!res.ok) throw new Error(`audit list ${res.status}: ${await res.text()}`);
  return (await res.json()) as AuditEntry[];
}
