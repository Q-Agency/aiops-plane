/**
 * ApprovalsView - "Gates": ONE queue, TWO kinds of human checkpoint -
 * approval gates (artifact sign-off) and clarification gates (the agent
 * needs an answer to proceed). Slice-2 reframe (C4/C1):
 *
 *   - kind switch (All · Approvals · Clarifications) + kind glyph per row
 *   - clarification rows interleaved by openedAt, answerable inline
 *   - approval rows click through to the client-grade review surface
 *     (/approvals/$gateId) - primary CTA for Spec/Design gates
 *   - inline decisions REQUIRE a typed reason (both approve and reject)
 *     and write the mock decision log (recordGateDecision)
 *   - rows decided on the review surface render as resolved stamps
 *
 * Wave-2 GATES slice:
 *   - P1-G1 policy chips on every row (artifact gate policy where the gate
 *     maps to a pipeline artifact, else the agent policy) + "sampled
 *     1-in-5" hint on auto-with-sampling rows
 *   - responsive <md: the list collapses to stacked cards sorted by SLA
 *     urgency (most-overdue first) linking to /approvals/$gateId; filters
 *     collapse into a single select. Desktop is untouched (md: prefixes).
 *   - decisions also land on the session audit ledger (audit-bridge)
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check, X, ChevronDown, ChevronRight, Clock, AlertTriangle,
  UserCircle2, Filter, ListChecks, FileText, FileCode2,
  GitPullRequest, TestTube2, MessageCircleQuestion, CheckCircle2,
  ArrowRight, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLive } from "@/hooks/useLiveTicker";
import type { Approval, Ticket } from "@/mock/types";
import {
  SpecPreview, DesignPreview, TasksPreview, CodePreview, QaPreview,
} from "@/components/traceability/TraceabilityView";
import { accountableFor, activeHumans } from "@/mock/humans";
import { agents as allAgents } from "@/mock/agents";
import {
  clarificationGates, gateDecisions, recordGateDecision,
  type ClarificationGate, type GateDecision,
} from "@/mock/approvals";
import {
  artifactKindForGate, REJECT_REASON_MIN_CHARS, SAMPLED_HINT,
} from "@/components/gates/gate-config";
import { GatePolicyChip } from "@/components/gates/GatePolicyChip";
import { artifactGatePolicyFor, gatePolicyFor } from "@/mock/gate-policies";
import { useDemoTick } from "@/mock/demo-bus";
import { appendAuditMock } from "@/mock/audit-bridge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { AgentId } from "@/mock/types";

type Gate = Approval["gate"];

const GATES: Gate[] = ["Spec Review", "Design Review", "Tasks Review", "Dev Review", "QA Review"];

const GATE_AGENT_ID: Record<Gate, AgentId> = {
  "Spec Review":   "ba",
  "Design Review": "sa",
  "Tasks Review":  "tasklist",
  "Dev Review":    "dev",
  "QA Review":     "qa",
};

const GATE_AGENT: Record<Gate, { name: string; color: string }> = {
  "Spec Review":   { name: "BA Agent",       color: "var(--agent-ba)" },
  "Design Review": { name: "SA Agent",       color: "var(--agent-sa)" },
  "Tasks Review":  { name: "Tasklist Agent", color: "var(--agent-tasklist)" },
  "Dev Review":    { name: "Dev Agent",      color: "var(--agent-dev)" },
  "QA Review":     { name: "QA Agent",       color: "var(--agent-qa)" },
};

const GATE_ICON: Record<Gate, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  "Spec Review":   FileText,
  "Design Review": FileCode2,
  "Tasks Review":  ListChecks,
  "Dev Review":    GitPullRequest,
  "QA Review":     TestTube2,
};

/** Spec & Design reviews route to the full client-grade review surface first. */
const FULL_REVIEW_PRIMARY: Set<Gate> = new Set(["Spec Review", "Design Review"]);

const ME = "Zlatko";
const ME_HUMAN_ID = "zlatko";
const SLA_MIN = 60;

type KindFilter = "all" | "approvals" | "clarifications";

/** Unified queue row - both gate kinds, interleaved by openedAt. */
type GateRow =
  | { kind: "approval"; id: string; openedAt: number; a: Approval }
  | { kind: "clarification"; id: string; openedAt: number; c: ClarificationGate };

function ago(ms: number) {
  const min = Math.max(0, Math.floor((Date.now() - ms) / 60000));
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}
function ageMin(ms: number) { return Math.max(0, Math.floor((Date.now() - ms) / 60000)); }

