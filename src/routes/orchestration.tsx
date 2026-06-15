import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Network, Activity, AlertOctagon, Clock, Cpu, Radio, ArrowRight,
  CheckCircle2, XCircle, Moon, MessageSquare, ClipboardList, Layers,
} from "lucide-react";
import { agents as allAgents } from "@/mock/agents";
import type { AgentId } from "@/mock/types";
import { cn } from "@/lib/utils";
import { mockOnlyBeforeLoad } from "@/lib/experience";

export const Route = createFileRoute("/orchestration")({
  beforeLoad: mockOnlyBeforeLoad,
  component: OrchestrationView,
});

// ----------------- mock data -----------------

const seed = (k: number) => {
  let x = Math.sin(k) * 10_000;
  return () => { x = Math.sin(x) * 10_000; return x - Math.floor(x); };
};

interface AgentApi {
  id: AgentId;
  endpoint: string;
  status: "healthy" | "degraded" | "down";
  errRatePct: number;
  p50Ms: number;
  p95Ms: number;
  inFlight: number;
  dispatches24h: number;
}

const AGENT_APIS: AgentApi[] = (["curator","ba","sa","tasklist","dev","review","qa","pm"] as AgentId[]).map((id, i) => {
  const r = seed(id.charCodeAt(0) * 17 + i * 3);
  const errRate = +(r() * 1.4).toFixed(2);
  const status: AgentApi["status"] =
    errRate > 1.0 ? "degraded" : errRate > 1.3 ? "down" : "healthy";
  const p50 = Math.round(120 + r() * 380 + (id === "dev" || id === "qa" ? 6000 : 0));
  return {
    id,
    endpoint: `https://agents.am.internal/${id}/v1/invoke`,
    status,
    errRatePct: errRate,
    p50Ms: p50,
    p95Ms: Math.round(p50 * (2.2 + r() * 0.8)),
    inFlight: Math.round(r() * 4),
    dispatches24h: Math.round(80 + r() * 600),
  };
});

interface DispatchLog {
  ts: string;        // HH:MM:SS
  source: string;
  via: "gateway" | "scheduler" | "slack" | "jira";
  agentId: AgentId | "-";
  ticketId?: string;
  status: "200" | "202" | "504" | "429" | "500";
  latencyMs: number;
  note?: string;
}

const dispatchLog: DispatchLog[] = [
  { ts: "14:22:08", source: "board.column.changed → ready-dev",  via: "gateway",   agentId: "dev",      ticketId: "AM-150", status: "202", latencyMs: 84, note: "dispatched · agent activated" },
  { ts: "14:21:51", source: "board.column.changed → ready-qa",   via: "gateway",   agentId: "qa",       ticketId: "AM-131", status: "202", latencyMs: 91 },
  { ts: "14:18:34", source: "gate.approved · Spec Review",       via: "gateway",   agentId: "sa",       ticketId: "AM-142", status: "202", latencyMs: 76 },
  { ts: "14:17:02", source: "slack.message → @ba-agent",          via: "slack",     agentId: "ba",       ticketId: "AM-128", status: "202", latencyMs: 142, note: "intent: clarify AC" },
  { ts: "14:12:47", source: "jira.issue.updated",                via: "jira",      agentId: "pm",       ticketId: "AM-149", status: "202", latencyMs: 68, note: "sync · status mirrored" },
  { ts: "14:08:11", source: "board.column.changed → ready-tasks",via: "gateway",   agentId: "tasklist", ticketId: "AM-147", status: "504", latencyMs: 30000, note: "gateway timeout · retried" },
  { ts: "14:08:42", source: "retry · ready-tasks",               via: "gateway",   agentId: "tasklist", ticketId: "AM-147", status: "202", latencyMs: 88 },
  { ts: "13:58:20", source: "teamwork.task.commented",           via: "jira",      agentId: "pm",       ticketId: "AM-138", status: "202", latencyMs: 55 },
  { ts: "13:42:09", source: "gate.rejected · Dev Review",        via: "gateway",   agentId: "dev",      ticketId: "AM-140", status: "202", latencyMs: 79, note: "rerun · feedback attached" },
  { ts: "22:00:00", source: "scheduler.cron · overnight batch",  via: "scheduler", agentId: "dev",      ticketId: "AM-150", status: "202", latencyMs: 102, note: "overnight loop started" },
];

