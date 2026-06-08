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
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  ExternalLink,
  PlugZap,
  X,
} from "lucide-react";
import { runObservabilityUrl } from "@/lib/flow-link";

import type { AgentHealth, AgentState, ArtifactFacet, HITLGate, Run, SpecFacet } from "@/contract";
import {
  getAgentDetailFn,
  getSpecReportFn,
  type AgentDetailData,
  type SpecReport,
} from "@/lib/api/fleet.functions";
import { cn } from "@/lib/utils";
import { fmtDateTime, fmtTime } from "@/lib/time";
import { STAGE_META, runStage } from "@/lib/lifecycle";

const POLL_MS = 5000;

const AGENT_STATE_DOT: Record<AgentState, string> = {
  running: "bg-status-running dot-pulse",
  waiting: "bg-status-waiting",
  error: "bg-status-error",
  idle: "bg-status-idle",
};

/** The run's SDLC lifecycle stage (ready for review / approved / in progress / …) rather
 *  than the bare exec status — derived from the agent's real session status when present. */
function RunStageBadge({ run }: { run: Run }) {
  const meta = STAGE_META[runStage(run)] ?? STAGE_META.done;
  return (
    <span
      className={cn(
        "inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
        meta.cls,
      )}
    >
      {meta.label}
    </span>
  );
}

const fmtCost = (v?: number) => (v == null ? "—" : `$${v.toFixed(2)}`);
const fmtDur = (ms?: number) => {
  if (ms == null) return "—";
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
};
const fmtTokens = (n: number) => (n ? n.toLocaleString("en-US") : "—");
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

  // Keep the open drawer synced with the polled data — `openRun` is otherwise a frozen
  // click-time snapshot, so a running run wouldn't fill in (facet, end time) when it
  // completes. Re-resolve it from the latest runs each poll.
  const openRunLive = openRun ? (runs.find((r) => r.id === openRun.id) ?? openRun) : null;

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
                  <th className="px-2 py-2 text-left font-medium">Stage</th>
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
                      <RunStageBadge run={r} />
                    </td>
                    <td className="px-2 py-2 text-muted-foreground" title={r.started_at}>
                      {fmtDateTime(r.started_at)}
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

      {openRunLive && (
        <RunDrawer
          run={openRunLive}
          systemId={systemId}
          siblingRuns={runs}
          observabilityTemplate={observability}
          approvals={approvals}
          onClose={() => setOpenRun(null)}
        />
      )}
    </div>
  );
}

/** The review/approve deep-link an approval gate carries — the agent stamps its own
 *  dashboard URL into `gate.metadata.review_url` (BA: `{DASHBOARD_BASE_URL}/?session=<id>`). */
function gateReviewUrl(g: HITLGate): string | undefined {
  const u = (g.metadata as Record<string, unknown> | undefined)?.review_url;
  return typeof u === "string" && u.length > 0 ? u : undefined;
}

/** The open approval gate (a produced artifact awaiting human sign-off) for a run's work
 *  item, if any — i.e. "this spec is waiting for review right now." */
function reviewGateFor(approvals: HITLGate[] | undefined, run: Run): HITLGate | undefined {
  if (!run.work_item_id) return undefined;
  return (approvals ?? []).find(
    (g) => g.kind === "approval" && g.state === "open" && g.work_item_id === run.work_item_id,
  );
}

