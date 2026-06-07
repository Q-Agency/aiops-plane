import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  PlugZap,
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  DollarSign,
  Layers,
} from "lucide-react";

import type { AgentHealth, AgentState, HITLGate, Run, RunStatus } from "@/contract";
import { getCommandCenterFn } from "@/lib/api/fleet.functions";
import { cn } from "@/lib/utils";

// How often the real surface re-reads the fleet through the gateway. Pauses while
// the tab is hidden (refetchIntervalInBackground defaults to false), so we don't
// hammer the agents when nobody's looking.
const POLL_MS = 4000;

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
const tokenSum = (a?: number, b?: number) => (a ?? 0) + (b ?? 0);
const fmtTokens = (n: number) => (n ? n.toLocaleString("en-US") : "—");
// UTC-based so server and client render identically (no hydration mismatch).
const fmtTimeUTC = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
};
const fmtClockUTC = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
};
// Prefer the human task name; fall back to the work-item id (often a raw UUID).
const workItemLabel = (x: { work_item_title?: string; work_item_id?: string }) =>
  x.work_item_title || x.work_item_id || "—";

type Props = { fleet: AgentHealth[]; runs: Run[]; approvals: HITLGate[] };

export function RealCommandCenter(initial: Props) {
  // SSR seeds the cache (initialData) for a populated first paint; the client then
  // polls the same combined endpoint to keep the surface near-live. Project scope
  // (aiops_project cookie) still applies — it's read server-side on every poll.
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ["command-center"],
    queryFn: () => getCommandCenterFn(),
    initialData: initial,
    refetchInterval: POLL_MS,
  });
  const { fleet, runs, approvals } = data;

  if (fleet.length === 0) return <EmptyFleet />;

  const terminal = runs.filter((r) => r.status === "succeeded" || r.status === "failed");
  const succeeded = runs.filter((r) => r.status === "succeeded").length;
  const successRate = terminal.length ? Math.round((succeeded / terminal.length) * 100) : null;
  const totalCost = runs.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const totalTokens = runs.reduce((s, r) => s + tokenSum(r.tokens_in, r.tokens_out), 0);
  const activeRuns = fleet.reduce((n, a) => n + (a.active_runs ?? 0), 0);
  const healthy = fleet.filter((a) => a.healthy).length;

  return (
    <div className="grid gap-4 p-4 lg:gap-5 lg:p-6 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-4 lg:space-y-5">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Connected"
            value={String(fleet.length)}
            sub={`${healthy} healthy`}
            icon={<Cpu className="size-3.5" />}
          />
          <Kpi
            label="Active runs"
            value={String(activeRuns)}
            accent={activeRuns > 0}
            icon={<Activity className="size-3.5" />}
          />
          <Kpi
            label="Success"
            value={successRate == null ? "—" : `${successRate}%`}
            sub={`${terminal.length} done`}
            icon={<CheckCircle2 className="size-3.5" />}
          />
          <Kpi
            label="Cost"
            value={fmtCost(totalCost)}
            sub={totalTokens ? `${Math.round(totalTokens / 1000)}k tok` : undefined}
            icon={<DollarSign className="size-3.5" />}
          />
        </section>

        <section>
          <SectionHead>Agent status</SectionHead>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fleet.map((a) => (
              <AgentCard
                key={a.agent_id}
                agent={a}
                runs={runs.filter((r) => r.agent_id === a.agent_id)}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHead icon={<Activity className="size-3.5" />}>
            Recent runs · {fleet[0]?.name}
          </SectionHead>
          {runs.length === 0 ? <Empty>No runs yet.</Empty> : <RunsTable runs={runs} />}
        </section>

        <section className="glass-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <Layers className="mt-0.5 size-4 shrink-0" />
          <span>
            Pipeline flow, traceability, and unit economics light up as you connect downstream
            agents (Software Architect, Dev, QA). Today the BA / spec slice is live.
          </span>
        </section>
      </div>

      <aside className="min-w-0 space-y-4 self-start lg:space-y-5 xl:sticky xl:top-4">
        <ApprovalsQueue approvals={approvals} />
        <ActivityFeed runs={runs} approvals={approvals} fleet={fleet} updatedAt={dataUpdatedAt} />
      </aside>
    </div>
  );
}

function AgentCard({ agent: a, runs }: { agent: AgentHealth; runs: Run[] }) {
  const terminal = runs.filter((r) => r.status === "succeeded" || r.status === "failed");
  const succeeded = runs.filter((r) => r.status === "succeeded").length;
  const pct = terminal.length ? Math.round((succeeded / terminal.length) * 100) : null;
  // BA runs many specs at once — show the concurrency, not just the first.
  const runningRuns = runs.filter((r) => r.status === "running");
  const workingLabel =
    runningRuns.length === 0
      ? "—"
      : runningRuns.length === 1
        ? workItemLabel(runningRuns[0])
        : `${runningRuns.length} specs in progress`;
  const cost = runs.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const durations = runs.filter((r) => r.duration_ms != null);
  const avgDur = durations.length
    ? durations.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / durations.length
    : undefined;

  return (
    <Link
      to="/agents/$agentId"
      params={{ agentId: a.agent_id }}
      className="glass-panel block p-4 transition-colors hover:border-primary/40"
    >
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

      <div className="mt-3 flex items-center gap-3">
        <Ring pct={pct} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Working on
          </div>
          {runningRuns.length > 1 ? (
            <div className="group/wo relative inline-block max-w-full">
              {/* clear "hoverable" affordance: dotted underline + chevron */}
              <span className="inline-flex max-w-full cursor-help items-center gap-1 text-sm text-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">
                <span className="truncate">{workingLabel}</span>
                <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
              </span>
              {/* instant, styled popover — `pt-1.5` bridges the gap so it doesn't flicker */}
              <div className="absolute left-0 top-full z-50 hidden w-72 max-w-[80vw] pt-1.5 group-hover/wo:block">
                <div className="glass-panel border border-primary/25 p-2 shadow-xl shadow-black/50">
                  <div className="mb-1 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {runningRuns.length} specs in progress
                  </div>
                  <div className="space-y-0.5">
                    {runningRuns.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 rounded px-1 py-1 text-xs hover:bg-white/5"
                      >
                        <span className="size-1.5 shrink-0 rounded-full bg-status-running dot-pulse" />
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {workItemLabel(r)}
                        </span>
                        {r.project?.name && (
                          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                            {r.project.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="truncate text-sm text-foreground">{workingLabel}</div>
          )}
          {/* Liveness (always-on while healthy) — distinct from the activity badge above. */}
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {a.healthy ? "available" : "unreachable"}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 font-mono text-[10px] text-muted-foreground">
        <Stat icon={<Activity className="size-3" />} value={String(runs.length)} label="runs" />
        <Stat icon={<Clock className="size-3" />} value={fmtDur(avgDur)} label="avg" />
        <Stat
          icon={<DollarSign className="size-3" />}
          value={cost ? cost.toFixed(2) : "—"}
          label="cost"
        />
      </div>
    </Link>
  );
}

function Ring({ pct }: { pct: number | null }) {
  const deg = (pct ?? 0) * 3.6;
  return (
    <div
      className="relative size-14 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(var(--primary) 0deg ${deg}deg, rgba(255,255,255,0.08) ${deg}deg 360deg)`,
      }}
    >
      <div className="absolute inset-[3px] grid place-items-center rounded-full bg-card font-mono text-[11px]">
        {pct == null ? "—" : `${pct}%`}
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md border border-border bg-white/5 py-1.5">
      <span className="flex items-center gap-1 text-foreground">
        {icon}
        {value}
      </span>
      <span className="uppercase tracking-wider">{label}</span>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-xl tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function RunsTable({ runs }: { runs: Run[] }) {
  return (
    <div className="glass-panel overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-medium">Task</th>
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
              <td
                className="max-w-[12rem] truncate px-3 py-2 text-foreground"
                title={`run ${r.id}${r.work_item_id ? ` · ${r.work_item_id}` : ""}`}
              >
                {workItemLabel(r)}
              </td>
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
                {fmtTokens(tokenSum(r.tokens_in, r.tokens_out))}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtCost(r.cost_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApprovalsQueue({ approvals }: { approvals: HITLGate[] }) {
  return (
    <div className="glass-panel p-4">
      <SectionHead icon={<CheckCircle2 className="size-3.5" />}>
        Human gates ({approvals.length})
      </SectionHead>
      {approvals.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">No pending approvals.</div>
      ) : (
        <div className="space-y-2">
          {approvals.slice(0, 8).map((g) => (
            <div
              key={g.id}
              className="rounded-md border border-status-waiting/30 bg-status-waiting/5 p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-status-waiting">
                  {g.kind}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {fmtTimeUTC(g.opened_at)}
                </span>
              </div>
              <div className="mt-1 line-clamp-2 text-xs text-foreground">{g.prompt}</div>
              <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                {[g.metadata?.agent_name as string | undefined, workItemLabel(g), g.channel]
                  .filter((v) => v && v !== "—")
                  .join(" · ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ActivityItem = {
  ts: string;
  kind: "run" | "approval";
  status?: RunStatus;
  agent: string;
  message: string;
};

function buildActivity(runs: Run[], approvals: HITLGate[], fleet: AgentHealth[]): ActivityItem[] {
  const nameOf = (id: string) => fleet.find((a) => a.agent_id === id)?.name ?? id;
  const fromRuns: ActivityItem[] = runs.map((r) => {
    const target = r.work_item_id || r.work_item_title ? ` for ${workItemLabel(r)}` : "";
    const message =
      r.status === "running"
        ? `started ${r.type}${target}`
        : r.status === "succeeded"
          ? `completed ${r.type}${target}`
          : r.status === "failed"
            ? `failed ${r.type}${r.error ? ` — ${r.error}` : ""}`
            : `${r.status} ${r.type}`;
    return {
      ts: r.ended_at ?? r.started_at,
      kind: "run",
      status: r.status,
      agent: nameOf(r.agent_id),
      message,
    };
  });
  const fromGates: ActivityItem[] = approvals.map((g) => ({
    ts: g.opened_at,
    kind: "approval",
    agent: (g.metadata?.agent_name as string) ?? "",
    message: `awaiting human ${g.kind}${g.work_item_id || g.work_item_title ? ` on ${workItemLabel(g)}` : ""}`,
  }));
  return [...fromRuns, ...fromGates]
    .filter((a) => a.ts)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, 15);
}

function ActivityFeed({
  runs,
  approvals,
  fleet,
  updatedAt,
}: {
  runs: Run[];
  approvals: HITLGate[];
  fleet: AgentHealth[];
  updatedAt: number;
}) {
  const items = buildActivity(runs, approvals, fleet);
  return (
    <div className="glass-panel p-4">
      <SectionHead
        icon={<Activity className="size-3.5" />}
        right={<LiveBadge updatedAt={updatedAt} />}
      >
        Activity
      </SectionHead>
      {items.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">No activity yet.</div>
      ) : (
        <div className="space-y-2.5">
          {items.map((a, i) => (
            <div key={i} className="flex gap-2.5 text-xs">
              <span
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  a.kind === "approval"
                    ? "bg-status-waiting"
                    : a.status === "succeeded"
                      ? "bg-status-done"
                      : a.status === "failed"
                        ? "bg-status-error"
                        : a.status === "running"
                          ? "bg-status-running dot-pulse"
                          : "bg-status-idle",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="text-foreground">
                  <span className="font-medium">{a.agent}</span>{" "}
                  <span className="text-muted-foreground">{a.message}</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {fmtTimeUTC(a.ts)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHead({
  children,
  icon,
  right,
}: {
  children: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      {icon}
      {children}
      {right && <span className="ml-auto normal-case">{right}</span>}
    </div>
  );
}

// Pulsing "Live" chip with the last poll time. The timestamp is client-only
// (gated on mount) so SSR and the first client render agree — no hydration warning.
function LiveBadge({ updatedAt }: { updatedAt: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <span className="inline-flex items-center gap-1 text-status-running">
      <span className="size-1.5 rounded-full bg-status-running dot-pulse" />
      Live{mounted && updatedAt ? ` · ${fmtClockUTC(updatedAt)}` : ""}
    </span>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="glass-panel p-6 text-center text-sm text-muted-foreground">{children}</div>
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
          This is your live workspace. Connect an agent on the{" "}
          <code className="rounded bg-white/5 px-1 font-mono text-foreground">Connections</code>{" "}
          page (or set{" "}
          <code className="rounded bg-white/5 px-1 font-mono text-foreground">BA_AGENT_URL</code>) —
          it will appear here automatically.
        </p>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Federated: the dashboard reads each agent's live API; nothing is stored here.
        </p>
      </div>
    </div>
  );
}
