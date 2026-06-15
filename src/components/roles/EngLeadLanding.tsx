/**
 * EngLeadLanding - the Engineering Lead "/" landing: "what needs my sign-off
 * on the code/architecture path, and where is cycle time actually going."
 *
 * Reuses the SAME ApprovalRow the unified /approvals renders, pre-filtered to
 * the eng-owned gates (Architecture + Dev review), plus a flow-bottleneck rail
 * (flow.ts) and open technical incidents (incidents.ts). Deliberately scoped:
 * NO billing/ROI - the engineering lead owns delivery health, not the P&L.
 *
 * Decisions go through the same canon as /approvals (recordGateDecision +
 * session-ledger rows with a typed reason on reject); rows click through to the
 * canonical /approvals/$gateId review surface.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, TimerReset, AlertTriangle, ArrowRight, GitMerge, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLive } from "@/hooks/useLiveTicker";
import type { AgentId, Approval, Ticket } from "@/mock/types";
import { isGateResolved, recordGateDecision } from "@/mock/approvals";
import { accountableFor } from "@/mock/humans";
import { appendAuditMock } from "@/mock/audit-bridge";
import { agents as allAgents } from "@/mock/agents";
import { bottlenecks, flowAggregates, fmtDur } from "@/mock/flow";
import { INCIDENTS } from "@/mock/incidents";
import { ApprovalRow } from "@/components/approvals/ApprovalsView";

/** The gates an engineering lead signs off (architecture + code path). */
const ENG_GATES = new Set<Approval["gate"]>(["Architecture Review", "Dev Review"]);

const GATE_AGENT_ID: Record<Approval["gate"], AgentId> = {
  "Spec Review": "ba",
  "Architecture Review": "sa",
  "Tasks Review": "tasklist",
  "Dev Review": "dev",
  "QA Review": "qa",
};