function agentOf(id: AgentId) {
  const a = allAgents.find((x) => x.id === id);
  return { name: a?.name ?? id.toUpperCase(), color: `var(--${a?.color ?? "agent-ba"})` };
}

const decisionFor = (gateId: string): GateDecision | undefined =>
  gateDecisions.find((d) => d.gateId === gateId);

/**
 * P1-G1 policy bits for one row - the artifact gate policy where the gate
 * maps to a pipeline ArtifactKind (approvals), else the agent policy alone
 * (clarifications).
 */
function policyBitsFor(r: GateRow) {
  const agentId = r.kind === "approval" ? GATE_AGENT_ID[r.a.gate] : r.c.agentId;
  const artifactKind = r.kind === "approval" ? artifactKindForGate(r.a.gate) : null;
  const artifactPolicy = artifactKind ? artifactGatePolicyFor(artifactKind) : undefined;
  return {
    policy: gatePolicyFor(agentId),
    artifactPolicy,
    sampled: artifactPolicy?.reviewMode === "auto-with-sampling",
  };
}

/** "⚠ 4h over SLA" / "⚠ 25m over SLA" - mobile card breach copy. */
function overSlaLabel(m: number): string {
  const over = Math.max(1, m - SLA_MIN);
  return over >= 60 ? `${Math.floor(over / 60)}h over SLA` : `${over}m over SLA`;
}

/** Single-select mobile filter - kind, mine, or breach (<md only). */
type MobileFilter = "all" | "approvals" | "clarifications" | "mine" | "breach";

