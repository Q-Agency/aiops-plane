import { PlugZap, Activity } from "lucide-react";

import type { AgentHealth, AgentState, Run, RunStatus } from "@/contract";
import { cn } from "@/lib/utils";

const AGENT_STATE_DOT: Record<AgentState, string> = {
  running: "bg-status-running dot-pulse",
  waiting: "bg-status-waiting",
  error: "bg-status-error",
  idle: "bg-status-idle",
};

const RUN_STATUS_STYLE: Record<RunStatus, string> = {
  running: "border-status-running/40 bg-status-running/10 text-status-running",
  succeeded: "border-status-done/40 bg-status-done/10 text-status-done",
  failed: "border-status-error/40 bg-status-error/10 text-status-error",
  cancelled: "border-border bg-white/5 text-muted-foreground",
};

const fmtCost = (v?: number) => (v == null ? "—" : `$${v.toFixed(2)}`);
const fmtDur = (ms?: number) => {
  if (ms == null) return "—";
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
};
const fmtTokens = (a?: number, b?: number) => {
  const t = (a ?? 0) + (b ?? 0);
  return t ? t.toLocaleString("en-US") : "—";
};
// UTC-based so server and client render identically (no hydration mismatch).
const fmtTimeUTC = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
};

export function RealCommandCenter({ fleet, runs }: { fleet: AgentHealth[]; runs: Run[] }) {
  if (fleet.length === 0) return <EmptyFleet />;

  const healthy = fleet.filter((a) => a.healthy).length;
  const activeRuns = fleet.reduce((n, a) => n + (a.active_runs ?? 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Live fleet
          </div>
          <div className="text-sm font-semibold">
            {fleet.length} connected agent{fleet.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
          <span>
            {healthy}/{fleet.length} healthy
          </span>
          <span>
            {activeRuns} active run{activeRuns === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fleet.map((a) => (
          <div key={a.agent_id} className="glass-panel p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{a.name}</div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {a.role ?? a.agent_id}
                  {a.version ? ` · ${a.version}` : ""}
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded border border-border bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                <span className={cn("size-1.5 rounded-full", AGENT_STATE_DOT[a.state])} />
                {a.state}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="flex items-center justify-between rounded-md border border-border bg-white/5 px-2 py-1.5">
                <span className="text-muted-foreground">Health</span>
                <span className={a.healthy ? "text-status-done" : "text-status-error"}>
                  {a.healthy ? "OK" : "DOWN"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-white/5 px-2 py-1.5">
                <span className="text-muted-foreground">Active</span>
                <span className="text-foreground">{a.active_runs ?? 0}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <Activity className="size-3.5" /> Recent runs · {fleet[0]?.name}
        </div>
        {runs.length === 0 ? (
          <div className="glass-panel p-6 text-center text-sm text-muted-foreground">
            No runs yet.
          </div>
        ) : (
          <div className="glass-panel overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium">Run</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Started</th>
                  <th className="px-3 py-2 text-right font-medium">Duration</th>
                  <th className="px-3 py-2 text-right font-medium">Tokens</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {runs.slice(0, 20).map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="max-w-[8rem] truncate px-3 py-2 text-muted-foreground">{r.id}</td>
                    <td className="px-3 py-2">{r.type}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                          RUN_STATUS_STYLE[r.status],
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground" title={r.started_at}>
                      {fmtTimeUTC(r.started_at)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtDur(r.duration_ms)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtTokens(r.tokens_in, r.tokens_out)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtCost(r.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyFleet() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass-panel max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <PlugZap className="size-5" />
        </div>
        <h2 className="text-base font-semibold text-foreground">No agents connected</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This is your live workspace. Connect an agent by setting{" "}
          <code className="rounded bg-white/5 px-1 font-mono text-foreground">BA_AGENT_URL</code>{" "}
          (and its API key) on the dashboard server — it will appear here automatically.
        </p>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Federated: the dashboard reads each agent's live API; nothing is stored here.
        </p>
      </div>
    </div>
  );
}
