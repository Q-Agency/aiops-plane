import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown, ChevronRight, Clock, Zap, AlertTriangle, MessageSquare,
  Mail, Hash, Send, CheckCircle2, CircleDashed, CircleAlert,
} from "lucide-react";
import { agents as seedAgents } from "@/mock/agents";
import { humans } from "@/mock/humans";
import {
  COMMS, ESCALATIONS, SCHEDULED, unackedOpen,
  type CommEntry, type CommChannel, type CommTrigger, type Escalation, type EscSeverity,
} from "@/mock/comms";
import type { AgentId } from "@/mock/types";
import { cn } from "@/lib/utils";
import { OutboundFeed } from "./OutboundFeed";

const agentColor = (id: AgentId) => {
  const a = seedAgents.find((x) => x.id === id);
  return a ? `var(--${a.color})` : "var(--muted-foreground)";
};
const agentName = (id: AgentId) => seedAgents.find((a) => a.id === id)?.name ?? id;
const humanName = (id: string) => humans.find((h) => h.id === id)?.name ?? id;

const channelIcon = (c: CommChannel) =>
  c === "slack" ? Hash : c === "teams" ? MessageSquare : c === "email" ? Mail : Send;

const TriggerBadge = ({ t, reason }: { t: CommTrigger; reason?: string }) => (
  <span
    title={reason}
    className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border",
      t === "scheduled"
        ? "border-status-waiting/40 bg-status-waiting/10 text-status-waiting"
        : "border-primary/40 bg-primary/10 text-primary",
    )}
  >
    {t === "scheduled" ? <Clock className="size-3" /> : <Zap className="size-3" />}
    {t === "scheduled" ? "SCHEDULED" : "THRESHOLD"}
  </span>
);

const StatusDot = ({ s }: { s: CommEntry["status"] }) => {
  const map = {
    acknowledged: { c: "bg-status-done", l: "ACK" },
    replied: { c: "bg-agent-pm", l: "REPLIED" },
    "no-response": { c: "bg-status-waiting", l: "NO RESP" },
  } as const;
  const m = map[s];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", m.c)} /> {m.l}
    </span>
  );
};

const sevColor = (s: EscSeverity) =>
  s === "critical"
    ? "var(--status-error)"
    : s === "high"
    ? "var(--agent-qa)"
    : s === "med"
    ? "var(--status-waiting)"
    : "var(--muted-foreground)";

