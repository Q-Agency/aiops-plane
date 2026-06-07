import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  PlugZap,
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  CircleHelp,
  Cpu,
  DollarSign,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { runObservabilityUrl } from "@/lib/flow-link";
import { fmtClock, fmtDateTime, fmtTime } from "@/lib/time";

import type {
  AgentEvent,
  AgentHealth,
  AgentState,
  HITLGate,
  LifecycleStage,
  Run,
  RunStatus,
} from "@/contract";
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

const fmtCost = (v?: number) => (v == null ? "—" : `$${v.toFixed(2)}`);
const fmtDur = (ms?: number) => {
  if (ms == null) return "—";
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
};
const tokenSum = (a?: number, b?: number) => (a ?? 0) + (b ?? 0);
// Prefer the human task name; fall back to the work-item id (often a raw UUID).
const workItemLabel = (x: { work_item_title?: string; work_item_id?: string }) =>
  x.work_item_title || x.work_item_id || "—";

// --- KPI trends (all from the runs ledger; deterministic — anchored to the latest run,
//     never Date.now(), so SSR and client agree) ------------------------------------
const DAY_MS = 86_400_000;
const isTerminal = (r: Run) => r.status === "succeeded" || r.status === "failed";

/** Latest run time as a stable "now" anchor; null if no parseable runs. */
function anchorMs(runs: Run[]): number | null {
  let max = -Infinity;
  for (const r of runs) {
    const t = Date.parse(r.started_at);
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max === -Infinity ? null : max;
}

/** Per-day sum of `pick` over the last `days`, oldest→newest. */
function dailySeries(
  runs: Run[],
  anchor: number,
  days: number,
  pick: (r: Run) => number,
): number[] {
  const endDay = Math.floor(anchor / DAY_MS);
  const out = new Array<number>(days).fill(0);
  for (const r of runs) {
    const t = Date.parse(r.started_at);
    if (Number.isNaN(t)) continue;
    const idx = days - 1 - (endDay - Math.floor(t / DAY_MS));
    if (idx >= 0 && idx < days) out[idx] += pick(r);
  }
  return out;
}

/** Count/sum of `pick` within the last `win` days of the anchor. */
function windowSum(runs: Run[], anchor: number, win: number, pick: (r: Run) => number): number {
  const start = anchor - win * DAY_MS;
  let s = 0;
  for (const r of runs) {
    const t = Date.parse(r.started_at);
    if (!Number.isNaN(t) && t > start) s += pick(r);
  }
  return s;
}

/** % change of `pick`-sum: last `win` days vs the prior `win` days. null if no baseline. */
function windowDelta(
  runs: Run[],
  anchor: number,
  win: number,
  pick: (r: Run) => number,
): number | null {
  const cur = windowSum(runs, anchor, win, pick);
  const prev = windowSum(runs, anchor, 2 * win, pick) - cur; // prior window = [2w, w) ago
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${95 - ((v - min) / range) * 90}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("h-5 w-full", className)}>
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** WoW delta chip. `goodDown` flips the color (for cost/latency, a drop is good). */
function Delta({ pct, goodDown }: { pct: number | null; goodDown?: boolean }) {
  if (pct == null || !Number.isFinite(pct) || Math.round(pct) === 0) return null;
  const up = pct > 0;
  const good = goodDown ? !up : up;
  return (
    <span className={cn("font-mono text-[10px]", good ? "text-status-done" : "text-status-error")}>
      {up ? "▲" : "▼"}
      {Math.abs(Math.round(pct))}%
    </span>
  );
}

type Props = {
  fleet: AgentHealth[];
  runs: Run[];
  approvals: HITLGate[];
  events: AgentEvent[];
  observability: Record<string, string>;
};

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
  const { fleet, runs, approvals, events, observability } = data;

  if (fleet.length === 0) return <EmptyFleet />;

  const terminal = runs.filter((r) => r.status === "succeeded" || r.status === "failed");
  const succeeded = runs.filter((r) => r.status === "succeeded").length;
  const successRate = terminal.length ? Math.round((succeeded / terminal.length) * 100) : null;
  const totalCost = runs.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const totalTokens = runs.reduce((s, r) => s + tokenSum(r.tokens_in, r.tokens_out), 0);
  const activeRuns = fleet.reduce((n, a) => n + (a.active_runs ?? 0), 0);
  const healthy = fleet.filter((a) => a.healthy).length;

  // KPI trends, all derived from the runs ledger (anchored to the latest run → deterministic).
  const anchor = anchorMs(runs);
  const costSeries = anchor != null ? dailySeries(runs, anchor, 14, (r) => r.cost_usd ?? 0) : [];
  const costDelta = anchor != null ? windowDelta(runs, anchor, 7, (r) => r.cost_usd ?? 0) : null;
  const tputSeries = anchor != null ? dailySeries(terminal, anchor, 14, () => 1) : [];
  const tput7d = anchor != null ? windowSum(terminal, anchor, 7, () => 1) : terminal.length;
  const tputDelta = anchor != null ? windowDelta(terminal, anchor, 7, () => 1) : null;
  const durRuns = terminal.filter((r) => r.duration_ms != null);
  const avgDurMs = durRuns.length
    ? durRuns.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / durRuns.length
    : undefined;

  return (
    <div className="grid gap-4 p-4 lg:gap-5 lg:p-6 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-4 lg:space-y-5">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi
            label="Active specs"
            value={String(activeRuns)}
            sub="in progress"
            accent={activeRuns > 0}
            icon={<Activity className="size-3.5" />}
            help="Artifacts the fleet is working on right now — runs in progress across all agents, scoped to the selected project. This is live state (what's happening now), not a running total."
          />
          <Kpi
            label="Success"
            value={successRate == null ? "—" : `${successRate}%`}
            sub={`${terminal.length} done`}
            icon={<CheckCircle2 className="size-3.5" />}
            help="Of the runs that have finished, the share that succeeded (succeeded ÷ all finished runs). A failed run is one the agent couldn't complete — not one a human rejected."
          />
          <Kpi
            label="Throughput"
            value={String(tput7d)}
            sub="last 7d"
            delta={{ pct: tputDelta }}
            series={tputSeries}
            icon={<TrendingUp className="size-3.5" />}
            help="Runs completed in the last 7 days. The sparkline is the daily trend; the chip is the change versus the previous 7 days (up is good)."
          />
          <Kpi
            label="Avg run"
            value={fmtDur(avgDurMs)}
            sub="per turn"
            icon={<Clock className="size-3.5" />}
            help="Average wall-clock duration of one finished run — i.e. a single autospec turn. A spec usually takes several turns, so this is per-turn, not the whole spec's cycle time."
          />
          <Kpi
            label="Cost"
            value={fmtCost(totalCost)}
            sub={totalTokens ? `${Math.round(totalTokens / 1000)}k tok` : undefined}
            delta={{ pct: costDelta, goodDown: true }}
            series={costSeries}
            icon={<DollarSign className="size-3.5" />}
            help="Total LLM spend across the runs shown (project-scoped). The sub-line is total tokens. Sparkline = daily spend; the chip compares the last 7 days to the prior 7 (a drop is green)."
          />
          <Kpi
            label="Connected"
            value={String(fleet.length)}
            sub={`${healthy} healthy`}
            icon={<Cpu className="size-3.5" />}
            help="Agents registered in the control plane and reachable through the gateway, and how many currently report healthy. Today that's the BA agent; more join the fleet here."
          />
        </section>

        <LifecycleFlow runs={runs} approvals={approvals} events={events} />

        <section>
          <SectionHead>Agent status</SectionHead>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fleet.map((a) => (
              <AgentCard
                key={a.agent_id}
                agent={a}
                runs={runs.filter((r) => r.agent_id === a.agent_id)}
                observabilityTemplate={observability[a.agent_id]}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHead icon={<Activity className="size-3.5" />}>
            Work items{fleet.length > 1 ? " · fleet" : ""}
          </SectionHead>
          {runs.length === 0 ? (
            <Empty>No work items yet.</Empty>
          ) : (
            <WorkItemsTable runs={runs} approvals={approvals} fleet={fleet} />
          )}
        </section>
      </div>

      <aside className="min-w-0 space-y-4 self-start lg:space-y-5 xl:sticky xl:top-4">
        <ApprovalsQueue approvals={approvals} />
        <ActivityFeed
          runs={runs}
          approvals={approvals}
          events={events}
          fleet={fleet}
          updatedAt={dataUpdatedAt}
        />
      </aside>
    </div>
  );
}

function AgentCard({
  agent: a,
  runs,
  observabilityTemplate,
}: {
  agent: AgentHealth;
  runs: Run[];
  observabilityTemplate?: string;
}) {
  const terminal = runs.filter((r) => r.status === "succeeded" || r.status === "failed");
  const succeeded = runs.filter((r) => r.status === "succeeded").length;
  const pct = terminal.length ? Math.round((succeeded / terminal.length) * 100) : null;
  // BA runs many specs at once — show the concurrency, not just the first.
  const runningRuns = runs.filter((r) => r.status === "running");
  const lastDone = runs.find(isTerminal); // runs are newest-first → most recent artifact
  const workingLabel =
    runningRuns.length === 0
      ? lastDone
        ? `last · ${workItemLabel(lastDone)}`
        : "—"
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
                    {runningRuns.map((r) => {
                      const live = runObservabilityUrl(observabilityTemplate, r);
                      return (
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
                          {live && (
                            <a
                              href={live}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open this run live in Flow Observer"
                              className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
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

/** A "?" that reveals a short explanation on hover (styled + immediate; not a native
 *  title). The popover is portalled to <body> and fixed-positioned by the icon's coords,
 *  so it escapes the tile's `backdrop-filter` stacking context + any `overflow` clipping
 *  — it always renders on top, never cut off by the menu or adjacent panels. */
function HelpTip({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  };

  return (
    <span
      ref={ref}
      className="ml-auto inline-flex shrink-0"
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
    >
      <CircleHelp className="size-3 cursor-help text-muted-foreground/40 transition-colors hover:text-muted-foreground" />
      {pos &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: pos.top, right: pos.right }}
            className="pointer-events-none fixed z-[200] w-56 max-w-[80vw] rounded-md border border-border bg-panel/95 p-2.5 font-sans text-[11px] font-normal normal-case leading-relaxed tracking-normal text-muted-foreground shadow-xl shadow-black/50 backdrop-blur"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  accent,
  delta,
  series,
  help,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
  delta?: { pct: number | null; goodDown?: boolean };
  series?: number[];
  help?: string;
}) {
  return (
    <div className="glass-panel flex flex-col p-3">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
        {help && <HelpTip text={help} />}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-xl tabular-nums",
            accent ? "text-primary" : "text-foreground",
          )}
        >
          {value}
        </span>
        {delta && <Delta pct={delta.pct} goodDown={delta.goodDown} />}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
      {series && series.length > 1 && (
        <div className={cn("mt-2", accent ? "text-primary/50" : "text-muted-foreground/40")}>
          <Sparkline data={series} />
        </div>
      )}
    </div>
  );
}

/** "Where every spec is right now" — the artifact lifecycle as a live flow, all from BA's
 *  data: running runs → in-progress, gates → waiting/ready, lifecycle events → recent
 *  approved/reset. The same lifecycle generalizes to every agent. */
function LifecycleFlow({
  runs,
  approvals,
  events,
}: {
  runs: Run[];
  approvals: HITLGate[];
  events: AgentEvent[];
}) {
  const inProgress = new Set(
    runs.filter((r) => r.status === "running").map((r) => r.work_item_id ?? r.id),
  ).size;
  const waiting = approvals.filter((g) => g.kind === "clarification").length;
  const ready = approvals.filter((g) => g.kind === "approval").length;
  const stageOf = (e: AgentEvent) =>
    e.type === "lifecycle.changed" ? (e.data?.stage as string | undefined) : undefined;
  const recentApproved = events.filter((e) => stageOf(e) === "approved").length;
  const recentReset = events.filter((e) => stageOf(e) === "reset").length;

  const stages = [
    {
      key: "in_progress",
      label: "In progress",
      count: inProgress,
      dot: "bg-status-running dot-pulse",
      note: "agent working",
    },
    {
      key: "waiting",
      label: "Waiting · human",
      count: waiting,
      dot: "bg-status-waiting",
      note: "blocked on clarification",
    },
    {
      key: "ready",
      label: "Ready · review",
      count: ready,
      dot: "bg-status-done",
      note: "awaiting approval",
    },
  ];

  return (
    <section className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Artifact lifecycle
          </div>
          <div className="mt-0.5 text-sm font-semibold">Where every artifact is right now</div>
        </div>
        {(recentApproved > 0 || recentReset > 0) && (
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-muted-foreground">recent</span>
            {recentApproved > 0 && (
              <span className="text-status-done">▲ {recentApproved} approved</span>
            )}
            {recentReset > 0 && <span className="text-status-error">↺ {recentReset} reset</span>}
          </div>
        )}
      </div>

      <div className="flex items-stretch gap-2">
        {stages.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center gap-2">
            <div className="flex-1 rounded-lg border border-border bg-panel/40 p-3">
              <div className="flex items-center gap-1.5">
                <span className={cn("size-1.5 shrink-0 rounded-full", s.dot)} />
                <span className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </span>
              </div>
              <div className="mt-1.5 font-mono text-2xl tabular-nums">{s.count}</div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{s.note}</div>
            </div>
            {i < stages.length - 1 && (
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/40" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 text-[10px] text-muted-foreground">
        Downstream agents (Software Architect, Dev, QA) extend this same lifecycle as you connect
        them.
      </div>
    </section>
  );
}

const STAGE_BADGE: Record<string, { cls: string; label: string }> = {
  in_progress: {
    cls: "text-status-running border-status-running/40 bg-status-running/10",
    label: "in progress",
  },
  waiting: {
    cls: "text-status-waiting border-status-waiting/40 bg-status-waiting/10",
    label: "waiting · human",
  },
  ready: {
    cls: "text-status-done border-status-done/40 bg-status-done/10",
    label: "ready · review",
  },
  done: { cls: "text-muted-foreground border-border bg-white/5", label: "done" },
  error: { cls: "text-status-error border-status-error/40 bg-status-error/10", label: "error" },
};

function StageBadge({ stage }: { stage: string }) {
  const s = STAGE_BADGE[stage] ?? STAGE_BADGE.done;
  return (
    <span className={cn("inline-block rounded border px-1.5 py-0.5 text-[10px]", s.cls)}>
      {s.label}
    </span>
  );
}

function avgComp(c: unknown): number | undefined {
  if (!c || typeof c !== "object") return undefined;
  const vals = Object.values(c as Record<string, unknown>).filter(
    (v): v is number => typeof v === "number",
  );
  return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : undefined;
}

type WorkItem = {
  id: string;
  title: string;
  agentId: string;
  project?: string;
  stage: string;
  turns: number;
  completeness?: number;
  cost: number;
  lastIso: string;
  lastMs: number;
};

/** Collapse runs (turns) into one row per work item (artifact) — the command-center unit.
 *  Stage: a running turn → in_progress; an open gate on it → waiting/ready; else the latest
 *  turn's outcome (done/error). All from the data already on the page (no new endpoint). */
function buildWorkItems(runs: Run[], approvals: HITLGate[]): WorkItem[] {
  const gateStage = new Map<string, "waiting" | "ready">();
  for (const g of approvals) {
    const wid = g.work_item_id;
    if (!wid) continue;
    if (g.kind === "clarification") gateStage.set(wid, "waiting");
    else if (g.kind === "approval" && !gateStage.has(wid)) gateStage.set(wid, "ready");
  }
  const byItem = new Map<string, Run[]>();
  for (const r of runs) {
    const wid = r.work_item_id ?? r.id;
    const list = byItem.get(wid);
    if (list) list.push(r);
    else byItem.set(wid, [r]);
  }
  const items: WorkItem[] = [];
  for (const [wid, rs] of byItem) {
    const latest = rs.reduce((a, b) =>
      Date.parse(a.started_at) >= Date.parse(b.started_at) ? a : b,
    );
    const running = rs.some((r) => r.status === "running");
    const gate = gateStage.get(wid);
    const stage = running
      ? "in_progress"
      : (gate ?? (latest.status === "failed" ? "error" : "done"));
    const times = rs
      .map((r) => Date.parse(r.ended_at ?? r.started_at))
      .filter((n) => !Number.isNaN(n));
    items.push({
      id: wid,
      title: workItemLabel(latest),
      agentId: latest.agent_id,
      project: latest.project?.name,
      stage,
      turns: rs.length,
      completeness: avgComp(latest.metadata?.completeness_after),
      cost: rs.reduce((s, r) => s + (r.cost_usd ?? 0), 0),
      lastIso: latest.ended_at ?? latest.started_at,
      lastMs: times.length ? Math.max(...times) : 0,
    });
  }
  return items.sort((a, b) => b.lastMs - a.lastMs);
}

function WorkItemsTable({
  runs,
  approvals,
  fleet,
}: {
  runs: Run[];
  approvals: HITLGate[];
  fleet: AgentHealth[];
}) {
  const items = buildWorkItems(runs, approvals);
  const agentName = new Map(fleet.map((a) => [a.agent_id, a.name]));
  return (
    <div className="glass-panel overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-medium">Artifact</th>
            <th className="px-3 py-2 text-left font-medium">Agent</th>
            <th className="px-3 py-2 text-left font-medium">Stage</th>
            <th className="px-3 py-2 text-right font-medium">Turns</th>
            <th className="px-3 py-2 text-right font-medium">Complete</th>
            <th className="px-3 py-2 text-right font-medium">Cost</th>
            <th className="px-3 py-2 text-right font-medium">Last</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {items.slice(0, 20).map((w) => (
            <tr
              key={`${w.agentId}:${w.id}`}
              className="border-b border-border/60 last:border-0 hover:bg-white/[0.02]"
            >
              <td className="max-w-[16rem] px-3 py-2">
                <Link
                  to="/agents/$agentId"
                  params={{ agentId: w.agentId }}
                  className="block min-w-0"
                  title={w.id}
                >
                  <span className="block truncate text-foreground">{w.title}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {w.project ?? "—"}
                  </span>
                </Link>
              </td>
              <td className="max-w-[10rem] truncate px-3 py-2 text-muted-foreground">
                {agentName.get(w.agentId) ?? w.agentId}
              </td>
              <td className="px-3 py-2">
                <StageBadge stage={w.stage} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{w.turns}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {w.completeness != null ? `${w.completeness}%` : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {fmtCost(w.cost)}
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground" title={w.lastIso}>
                {fmtDateTime(w.lastIso)}
              </td>
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
                  {fmtTime(g.opened_at)}
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
  kind: "run" | "approval" | "lifecycle";
  status?: RunStatus;
  stage?: LifecycleStage;
  agent: string;
  message: string;
};

const STAGE_VERB: Partial<Record<LifecycleStage, string>> = {
  reset: "reset the",
  approved: "approved the",
  blocked: "blocked the",
  error: "errored on the",
  ready: "finished the",
  delivered: "delivered the",
};

const STAGE_DOT: Partial<Record<LifecycleStage, string>> = {
  reset: "bg-status-error",
  error: "bg-status-error",
  blocked: "bg-status-waiting",
  approved: "bg-status-done",
  delivered: "bg-status-done",
  ready: "bg-status-running",
};

function activityDot(a: ActivityItem): string {
  if (a.kind === "lifecycle") return (a.stage && STAGE_DOT[a.stage]) || "bg-status-idle";
  if (a.kind === "approval") return "bg-status-waiting";
  return a.status === "succeeded"
    ? "bg-status-done"
    : a.status === "failed"
      ? "bg-status-error"
      : a.status === "running"
        ? "bg-status-running dot-pulse"
        : "bg-status-idle";
}

function buildActivity(
  runs: Run[],
  approvals: HITLGate[],
  events: AgentEvent[],
  fleet: AgentHealth[],
): ActivityItem[] {
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
  // Lifecycle transitions (resets, approvals, …) that aren't runs or gates.
  const fromEvents: ActivityItem[] = events
    .filter((e) => e.type === "lifecycle.changed")
    .map((e) => {
      const d = e.data ?? {};
      const stage = d.stage as LifecycleStage | undefined;
      const title = (d.work_item_title as string) || (d.work_item_id as string) || "";
      const artifact = (d.artifact_type as string) || "artifact";
      const verb = (stage && STAGE_VERB[stage]) || "updated the";
      return {
        ts: e.ts,
        kind: "lifecycle",
        stage,
        agent: nameOf(e.agent_id),
        message: `${verb} ${artifact}${title ? ` · ${title}` : ""}`,
      };
    });
  return [...fromRuns, ...fromGates, ...fromEvents]
    .filter((a) => a.ts)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, 18);
}

function ActivityFeed({
  runs,
  approvals,
  events,
  fleet,
  updatedAt,
}: {
  runs: Run[];
  approvals: HITLGate[];
  events: AgentEvent[];
  fleet: AgentHealth[];
  updatedAt: number;
}) {
  const items = buildActivity(runs, approvals, events, fleet);
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
              <span className={cn("mt-1 size-2 shrink-0 rounded-full", activityDot(a))} />
              <div className="min-w-0 flex-1">
                <div className="text-foreground">
                  <span className="font-medium">{a.agent}</span>{" "}
                  <span className="text-muted-foreground">{a.message}</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">{fmtTime(a.ts)}</div>
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
      Live{mounted && updatedAt ? ` · ${fmtClock(updatedAt)}` : ""}
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