function agentName(id: AgentId): string {
  return allAgents.find((a) => a.id === id)?.name ?? id.toUpperCase();
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass-panel p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono truncate">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

export function EngLeadLanding() {
  const { approvals, tickets, approve, reject } = useLive();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const lead = accountableFor("dev"); // Ivan - owns the Dev/Review agents
  const ticketOf = (id: string): Ticket | undefined => tickets.find((t) => t.id === id);

  /* eng-owned gates, oldest first (same ordering as /approvals) */
  const engRows = useMemo(
    () =>
      approvals
        .filter((a) => !isGateResolved(a.id) && ENG_GATES.has(a.gate))
        .sort((x, y) => x.openedAt - y.openedAt),
    // tick re-derives after a local decision
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [approvals, tick],
  );

  const reworks = useMemo(
    () => tickets.reduce((n, t) => n + (t.rerunCount ?? 0), 0),
    [tickets],
  );
  const openIncidents = useMemo(() => INCIDENTS.filter((i) => i.status === "open"), []);
  const topBottlenecks = bottlenecks.slice(0, 3);

  const onApprove = (a: Approval, reason: string) => {
    recordGateDecision({
      gateId: a.id,
      ticketId: a.ticketId,
      gateKind: "approval",
      decision: "approved",
      reason,
      actor: null,
    });
    appendAuditMock({ action: "gate.approved", target: a.id, detail: reason });
    approve(a.id);
    setTick((n) => n + 1);
    toast.success(`${a.ticketId} approved - moved forward`, {
      description: `${a.gate} cleared · "${reason.slice(0, 90)}"`,
    });
  };

  const onReject = (a: Approval, feedback: string) => {
    recordGateDecision({
      gateId: a.id,
      ticketId: a.ticketId,
      gateKind: "approval",
      decision: "rejected",
      reason: feedback,
      actor: null,
    });
    appendAuditMock({ action: "gate.rejected", target: a.id, detail: feedback });
    reject(a.id);
    setTick((n) => n + 1);
    toast(`${a.ticketId} returned to ${agentName(GATE_AGENT_ID[a.gate])} with feedback - rerunning`, {
      description: feedback.slice(0, 140),
      icon: <X className="size-4 text-status-error" />,
    });
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          engineering delivery floor
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Your delivery floor · Engineering</h1>
        <div className="text-xs text-muted-foreground mt-0.5">
          Architecture + code gates and run health · accountable: {lead.name}
        </div>
      </div>

      {/* technical KPI band - flow-derived, no $ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Avg cycle" value={fmtDur(flowAggregates.avgTotalMin)} sub="ticket → done" />
        <Kpi
          label="Gate wait"
          value={`${flowAggregates.waitPct}%`}
          sub="of cycle is human-gate wait"
        />
        <Kpi label="Reruns · rework" value={String(reworks)} sub="rejects sent back upstream" />
        <Kpi
          label="SLA breaches"
          value={String(flowAggregates.breachesTotal)}
          sub="gates over target"
        />
      </div>

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[1fr_340px] items-start">
        {/* eng gate queue - the same rows /approvals renders */}
        <div className="space-y-2 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono px-0.5">
            Your sign-offs · architecture + code · {engRows.length}
          </div>
          {engRows.length === 0 && (
            <div className="glass-panel p-12 text-center space-y-3">
              <CheckCircle2 className="size-10 text-status-done mx-auto" />
              <div className="text-sm font-medium">You&apos;re clear - no code or architecture gates waiting.</div>
              <Link to="/pipeline" className="text-xs text-primary hover:underline">
                Open the pipeline board
              </Link>
            </div>
          )}
          {engRows.map((a) => {
            const t = ticketOf(a.ticketId);
            if (!t) return null;
            const open = expanded === a.id;
            return (
              <ApprovalRow
                key={a.id}
                approval={a}
                ticket={t}
                open={open}
                onToggle={() => setExpanded(open ? null : a.id)}
                onApprove={(reason) => onApprove(a, reason)}
                onReject={(fb) => onReject(a, fb)}
              />
            );
          })}
        </div>

        {/* engineering posture rail */}
        <aside className="space-y-4 min-w-0">
          {/* where cycle time goes - flow.ts bottlenecks */}
          <section className="glass-panel p-4">
            <div className="flex items-center gap-2">
              <TimerReset className="size-4 text-status-waiting" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                Where cycle time goes
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {topBottlenecks.map((b) => {
                const ratio = b.currentAvgMin > 0 ? Math.min(1, b.targetAvgMin / b.currentAvgMin) : 1;
                return (
                  <div key={b.gate} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-foreground truncate">{b.gate} Review</span>
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0 tabular-nums">
                        {fmtDur(b.currentAvgMin)} avg
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-status-waiting"
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      target {fmtDur(b.targetAvgMin)} · −{b.cycleTimeDropPct}% cycle if cleared on
                      time
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* open technical incidents */}
          <Link
            to="/incidents"
            className="glass-panel p-4 block hover-lift transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={cn(
                  "size-4",
                  openIncidents.length > 0 ? "text-status-error" : "text-status-done",
                )}
              />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                Open incidents
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground ml-auto" />
            </div>
            <div className="mt-1 text-2xl font-semibold font-mono tabular-nums">
              {openIncidents.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {openIncidents[0]?.title ?? "No active incidents - the fleet is healthy."}
            </div>
          </Link>

          {/* eng surfaces */}
          <section className="glass-panel p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Eng surfaces
            </div>
            <div className="mt-2 space-y-1.5">
              {[
                { to: "/pipeline", icon: GitMerge, label: "Pipeline board" },
                { to: "/traceability", icon: ArrowRight, label: "Traceability · spec → code" },
              ].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-white/[0.02] px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                >
                  <l.icon className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{l.label}</span>
                  <ArrowRight className="size-3 text-muted-foreground/60" />
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="text-[11px] text-muted-foreground font-mono border-t border-border/60 pt-3">
        Engineering scope · code + architecture gates, run health and incidents. Billing and pod
        configuration live with the Pod Admin.
      </div>
    </div>
  );
}
