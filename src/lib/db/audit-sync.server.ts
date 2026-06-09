// Server-side background sync for the audit ledger. Ingests each connected agent's durable
// lifecycle events (reset / approve) into the dashboard's Supabase on a schedule, so the
// trail is captured 24/7 — not only while someone has the Compliance page open. Runs in the
// long-lived node-server process (the self-hosted rig); a complete no-op when the audit DB
// isn't configured. Idempotent, so it's safe alongside the on-view ingest.
import { getSystems } from "../gateway/systems.server";
import { getEvents } from "../gateway/ba-adapter.server";
import { auditEnabled, eventToAuditRow, recordAuditRows, type AuditRow } from "./audit.server";

/** One ingest sweep: pull recent lifecycle events from every connected agent (no request
 *  context needed — systems resolve from env) and append the auditable ones to the ledger.
 *  Returns the number of rows submitted (idempotent upsert dedupes already-seen ones). */
export async function ingestAuditOnce(limit = 200): Promise<number> {
  if (!auditEnabled()) return 0;
  const systems = getSystems();
  const settled = await Promise.allSettled(systems.map((s) => getEvents(s, limit)));
  const rows: AuditRow[] = settled
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .map(eventToAuditRow)
    .filter((r): r is AuditRow => r !== null);
  return rows.length ? recordAuditRows(rows) : 0;
}

let started = false;

/** Start the background ingest loop once, at server boot. Self-gating: does nothing if the
 *  audit DB isn't configured or `AUDIT_SYNC=off`. Single-flight (each run schedules the next
 *  only after it finishes — no overlap), error-tolerant, and `unref`'d so it never keeps the
 *  process alive on its own. Tunable via `AUDIT_SYNC_INTERVAL_MS` (default 120s, floor 30s). */
export function startAuditSyncLoop(): void {
  if (started) return;
  if (process.env.AUDIT_SYNC === "off") return;
  if (!auditEnabled()) return;
  started = true;

  const intervalMs = Math.max(30_000, Number(process.env.AUDIT_SYNC_INTERVAL_MS) || 120_000);
  const schedule = (ms: number) => {
    const t = setTimeout(tick, ms);
    if (typeof t.unref === "function") t.unref();
  };
  const tick = async () => {
    try {
      const n = await ingestAuditOnce();
      if (n) console.log(`[audit-sync] ingested ${n} event(s)`);
    } catch (e) {
      console.error("[audit-sync] failed:", e instanceof Error ? e.message : e);
    } finally {
      schedule(intervalMs);
    }
  };
  schedule(10_000); // first sweep shortly after boot, once the server has settled
  console.log(`[audit-sync] started — every ${Math.round(intervalMs / 1000)}s`);
}