function GateRow({ gate: g }: { gate: HITLGate }) {
  const reviewUrl = g.kind === "approval" ? gateReviewUrl(g) : undefined;
  return (
    <div className="rounded-md border border-status-waiting/30 bg-status-waiting/5 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-status-waiting">
          {g.kind}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{fmtTime(g.opened_at)}</span>
      </div>
      <div className="mt-1 line-clamp-2 text-xs text-foreground">{g.prompt}</div>
      <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
        {[workItemLabel(g), g.channel].filter((v) => v && v !== "—").join(" · ")}
      </div>
      {reviewUrl && (
        <a
          href={reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1.5 rounded border border-status-waiting/40 bg-status-waiting/10 px-2 py-1 text-[11px] font-medium text-status-waiting transition-colors hover:bg-status-waiting/20"
        >
          Review &amp; approve in BA
          <ExternalLink className="size-3 shrink-0" />
        </a>
      )}
    </div>
  );
}

function RunDrawer({
  run,
  systemId,
  siblingRuns,
  observabilityTemplate,
  approvals,
  onClose,
}: {
  run: Run;
  systemId: string;
  siblingRuns?: Run[];
  observabilityTemplate?: string;
  approvals?: HITLGate[];
  onClose: () => void;
}) {
  const liveUrl = runObservabilityUrl(observabilityTemplate, run);
  // Is this run's artifact sitting in a human-review gate? If so, deep-link to the agent's
  // own approval screen (BA's "Spec review workspace") so the operator can sign off there.
  const reviewGate = reviewGateFor(approvals, run);
  const reviewUrl = reviewGate ? gateReviewUrl(reviewGate) : undefined;
  // The live deep view only exists *while the run is in flight* — BA streams it from an
  // in-memory bus that's wiped ~5 min after the run finishes (and on restart). Past that,
  // the durable record below is the source of truth. So only offer the live link when running.
  const showLive = run.status === "running" && !!liveUrl;

  // The session's turns (same work item) — a durable timeline of how the spec advanced.
  const turns = (siblingRuns ?? [])
    .filter((r) => r.work_item_id && r.work_item_id === run.work_item_id)
    .sort((a, b) => turnNo(a) - turnNo(b));

  // Live, read-only structural report for the spec's CURRENT state (AC/EARS + lint) —
  // on-demand, spec runs only. Complements the per-run facet, which is historical.
  const sessionId = run.work_item?.id ?? run.work_item_id;
  const isSpec = (run.artifact?.type ?? run.artifact_type) === "spec";
  const { data: specReport } = useQuery({
    queryKey: ["spec-report", systemId, sessionId],
    queryFn: () => getSpecReportFn({ data: { systemId, sessionId: sessionId as string } }),
    enabled: !!sessionId && isSpec,
    staleTime: 60_000,
  });

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
            {(run.artifact?.type ?? run.artifact_type) && (
              <Tag>→ {run.artifact?.type ?? run.artifact_type}</Tag>
            )}
            <Tag>
              <span
                className={(STAGE_META[runStage(run)] ?? STAGE_META.done).cls
                  .split(" ")
                  .find((c) => c.startsWith("text-"))}
              >
                {(STAGE_META[runStage(run)] ?? STAGE_META.done).label}
              </span>
            </Tag>
            <Tag>{fmtDur(run.duration_ms)}</Tag>
            <Tag>{fmtTokens((run.tokens_in ?? 0) + (run.tokens_out ?? 0))} tok</Tag>
            <Tag>{fmtCost(run.cost_usd)}</Tag>
            {run.model && <Tag>{run.model}</Tag>}
          </div>
        </div>

        <div className="space-y-5 p-5">
          {run.error && (
            <div className="rounded-md border border-status-error/30 bg-status-error/5 p-3 text-xs text-status-error">
              {run.error}
            </div>
          )}

          {showLive ? (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground transition-colors hover:bg-primary/10"
            >
              <span>
                <span className="font-medium">Open this run live in Flow Observer</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Step-by-step trace, supervisor graph, and token stream — live while it runs.
                </span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-primary" />
            </a>
          ) : liveUrl ? (
            <div className="rounded-md border border-border bg-white/[0.02] p-3 text-[11px] text-muted-foreground">
              The live Flow Observer view exists only while a run is in progress (the agent streams
              it in real time, then it expires). This run has finished — its durable record is
              below.
            </div>
          ) : null}

          {/* Waiting on a human: the produced artifact is in a review gate → deep-link to the
              agent's own approval screen so the operator can approve / request changes. */}
          {reviewUrl && (
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-md border border-status-waiting/40 bg-status-waiting/10 p-3 text-xs text-foreground transition-colors hover:bg-status-waiting/20"
            >
              <span>
                <span className="font-medium text-status-waiting">Waiting for review</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Open the agent's dashboard to approve the spec or request changes.
                </span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-status-waiting" />
            </a>
          )}

          {/* Artifact facet — the per-agent craft + focus metrics, from the typed
              run.artifact.facet (spec → SpecCard; anything else → generic fallback). */}
          <FacetPanel run={run} />

          {/* Live, read-only report for the CURRENT spec (on-demand from the agent). */}
          <LiveSpecReport report={specReport as SpecReport | null | undefined} />

          {/* Session turns — durable timeline of the spec's autospec iterations */}
          {turns.length > 1 && (
            <section>
              <SectionLabel>Session turns ({turns.length})</SectionLabel>
              <div className="space-y-1">
                {turns.map((t) => (
                  <TurnRow key={t.id} turn={t} current={t.id === run.id} />
                ))}
              </div>
            </section>
          )}

          {/* Details */}
          <section>
            <SectionLabel>Details</SectionLabel>
            <dl className="space-y-1 text-xs">
              <Row k="Started" v={run.started_at} />
              <Row k="Ended" v={run.ended_at ?? "—"} />
              {(run.work_item?.id ?? run.work_item_id) && (
                <Row k="Work item" v={(run.work_item?.id ?? run.work_item_id) as string} />
              )}
              {run.project && <Row k="Project" v={run.project.name} />}
            </dl>
          </section>
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

// --- Artifact facet renderers ------------------------------------------------
// Registry: each artifact kind gets a bespoke card; unknown kinds fall back to a
// generic key/value list so any agent still renders. Add a role = add a case here.

/** Per-agent craft + focus metrics from the typed `run.artifact.facet`. */
function FacetPanel({ run }: { run: Run }) {
  const facet = run.artifact?.facet;
  if (!facet) return null;
  if (facet.kind === "spec") {
    return (
      <section>
        <SectionLabel>Spec quality</SectionLabel>
        <SpecCard facet={facet} run={run} />
      </section>
    );
  }
  return (
    <section>
      <SectionLabel>{facet.kind} metrics</SectionLabel>
      <AnyFacetCard facet={facet} />
    </section>
  );
}

/** BA's spec quality — structural-first: the V1–V9 gate is the headline; the
 *  6-dimension readout is a structurally-derived signal, not LLM-judged. */
function SpecCard({ facet, run }: { facet: SpecFacet; run: Run }) {
  const before = completenessMap(run.metadata?.completeness_before);
  const after = facet.dimensions ?? completenessMap(run.metadata?.completeness_after);
  const cAfter = facet.completeness ?? avgOf(after);
  const s = facet.structural;
  const gatePass = !!s && s.total != null && s.passed === s.total;
  const missing = facet.missing_sections ?? [];
  const valErrors = facet.validation_errors ?? [];
  // Structural quality is persisted when the turn COMPLETES — a running run has none yet.
  const hasAny =
    (!!s && (s.passed != null || s.total != null)) ||
    Object.keys(after).length > 0 ||
    facet.completeness != null ||
    facet.ears_coverage != null ||
    missing.length > 0 ||
    valErrors.length > 0;
  if (!hasAny) {
    return (
      <div className="text-[11px] text-muted-foreground">
        {run.status === "running"
          ? "In progress — structural quality is recorded when the turn completes."
          : "No structural data recorded for this run."}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {s && (s.passed != null || s.total != null) && (
        <div
          className={cn(
            "flex items-center justify-between rounded-md border p-3",
            gatePass
              ? "border-status-done/30 bg-status-done/5"
              : "border-status-waiting/30 bg-status-waiting/5",
          )}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Structural gate (V1–V9)
            </div>
            <div className="mt-0.5 text-sm font-semibold">
              {s.passed ?? 0} / {s.total ?? 0} checks passed
            </div>
          </div>
          {gatePass ? (
            <CheckCircle2 className="size-5 shrink-0 text-status-done" />
          ) : (
            <AlertTriangle className="size-5 shrink-0 text-status-waiting" />
          )}
        </div>
      )}

      {facet.ears_coverage != null && (
        <div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>EARS coverage</span>
            <span className="font-mono">{Math.round(facet.ears_coverage)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-primary/60"
              style={{ width: `${Math.max(0, Math.min(100, facet.ears_coverage))}%` }}
            />
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Missing sections:</span>
          {missing.map((m) => (
            <span
              key={m}
              className="rounded border border-status-waiting/30 bg-status-waiting/10 px-1.5 py-0.5 text-[10px] text-status-waiting"
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {(Object.keys(after).length > 0 || Object.keys(before).length > 0) && (
        <div>
          <SectionLabel>
            Dimensions (structural){cAfter != null ? ` · ${Math.round(cAfter)}%` : ""}
          </SectionLabel>
          <div className="space-y-2">
            {Object.entries(COMPLETENESS_LABELS).map(([dim, label]) =>
              after[dim] == null && before[dim] == null ? null : (
                <CompletenessRow key={dim} label={label} before={before[dim]} after={after[dim]} />
              ),
            )}
          </div>
        </div>
      )}

      {(facet.completion_reason || facet.finalize_method || !!facet.decisions) && (
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          {facet.completion_reason && <Tag>{facet.completion_reason.replace(/_/g, " ")}</Tag>}
          {facet.finalize_method && <Tag>finalize: {facet.finalize_method}</Tag>}
          {!!facet.decisions && <Tag>{facet.decisions} decisions</Tag>}
        </div>
      )}

      {valErrors.length > 0 && (
        <div>
          <SectionLabel>Validation ({valErrors.length})</SectionLabel>
          <ul className="space-y-1">
            {valErrors.map((e, i) => (
              <li
                key={i}
                className="rounded border border-status-error/25 bg-status-error/5 px-2 py-1 font-mono text-[11px] text-status-error/90"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Generic fallback — lists an artifact facet's scalar fields, so an agent without a
 *  bespoke card still renders something useful. */
function AnyFacetCard({ facet }: { facet: ArtifactFacet }) {
  const src: Record<string, unknown> =
    facet.kind === "generic" ? (facet.values ?? {}) : (facet as unknown as Record<string, unknown>);
  const entries = Object.entries(src).filter(
    ([k, v]) =>
      k !== "kind" && (typeof v === "string" || typeof v === "number" || typeof v === "boolean"),
  );
  if (!entries.length) return null;
  return (
    <dl className="space-y-1 text-xs">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-3">
          <dt className="w-32 shrink-0 font-mono text-muted-foreground">{k.replace(/_/g, " ")}</dt>
          <dd className="min-w-0 flex-1 break-words font-mono text-foreground/90">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Live, read-only structural report for the CURRENT spec (agent's /structured-ac + /lint).
 *  Distinct from the per-run facet above — that's the historical record; this is now. */
function LiveSpecReport({ report }: { report?: SpecReport | null }) {
  if (!report) return null;
  const weak = report.weak_criteria ?? [];
  const warnings = report.lint_warnings ?? [];
  const acTotal = report.ac_total ?? 0;
  // The coverage % is a summary — it lives on the SpecCard above. This section is the
  // DETAIL: the acceptance-criteria count, which ACs aren't EARS, and lint. Nothing to
  // drill into yet (e.g. an in-progress spec) → hide.
  if (!acTotal && !weak.length && !warnings.length) return null;
  return (
    <section>
      <SectionLabel>Live spec report · current</SectionLabel>
      <div className="space-y-3 rounded-md border border-border bg-white/[0.02] p-3">
        {acTotal > 0 && (
          <div className="text-[11px] text-muted-foreground">{acTotal} acceptance criteria</div>
        )}
        {weak.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Not in EARS form ({weak.length})
            </div>
            <ul className="space-y-1">
              {weak.map((c, i) => (
                <li
                  key={i}
                  className="line-clamp-2 rounded border border-border bg-white/[0.02] px-2 py-1 text-[11px] text-muted-foreground"
                >
                  {c.raw}
                </li>
              ))}
            </ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Lint ({warnings.length}
              {report.lines_scanned ? ` · ${report.lines_scanned} lines` : ""})
            </div>
            <ul className="space-y-1">
              {warnings.map((w, i) => (
                <li
                  key={i}
                  className="rounded border border-status-waiting/20 bg-status-waiting/5 px-2 py-1 text-[11px]"
                >
                  <span className="text-status-waiting/90">{w.issue}</span>
                  {w.suggestion && (
                    <span className="block text-[10px] text-muted-foreground">
                      → {w.suggestion}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

const COMPLETENESS_LABELS: Record<string, string> = {
  user_roles: "User roles",
  business_rules: "Business rules",
  acceptance_criteria: "Acceptance criteria",
  scope_boundaries: "Scope boundaries",
  error_handling: "Error handling",
  data_model: "Data model",
};

/** Pull the numeric dimensions out of a completeness map (ignores non-numbers). */
function completenessMap(v: unknown): Record<string, number> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "number") out[k] = val;
  }
  return out;
}

function avgOf(m: Record<string, number>): number | undefined {
  const vals = Object.values(m);
  return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : undefined;
}

function turnNo(r: Run): number {
  const n = r.metadata?.run_number;
  return typeof n === "number" ? n : 0;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

/** One completeness dimension: before→after with a delta + an overlaid bar (faint =
 *  before, solid = after). All from persisted run metrics, so it survives restarts. */
function CompletenessRow({
  label,
  before,
  after,
}: {
  label: string;
  before?: number;
  after?: number;
}) {
  const filled = after ?? before ?? 0;
  const delta = before != null && after != null ? after - before : undefined;
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between font-mono text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {before ?? "—"} → {after ?? "—"}
          {delta != null && delta !== 0 && (
            <span className={cn("ml-1", delta > 0 ? "text-status-done" : "text-status-error")}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
        {before != null && (
          <div
            className="absolute h-full rounded-full bg-white/15"
            style={{ width: `${clamp(before)}%` }}
          />
        )}
        <div
          className="absolute h-full rounded-full bg-primary/70"
          style={{ width: `${clamp(filled)}%` }}
        />
      </div>
    </div>
  );
}

/** One autospec turn in the session's durable timeline. */
function TurnRow({ turn, current }: { turn: Run; current: boolean }) {
  const b = avgOf(completenessMap(turn.metadata?.completeness_before));
  const a = avgOf(completenessMap(turn.metadata?.completeness_after));
  const n = turnNo(turn);
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded px-2 py-1.5 text-[11px]",
        current ? "border border-primary/40 bg-primary/5" : "border border-border",
      )}
    >
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/5 font-mono text-[10px] text-muted-foreground">
        {n || "•"}
      </span>
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          turn.status === "running"
            ? "bg-status-running dot-pulse"
            : turn.status === "failed"
              ? "bg-status-error"
              : "bg-status-done",
        )}
      />
      <span className="font-mono text-foreground/80">{turn.status}</span>
      <span className="ml-auto truncate font-mono text-muted-foreground">
        {b != null || a != null ? `${b ?? "—"}→${a ?? "—"}%` : ""}
        {turn.duration_ms != null ? ` · ${fmtDur(turn.duration_ms)}` : ""}
      </span>
    </div>
  );
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
