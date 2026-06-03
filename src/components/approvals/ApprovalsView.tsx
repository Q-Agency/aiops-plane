import { useMemo, useState } from "react";
import {
  Check, X, ChevronDown, ChevronRight, Clock, AlertTriangle,
  UserCircle2, Filter, ListChecks, FileText, FileCode2,
  GitPullRequest, TestTube2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLive } from "@/hooks/useLiveTicker";
import type { Approval, Ticket } from "@/mock/types";
import {
  SpecPreview, DesignPreview, TasksPreview, CodePreview, QaPreview,
} from "@/components/traceability/TraceabilityView";
import { accountableFor, activeHumans } from "@/mock/humans";
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

const ME = "Zlatko";
const SLA_MIN = 60;

function ago(ms: number) {
  const min = Math.max(0, Math.floor((Date.now() - ms) / 60000));
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}
function ageMin(ms: number) { return Math.max(0, Math.floor((Date.now() - ms) / 60000)); }

export function ApprovalsView() {
  const { approvals, tickets, approve, reject } = useLive();
  const [gate, setGate] = useState<Gate | "all">("all");
  const [approver, setApprover] = useState<string>("all");
  const [humanFilter, setHumanFilter] = useState<string>("all");
  const [groupByHuman, setGroupByHuman] = useState(false);
  const [ageBucket, setAge] = useState<"all" | "fresh" | "aging" | "breach">("all");
  const [expanded, setExpanded] = useState<string | null>(approvals[0]?.id ?? null);

  const approvers = useMemo(
    () => Array.from(new Set(approvals.map((a) => a.approver))).sort(),
    [approvals],
  );

  const humansInPod = useMemo(() => activeHumans(), []);

  const humanForApproval = (a: Approval) =>
    accountableFor(GATE_AGENT_ID[a.gate]);

  const filtered = useMemo(() => {
    return approvals.filter((a) => {
      if (gate !== "all" && a.gate !== gate) return false;
      if (approver !== "all" && a.approver !== approver) return false;
      if (humanFilter !== "all" && humanForApproval(a).id !== humanFilter) return false;
      const m = ageMin(a.openedAt);
      if (ageBucket === "fresh"  && m >= 30) return false;
      if (ageBucket === "aging"  && (m < 30 || m >= SLA_MIN)) return false;
      if (ageBucket === "breach" && m < SLA_MIN) return false;
      return true;
    }).sort((x, y) => x.openedAt - y.openedAt);
  }, [approvals, gate, approver, humanFilter, ageBucket]);

  // per-human summary across ALL approvals (ignores filters)
  const perHuman = useMemo(() => {
    return humansInPod.map((h) => {
      const mine = approvals.filter((a) => humanForApproval(a).id === h.id);
      const gates = Array.from(new Set(mine.map((a) => a.gate.replace(" Review", "")))).sort();
      return { human: h, count: mine.length, gates };
    });
  }, [approvals, humansInPod]);

  const stats = useMemo(() => {
    const pending = approvals.length;
    const avgMin = pending === 0 ? 0 : Math.round(approvals.reduce((s, a) => s + ageMin(a.openedAt), 0) / pending);
    const breaches = approvals.filter((a) => ageMin(a.openedAt) >= SLA_MIN).length;
    const mine = approvals.filter((a) => a.approver === ME).length;
    return { pending, avgMin, breaches, mine };
  }, [approvals]);

  const ticketOf = (id: string): Ticket | undefined => tickets.find((t) => t.id === id);

  const onApprove = (a: Approval) => {
    approve(a.id);
    toast.success(`${a.ticketId} approved — moved forward`, {
      description: `${a.gate} cleared by ${ME}`,
    });
  };

  const onReject = (a: Approval, feedback: string) => {
    reject(a.id);
    const back = GATE_AGENT[a.gate].name;
    toast(`${a.ticketId} returned to ${back} with feedback — rerunning`, {
      description: feedback.slice(0, 140),
      icon: <X className="size-4 text-status-error" />,
    });
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4">
      {/* header */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">human gates</div>
        <h1 className="text-xl font-semibold tracking-tight">Approvals queue</h1>
        <div className="text-xs text-muted-foreground mt-0.5">
          Every pending human checkpoint across the pipeline — approve, or reject with feedback to send back.
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Approvals pending"   value={stats.pending} sub="across all gates" />
        <Stat label="Avg approval age"    value={`${stats.avgMin}m`} sub={`SLA · ${SLA_MIN}m`} />
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

      {/* per-human summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
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
                    {count} pending{gates.length > 0 ? ` · ${gates.join(" + ")} gates` : ""}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* filters */}
      <div className="glass-panel px-3 py-2 flex items-center gap-2 flex-wrap text-xs">
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
          <Chip active={ageBucket === "aging"}  onClick={() => setAge("aging")}>30–60m</Chip>
          <Chip active={ageBucket === "breach"} onClick={() => setAge("breach")} tone="error">SLA breach</Chip>
        </FilterGroup>

        <FilterGroup label="group">
          <Chip active={!groupByHuman} onClick={() => setGroupByHuman(false)}>flat</Chip>
          <Chip active={groupByHuman}  onClick={() => setGroupByHuman(true)}>by human</Chip>
        </FilterGroup>

        <div className="ml-auto text-[11px] font-mono text-muted-foreground">
          {filtered.length} of {approvals.length}
        </div>
      </div>

      {/* list */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
        {filtered.length === 0 && (
          <div className="glass-panel p-10 text-center text-sm text-muted-foreground">
            No approvals match these filters.
          </div>
        )}
        {!groupByHuman && filtered.map((a) => {
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
              onApprove={() => onApprove(a)}
              onReject={(fb) => onReject(a, fb)}
            />
          );
        })}
        {groupByHuman && humansInPod.map((h) => {
          const items = filtered.filter((a) => humanForApproval(a).id === h.id);
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
                  · {items.length} pending across {Array.from(new Set(items.map((i) => i.gate.replace(" Review","")))).join(" + ")} gates
                </span>
              </div>
              {items.map((a) => {
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
                    onApprove={() => onApprove(a)}
                    onReject={(fb) => onReject(a, fb)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- row ---------- */

function ApprovalRow({
  approval, ticket, open, onToggle, onApprove, onReject,
}: {
  approval: Approval;
  ticket: Ticket;
  open: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: (feedback: string) => void;
}) {
  const Icon = GATE_ICON[approval.gate];
  const agent = GATE_AGENT[approval.gate];
  const m = ageMin(approval.openedAt);
  const breached = m >= SLA_MIN;
  const mine = approval.approver === ME;
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");

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

        <span className="font-mono text-xs text-foreground/90">{approval.ticketId}</span>
        <span className="text-sm truncate flex-1">{ticket.title}</span>

        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
          <UserCircle2 className="size-3.5" />
          {approval.approver}{mine && <span className="text-primary">·me</span>}
        </span>

        <span className={cn(
          "inline-flex items-center gap-1 text-[11px] font-mono",
          breached ? "text-status-error" : m >= 30 ? "text-status-waiting" : "text-muted-foreground",
        )}>
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
            {!rejecting ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={onApprove}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-status-done/15 border border-status-done/40 text-status-done text-sm font-medium px-3 py-2 hover:bg-status-done/25 transition-colors"
                >
                  <Check className="size-4" /> Approve gate
                </button>
                <button
                  onClick={() => setRejecting(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-status-error/10 border border-status-error/40 text-status-error text-sm font-medium px-3 py-2 hover:bg-status-error/20 transition-colors"
                >
                  <X className="size-4" /> Reject with feedback
                </button>
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  Rejecting returns <span className="font-mono">{approval.ticketId}</span> to{" "}
                  <span className="font-medium" style={{ color: agent.color }}>{agent.name}</span>{" "}
                  with your feedback attached as added context.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Feedback for {agent.name}
                </label>
                <textarea
                  autoFocus
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={6}
                  placeholder="What's missing or wrong? Be specific — this becomes the agent's added context on rerun."
                  className="w-full rounded-md bg-background border border-border px-2.5 py-2 text-xs leading-relaxed font-mono outline-none focus:ring-1 focus:ring-primary/50"
                />
                <div className="flex gap-2">
                  <button
                    disabled={!feedback.trim()}
                    onClick={() => onReject(feedback.trim())}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-status-error/15 border border-status-error/50 text-status-error text-xs font-medium px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-status-error/25"
                  >
                    Send back to {agent.name}
                  </button>
                  <button
                    onClick={() => { setRejecting(false); setFeedback(""); }}
                    className="rounded-md border border-border text-xs px-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

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
