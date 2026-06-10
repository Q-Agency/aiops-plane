/**
 * ScopedGateLanding — the QA Lead "/" landing: "what needs my sign-off and
 * what's the quality posture". A thin wrapper over the SAME queue rows the
 * unified /approvals renders (ApprovalRow / ClarificationRow imported, not
 * forked) pre-filtered to QA-owned gates, plus the walled deterministic
 * ValidatorPanel and a "My SLA" mini from humans.ts workload.
 *
 * Decisions go through the same canon as /approvals: recordGateDecision +
 * the same session-ledger rows (gate.approved / gate.rejected /
 * clarification.answered) with a typed reason (required on reject); rows
 * click through to the canonical /approvals/$gateId review surface.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLive } from "@/hooks/useLiveTicker";
import type { AgentId, Approval, Ticket } from "@/mock/types";
import {
  clarificationGates,
  isGateResolved,
  recordGateDecision,
  type ClarificationGate,
} from "@/mock/approvals";
import { accountableFor } from "@/mock/humans";
import { appendAuditMock } from "@/mock/audit-bridge";
import { agents as allAgents } from "@/mock/agents";
import { validatorsFor, VALIDATOR_SET_ALL_PASS } from "@/mock/validators";
import { ValidatorPanel } from "@/components/governance/ValidatorPanel";
import { ApprovalRow, ClarificationRow } from "@/components/approvals/ApprovalsView";

const GATE_AGENT_ID: Record<Approval["gate"], AgentId> = {
  "Spec Review": "ba",
  "Design Review": "sa",
  "Tasks Review": "tasklist",
  "Dev Review": "dev",
  "QA Review": "qa",
};

function agentName(id: AgentId): string {
  return allAgents.find((a) => a.id === id)?.name ?? id.toUpperCase();
}

type Row =
  | { kind: "approval"; id: string; openedAt: number; a: Approval }
  | { kind: "clarification"; id: string; openedAt: number; c: ClarificationGate };

export function ScopedGateLanding() {
  const { approvals, tickets, approve, reject } = useLive();
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [expanded, setExpanded] = useState<string | null>(null);
  // bump after a decision so resolved rows drop out immediately
  const [decisionTick, setDecisionTick] = useState(0);

  const qaLead = accountableFor("qa"); // Petra — owns the QA agent

  const ticketOf = (id: string): Ticket | undefined => tickets.find((t) => t.id === id);

  /* open rows of both kinds, oldest first (same ordering as /approvals) */
  const openRows = useMemo<Row[]>(() => {
    const fromApprovals: Row[] = approvals
      .filter((a) => !isGateResolved(a.id))
      .map((a) => ({ kind: "approval" as const, id: a.id, openedAt: a.openedAt, a }));
    const fromClarifications: Row[] = clarificationGates
      .filter((c) => !isGateResolved(c.id))
      .map((c) => ({ kind: "clarification" as const, id: c.id, openedAt: c.openedAt, c }));
    return [...fromApprovals, ...fromClarifications].sort((x, y) => x.openedAt - y.openedAt);
    // decisionTick re-derives after local decisions (clarifications don't touch useLive)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvals, decisionTick]);

  /* "Mine" — QA-owned: QA Review sign-offs + anything the QA agent asks */
  const mine = useMemo(
    () =>
      openRows.filter((r) =>
        r.kind === "approval"
          ? r.a.gate === "QA Review"
          : r.c.agentId === "qa" || r.c.accountable === qaLead.id,
      ),
    [openRows, qaLead.id],
  );

  const rows = tab === "mine" ? mine : openRows;

  /* decisions — same canon as the unified queue */
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
    setDecisionTick((n) => n + 1);
    toast.success(`${a.ticketId} approved — moved forward`, {
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
    setDecisionTick((n) => n + 1);
    toast(`${a.ticketId} returned to ${agentName(GATE_AGENT_ID[a.gate])} with feedback — rerunning`, {
      description: feedback.slice(0, 140),
      icon: <X className="size-4 text-status-error" />,
    });
  };

  const onAnswer = (c: ClarificationGate, answer: string) => {
    recordGateDecision({
      gateId: c.id,
      ticketId: c.ticketId,
      gateKind: "clarification",
      decision: "answered",
      reason: answer,
      actor: null,
    });
    appendAuditMock({ action: "clarification.answered", target: c.id, detail: answer });
    setDecisionTick((n) => n + 1);
    setExpanded(null);
    toast.success(`Answer sent to ${agentName(c.agentId)} — rerunning`, {
      description: answer.slice(0, 140),
    });
  };

  /* quality posture — the latest open QA artifact's deterministic checks */
  const firstQaApproval = mine.find((r) => r.kind === "approval");
  const postureChecks =
    firstQaApproval?.kind === "approval"
      ? validatorsFor(firstQaApproval.a.ticketId)
      : VALIDATOR_SET_ALL_PASS.map((c) => ({ ...c }));

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            scoped gate queue
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Your gate queue · QA</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            Pre-filtered to QA-owned gates · accountable: {qaLead.name}
          </div>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "mine" | "all")}>
          <TabsList>
            <TabsTrigger value="mine">Mine · {mine.length}</TabsTrigger>
            <TabsTrigger value="all">All gates · {openRows.length}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[1fr_340px] items-start">
        {/* gate list — the same rows /approvals renders */}
        <div className="space-y-2 min-w-0">
          {rows.length === 0 && (
            <div className="glass-panel p-12 text-center space-y-3">
              <CheckCircle2 className="size-10 text-status-done mx-auto" />
              <div className="text-sm font-medium">
                {tab === "mine"
                  ? "You're clear — no QA gates waiting."
                  : "All clear — no gates waiting."}
              </div>
              {tab === "mine" ? (
                <button
                  type="button"
                  onClick={() => setTab("all")}
                  className="text-xs text-primary hover:underline"
                >
                  See all gates
                </button>
              ) : (
                <div className="text-xs text-muted-foreground">The pod is running unblocked.</div>
              )}
            </div>
          )}
          {rows.map((r) => {
            if (r.kind === "approval") {
              const t = ticketOf(r.a.ticketId);
              if (!t) return null;
              const open = expanded === r.id;
              return (
                <ApprovalRow
                  key={r.id}
                  approval={r.a}
                  ticket={t}
                  open={open}
                  onToggle={() => setExpanded(open ? null : r.id)}
                  onApprove={(reason) => onApprove(r.a, reason)}
                  onReject={(fb) => onReject(r.a, fb)}
                />
              );
            }
            const open = expanded === r.id;
            return (
              <ClarificationRow
                key={r.id}
                gate={r.c}
                ticket={ticketOf(r.c.ticketId)}
                open={open}
                onToggle={() => setExpanded(open ? null : r.id)}
                onAnswer={(answer) => onAnswer(r.c, answer)}
              />
            );
          })}
        </div>

        {/* quality-posture rail */}
        <aside className="space-y-4 min-w-0">
          <Link
            to="/governance"
            className="glass-panel px-3 py-2.5 flex items-center gap-2 hover-lift text-left"
          >
            <ShieldCheck className="size-4 text-status-done shrink-0" />
            <span className="text-xs text-foreground/90">
              Validated deterministically · no LLM in the loop
            </span>
          </Link>

          <ValidatorPanel checks={postureChecks} compact />

          {/* My SLA mini — humans.ts workload */}
          <section className="glass-panel p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              My SLA · {qaLead.name.split(" ")[0]}
            </div>
            <div className="mt-1 text-sm font-semibold">
              Avg clearance {qaLead.workload.avgApprovalMin}m ·{" "}
              {qaLead.workload.slaBreaches} breaches
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
              <div>
                <div className="text-lg text-foreground tabular-nums">
                  {qaLead.workload.pendingApprovals}
                </div>
                pending on me
              </div>
              <div>
                <div className="text-lg text-foreground tabular-nums">
                  {qaLead.workload.decisionsToday}
                </div>
                decisions today
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