const stuckHandoffs = [
  { ticketId: "AM-141", from: "tasks-review", to: "ready-dev",      waitingMin: 92, reason: "no dispatch received by dev-agent.api" },
  { ticketId: "AM-128", from: "ready-spec",   to: "ba-agent.api",   waitingMin: 38, reason: "gateway accepted · agent not activated" },
];

const dispatchLatencyP50 = 96;
const dispatchLatencyP95 = 412;

const statusTone: Record<AgentApi["status"], string> = {
  healthy:  "text-status-done border-status-done/40 bg-status-done/10",
  degraded: "text-status-waiting border-status-waiting/40 bg-status-waiting/10",
  down:     "text-status-error border-status-error/40 bg-status-error/10",
};

const statusDot: Record<AgentApi["status"], string> = {
  healthy:  "bg-status-done",
  degraded: "bg-status-waiting",
  down:     "bg-status-error",
};

const viaIcon = {
  gateway:   Network,
  scheduler: Moon,
  slack:     MessageSquare,
  jira:      ClipboardList,
} as const;

function agentMeta(id: AgentId) {
  const a = allAgents.find((x) => x.id === id)!;
  return { name: a.name, color: `var(--${a.color})` };
}

// ----------------- view -----------------

function OrchestrationView() {
  const [selected, setSelected] = useState<AgentId | null>(null);

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            agent-api dispatch
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Orchestration / Agent-API Health</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            Each agent runs behind its own API. Board events are dispatched through a gateway. A dedicated orchestrator is planned - for now the gateway routes directly.
          </div>
        </div>
        <Link to="/observability" className="text-[11px] font-mono text-muted-foreground hover:text-foreground glass-panel px-3 py-1.5 inline-flex items-center gap-1.5">
          <Activity className="size-3" /> infra & cost dashboard <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Topology */}
      <section className="space-y-2">
        <SectionHead icon={Layers} title="Dispatch topology" sub="board events → gateway → agent APIs (orchestrator planned)" />
        <Topology />
      </section>

      {/* KPI row */}
      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2">
        <Kpi icon={Network}      label="Healthy endpoints"    value={`${AGENT_APIS.filter(a => a.status === "healthy").length}/${AGENT_APIS.length}`} sub="agent APIs up" tone="positive" />
        <Kpi icon={Clock}        label="Dispatch p50"         value={`${dispatchLatencyP50}ms`} sub="board → agent activated" />
        <Kpi icon={Clock}        label="Dispatch p95"         value={`${dispatchLatencyP95}ms`} sub="board → agent activated" />
        <Kpi icon={Cpu}          label="In-flight requests"   value={`${AGENT_APIS.reduce((a, x) => a + x.inFlight, 0)}`} sub="across all agents" />
        <Kpi icon={AlertOctagon} label="Stuck handoffs"       value={`${stuckHandoffs.length}`} sub="dispatch sent · no activation" tone={stuckHandoffs.length ? "error" : undefined} />
      </section>

      {/* Stuck handoffs */}
      {stuckHandoffs.length > 0 && (
        <section className="space-y-2">
          <SectionHead icon={AlertOctagon} title="Stuck handoffs" sub="Board moved · agent never activated" />
          <div className="glass-panel divide-y divide-border">
            {stuckHandoffs.map((s) => (
              <div key={s.ticketId} className="px-3 py-2 flex items-center gap-3 text-[11px] font-mono">
                <span className="text-status-error inline-flex items-center gap-1.5">
                  <AlertOctagon className="size-3" /> {s.ticketId}
                </span>
                <span className="text-muted-foreground">{s.from}</span>
                <ArrowRight className="size-3 text-muted-foreground/60" />
                <span className="text-foreground">{s.to}</span>
                <span className="text-status-waiting ml-auto">waiting {s.waitingMin}m</span>
                <span className="text-muted-foreground/70 truncate max-w-[36ch]">· {s.reason}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Per-agent API health */}
      <section className="space-y-2">
        <SectionHead icon={Radio} title="Per-agent API health" sub="status · error rate · p50/p95 · in-flight" />
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <Th>agent</Th>
                <Th>endpoint</Th>
                <Th>status</Th>
                <Th className="text-right">err %</Th>
                <Th className="text-right">p50</Th>
                <Th className="text-right">p95</Th>
                <Th className="text-right">in-flight</Th>
                <Th className="text-right">24h dispatches</Th>
              </tr>
            </thead>
            <tbody>
              {AGENT_APIS.map((a) => {
                const m = agentMeta(a.id);
                const active = selected === a.id;
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelected(active ? null : a.id)}
                    className={cn(
                      "border-b border-border/60 cursor-pointer transition-colors",
                      active ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: m.color }} />
                        <span>{m.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground truncate max-w-[28ch]">{a.endpoint}</td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded border", statusTone[a.status])}>
                        <span className={cn("size-1.5 rounded-full", statusDot[a.status])} />
                        {a.status}
                      </span>
                    </td>
                    <td className={cn(
                      "px-3 py-2 text-right font-mono tabular-nums",
                      a.errRatePct > 1 ? "text-status-error" : "text-muted-foreground",
                    )}>{a.errRatePct.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{a.p50Ms < 1000 ? `${a.p50Ms}ms` : `${(a.p50Ms/1000).toFixed(1)}s`}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{a.p95Ms < 1000 ? `${a.p95Ms}ms` : `${(a.p95Ms/1000).toFixed(1)}s`}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{a.inFlight}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{a.dispatches24h.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dispatch / event log */}
      <section className="space-y-2">
        <SectionHead icon={Activity} title="Dispatch & event log" sub="board · scheduler · Slack/Teams · Jira/Teamwork → gateway → agent API" />
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <Th className="w-20">time</Th>
                <Th>source event</Th>
                <Th>via</Th>
                <Th>→ agent API</Th>
                <Th>ticket</Th>
                <Th className="text-right">status</Th>
                <Th className="text-right">latency</Th>
              </tr>
            </thead>
            <tbody>
              {dispatchLog.map((d, i) => {
                const VI = viaIcon[d.via];
                const m = d.agentId !== "-" ? agentMeta(d.agentId) : null;
                const ok = d.status === "200" || d.status === "202";
                return (
                  <tr key={i} className="border-b border-border/60 hover:bg-white/[0.03]">
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground tabular-nums">{d.ts}</td>
                    <td className="px-3 py-2">
                      <div className="text-foreground truncate">{d.source}</div>
                      {d.note && <div className="text-[10px] text-muted-foreground/80 truncate">{d.note}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-white/[0.03] text-muted-foreground">
                        <VI className="size-2.5" /> {d.via}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {m ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="size-1.5 rounded-full" style={{ background: m.color }} />
                          {m.name}
                        </span>
                      ) : <span className="text-muted-foreground/60">-</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{d.ticketId ?? "-"}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={cn(
                        "inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border",
                        ok ? "text-status-done border-status-done/40 bg-status-done/10"
                           : "text-status-error border-status-error/40 bg-status-error/10",
                      )}>
                        {ok ? <CheckCircle2 className="size-2.5" /> : <XCircle className="size-2.5" />}
                        {d.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {d.latencyMs < 1000 ? `${d.latencyMs}ms` : `${(d.latencyMs/1000).toFixed(1)}s`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ----------------- topology strip ----------------- */

function Topology() {
  return (
    <div className="glass-panel p-4">
      <div className="grid grid-cols-1 lg:grid-cols-[180px_60px_180px_60px_180px_60px_1fr] gap-3 items-center">
        <Node label="Board events" sub="column changes · approvals" color="var(--agent-pm)" />
        <Arrow />
        <Node label="Gateway" sub="dispatch & retries" color="var(--primary)" />
        <Arrow />
        <Node
          label="Orchestrator"
          sub="planned · not deployed"
          color="var(--muted-foreground)"
          planned
        />
        <Arrow dashed />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {AGENT_APIS.slice(0, 8).map((a) => {
            const m = agentMeta(a.id);
            return (
              <div
                key={a.id}
                className="border border-border rounded px-2 py-1.5 bg-white/[0.02] flex items-center gap-1.5"
                style={{ borderColor: `color-mix(in oklab, ${m.color} 35%, var(--border))` }}
              >
                <span className={cn("size-1.5 rounded-full shrink-0", statusDot[a.status])} />
                <span className="text-[10px] font-mono truncate" style={{ color: m.color }}>{m.name.replace(" Agent","").replace("Supervisor","Sup")}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
        <InfraStat label="Redis queue depth" value="14" sub="dispatch.queue · normal" tone="ok" />
        <InfraStat label="Rate limit" value="312 / 600 rpm" sub="gateway → agents · 52%" tone="ok" />
        <InfraStat label="Retries (1h)" value="7" sub="3 dispatch · 4 agent-side" tone="warn" />
        <InfraStat label="Dead-letter" value="0" sub="no dropped events" tone="ok" />
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-[10px] font-mono text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1.5"><MessageSquare className="size-3" /> Slack/Teams events feed the gateway alongside board events</span>
        <span className="inline-flex items-center gap-1.5"><ClipboardList className="size-3" /> Jira/Teamwork sync runs through the PM agent</span>
        <span className="inline-flex items-center gap-1.5"><Moon className="size-3" /> Scheduler kicks the 22:00 overnight loop</span>
      </div>
    </div>
  );
}

function InfraStat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "ok" | "warn" | "err" }) {
  const dot = tone === "ok" ? "bg-status-done" : tone === "warn" ? "bg-status-waiting" : "bg-status-error";
  return (
    <div className="border border-border rounded px-2 py-1.5 bg-white/[0.02]">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className={cn("size-1.5 rounded-full", dot)} />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-foreground tabular-nums mt-0.5">{value}</div>
      <div className="text-muted-foreground/70 truncate">{sub}</div>
    </div>
  );
}

function Node({ label, sub, color, planned }: { label: string; sub: string; color: string; planned?: boolean }) {
  return (
    <div
      className={cn(
        "rounded border p-2.5 bg-white/[0.02]",
        planned && "border-dashed opacity-70",
      )}
      style={{ borderColor: planned ? "var(--border)" : `color-mix(in oklab, ${color} 45%, var(--border))` }}
    >
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: color }} />
        <span className="text-[11px] font-mono" style={{ color: planned ? "var(--muted-foreground)" : "var(--foreground)" }}>{label}</span>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</div>
      {planned && (
        <span className="mt-1 inline-block text-[9px] font-mono px-1 py-0.5 rounded border border-status-waiting/40 text-status-waiting bg-status-waiting/10">
          planned
        </span>
      )}
    </div>
  );
}

function Arrow({ dashed }: { dashed?: boolean }) {
  return (
    <div className="flex items-center justify-center">
      <div
        className={cn("h-px flex-1", dashed ? "border-t border-dashed border-border" : "bg-border")}
      />
      <ArrowRight className={cn("size-3 -ml-1", dashed ? "text-muted-foreground/50" : "text-muted-foreground")} />
    </div>
  );
}

/* ----------------- shared ----------------- */

function Kpi({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string; value: string; sub?: string; tone?: "positive" | "error";
}) {
  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <Icon className="size-3" /> {label}
      </div>
      <div className={cn(
        "mt-1.5 text-xl font-semibold tabular-nums",
        tone === "positive" && "text-status-done",
        tone === "error" && "text-status-error",
      )}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function SectionHead({ icon: Icon, title, sub }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{title}</span>
      {sub && <span className="text-[10px] text-muted-foreground/70 font-mono">· {sub}</span>}
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground", className)}>{children}</th>;
}
