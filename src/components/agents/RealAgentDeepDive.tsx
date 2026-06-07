import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  ExternalLink,
  PlugZap,
  X,
} from "lucide-react";
import { runObservabilityUrl } from "@/lib/flow-link";

import type { AgentHealth, AgentState, HITLGate, Run, RunStatus } from "@/contract";
import { getAgentDetailFn, type AgentDetailData } from "@/lib/api/fleet.functions";
import { cn } from "@/lib/utils";

const POLL_MS = 5000;

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
const fmtTokens = (n: number) => (n ? n.toLocaleString("en-US") : "—");
const fmtTimeUTC = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
};
const workItemLabel = (x: { work_item_title?: string; work_item_id?: string }) =>
  x.work_item_title || x.work_item_id || "—";

const DAY_MS = 86_400_000;

/** Daily runs + cost over a window anchored to the latest run (deterministic, so
 *  SSR and client agree — no `Date.now()`). Zero-filled for a clean sparkline. */
function dailySeries(runs: Run[], days = 14) {
  const times = runs.map((r) => Date.parse(r.started_at)).filter((n) => !Number.isNaN(n));
  if (!times.length) return [];
  const end = Math.floor(Math.max(...times) / DAY_MS);
  const buckets = new Map<number, { runs: number; cost: number }>();
  for (let i = 0; i < days; i++) buckets.set(end - i, { runs: 0, cost: 0 });
  for (const r of runs) {
    const t = Date.parse(r.started_at);
    if (Number.isNaN(t)) continue;
    const b = buckets.get(Math.floor(t / DAY_MS));
    if (b) {
      b.runs += 1;
      b.cost += r.cost_usd ?? 0;
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([d, v]) => ({
      day: new Date(d * DAY_MS).toISOString().slice(5, 10),
      runs: v.runs,
      cost: +v.cost.toFixed(2),
    }));
}

function durationHistogram(runs: Run[]) {
  const defs: { label: string; lo: number; hi: number }[] = [
    { label: "<30s", lo: 0, hi: 30 },
    { label: "30–60s", lo: 30, hi: 60 },
    { label: "1–2m", lo: 60, hi: 120 },
    { label: "2–5m", lo: 120, hi: 300 },
    { label: "5m+", lo: 300, hi: Infinity },
  ];
  const out = defs.map((d) => ({ bucket: d.label, count: 0 }));
  for (const r of runs) {
    if (r.duration_ms == null) continue;
    const s = r.duration_ms / 1000;
    const idx = defs.findIndex((d) => s >= d.lo && s < d.hi);
    if (idx >= 0) out[idx].count += 1;
  }
  return out;
}

type Props = { systemId: string; initial: AgentDetailData };

export function RealAgentDeepDive({ systemId, initial }: Props) {
  const { data } = useQuery({
    queryKey: ["agent-detail", systemId],
    queryFn: () => getAgentDetailFn({ data: { systemId } }),
    initialData: initial,
    refetchInterval: POLL_MS,
  });
  const [openRun, setOpenRun] = useState<Run | null>(null);

  // `data` is typed `unknown` here due to the server-fn return-serialization
  // inference; at runtime it is AgentDetailData (initialData + queryFn both supply it).
  const { agent, runs, approvals, observability } = data as AgentDetailData;
  if (!agent) return <NotConnected systemId={systemId} />;

  const terminal = runs.filter((r) => r.status === "succeeded" || r.status === "failed");
  const succeeded = runs.filter((r) => r.status === "succeeded").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  const successRate = terminal.length ? Math.round((succeeded / terminal.length) * 100) : null;
  const totalCost = runs.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const totalTokens = runs.reduce((s, r) => s + (r.tokens_in ?? 0) + (r.tokens_out ?? 0), 0);
  const durations = runs.filter((r) => r.duration_ms != null);
  const avgDur = durations.length
    ? durations.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / durations.length
    : undefined;
  const series = dailySeries(runs);
  const hist = durationHistogram(runs);
  const initials = agent.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="glass-panel flex flex-wrap items-center gap-4 p-5">
        <div className="grid size-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-lg font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            agent
          </div>
          <div className="truncate text-xl font-semibold">{agent.name}</div>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">
            {agent.role ?? agent.agent_id}
            {agent.version ? ` · ${agent.version}` : ""}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded border border-border bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider">
            <span className={cn("size-1.5 rounded-full", AGENT_STATE_DOT[agent.state])} />
            {agent.state}
          </span>
          <span className="rounded border border-border bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {agent.healthy ? "operational" : "unreachable"}
          </span>
        </div>
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Runs" value={String(runs.length)} icon={<Activity className="size-3.5" />} />
        <Kpi
          label="Success"
          value={successRate == null ? "—" : `${successRate}%`}
          sub={`${succeeded}/${terminal.length}`}
          icon={<CheckCircle2 className="size-3.5" />}
        />
        <Kpi
          label="Active"
          value={String(agent.active_runs ?? 0)}
          accent={(agent.active_runs ?? 0) > 0}
          icon={<Cpu className="size-3.5" />}
        />
        <Kpi label="Cost" value={fmtCost(totalCost)} icon={<DollarSign className="size-3.5" />} />
        <Kpi
          label="Tokens"
          value={totalTokens ? `${Math.round(totalTokens / 1000)}k` : "—"}
          icon={<Activity className="size-3.5" />}
        />
        <Kpi label="Avg run" value={fmtDur(avgDur)} icon={<Clock className="size-3.5" />} />
      </section>

      {/* Charts from real runs */}
      {runs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartPanel title="Runs · by day" sub={`${runs.length} total`}>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-runs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip content={<DarkTooltip />} />
                <Area
                  type="monotone"
                  dataKey="runs"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#g-runs)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Cost · by day" sub={fmtCost(totalCost)}>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-cost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--status-done)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--status-done)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip content={<DarkTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="var(--status-done)"
                  strokeWidth={2}
                  fill="url(#g-cost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Duration distribution" sub={`avg ${fmtDur(avgDur)}`}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={hist} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Outcomes" sub={`${terminal.length} finished`}>
            <div className="flex h-[170px] flex-col justify-center gap-3 px-2">
              <OutcomeBar
                label="Succeeded"
                value={succeeded}
                total={runs.length}
                cls="bg-status-done"
              />
              <OutcomeBar label="Failed" value={failed} total={runs.length} cls="bg-status-error" />
              <OutcomeBar
                label="Running"
                value={runs.length - terminal.length}
                total={runs.length}
                cls="bg-status-running"
              />
            </div>
          </ChartPanel>
        </div>
      )}

      {/* Open gates for this agent */}
      {approvals.length > 0 && (
        <section className="glass-panel p-4">
          <SectionHead icon={<CheckCircle2 className="size-3.5" />}>
            Open human gates ({approvals.length})
          </SectionHead>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {approvals.slice(0, 6).map((g) => (
              <GateRow key={g.id} gate={g} />
            ))}
          </div>
        </section>
      )}

      {/* Runs table */}
      <section className="glass-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <SectionHead icon={<Activity className="size-3.5" />}>Recent runs</SectionHead>
          <span className="font-mono text-[10px] text-muted-foreground">{runs.length} runs</span>
        </div>
        {runs.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No runs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left font-medium">Task</th>
                  <th className="px-2 py-2 text-left font-medium">Type</th>
                  <th className="px-2 py-2 text-left font-medium">Status</th>
                  <th className="px-2 py-2 text-left font-medium">Started</th>
                  <th className="px-2 py-2 text-right font-medium">Duration</th>
                  <th className="px-2 py-2 text-right font-medium">Tokens</th>
                  <th className="px-2 py-2 text-left font-medium">Model</th>
                  <th className="px-2 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {runs.slice(0, 40).map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setOpenRun(r)}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td
                      className="max-w-[14rem] truncate px-2 py-2 text-foreground"
                      title={`run ${r.id}`}
                    >
                      {workItemLabel(r)}
                    </td>
                    <td className="px-2 py-2">{r.type}</td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                          RUN_STATUS_STYLE[r.status],
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground" title={r.started_at}>
                      {fmtTimeUTC(r.started_at)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmtDur(r.duration_ms)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {fmtTokens((r.tokens_in ?? 0) + (r.tokens_out ?? 0))}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{r.model ?? "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmtCost(r.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {openRun && (
        <RunDrawer
          run={openRun}
          observabilityTemplate={observability}
          onClose={() => setOpenRun(null)}
        />
      )}
    </div>
  );
}

