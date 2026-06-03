import { useMemo, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Check, X, AlertOctagon, ChevronRight, ChevronDown, Moon,
  GitPullRequest, Wrench, Activity, Server,
} from "lucide-react";
import { agents as allAgents } from "@/mock/agents";
import type { AgentId, Agent } from "@/mock/types";
import {
  buildRuns, invocationsSeries, acceptanceSeries, latencyHistogram,
  tokenCostSeries, overnightHistory, type AgentRun, type RunStep,
} from "@/mock/runs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agents/$agentId")({
  loader: ({ params }) => {
    const agent = allAgents.find((a) => a.id === params.agentId);
    if (!agent) throw notFound();
    return { agent };
  },
  component: AgentDeepDive,
});

function AgentDeepDive() {
  const { agent } = Route.useLoaderData();
  const a = agent as Agent;
  const color = `var(--${a.color})`;
  const [variant, setVariant] = useState<"All" | "Backend" | "Frontend" | "Mobile">("All");
  const [openRun, setOpenRun] = useState<AgentRun | null>(null);

  const runs = useMemo(() => {
    const r = buildRuns(a.id);
    return a.id === "dev" && variant !== "All" ? r.filter((x) => x.variant === variant) : r;
  }, [a.id, variant]);

  const invSeries = useMemo(() => invocationsSeries(a.id), [a.id]);
  const accSeries = useMemo(() => acceptanceSeries(a.id), [a.id]);
  const latData   = useMemo(() => latencyHistogram(a.id), [a.id]);
  const costData  = useMemo(() => tokenCostSeries(a.id), [a.id]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="glass-panel p-5 flex items-center gap-4 flex-wrap" style={{ borderColor: `color-mix(in oklab, ${color} 40%, transparent)` }}>
        <div className="size-12 rounded-xl grid place-items-center text-lg font-semibold"
             style={{ background: `color-mix(in oklab, ${color} 20%, transparent)`, color, boxShadow: `inset 0 0 0 1px ${color}` }}>
          {a.name.split(" ").map((w) => w[0]).join("").slice(0,2)}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">agent</div>
          <div className="text-xl font-semibold truncate">{a.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{a.role}</div>
        </div>
        <div className="ml-auto grid grid-cols-3 gap-2 text-[11px] font-mono">
          <Meta label="engine"  value={a.engine} />
          <Meta label="prompt"  value={`${a.id}.prompt v${(a.id.charCodeAt(0) % 6) + 1}`} />
          <Meta label="state"   value={a.state} tone={a.state === "running" ? "text-status-running" : a.state === "waiting" ? "text-status-waiting" : a.state === "error" ? "text-status-error" : "text-muted-foreground"} />
        </div>
      </div>

      {/* Dev variant tabs */}
      {a.id === "dev" && (
        <div className="flex items-center gap-1 text-xs">
          {(["All","Backend","Frontend","Mobile"] as const).map((v) => (
            <button key={v} onClick={() => setVariant(v)}
              className={cn("px-3 py-1.5 rounded-full border font-mono",
                variant === v ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-foreground")}>
              {v}
            </button>
          ))}
        </div>
      )}

      {/* Metric panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartPanel title="Invocations · last 24h" sub={`${invSeries.reduce((s, x) => s + x.runs, 0)} runs`}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={invSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${a.id}-inv`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="h" interval={3} stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="runs" stroke={color} strokeWidth={2} fill={`url(#g-${a.id}-inv)`} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Acceptance vs rejection" sub={`${a.successRate}% success · last 14d`}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={accSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<DarkTooltip />} />
              <Line type="monotone" dataKey="accepted" stroke="var(--status-done)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rejected" stroke="var(--status-error)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Latency distribution" sub={`p95 ≈ ${Math.round(a.latencyMs / 1000)}s`}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={latData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="count" fill={color} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Token cost · cloud vs local" sub={`$${a.tokenCostToday.toFixed(2)} today`}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={costData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="cloud" stackId="1" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
              <Area type="monotone" dataKey="local" stackId="1" stroke="var(--agent-curator)" fill="var(--agent-curator)" fillOpacity={0.35} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {/* Dev-only Overnight panel */}
      {a.id === "dev" && <OvernightPanel />}

      {/* Recent runs table */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">trace · langfuse-style</div>
            <div className="text-sm font-semibold">Recent runs</div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">{runs.length} runs</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 pl-1">run</th>
                <th className="text-left">ticket</th>
                <th className="text-left">started</th>
                <th className="text-left">duration</th>
                <th className="text-left">tokens</th>
                <th className="text-left">model</th>
                {a.id === "dev" && <th className="text-left">variant</th>}
                <th className="text-left">outcome</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}
                    onClick={() => setOpenRun(r)}
                    className="border-b border-border/60 hover:bg-white/[0.03] cursor-pointer">
                  <td className="py-2 pl-1 text-muted-foreground">{r.id}</td>
                  <td className="text-foreground">{r.ticketId}</td>
                  <td className="text-muted-foreground">{r.startedOffsetMin}m ago</td>
                  <td className="text-muted-foreground">{fmtDur(r.durationMs)}</td>
                  <td className="text-muted-foreground">{r.tokens.toLocaleString()}</td>
                  <td className="text-muted-foreground">{r.model}</td>
                  {a.id === "dev" && <td><span className="text-[10px] px-1.5 py-0.5 border border-border rounded text-muted-foreground">{r.variant}</span></td>}
                  <td><OutcomePill outcome={r.outcome} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openRun && <TraceDrawer run={openRun} agentColor={color} onClose={() => setOpenRun(null)} />}
    </div>
  );
}

function Meta({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-border rounded px-2 py-1.5 min-w-[120px]">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("truncate text-foreground/90", tone)}>{value}</div>
    </div>
  );
}

function ChartPanel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{title}</div>
        {sub && <div className="text-[10px] text-muted-foreground font-mono">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel p-2 text-[11px] font-mono">
      <div className="text-muted-foreground mb-1">{label}</div>
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

function OutcomePill({ outcome }: { outcome: AgentRun["outcome"] }) {
  const map = {
    approved: { i: Check, t: "text-status-done border-status-done/40 bg-status-done/10", l: "approved" },
    rejected: { i: X, t: "text-status-waiting border-status-waiting/40 bg-status-waiting/10", l: "rejected" },
    error:    { i: AlertOctagon, t: "text-status-error border-status-error/40 bg-status-error/10", l: "error" },
  } as const;
  const m = map[outcome];
  const I = m.i;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border", m.t)}>
      <I className="size-3" /> {m.l}
    </span>
  );
}

function fmtDur(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

/* ----- trace drawer ----- */

function TraceDrawer({ run, agentColor, onClose }: { run: AgentRun; agentColor: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] h-full glass-panel rounded-none border-l border-primary/30 overflow-y-auto scrollbar-thin anim-in"
        style={{ animation: "slide-in-down 0.25s ease-out both" }}
      >
        <div className="p-5 border-b border-border sticky top-0 bg-panel/90 backdrop-blur z-10">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">run trace</div>
              <div className="font-mono text-sm truncate">{run.id}</div>
            </div>
            <button onClick={onClose} className="size-8 rounded grid place-items-center hover:bg-white/5 cursor-pointer">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-mono">
            <span className="border border-border rounded px-1.5 py-0.5">ticket · <span className="text-foreground">{run.ticketId}</span></span>
            <span className="border border-border rounded px-1.5 py-0.5">duration · {fmtDur(run.durationMs)}</span>
            <span className="border border-border rounded px-1.5 py-0.5">{run.tokens.toLocaleString()} tokens</span>
            <span className="border border-border rounded px-1.5 py-0.5">{run.model}</span>
            <OutcomePill outcome={run.outcome} />
          </div>
        </div>

        <div className="p-5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">step tree</div>
          <div className="space-y-1.5">
            {run.trace.map((s) => <Step key={s.id} step={s} color={agentColor} depth={0} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ step, color, depth }: { step: RunStep; color: string; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasKids = !!step.children?.length;
  const Toggle = open ? ChevronDown : ChevronRight;
  return (
    <div className="border-l-2" style={{ borderColor: `color-mix(in oklab, ${color} 35%, transparent)`, paddingLeft: 10 }}>
      <button
        onClick={() => (hasKids || step.input || step.output) && setOpen(!open)}
        className="w-full text-left flex items-center gap-1.5 py-1.5 rounded hover:bg-white/[0.03] cursor-pointer"
      >
        <Toggle className="size-3 text-muted-foreground shrink-0" />
        <span className="text-[13px] text-foreground/90 truncate">{step.name}</span>
        {step.tool && <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1">{step.tool}</span>}
        <span className="ml-auto text-[10px] font-mono text-muted-foreground shrink-0">
          {fmtDur(step.durationMs)}{step.tokens ? ` · ${step.tokens.toLocaleString()}t` : ""}
        </span>
      </button>
      {open && (
        <div className="ml-2 mb-1.5 space-y-1">
          {step.input && (
            <div className="text-[11px] font-mono bg-white/[0.02] border border-border rounded p-2">
              <div className="text-muted-foreground mb-0.5">input</div>
              <div className="text-foreground/80 whitespace-pre-wrap">{step.input}</div>
            </div>
          )}
          {step.output && (
            <div className="text-[11px] font-mono bg-white/[0.02] border border-border rounded p-2">
              <div className="text-muted-foreground mb-0.5">output</div>
              <div className="text-foreground/80 whitespace-pre-wrap">{step.output}</div>
            </div>
          )}
          {hasKids && (
            <div className="space-y-1.5 mt-1.5">
              {step.children!.map((c) => <Step key={c.id} step={c} color={color} depth={depth + 1} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ----- overnight (dev only) ----- */

function OvernightPanel() {
  const rows = overnightHistory();
  const totalTickets = rows.reduce((s, r) => s + r.tickets, 0);
  const totalPRs = rows.reduce((s, r) => s + r.prs, 0);
  const totalGpu = rows.reduce((s, r) => s + r.gpuHours, 0).toFixed(1);
  const totalHeal = rows.reduce((s, r) => s + r.healerFixes, 0);

  return (
    <div className="glass-panel p-4 border-primary/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Moon className="size-4 text-primary" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">overnight</div>
            <div className="text-sm font-semibold">Ralph Wiggum loop · last 10 nights</div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">2×H200 · 22:00–06:00 UTC</div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <Summary icon={GitPullRequest} label="PRs opened" value={String(totalPRs)} tone="text-status-done" />
        <Summary icon={Activity}       label="Tickets processed" value={String(totalTickets)} tone="text-foreground" />
        <Summary icon={Wrench}         label="Healer fixes" value={String(totalHeal)} tone="text-status-waiting" />
        <Summary icon={Server}         label="GPU hours" value={`${totalGpu}h`} tone="text-primary" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left py-1.5">night</th>
              <th className="text-left">tickets</th>
              <th className="text-left">PRs</th>
              <th className="text-left">tests passing</th>
              <th className="text-left">healer fixes</th>
              <th className="text-left">GPU hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.night} className="border-b border-border/40">
                <td className="py-1.5 text-muted-foreground">{r.night}</td>
                <td>{r.tickets}</td>
                <td className="text-status-done">{r.prs}</td>
                <td>{r.testsPass}</td>
                <td className="text-status-waiting">{r.healerFixes}</td>
                <td className="text-primary">{r.gpuHours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({ icon: I, label, value, tone }: { icon: any; label: string; value: string; tone?: string }) {
  return (
    <div className="border border-border rounded p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <I className="size-3" /> {label}
      </div>
      <div className={cn("text-lg font-semibold font-mono mt-0.5", tone)}>{value}</div>
    </div>
  );
}