function fmtAgo(min: number) {
  if (min < 60) return `${min}m`;
  if (min < 60 * 24) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / (60 * 24))}d`;
}

export function CommsView() {
  const [agentFilter, setAgentFilter] = useState<AgentId | "all">("all");
  const [channelFilter, setChannelFilter] = useState<CommChannel | "all">("all");
  const [triggerFilter, setTriggerFilter] = useState<CommTrigger | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      COMMS.filter(
        (c) =>
          (agentFilter === "all" || c.agentId === agentFilter) &&
          (channelFilter === "all" || c.channel === channelFilter) &&
          (triggerFilter === "all" || c.trigger === triggerFilter),
      ).sort((a, b) => a.tsOffsetMin - b.tsOffsetMin),
    [agentFilter, channelFilter, triggerFilter],
  );

  const openEsc = unackedOpen().length;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Communications &amp; Escalations</h1>
          <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Agent-initiated outbound · scheduled or threshold-triggered
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
          Every outbound message and escalation is fired by a deterministic rule — cadence or threshold. Agents do not
          decide to reach out from nothing; the trigger is always shown.
        </p>
      </header>

      {/* Proactive outbound — the demo beat: the pod talks first */}
      <OutboundFeed />

      {/* Escalation tracker — top, most prominent */}
      <section className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Highest-signal autonomy
            </div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 text-status-error" />
              Escalation tracker · {openEsc} open
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2">Sev</th>
                <th className="text-left py-2 px-2">Ticket</th>
                <th className="text-left py-2 px-2">Trigger</th>
                <th className="text-left py-2 px-2">Raised by</th>
                <th className="text-left py-2 px-2">Routed to</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Time-to-ack</th>
                <th className="text-right py-2 px-2">Time-to-resolve</th>
              </tr>
            </thead>
            <tbody>
              {ESCALATIONS.map((e) => (
                <EscalationRow key={e.id} e={e} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        {/* Communications log */}
        <section className="glass-panel p-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Stream</div>
              <div className="text-sm font-semibold">Communications log · {filtered.length} entries</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value as AgentId | "all")}
                className="h-7 px-2 text-xs rounded border border-border bg-white/5 font-mono"
              >
                <option value="all">all agents</option>
                {seedAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as CommChannel | "all")}
                className="h-7 px-2 text-xs rounded border border-border bg-white/5 font-mono"
              >
                <option value="all">all channels</option>
                <option value="slack">slack</option>
                <option value="teams">teams</option>
                <option value="email">email</option>
                <option value="dm">dm</option>
              </select>
              <select
                value={triggerFilter}
                onChange={(e) => setTriggerFilter(e.target.value as CommTrigger | "all")}
                className="h-7 px-2 text-xs rounded border border-border bg-white/5 font-mono"
              >
                <option value="all">all triggers</option>
                <option value="scheduled">scheduled</option>
                <option value="threshold">threshold</option>
              </select>
            </div>
          </div>

          <ul className="space-y-1.5 max-h-[640px] overflow-y-auto scrollbar-thin pr-1">
            {filtered.map((c) => {
              const Icon = channelIcon(c.channel);
              const open = expanded === c.id;
              return (
                <li
                  key={c.id}
                  className="rounded-md border border-border/60 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <button
                    onClick={() => setExpanded(open ? null : c.id)}
                    className="w-full text-left p-2.5 flex items-start gap-2"
                  >
                    {open ? (
                      <ChevronDown className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className="mt-1 size-1.5 rounded-full shrink-0"
                      style={{ background: agentColor(c.agentId), boxShadow: `0 0 6px ${agentColor(c.agentId)}` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span style={{ color: agentColor(c.agentId) }} className="font-medium">
                          {agentName(c.agentId)}
                        </span>
                        <Icon className="size-3 text-muted-foreground" />
                        <span className="font-mono text-[11px] text-muted-foreground">{c.channelLabel}</span>
                        <TriggerBadge t={c.trigger} reason={c.triggerReason} />
                        {c.ticketId && (
                          <span className="font-mono text-[10px] px-1 rounded border border-border text-muted-foreground">
                            {c.ticketId}
                          </span>
                        )}
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                          {fmtAgo(c.tsOffsetMin)} ago
                        </span>
                      </div>
                      <div className="text-xs text-foreground/90 mt-1 truncate">{c.preview}</div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <StatusDot s={c.status} />
                        <span className="text-[10px] font-mono text-muted-foreground truncate">
                          → {c.recipients.join(", ")}
                        </span>
                      </div>
                    </div>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 ml-6 text-xs text-foreground/80 border-l border-border/50 pl-3 anim-in">
                      <div className="text-[10px] font-mono text-muted-foreground mb-1">
                        Trigger · {c.triggerReason}
                      </div>
                      {c.body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Scheduled / cadence */}
        <section className="glass-panel p-4 min-w-0">
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Cadence</div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <Clock className="size-4 text-status-waiting" />
              Scheduled comms · {SCHEDULED.length}
            </div>
          </div>
          <div className="space-y-3 max-h-[640px] overflow-y-auto scrollbar-thin pr-1">
            {SCHEDULED.map((s) => {
              const Icon = channelIcon(s.channel);
              return (
                <div key={s.id} className="rounded-md border border-border/60 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: agentColor(s.agentId), boxShadow: `0 0 6px ${agentColor(s.agentId)}` }}
                    />
                    <span className="font-medium" style={{ color: agentColor(s.agentId) }}>
                      {agentName(s.agentId)}
                    </span>
                    <Icon className="size-3 text-muted-foreground" />
                    <span className="font-mono text-[10px] text-muted-foreground">{s.channelLabel}</span>
                  </div>
                  <div className="mt-1.5 text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {s.cadence} · next: <span className="text-foreground">{s.nextRunIso}</span>
                  </div>
                  <details className="mt-2 group">
                    <summary className="cursor-pointer text-[11px] text-primary hover:text-primary/80 font-mono">
                      preview next send →
                    </summary>
                    <div className="mt-2 rounded border border-border/50 bg-background/40 p-2.5 text-xs space-y-2">
                      <div className="font-semibold">{s.preview.title}</div>
                      {s.preview.sections.map((sec) => (
                        <div key={sec.heading}>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                            {sec.heading}
                          </div>
                          <ul className="mt-0.5 space-y-0.5 text-foreground/85">
                            {sec.lines.map((l, i) => (
                              <li key={i} className="text-[11px]">
                                · {l}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function EscalationRow({ e }: { e: Escalation }) {
  const color = sevColor(e.severity);
  const glow = e.status === "open" ? `0 0 12px ${color}66` : "none";
  const StatusIcon =
    e.status === "resolved" ? CheckCircle2 : e.status === "acknowledged" ? CircleDashed : CircleAlert;
  return (
    <tr className="border-b border-border/40 hover:bg-white/[0.03]">
      <td className="py-2 px-2">
        <span
          className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border"
          style={{ borderColor: `${color}66`, color, background: `${color}14`, boxShadow: glow }}
        >
          <span className="size-1.5 rounded-full" style={{ background: color }} />
          {e.severity}
        </span>
      </td>
      <td className="py-2 px-2 font-mono">
        <Link to="/traceability" className="text-primary hover:underline">
          {e.ticketId}
        </Link>
        <div className="text-[10px] text-muted-foreground truncate max-w-[280px]">{e.summary}</div>
      </td>
      <td className="py-2 px-2 text-foreground/85">{e.trigger}</td>
      <td className="py-2 px-2">
        <span style={{ color: agentColor(e.raisedBy) }} className="font-medium">
          {agentName(e.raisedBy)}
        </span>
      </td>
      <td className="py-2 px-2 font-mono text-foreground/85">{humanName(e.routedTo)}</td>
      <td className="py-2 px-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-mono text-muted-foreground">
          <StatusIcon className="size-3" /> {e.status}
        </span>
        {e.status === "open" && (
          <div className="text-[10px] text-muted-foreground font-mono">open {fmtAgo(e.openedMinAgo)}</div>
        )}
      </td>
      <td className="py-2 px-2 text-right font-mono tabular-nums">{e.ackMin ? fmtAgo(e.ackMin) : "—"}</td>
      <td className="py-2 px-2 text-right font-mono tabular-nums">{e.resolvedMin ? fmtAgo(e.resolvedMin) : "—"}</td>
    </tr>
  );
}