function GateRow({ gate: g }: { gate: HITLGate }) {
  return (
    <div className="rounded-md border border-status-waiting/30 bg-status-waiting/5 p-2.5">
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
        {[workItemLabel(g), g.channel].filter((v) => v && v !== "—").join(" · ")}
      </div>
    </div>
  );
}

function RunDrawer({
  run,
  observabilityTemplate,
  onClose,
}: {
  run: Run;
  observabilityTemplate?: string;
  onClose: () => void;
}) {
  const meta = run.metadata ?? {};
  const liveUrl = runObservabilityUrl(observabilityTemplate, run);
  // The artifact's completeness before/after this run — a run is a step in the
  // artifact's life, so show how much it advanced.
  const avgComp = (c: unknown) => {
    if (!c || typeof c !== "object") return undefined;
    const vals = Object.values(c as Record<string, unknown>).filter(
      (v): v is number => typeof v === "number",
    );
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : undefined;
  };
  const cBefore = avgComp(meta.completeness_before);
  const cAfter = avgComp(meta.completeness_after);
  const metaEntries = Object.entries(meta).filter(
    ([k, v]) => v != null && v !== "" && k !== "completeness_before" && k !== "completeness_after",
  );
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-in scrollbar-thin h-full w-full max-w-[520px] overflow-y-auto rounded-none border-l border-primary/30 bg-card"
      >
        <div className="sticky top-0 z-10 border-b border-border bg-card/90 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                run
              </div>
              <div className="truncate text-sm font-semibold">{workItemLabel(run)}</div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                {run.id}
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded hover:bg-white/5"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
            <Tag>{run.type}</Tag>
            {run.artifact_type && <Tag>→ {run.artifact_type}</Tag>}
            <Tag>
              <span
                className={RUN_STATUS_STYLE[run.status]
                  .split(" ")
                  .find((c) => c.startsWith("text-"))}
              >
                {run.status}
              </span>
            </Tag>
            <Tag>{fmtDur(run.duration_ms)}</Tag>
            <Tag>{fmtTokens((run.tokens_in ?? 0) + (run.tokens_out ?? 0))} tok</Tag>
            <Tag>{fmtCost(run.cost_usd)}</Tag>
            {run.model && <Tag>{run.model}</Tag>}
          </div>
        </div>

        <div className="space-y-4 p-5">
          {run.error && (
            <div className="rounded-md border border-status-error/30 bg-status-error/5 p-3 text-xs text-status-error">
              {run.error}
            </div>
          )}

          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Details
            </div>
            <dl className="space-y-1 text-xs">
              <Row k="Started" v={run.started_at} />
              <Row k="Ended" v={run.ended_at ?? "—"} />
              {run.artifact_type && <Row k="Artifact" v={run.artifact_type} />}
              {(cBefore != null || cAfter != null) && (
                <Row k="Completeness" v={`${cBefore ?? "—"}% → ${cAfter ?? "—"}%`} />
              )}
              {run.work_item_id && <Row k="Work item" v={run.work_item_id} />}
              {run.project && <Row k="Project" v={run.project.name} />}
              {metaEntries.map(([k, v]) => (
                <Row key={k} k={k} v={typeof v === "object" ? JSON.stringify(v) : String(v)} />
              ))}
            </dl>
          </div>

          {liveUrl ? (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground transition-colors hover:bg-primary/10"
            >
              <span>
                <span className="font-medium">Open this run live in Flow Observer</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Step-by-step trace, supervisor graph, and token stream — the agent’s own
                  deep-observability view.
                </span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-primary" />
            </a>
          ) : (
            <div className="rounded-md border border-border bg-white/[0.02] p-3 text-[11px] text-muted-foreground">
              Step-level deep trace lives in the agent’s own observability tool. This agent doesn’t
              advertise one (<code className="font-mono">x-agency.ui.runUrlTemplate</code>), so this
              shows the run record + its domain metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 font-mono text-muted-foreground">{k}</dt>
      <dd className="min-w-0 flex-1 break-words font-mono text-foreground/90">{v}</dd>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded border border-border px-1.5 py-0.5">{children}</span>;
}

function OutcomeBar({
  label,
  value,
  total,
  cls,
}: {
  label: string;
  value: number;
  total: number;
  cls: string;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {value} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div className={cn("h-full rounded-full", cls)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        {sub && <div className="font-mono text-[10px] text-muted-foreground">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel p-2 font-mono text-[11px]">
      <div className="mb-1 text-muted-foreground">{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-foreground/90">{p.dataKey}</span>
          <span className="ml-auto">{p.value}</span>
        </div>
      ))}
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
      {sub && <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SectionHead({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      {icon}
      {children}
    </div>
  );
}

function NotConnected({ systemId }: { systemId: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass-panel max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <PlugZap className="size-5" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Agent not connected</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <code className="rounded bg-white/5 px-1 font-mono text-foreground">{systemId}</code>{" "}
          isn’t in the connected fleet. Add it on the{" "}
          <Link to="/connections" className="text-primary underline-offset-2 hover:underline">
            Connections
          </Link>{" "}
          page (or set its env URL).
        </p>
      </div>
    </div>
  );
}