export function ApprovalsView() {
  const { approvals, tickets, approve, reject } = useLive();
  // re-render when the Demo Director lands a staged mock mutation
  const demoTick = useDemoTick();
  const [kind, setKind] = useState<KindFilter>("all");
  const [mobileFilter, setMobileFilter] = useState<MobileFilter>("all");
  const [gate, setGate] = useState<Gate | "all">("all");
  const [approver, setApprover] = useState<string>("all");
  const [humanFilter, setHumanFilter] = useState<string>("all");
  const [groupByHuman, setGroupByHuman] = useState(false);
  const [ageBucket, setAge] = useState<"all" | "fresh" | "aging" | "breach">("all");
  const [expanded, setExpanded] = useState<string | null>(approvals[0]?.id ?? null);
  // bump after an inline decision so resolved stamps render immediately
  const [decisionTick, setDecisionTick] = useState(0);

  const approvers = useMemo(
    () => Array.from(new Set(approvals.map((a) => a.approver))).sort(),
    [approvals],
  );

  const humansInPod = useMemo(() => activeHumans(), []);

  const humanForRow = (r: GateRow): string =>
    r.kind === "approval" ? accountableFor(GATE_AGENT_ID[r.a.gate]).id : r.c.accountable;

  const assignedToMe = (r: GateRow): boolean =>
    r.kind === "approval" ? r.a.approver === ME : r.c.accountable === ME_HUMAN_ID;

  /* unified queue - approvals + clarifications interleaved by openedAt */
  const rows = useMemo<GateRow[]>(() => {
    const fromApprovals: GateRow[] = approvals.map((a) => ({
      kind: "approval" as const, id: a.id, openedAt: a.openedAt, a,
    }));
    const fromClarifications: GateRow[] = clarificationGates.map((c) => ({
      kind: "clarification" as const, id: c.id, openedAt: c.openedAt, c,
    }));
    return [...fromApprovals, ...fromClarifications].sort((x, y) => x.openedAt - y.openedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvals, decisionTick, demoTick]);

  const unresolved = useMemo(
    () => rows.filter((r) => !decisionFor(r.id)),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (kind === "approvals" && r.kind !== "approval") return false;
      if (kind === "clarifications" && r.kind !== "clarification") return false;
      // gate + approver filters only describe approval rows
      if (gate !== "all" && (r.kind !== "approval" || r.a.gate !== gate)) return false;
      if (approver !== "all" && (r.kind !== "approval" || r.a.approver !== approver)) return false;
      if (humanFilter !== "all" && humanForRow(r) !== humanFilter) return false;
      const m = ageMin(r.openedAt);
      if (ageBucket === "fresh"  && m >= 30) return false;
      if (ageBucket === "aging"  && (m < 30 || m >= SLA_MIN)) return false;
      if (ageBucket === "breach" && m < SLA_MIN) return false;
      return true;
    });
  }, [rows, kind, gate, approver, humanFilter, ageBucket]);

  /* mobile (<md) card stack - single-select filter, most-overdue first */
  const mobileRows = useMemo(() => {
    return unresolved
      .filter((r) => {
        switch (mobileFilter) {
          case "approvals": return r.kind === "approval";
          case "clarifications": return r.kind === "clarification";
          case "mine": return assignedToMe(r);
          case "breach": return ageMin(r.openedAt) >= SLA_MIN;
          default: return true;
        }
      })
      .sort((a, b) => a.openedAt - b.openedAt); // oldest = most over SLA first
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unresolved, mobileFilter]);

  /* per-human summary across ALL unresolved gates (ignores filters) */
  const perHuman = useMemo(() => {
    return humansInPod.map((h) => {
      const mine = unresolved.filter((r) => humanForRow(r) === h.id);
      const gates = Array.from(new Set(mine.map((r) =>
        r.kind === "approval" ? r.a.gate.replace(" Review", "") : "Clarification",
      ))).sort();
      return { human: h, count: mine.length, gates };
    });
  }, [unresolved, humansInPod]);

  const stats = useMemo(() => {
    const pending = unresolved.length;
    const avgMin = pending === 0
      ? 0
      : Math.round(unresolved.reduce((s, r) => s + ageMin(r.openedAt), 0) / pending);
    const breaches = unresolved.filter((r) => ageMin(r.openedAt) >= SLA_MIN).length;
    const mine = unresolved.filter(assignedToMe).length;
    return { pending, avgMin, breaches, mine };
  }, [unresolved]);

  const counts = useMemo(() => ({
    all: unresolved.length,
    approvals: unresolved.filter((r) => r.kind === "approval").length,
    clarifications: unresolved.filter((r) => r.kind === "clarification").length,
  }), [unresolved]);

  const ticketOf = (id: string): Ticket | undefined => tickets.find((t) => t.id === id);

  /* ---------- inline decisions (fast path; reason REQUIRED) ---------- */

  const onApprove = (a: Approval, reason: string) => {
    recordGateDecision({
      gateId: a.id, ticketId: a.ticketId, gateKind: "approval",
      decision: "approved", reason, actor: null,
    });
    appendAuditMock({ action: "gate.approved", target: a.id, detail: reason });
    approve(a.id); // row collapses out of the live queue
    setDecisionTick((n) => n + 1);
    toast.success(`${a.ticketId} approved - moved forward`, {
      description: `${a.gate} cleared · "${reason.slice(0, 90)}"`,
    });
  };

  const onReject = (a: Approval, feedback: string) => {
    recordGateDecision({
      gateId: a.id, ticketId: a.ticketId, gateKind: "approval",
      decision: "rejected", reason: feedback, actor: null,
    });
    appendAuditMock({ action: "gate.rejected", target: a.id, detail: feedback });
    reject(a.id);
    setDecisionTick((n) => n + 1);
    const back = GATE_AGENT[a.gate].name;
    toast(`${a.ticketId} returned to ${back} with feedback - rerunning`, {
      description: feedback.slice(0, 140),
      icon: <X className="size-4 text-status-error" />,
    });
  };

  const onAnswer = (c: ClarificationGate, answer: string) => {
    recordGateDecision({
      gateId: c.id, ticketId: c.ticketId, gateKind: "clarification",
      decision: "answered", reason: answer, actor: null,
    });
    appendAuditMock({ action: "clarification.answered", target: c.id, detail: answer });
    setDecisionTick((n) => n + 1);
    setExpanded(null);
    toast.success(`Answer sent to ${agentOf(c.agentId).name} - rerunning`, {
      description: answer.slice(0, 140),
    });
  };

  const renderRow = (r: GateRow) => {
    const resolved = decisionFor(r.id);
    if (resolved) {
      return <ResolvedGateRow key={r.id} row={r} decision={resolved} ticket={ticketOf(r.kind === "approval" ? r.a.ticketId : r.c.ticketId)} />;
    }
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
    const t = ticketOf(r.c.ticketId);
    const open = expanded === r.id;
    return (
      <ClarificationRow
        key={r.id}
        gate={r.c}
        ticket={t}
        open={open}
        onToggle={() => setExpanded(open ? null : r.id)}
        onAnswer={(answer) => onAnswer(r.c, answer)}
      />
    );
  };

  const allClear = unresolved.length === 0;

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4">
      {/* header */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">human gates</div>
        <h1 className="text-xl font-semibold tracking-tight">
          <span className="md:hidden">My gates</span>
          <span className="hidden md:inline">Gates</span>
        </h1>
        <div className="text-xs text-muted-foreground mt-0.5">
          <span className="md:hidden">Sorted by SLA urgency - tap a gate to review and decide.</span>
          <span className="hidden md:inline">Every pending human checkpoint - approvals to sign off and clarifications the agents need answered.</span>
        </div>
      </div>

      {/* stats (desktop) */}
      <div className="hidden md:grid md:grid-cols-4 gap-3">
        <Stat label="Gates pending"     value={stats.pending} sub={`${counts.approvals} approvals · ${counts.clarifications} clarifications`} />
        <Stat label="Avg gate age"      value={`${stats.avgMin}m`} sub={`SLA · ${SLA_MIN}m`} />
        <Stat
          label="SLA breaches"
          value={stats.breaches}
          sub={stats.breaches ? "needs attention" : "all within SLA"}
          tone={stats.breaches ? "error" : "ok"}
        />
        <Stat
          label={`Assigned to ${ME}`}
          value={stats.mine}
          sub="your personal queue"
          tone="me"
        />
      </div>

      {/* per-human summaries (desktop) */}
      <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {perHuman.map(({ human, count, gates }) => {
          const color = `var(--agent-${human.primaryAgentId})`;
          const active = humanFilter === human.id;
          return (
            <button
              key={human.id}
              onClick={() => setHumanFilter(active ? "all" : human.id)}
              className={cn(
                "glass-panel px-3 py-2 text-left hover-lift transition-colors",
                active && "border-primary/60 bg-primary/5",
              )}
              title={`Filter by accountable: ${human.name}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-7 rounded-full grid place-items-center text-[10px] font-mono font-semibold border"
                  style={{
                    color,
                    borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
                    background: `color-mix(in oklab, ${color} 14%, transparent)`,
                  }}
                >{human.initials}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{human.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {count} pending{gates.length > 0 ? ` · ${gates.join(" + ")}` : ""}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* mobile filter - everything collapses into one select (<md) */}
      <div className="md:hidden flex items-center gap-2">
        <Select value={mobileFilter} onValueChange={(v) => setMobileFilter(v as MobileFilter)}>
          <SelectTrigger className="h-8 flex-1 text-xs bg-white/5 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All gates · {counts.all}</SelectItem>
            <SelectItem value="approvals" className="text-xs">Approvals · {counts.approvals}</SelectItem>
            <SelectItem value="clarifications" className="text-xs">Clarifications · {counts.clarifications}</SelectItem>
            <SelectItem value="mine" className="text-xs">Assigned to me · {stats.mine}</SelectItem>
            <SelectItem value="breach" className="text-xs">Over SLA · {stats.breaches}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
          {mobileRows.length} of {counts.all}
        </span>
      </div>

      {/* kind switch - the unified-queue reframe */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
        <div className="glass-panel p-1 inline-flex gap-1">
          {([
            ["all", `All · ${counts.all}`],
            ["approvals", `Approvals · ${counts.approvals}`],
            ["clarifications", `Clarifications · ${counts.clarifications}`],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                kind === k
                  ? "bg-primary/15 text-primary border border-primary/40"
                  : "text-muted-foreground hover:text-foreground border border-transparent",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground">
          Approvals sign an artifact off · clarifications unblock an agent with an answer.
        </span>
      </div>

      {/* filters (desktop) */}
      <div className="glass-panel px-3 py-2 hidden md:flex items-center gap-2 flex-wrap text-xs">
        <Filter className="size-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mr-1">filter</span>

        <FilterGroup label="gate">
          <Chip active={gate === "all"} onClick={() => setGate("all")}>all</Chip>
          {GATES.map((g) => (
            <Chip key={g} active={gate === g} onClick={() => setGate(g)}>{g}</Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="approver">
          <Chip active={approver === "all"} onClick={() => setApprover("all")}>all</Chip>
          {approvers.map((p) => (
            <Chip key={p} active={approver === p} onClick={() => setApprover(p)}>
              {p === ME ? `${p} (me)` : p}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="accountable">
          <Chip active={humanFilter === "all"} onClick={() => setHumanFilter("all")}>all</Chip>
          {humansInPod.map((h) => (
            <Chip key={h.id} active={humanFilter === h.id} onClick={() => setHumanFilter(h.id)}>
              {h.initials}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="age">
          <Chip active={ageBucket === "all"}    onClick={() => setAge("all")}>any</Chip>
          <Chip active={ageBucket === "fresh"}  onClick={() => setAge("fresh")}>{"< 30m"}</Chip>
          <Chip active={ageBucket === "aging"}  onClick={() => setAge("aging")}>30-60m</Chip>
          <Chip active={ageBucket === "breach"} onClick={() => setAge("breach")} tone="error">SLA breach</Chip>
        </FilterGroup>

        <FilterGroup label="group">
          <Chip active={!groupByHuman} onClick={() => setGroupByHuman(false)}>flat</Chip>
          <Chip active={groupByHuman}  onClick={() => setGroupByHuman(true)}>by human</Chip>
        </FilterGroup>

        <div className="ml-auto text-[11px] font-mono text-muted-foreground">
          {filtered.length} of {rows.length}
        </div>
      </div>

      {/* list */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {/* mobile card stack (<md) - most-overdue first, cards open the review surface */}
        <div className="md:hidden space-y-2">
          {allClear && (
            <div className="glass-panel p-10 text-center space-y-3">
              <CheckCircle2 className="size-10 text-status-done mx-auto" />
              <div className="text-sm font-medium">No gates waiting on you</div>
              <div className="text-xs text-muted-foreground">We'll notify you the moment one opens.</div>
            </div>
          )}
          {!allClear && mobileRows.length === 0 && (
            <div className="glass-panel p-8 text-center text-sm text-muted-foreground">
              No gates match this filter.
            </div>
          )}
          {mobileRows.map((r) => (
            <MobileGateCard
              key={r.id}
              row={r}
              ticket={ticketOf(r.kind === "approval" ? r.a.ticketId : r.c.ticketId)}
            />
          ))}
        </div>

        {/* desktop list (unchanged) */}
        <div className="hidden md:block space-y-2">
        {allClear && (
          <div className="glass-panel p-12 text-center space-y-3">
            <CheckCircle2 className="size-10 text-status-done mx-auto" />
            <div className="text-sm font-medium">All clear - no gates waiting.</div>
            <div className="text-xs text-muted-foreground">The pod is running unblocked.</div>
          </div>
        )}
        {!allClear && filtered.length === 0 && (
          <div className="glass-panel p-10 text-center text-sm text-muted-foreground">
            No gates match these filters.
          </div>
        )}
        {!groupByHuman && filtered.map(renderRow)}
        {groupByHuman && humansInPod.map((h) => {
          const items = filtered.filter((r) => humanForRow(r) === h.id);
          if (items.length === 0) return null;
          const color = `var(--agent-${h.primaryAgentId})`;
          return (
            <div key={h.id} className="space-y-2">
              <div className="flex items-center gap-2 pt-2 pb-1 border-b border-border">
                <span
                  className="size-6 rounded-full grid place-items-center text-[10px] font-mono font-semibold border"
                  style={{
                    color,
                    borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
                    background: `color-mix(in oklab, ${color} 14%, transparent)`,
                  }}
                >{h.initials}</span>
                <span className="text-sm font-semibold">{h.name}</span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  · {items.length} pending
                </span>
              </div>
              {items.map(renderRow)}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

/* ---------- resolved stamp row ---------- */

function ResolvedGateRow({
  row, decision, ticket,
}: { row: GateRow; decision: GateDecision; ticket?: Ticket }) {
  const ok = decision.decision !== "rejected";
  const verb =
    decision.decision === "approved" ? "Approved"
    : decision.decision === "rejected" ? "Rejected & returned"
    : "Answered";
  const kindLabel = row.kind === "approval" ? row.a.gate : "Clarification";
  return (
    <div className={cn(
      "glass-panel px-3 py-2.5 flex items-center gap-3 opacity-75",
      ok ? "border-status-done/30" : "border-status-error/30",
    )}>
      {ok
        ? <CheckCircle2 className="size-4 text-status-done shrink-0" />
        : <Undo2 className="size-4 text-status-error shrink-0" />}
      <span className="font-mono text-xs text-foreground/90">{decision.ticketId}</span>
      <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{kindLabel}</span>
      <span className={cn("text-xs font-medium", ok ? "text-status-done" : "text-status-error")}>
        {verb}
      </span>
      {decision.reason && (
        <span className="text-[11px] text-muted-foreground truncate flex-1">
          “{decision.reason}”
        </span>
      )}
      {!decision.reason && <span className="flex-1" />}
      {ticket && <span className="hidden md:inline text-[11px] text-muted-foreground truncate max-w-[24ch]">{ticket.title}</span>}
      <span className="text-[10px] font-mono text-muted-foreground" suppressHydrationWarning>
        {ago(decision.ts)} ago · audit-logged
      </span>
    </div>
  );
}

/* ---------- mobile gate card (<md) ---------- */

function MobileGateCard({ row, ticket }: { row: GateRow; ticket?: Ticket }) {
  const isApproval = row.kind === "approval";
  const agent = isApproval ? GATE_AGENT[row.a.gate] : agentOf(row.c.agentId);
  const Icon = isApproval ? GATE_ICON[row.a.gate] : MessageCircleQuestion;
  const kindLabel = isApproval ? row.a.gate : "Clarification";
  const { policy, artifactPolicy, sampled } = policyBitsFor(row);
  const m = ageMin(row.openedAt);
  const overdue = m >= SLA_MIN;
  const aging = !overdue && m >= 30;
  const who = isApproval
    ? row.a.approver
    : accountableFor(row.c.agentId).name.split(" ")[0];

  return (
    <Link
      to="/approvals/$gateId"
      params={{ gateId: row.id }}
      className={cn(
        "glass-panel block p-3 space-y-2 active:bg-white/[0.04] transition-colors",
        overdue && "border-l-2 border-l-status-error",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono border shrink-0"
          style={{ color: agent.color, borderColor: `color-mix(in oklab, ${agent.color} 40%, transparent)`, background: `color-mix(in oklab, ${agent.color} 10%, transparent)` }}
        >
          <Icon className="size-3" />
          {kindLabel}
        </span>
        <span className="flex-1" />
        <span
          suppressHydrationWarning
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0",
            overdue
              ? "border-status-error/40 bg-status-error/10 text-status-error"
              : aging
                ? "border-status-waiting/40 bg-status-waiting/10 text-status-waiting"
                : "border-status-done/40 bg-status-done/10 text-status-done",
          )}
        >
          {overdue ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />}
          {overdue ? `⚠ ${overSlaLabel(m)}` : `Due in ${SLA_MIN - m}m`}
        </span>
      </div>

      <div className="flex items-start gap-2">
        <span className="font-mono text-xs text-foreground/90 shrink-0 pt-px">
          {isApproval ? row.a.ticketId : row.c.ticketId}
        </span>
        <span className="text-sm leading-snug line-clamp-2">
          {isApproval ? (ticket?.title ?? "") : row.c.question}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <GatePolicyChip policy={policy} artifactPolicy={artifactPolicy} compact />
        {sampled && (
          <span className="text-[9px] font-mono text-muted-foreground/70">{SAMPLED_HINT}</span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <UserCircle2 className="size-3" /> {who}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[16ch]">
          {isApproval ? row.a.artifact : `${agent.name} asks`}
        </span>
      </div>
    </Link>
  );
}

/* ---------- approval row ---------- */

/** Exported for reuse by the QA-scoped "/" landing (roles/ScopedGateLanding). */
export function ApprovalRow({
  approval, ticket, open, onToggle, onApprove, onReject,
}: {
  approval: Approval;
  ticket: Ticket;
  open: boolean;
  onToggle: () => void;
  onApprove: (reason: string) => void;
  onReject: (feedback: string) => void;
}) {
  const Icon = GATE_ICON[approval.gate];
  const agent = GATE_AGENT[approval.gate];
  const m = ageMin(approval.openedAt);
  const breached = m >= SLA_MIN;
  const mine = approval.approver === ME;
  const fullReviewPrimary = FULL_REVIEW_PRIMARY.has(approval.gate);
  // P1-G1 - the gate's policy regime, keyed by artifact kind
  const policy = gatePolicyFor(GATE_AGENT_ID[approval.gate]);
  const artifactKind = artifactKindForGate(approval.gate);
  const artifactPolicy = artifactKind ? artifactGatePolicyFor(artifactKind) : undefined;
  const sampled = artifactPolicy?.reviewMode === "auto-with-sampling";
  const [reason, setReason] = useState("");
  const approveDisabled = reason.trim().length === 0;
  const rejectDisabled = reason.trim().length < REJECT_REASON_MIN_CHARS;

  return (
    <div className={cn(
      "glass-panel overflow-hidden transition-colors",
      open && "ring-1 ring-border",
      mine && !open && "border-l-2 border-l-primary",
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.02]"
      >
        {open ? <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}

        <span
          className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono border"
          style={{ color: agent.color, borderColor: `color-mix(in oklab, ${agent.color} 40%, transparent)`, background: `color-mix(in oklab, ${agent.color} 10%, transparent)` }}
        >
          <Icon className="size-3" />
          {approval.gate}
        </span>

        <GatePolicyChip policy={policy} artifactPolicy={artifactPolicy} compact className="shrink-0" />
        {sampled && (
          <span className="hidden lg:inline text-[9px] font-mono text-muted-foreground/70 shrink-0">
            {SAMPLED_HINT}
          </span>
        )}

        <span className="font-mono text-xs text-foreground/90">{approval.ticketId}</span>
        <span className="text-sm truncate flex-1">{ticket.title}</span>

        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
          <UserCircle2 className="size-3.5" />
          {approval.approver}{mine && <span className="text-primary">·me</span>}
        </span>

        <span className={cn(
          "inline-flex items-center gap-1 text-[11px] font-mono",
          breached ? "text-status-error" : m >= 30 ? "text-status-waiting" : "text-muted-foreground",
        )} suppressHydrationWarning>
          {breached ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />}
          {ago(approval.openedAt)}
        </span>

        <span className="hidden md:inline text-[10px] font-mono text-muted-foreground">
          {ticket.codebase} · {ticket.priority}
        </span>
      </button>

      {open && (
        <div className="border-t border-border p-4 grid gap-4 lg:grid-cols-[1fr_280px] items-start">
          <div className="min-w-0 max-h-[460px] overflow-y-auto pr-1">
            <ArtifactPreview gate={approval.gate} ticket={ticket} />
          </div>

          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">decision</div>

            {/* the client-grade review surface - primary for Spec/Design */}
            <Link
              to="/approvals/$gateId"
              params={{ gateId: approval.id }}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-md text-sm font-medium px-3 py-2 transition-colors",
                fullReviewPrimary
                  ? "bg-primary/15 border border-primary/50 text-primary hover:bg-primary/25"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
              )}
            >
              Open full review <ArrowRight className="size-4" />
            </Link>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                Decision note (required)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Why is this good enough to ship? Rejections need ≥10 chars - they become the agent's added context on rerun."
                className="w-full rounded-md bg-background border border-border px-2.5 py-2 text-xs leading-relaxed outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                disabled={approveDisabled}
                onClick={() => onApprove(reason.trim())}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-status-done/15 border border-status-done/40 text-status-done text-sm font-medium px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-status-done/25 transition-colors"
                title={approveDisabled ? "Type a decision note - even a one-liner. It feeds the human-decision audit." : undefined}
              >
                <Check className="size-4" /> Approve gate
              </button>
              <button
                disabled={rejectDisabled}
                onClick={() => onReject(reason.trim())}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-status-error/10 border border-status-error/40 text-status-error text-sm font-medium px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-status-error/20 transition-colors"
                title={rejectDisabled ? "What's missing or wrong? This becomes the agent's added context on rerun (min 10 chars)." : undefined}
              >
                <X className="size-4" /> Reject with feedback
              </button>
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                Rejecting returns <span className="font-mono">{approval.ticketId}</span> to{" "}
                <span className="font-medium" style={{ color: agent.color }}>{agent.name}</span>{" "}
                with your note attached as added context.
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-1.5 text-[11px] font-mono text-muted-foreground">
              <Meta k="artifact" v={approval.artifact} />
              <Meta k="approver" v={approval.approver} />
              <Meta k="opened"   v={ago(approval.openedAt) + " ago"} />
              <Meta k="sla"      v={breached ? <span className="text-status-error">breached</span> : "within"} />
              {ticket.rerunCount ? <Meta k="rerun" v={`↩ ${ticket.rerunCount}`} /> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- clarification row ---------- */

/** Exported for reuse by the QA-scoped "/" landing (roles/ScopedGateLanding). */
export function ClarificationRow({
  gate, ticket, open, onToggle, onAnswer,
}: {
  gate: ClarificationGate;
  ticket?: Ticket;
  open: boolean;
  onToggle: () => void;
  onAnswer: (answer: string) => void;
}) {
  const agent = agentOf(gate.agentId);
  const accountable = accountableFor(gate.agentId);
  const m = ageMin(gate.openedAt);
  const breached = m >= SLA_MIN;
  const mine = gate.accountable === ME_HUMAN_ID;
  const [answer, setAnswer] = useState(gate.proposedAnswer ?? "");
  const sendDisabled = answer.trim().length === 0;

  return (
    <div className={cn(
      "glass-panel overflow-hidden transition-colors",
      open && "ring-1 ring-border",
      mine && !open && "border-l-2 border-l-primary",
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.02]"
      >
        {open ? <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}

        <span
          className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono border"
          style={{ color: agent.color, borderColor: `color-mix(in oklab, ${agent.color} 40%, transparent)`, background: `color-mix(in oklab, ${agent.color} 10%, transparent)` }}
        >
          <MessageCircleQuestion className="size-3" />
          Clarification
        </span>

        <GatePolicyChip policy={gatePolicyFor(gate.agentId)} compact className="shrink-0" />

        <span className="font-mono text-xs text-foreground/90">{gate.ticketId}</span>
        <span className="text-sm truncate flex-1">{gate.question}</span>

        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
          <UserCircle2 className="size-3.5" />
          {accountable.name.split(" ")[0]}{mine && <span className="text-primary">·me</span>}
        </span>

        <span className={cn(
          "inline-flex items-center gap-1 text-[11px] font-mono",
          breached ? "text-status-error" : m >= 30 ? "text-status-waiting" : "text-muted-foreground",
        )} suppressHydrationWarning>
          {breached ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />}
          {ago(gate.openedAt)}
        </span>

        <span className="hidden md:inline text-[10px] font-mono text-muted-foreground">
          {agent.name} asks
        </span>
      </button>

      {open && (
        <div className="border-t border-border p-4 grid gap-4 lg:grid-cols-[1fr_280px] items-start">
          {/* the question */}
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircleQuestion className="size-4 text-primary" />
              {agent.name} needs an answer to proceed
            </div>
            <p className="text-sm text-foreground">{gate.question}</p>
            {ticket && (
              <p className="text-[11px] text-muted-foreground">
                Blocks <span className="font-mono">{gate.ticketId}</span> · {ticket.title} ·{" "}
                {ticket.codebase} · {ticket.priority}
              </p>
            )}
            {gate.options && (
              <div className="flex flex-wrap gap-2">
                {gate.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setAnswer(o)}
                    className={cn(
                      "px-2.5 py-1.5 rounded border text-xs transition-colors",
                      answer === o
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-white/5 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}
            {gate.proposedAnswer && (
              <p className="text-xs text-muted-foreground">
                <span className="text-[10px] uppercase tracking-wider font-mono mr-1.5">agent suggests</span>
                {gate.proposedAnswer}
              </p>
            )}
          </div>

          {/* the answer */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">your answer</div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Pick an option or type your answer - it becomes the agent's added context."
              className="w-full rounded-md bg-background border border-border px-2.5 py-2 text-xs leading-relaxed outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              disabled={sendDisabled}
              onClick={() => onAnswer(answer.trim())}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary/15 border border-primary/50 text-primary text-sm font-medium px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/25 transition-colors"
            >
              Send answer
            </button>
            <Link
              to="/approvals/$gateId"
              params={{ gateId: gate.id }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border text-xs px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
            >
              Open full review <ArrowRight className="size-3.5" />
            </Link>
            <div className="pt-3 border-t border-border space-y-1.5 text-[11px] font-mono text-muted-foreground">
              <Meta k="asked by" v={agent.name} />
              <Meta k="answers"  v={accountable.name} />
              <Meta k="opened"   v={ago(gate.openedAt) + " ago"} />
              <Meta k="sla"      v={breached ? <span className="text-status-error">breached</span> : "within"} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArtifactPreview({ gate, ticket }: { gate: Gate; ticket: Ticket }) {
  switch (gate) {
    case "Spec Review":   return <SpecPreview   ticket={ticket} />;
    case "Design Review": return <DesignPreview ticket={ticket} />;
    case "Tasks Review":  return <TasksPreview  ticket={ticket} />;
    case "Dev Review":    return <CodePreview   ticket={ticket} />;
    case "QA Review":     return <QaPreview     ticket={ticket} />;
  }
}

/* ---------- small bits ---------- */

function Stat({
  label, value, sub, tone = "default",
}: { label: string; value: number | string; sub?: string; tone?: "default" | "error" | "ok" | "me" }) {
  return (
    <div className={cn(
      "glass-panel px-4 py-3",
      tone === "error" && "border-status-error/40",
      tone === "me"    && "border-primary/40",
    )}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={cn(
        "text-2xl font-semibold mt-0.5 tabular-nums",
        tone === "error" && "text-status-error",
        tone === "ok"    && "text-status-done",
        tone === "me"    && "text-primary",
      )}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono ml-2 mr-1">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  children, active, onClick, tone,
}: { children: React.ReactNode; active?: boolean; onClick: () => void; tone?: "error" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[11px] font-mono rounded px-2 py-0.5 border transition-colors",
        active
          ? tone === "error"
            ? "bg-status-error/20 border-status-error/50 text-status-error"
            : "bg-primary/15 border-primary/50 text-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
      )}
    >
      {children}
    </button>
  );
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] uppercase tracking-wider">{k}</span>
      <span className="text-foreground/80 truncate">{v}</span>
    </div>
  );
}
