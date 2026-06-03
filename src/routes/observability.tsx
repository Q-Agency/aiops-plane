import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Moon, AlertOctagon, AlertTriangle, Activity, Server, Gauge,
  GitPullRequest, Wrench, Search, Network, Cpu, DollarSign, Zap,
} from "lucide-react";
import { agents as allAgents, coreAgents } from "@/mock/agents";
import { buildRuns, tokenCostSeries, overnightHistory, type AgentRun } from "@/mock/runs";
import { TraceDrawer, OutcomePill, fmtDur } from "@/components/agents/TraceDrawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/observability")({
  component: ObservabilityView,
});

const noise = (i: number, s: number) => Math.sin(i * 0.6 + s) * 0.5 + Math.cos(i * 1.1 + s) * 0.3;

function ObservabilityView() {
  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">aiops</div>
        <h1 className="text-xl font-semibold tracking-tight">Observability</h1>
        <div className="text-xs text-muted-foreground mt-0.5">
          Cost, infra, traces, overnight reports and system health — one telemetry surface.
        </div>
      </div>

      <CostDashboard />
      <InfraPanel />
      <OvernightReport />
      <HealthTimeline />
      <TraceExplorer />
    </div>
  );
}

/* ============ COST ============ */

function CostDashboard() {
  const byAgent = useMemo(() =>
    allAgents.map((a) => ({
      name: a.name.replace(" Agent", "").replace(" Supervisor", ""),
      cost: +a.tokenCostToday.toFixed(2),
      color: `var(--${a.color})`,
    })), []);

  const totalToday = byAgent.reduce((s, a) => s + a.cost, 0);

  const cloudVsLocal = [
    { name: "cloud (Claude/GPT)", value: 86, color: "var(--primary)" },
    { name: "batch API (50% off)", value: 9, color: "var(--agent-sa)" },
    { name: "local vLLM",         value: 5, color: "var(--agent-curator)" },
  ];

  const trend = Array.from({ length: 14 }, (_, i) => ({
    day: `d-${14 - i}`,
    cost: +(totalToday * (0.85 + noise(i, 3) * 0.25)).toFixed(2),
  }));

  return (
    <section className="space-y-3">
      <SectionHeader icon={DollarSign} title="Cost dashboard" sub="last 14d · all agents" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Spend today" value={`$${totalToday.toFixed(2)}`} sub="−4% vs 7d avg" tone="text-foreground" />
        <KpiTile label="Spend this week" value={`$${(totalToday * 6.4).toFixed(0)}`} sub="9 days runway @ burn" tone="text-foreground" />
        <KpiTile label="Batch API savings" value={`$${(totalToday * 1.8).toFixed(2)}`} sub="overnight @ 50% off" tone="text-status-done" icon={Moon} />
        <KpiTile label="Local vLLM offload" value="38%" sub="of curator + tasklist runs" tone="text-agent-curator" icon={Cpu} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px_1fr] gap-3">
        <Panel title="Spend by agent" sub="today · USD">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byAgent} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="cost" radius={[3,3,0,0]}>
                {byAgent.map((a) => <Cell key={a.name} fill={a.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Cloud vs local" sub="share of total spend">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={cloudVsLocal} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                {cloudVsLocal.map((c) => <Cell key={c.name} fill={c.color} />)}
              </Pie>
              <Tooltip content={<DarkTooltip suffix="%" />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid gap-1 text-[11px] font-mono">
            {cloudVsLocal.map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="size-2 rounded-sm" style={{ background: c.color }} />
                <span className="text-muted-foreground flex-1 truncate">{c.name}</span>
                <span>{c.value}%</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Daily trend" sub="last 14d total">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trend-g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<DarkTooltip prefix="$" />} />
              <Area type="monotone" dataKey="cost" stroke="var(--primary)" strokeWidth={2} fill="url(#trend-g)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </section>
  );
}

/* ============ INFRA ============ */

function InfraPanel() {
  const gpus = [
    { name: "H200 · node-0", util: 78, mem: 81 },
    { name: "H200 · node-1", util: 64, mem: 72 },
  ];

  const throughput = Array.from({ length: 30 }, (_, i) => ({
    t: `${i}m`,
    tps: Math.max(80, Math.round(640 + noise(i, 7) * 240)),
  }));

  const queue = Array.from({ length: 30 }, (_, i) => ({
    t: `${i}m`,
    depth: Math.max(0, Math.round(4 + noise(i, 11) * 5)),
  }));

  const dispatches = [
    { name: "ba-agent.api",       ok: 1284, err: 2,  rate: 99.8 },
    { name: "sa-agent.api",       ok: 942,  err: 6,  rate: 99.4 },
    { name: "tasklist-agent.api", ok: 318,  err: 0,  rate: 100  },
    { name: "dev-agent.api",      ok: 41,   err: 1,  rate: 97.6 },
    { name: "review-agent.api",   ok: 187,  err: 4,  rate: 97.9 },
    { name: "qa-agent.api",       ok: 96,   err: 0,  rate: 100  },
  ];

  const grafanaTiles = [
    { label: "queue depth",      value: "4",     tone: "text-foreground" },
    { label: "active runs",      value: "7",     tone: "text-status-running" },
    { label: "p95 latency",      value: "18.4s", tone: "text-foreground" },
    { label: "error rate (1h)",  value: "0.6%",  tone: "text-status-done" },
    { label: "tokens/sec",       value: "642",   tone: "text-foreground" },
    { label: "dispatches (24h)", value: "2.8k",  tone: "text-foreground" },
    { label: "Healer fixes (24h)", value: "9",   tone: "text-status-waiting" },
    { label: "PRs opened (24h)", value: "11",    tone: "text-status-done" },
  ];

  return (
    <section className="space-y-3">
      <SectionHeader icon={Server} title="Infra" sub="2×H200 · vLLM · agent-API gateway" />

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr_1fr] gap-3">
        <Panel title="GPU utilization" sub="H200 cluster">
          <div className="grid grid-cols-2 gap-3">
            {gpus.map((g) => <GpuGauge key={g.name} {...g} />)}
          </div>
        </Panel>

        <Panel title="vLLM throughput" sub="tokens/sec · last 30m">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={throughput} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="t" interval={4} stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<DarkTooltip suffix=" t/s" />} />
              <Line type="monotone" dataKey="tps" stroke="var(--agent-curator)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Queue depth" sub="pending agent invocations">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={queue} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="q-g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--agent-pm)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--agent-pm)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="t" interval={4} stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="depth" stroke="var(--agent-pm)" strokeWidth={2} fill="url(#q-g)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-3">
        <Panel title="Agent-API dispatch health" sub="last 24h · success / error rate per agent endpoint" icon={Network}>
          <div className="space-y-2">
            {dispatches.map((w) => (
              <div key={w.name} className="grid grid-cols-[1fr_60px_60px_80px] gap-2 items-center text-[11px] font-mono">
                <span className="text-foreground/90 truncate">{w.name}</span>
                <span className="text-status-done text-right">{w.ok.toLocaleString()}</span>
                <span className={cn("text-right", w.err > 0 ? "text-status-error" : "text-muted-foreground")}>{w.err}</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${w.rate}%`,
                      background: w.rate >= 99.5 ? "var(--status-done)" : w.rate >= 98 ? "var(--status-waiting)" : "var(--status-error)",
                    }} />
                  </div>
                  <span className="text-muted-foreground w-10 text-right">{w.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Metrics grid" sub="Grafana-style" icon={Gauge}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {grafanaTiles.map((t) => (
              <div key={t.label} className="border border-border rounded p-2.5">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">{t.label}</div>
                <div className={cn("font-mono font-semibold text-base mt-0.5", t.tone)}>{t.value}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function GpuGauge({ name, util, mem }: { name: string; util: number; mem: number }) {
  const data = [{ name: "util", value: util, fill: "var(--primary)" }];
  return (
    <div className="border border-border rounded p-2 relative">
      <div className="text-[10px] font-mono text-muted-foreground truncate">{name}</div>
      <div className="relative h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="65%" outerRadius="100%" barSize={8} data={data} startAngle={210} endAngle={-30}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "rgba(255,255,255,0.05)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <div className="text-xl font-semibold font-mono">{util}%</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">util</div>
          </div>
        </div>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground text-center">mem · {mem}%</div>
    </div>
  );
}

/* ============ OVERNIGHT REPORT ============ */

function OvernightReport() {
  const hist = overnightHistory();
  const lastNight = hist[hist.length - 1];

  const timeline = [
    { t: "22:01", label: "loop started · 4 tickets enqueued", tone: "text-primary" },
    { t: "22:14", label: "AM-150 · scaffolded + first commit", tone: "text-foreground/80" },
    { t: "22:47", label: "AM-150 · CI green, PR #441 opened", tone: "text-status-done" },
    { t: "23:18", label: "AM-141 · Healer repaired 2 selectors", tone: "text-status-waiting" },
    { t: "23:52", label: "AM-149 · tests failed, agent self-heal", tone: "text-status-waiting" },
    { t: "00:36", label: "AM-149 · CI green, PR #442 opened",      tone: "text-status-done" },
    { t: "01:42", label: "AM-147 · context overflow, deferred",    tone: "text-status-error" },
    { t: "03:08", label: "AM-131 · re-run of QA suite passed",     tone: "text-status-done" },
    { t: "05:55", label: "loop wrapped · summary posted to Slack", tone: "text-primary" },
  ];

  return (
    <section className="space-y-3">
      <SectionHeader icon={Moon} title="Overnight run · last night" sub="22:00 → 06:00 UTC · 2×H200" tone="primary" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Tickets attempted" value={String(lastNight.tickets)} tone="text-foreground" icon={Activity} />
        <KpiTile label="PRs created"       value={String(lastNight.prs)}     tone="text-status-done"  icon={GitPullRequest} />
        <KpiTile label="Auto-QA pass rate" value={lastNight.testsPass}        tone="text-status-done"  icon={Zap} />
        <KpiTile label="Healer repairs"    value={String(lastNight.healerFixes)} tone="text-status-waiting" icon={Wrench} />
        <KpiTile label="Total cost"        value={`$${(lastNight.gpuHours * 4.2).toFixed(2)}`} sub={`${lastNight.gpuHours}h GPU`} tone="text-primary" icon={DollarSign} />
      </div>

      <Panel title="Loop iterations" sub="timeline of the overnight batch">
        <ol className="relative border-l border-border ml-2 space-y-2.5">
          {timeline.map((e, i) => (
            <li key={i} className="pl-4 relative">
              <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary" />
              <div className="flex items-baseline gap-2 text-[12px]">
                <span className="font-mono text-muted-foreground w-12 shrink-0">{e.t}</span>
                <span className={cn("font-mono", e.tone)}>{e.label}</span>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </section>
  );
}

/* ============ HEALTH TIMELINE ============ */

function HealthTimeline() {
  // 24 hour-buckets, deterministic incidents
  const incidents = [
    { hourFrom: 1,  spanH: 0.5, kind: "agent error",      detail: "Dev · build failed · TS2345" },
    { hourFrom: 4,  spanH: 1.2, kind: "SLA breach",       detail: "Spec Review · Zlatko · 6h12m" },
    { hourFrom: 8,  spanH: 0.4, kind: "dispatch failure", detail: "review-agent.api · timeout" },
    { hourFrom: 13, spanH: 0.8, kind: "agent error",      detail: "QA · selector drift (healed)" },
    { hourFrom: 17, spanH: 2.0, kind: "SLA breach",       detail: "Dev Review · Marin · 2h" },
    { hourFrom: 21, spanH: 0.6, kind: "agent error",      detail: "BA · rate-limited, retried" },
  ];

  const tone = (kind: string) =>
    kind === "agent error"   ? "bg-status-error/70 border-status-error" :
    kind === "SLA breach"    ? "bg-status-waiting/70 border-status-waiting" :
                               "bg-agent-pm/70 border-agent-pm";
  const icon = (kind: string) =>
    kind === "agent error"   ? AlertOctagon :
    kind === "SLA breach"    ? AlertTriangle :
                               Network;

  return (
    <section className="space-y-3">
      <SectionHeader icon={Activity} title="System health · last 24h" sub="errors · SLA breaches · dispatch failures" />

      <Panel title="" sub="">
        {/* track */}
        <div className="relative h-14 rounded-md border border-border bg-white/[0.02] overflow-hidden">
          {/* hour gridlines */}
          {Array.from({ length: 25 }).map((_, h) => (
            <span key={h} className="absolute top-0 bottom-0 w-px bg-white/[0.04]" style={{ left: `${(h / 24) * 100}%` }} />
          ))}
          {/* incidents */}
          {incidents.map((inc, i) => {
            const I = icon(inc.kind);
            return (
              <div
                key={i}
                title={`${inc.kind} · ${inc.detail}`}
                className={cn("absolute top-2 bottom-2 rounded border flex items-center px-1.5 gap-1 cursor-help hover:brightness-125 transition", tone(inc.kind))}
                style={{
                  left: `${(inc.hourFrom / 24) * 100}%`,
                  width: `${(inc.spanH / 24) * 100}%`,
                  minWidth: 22,
                }}
              >
                <I className="size-3 text-foreground shrink-0" />
                <span className="text-[10px] font-mono text-foreground truncate hidden md:inline">{inc.kind}</span>
              </div>
            );
          })}
        </div>
        {/* hour labels */}
        <div className="mt-1 flex justify-between text-[10px] font-mono text-muted-foreground">
          {[0,3,6,9,12,15,18,21,24].map((h) => <span key={h}>{String(h).padStart(2,"0")}:00</span>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-mono">
          <Legend color="status-error" label="agent error" />
          <Legend color="status-waiting" label="SLA breach" />
          <Legend color="agent-pm" label="dispatch failure" />
        </div>
      </Panel>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-2 rounded-sm" style={{ background: `var(--${color})` }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

/* ============ TRACE EXPLORER ============ */

interface ExplorerRow extends AgentRun {
  agentId: typeof coreAgents[number]["id"] | "curator" | "pm";
  agentName: string;
  agentColor: string;
}

function TraceExplorer() {
  const [agentFilter, setAgentFilter] = useState<"all" | string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "approved" | "rejected" | "error">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ExplorerRow | null>(null);

  const allRows: ExplorerRow[] = useMemo(() => {
    return allAgents.flatMap((a) =>
      buildRuns(a.id).slice(0, 6).map((r) => ({
        ...r,
        agentId: a.id,
        agentName: a.name,
        agentColor: `var(--${a.color})`,
      })),
    ).sort((x, y) => x.startedOffsetMin - y.startedOffsetMin);
  }, []);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (agentFilter !== "all" && r.agentId !== agentFilter) return false;
      if (outcomeFilter !== "all" && r.outcome !== outcomeFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!r.ticketId.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allRows, agentFilter, outcomeFilter, query]);

  return (
    <section className="space-y-3">
      <SectionHeader icon={Search} title="Trace explorer" sub={`${filtered.length} of ${allRows.length} traces · Langfuse-style`} />

      <Panel title="" sub="">
        {/* filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search trace id / ticket…"
              className="w-full bg-white/[0.02] border border-border rounded h-8 pl-7 pr-2 text-xs outline-none focus:border-primary/40"
            />
          </div>
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
                  className="h-8 bg-white/[0.02] border border-border rounded px-2 text-xs font-mono outline-none">
            <option value="all">all agents</option>
            {allAgents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value as any)}
                  className="h-8 bg-white/[0.02] border border-border rounded px-2 text-xs font-mono outline-none">
            <option value="all">all outcomes</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="error">error</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 pl-1">trace</th>
                <th className="text-left">agent</th>
                <th className="text-left">ticket</th>
                <th className="text-left">started</th>
                <th className="text-left">latency</th>
                <th className="text-left">tokens</th>
                <th className="text-left">status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 40).map((r) => (
                <tr key={`${r.agentId}-${r.id}`}
                    onClick={() => setOpen(r)}
                    className="border-b border-border/60 hover:bg-white/[0.03] cursor-pointer">
                  <td className="py-2 pl-1 text-muted-foreground">{r.id}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ background: r.agentColor, boxShadow: `0 0 6px ${r.agentColor}` }} />
                      <span style={{ color: r.agentColor }}>{r.agentName}</span>
                    </span>
                  </td>
                  <td className="text-foreground">{r.ticketId}</td>
                  <td className="text-muted-foreground">{r.startedOffsetMin}m ago</td>
                  <td className="text-muted-foreground">{fmtDur(r.durationMs)}</td>
                  <td className="text-muted-foreground">{r.tokens.toLocaleString()}</td>
                  <td><OutcomePill outcome={r.outcome} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">no traces match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {open && (
        <TraceDrawer
          run={open}
          agentColor={open.agentColor}
          agentName={open.agentName}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

/* ============ small ui ============ */

function SectionHeader({ icon: I, title, sub, tone }: { icon: any; title: string; sub?: string; tone?: "primary" }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex items-center gap-2">
        <I className={cn("size-4", tone === "primary" ? "text-primary" : "text-muted-foreground")} />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">section</div>
          <div className={cn("text-base font-semibold", tone === "primary" && "text-primary")}>{title}</div>
        </div>
      </div>
      {sub && <div className="text-[11px] font-mono text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Panel({ title, sub, icon: I, children }: { title?: string; sub?: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="glass-panel p-4">
      {(title || sub) && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {I && <I className="size-3.5 text-muted-foreground" />}
            {title && <div className="text-sm font-semibold">{title}</div>}
          </div>
          {sub && <div className="text-[10px] text-muted-foreground font-mono">{sub}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiTile({ label, value, sub, tone, icon: I }: { label: string; value: string; sub?: string; tone?: string; icon?: any }) {
  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {I && <I className="size-3" />} {label}
      </div>
      <div className={cn("text-xl font-semibold font-mono mt-1", tone)}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function DarkTooltip({ active, payload, label, prefix, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel p-2 text-[11px] font-mono">
      {label && <div className="text-muted-foreground mb-1">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ background: p.color ?? p.payload?.color }} />
          <span className="text-foreground/90">{p.name ?? p.dataKey}</span>
          <span className="ml-auto">{prefix ?? ""}{p.value}{suffix ?? ""}</span>
        </div>
      ))}
    </div>
  );
}
