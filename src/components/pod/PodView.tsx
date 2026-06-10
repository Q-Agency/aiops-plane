import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users, AlertTriangle, Clock, CheckCircle2, Activity, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { agents as allAgents } from "@/mock/agents";
import {
  activeHumans, capacityInfo, delegateOf, humanById, ownershipMap,
  THROTTLE_POLICY_LINE,
} from "@/mock/humans";
import { appendAuditMock } from "@/mock/audit-bridge";
import type { AgentId } from "@/mock/types";
import { MembersRoles } from "@/components/people/MembersRoles";
import { CoverageStrip } from "@/components/pod/CoverageStrip";
import { useAcceptance, UNACCEPTED_HUMAN_ID } from "@/components/welcome/acceptance";
import { cn } from "@/lib/utils";

const agentMeta = (id: AgentId) => {
  const a = allAgents.find((x) => x.id === id)!;
  return { name: a.name, color: `var(--${a.color})`, state: a.state };
};

const ORDERED_AGENTS: AgentId[] = ["curator", "ba", "pm", "sa", "tasklist", "dev", "review", "qa"];

export function PodView() {
  const baseMap = useMemo(() => ownershipMap(), []);
  const humans = useMemo(() => activeHumans(), []);
  // P1-O2: coverage is accepted, not assigned — null until /welcome's Accept.
  const acceptance = useAcceptance();
  const orderedAgents = ORDERED_AGENTS;

  // P1-O1: session reassignments overlay the seeded ownership (optimistic,
  // audited; the new assignee stays amber until the /welcome handshake).
  const [reassigned, setReassigned] = useState<Partial<Record<AgentId, string>>>({});
  const map = useMemo<Record<AgentId, string>>(
    () => ({ ...baseMap, ...reassigned }),
    [baseMap, reassigned],
  );
  const ownedBy = (humanId: string) => orderedAgents.filter((a) => map[a] === humanId);

  const [reassignAgent, setReassignAgent] = useState<AgentId | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const reassignFrom = reassignAgent ? humanById(map[reassignAgent]) : undefined;

  function closeReassign() {
    setReassignAgent(null);
    setReassignTo("");
  }

  function confirmReassign() {
    if (!reassignAgent || !reassignTo) return;
    const agent = agentMeta(reassignAgent);
    const from = humanById(map[reassignAgent]);
    const to = humanById(reassignTo);
    const entry = appendAuditMock({
      action: "human.reassigned",
      target: reassignAgent,
      detail: `${from?.name ?? "?"} → ${to?.name ?? "?"} — pending acceptance on /welcome (accountability transfers on accept)`,
      actorName: humanById("zlatko")?.name ?? "Zlatko",
    });
    setReassigned((prev) => ({ ...prev, [reassignAgent]: reassignTo }));
    closeReassign();
    toast.success("Reassigned — written to the audit ledger ✓", {
      description: `human.reassigned · ${agent.name} · ${from?.name} → ${to?.name} · ledger #${entry.id}`,
    });
  }

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            human ↔ agent ownership
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Accountability</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            Every agent has exactly one accountable human. One human can cover multiple agents.
          </div>
        </div>
        <div className="text-[11px] font-mono text-muted-foreground glass-panel px-3 py-1.5">
          <span className="text-foreground">{humans.length}</span> humans
          <span className="mx-1.5">·</span>
          <span className="text-foreground">{orderedAgents.length}</span> agents
        </div>
      </div>

      {/* members & roles (C11) — management surface; matrix below stays the hero */}
      <MembersRoles />

      {/* roster */}
      <section className="space-y-2">
        <SectionHead icon={Users} title="Roster" sub="Accountable humans · live workload" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {humans.map((h) => {
            const owned = ownedBy(h.id);
            const primary = agentMeta(h.primaryAgentId);
            const cap = capacityInfo(h);
            const deputy = delegateOf(h);
            return (
              <div
                key={h.id}
                className="glass-panel p-4 hover-lift block group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="size-11 rounded-full grid place-items-center font-mono font-semibold text-sm border"
                    style={{
                      color: primary.color,
                      borderColor: `color-mix(in oklab, ${primary.color} 50%, transparent)`,
                      background: `color-mix(in oklab, ${primary.color} 12%, transparent)`,
                    }}
                  >
                    {h.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-sm truncate">{h.name}</div>
                      {h.workload.slaBreaches > 0 && (
                        <span className="text-[10px] font-mono px-1 rounded border border-status-error/50 bg-status-error/10 text-status-error glow-pulse">
                          {h.workload.slaBreaches} SLA
                        </span>
                      )}
                      {h.status === "ooo" && deputy && (
                        <span
                          title={`${h.name} OOO → ${deputy.name} covers · accountability stays with ${h.name}`}
                          className="text-[10px] font-mono px-1 rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting"
                        >
                          OOO · deputy {deputy.name.split(" ")[0]}
                        </span>
                      )}
                      {h.status !== "ooo" && cap?.near && (
                        <span
                          title={`${h.name} near capacity — ${cap.used}/${cap.cap} gates today. ${THROTTLE_POLICY_LINE}`}
                          className="text-[10px] font-mono px-1 rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting"
                        >
                          {cap.used}/{cap.cap} today
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{h.role}</div>
                    {h.workingHours && (
                      <div className="text-[10px] font-mono text-muted-foreground/80 truncate">
                        {h.workingHours.start}–{h.workingHours.end} {h.workingHours.tz} · {h.workingHours.days}
                      </div>
                    )}
                  </div>
                </div>

                {/* agent chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {owned.map((aid) => {
                    const m = agentMeta(aid);
                    const dot =
                      m.state === "running" ? "bg-status-running dot-pulse" :
                      m.state === "waiting" ? "bg-status-waiting" :
                      m.state === "error"   ? "bg-status-error"   : "bg-status-idle";
                    return (
                      <Link
                        key={aid}
                        to="/agents/$agentId"
                        params={{ agentId: aid }}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono border hover:bg-white/5 transition-colors"
                        style={{
                          color: m.color,
                          borderColor: `color-mix(in oklab, ${m.color} 45%, transparent)`,
                          background: `color-mix(in oklab, ${m.color} 8%, transparent)`,
                        }}
                      >
                        <span className={cn("size-1.5 rounded-full", dot)} />
                        {m.name}
                      </Link>
                    );
                  })}
                </div>

                {/* workload */}
                <div className="mt-3 grid grid-cols-4 gap-2 pt-3 border-t border-border">
                  <Metric icon={CheckCircle2} label="pending" value={h.workload.pendingApprovals} />
                  <Metric icon={Activity}     label="today"   value={h.workload.decisionsToday} />
                  <Metric icon={Clock}        label="avg"     value={`${h.workload.avgApprovalMin}m`} />
                  <Metric
                    icon={AlertTriangle}
                    label="SLA"
                    value={h.workload.slaBreaches}
                    tone={h.workload.slaBreaches > 0 ? "error" : undefined}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* matrix */}
      <section className="space-y-2">
        <SectionHead icon={Shield} title="Accountability matrix" sub="Filled = accountable · amber = assigned, not yet accepted · empty column = uncovered" />
        <div className="glass-panel overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 z-10 bg-panel/95 text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground min-w-[180px]">
                  human \ agent
                </th>
                {orderedAgents.map((aid) => {
                  const m = agentMeta(aid);
                  const uncovered = !map[aid];
                  return (
                    <th
                      key={aid}
                      className={cn(
                        "px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-center min-w-[88px]",
                        uncovered && "bg-status-error/10",
                      )}
                      style={{ color: m.color }}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{m.name}</span>
                        {uncovered && (
                          <span className="text-[9px] text-status-error normal-case">⚠ uncovered</span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {humans.map((h, rowIdx) => {
                const owned = new Set(ownedBy(h.id));
                const cap = capacityInfo(h);
                const deputy = delegateOf(h);
                return (
                  <tr
                    key={h.id}
                    className={cn("border-b border-border last:border-b-0", rowIdx % 2 && "bg-white/[0.015]")}
                  >
                    <td className="sticky left-0 z-10 bg-panel/95 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-6 rounded-full grid place-items-center text-[10px] font-mono font-semibold border"
                          style={{
                            color: agentMeta(h.primaryAgentId).color,
                            borderColor: `color-mix(in oklab, ${agentMeta(h.primaryAgentId).color} 50%, transparent)`,
                            background: `color-mix(in oklab, ${agentMeta(h.primaryAgentId).color} 12%, transparent)`,
                          }}
                        >
                          {h.initials}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium truncate">{h.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{h.role}</div>
                          {h.status === "ooo" && deputy && (
                            <span
                              title={`${h.name} OOO → ${deputy.name} covers · accountability stays with ${h.name}`}
                              className="inline-block max-w-full truncate text-[9px] font-mono px-1 py-px mt-0.5 rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting"
                            >
                              OOO → deputy {deputy.name.split(" ")[0]}
                            </span>
                          )}
                          {h.status !== "ooo" && cap?.near && (
                            <span
                              title={`${h.name} near capacity — upstream intake pauses at cap. ${THROTTLE_POLICY_LINE}`}
                              className="inline-block max-w-full truncate text-[9px] font-mono px-1 py-px mt-0.5 rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting"
                            >
                              near capacity · {cap.used}/{cap.cap} gates today
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {orderedAgents.map((aid) => {
                      const owns = owned.has(aid);
                      const pendingReassign = owns && reassigned[aid] != null;
                      const m = agentMeta(aid);
                      return (
                        <td key={aid} className="px-2 py-2 text-center align-middle">
                          {owns ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              {pendingReassign ? (
                                /* P1-O1: reassigned this session — amber until the
                                   /welcome handshake (same treatment as P1-O2). */
                                <Link
                                  to="/welcome"
                                  title={`${h.name} assigned to ${m.name} — not yet accepted. Reassigned this session (audited as human.reassigned); open the accountability handshake.`}
                                  className="inline-flex items-center justify-center size-7 rounded font-mono font-bold text-[11px] border border-dashed border-status-waiting/70 bg-status-waiting/10 text-status-waiting hover:bg-status-waiting/25 transition-colors"
                                >
                                  A
                                </Link>
                              ) : h.id === UNACCEPTED_HUMAN_ID && !acceptance ? (
                                /* assigned — not yet accepted (P1-O2): amber until
                                   the /welcome handshake writes the acceptance */
                                <Link
                                  to="/welcome"
                                  title={`${h.name} assigned to ${m.name} — not yet accepted. Open the accountability handshake.`}
                                  className="inline-flex items-center justify-center size-7 rounded font-mono font-bold text-[11px] border border-dashed border-status-waiting/70 bg-status-waiting/10 text-status-waiting hover:bg-status-waiting/25 transition-colors"
                                >
                                  A
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setReassignAgent(aid); setReassignTo(""); }}
                                  title={`${h.name} accountable for ${m.name} — click to reassign (audited)`}
                                  className="inline-flex items-center justify-center size-7 rounded font-mono font-bold text-[11px] border cursor-pointer transition-all hover:brightness-125"
                                  style={{
                                    color: m.color,
                                    borderColor: `color-mix(in oklab, ${m.color} 55%, transparent)`,
                                    background: `color-mix(in oklab, ${m.color} 18%, transparent)`,
                                    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${m.color} 20%, transparent)`,
                                  }}
                                >
                                  A
                                </button>
                              )}
                              {deputy && (
                                /* P1-O1 deputy chip — covers-not-owns; the cell keeps ONE "A". */
                                <span
                                  title={`${deputy.name} covers while ${h.name} is OOO — accountability stays with ${h.name}`}
                                  className="text-[9px] font-mono px-1 py-px rounded border border-border/70 bg-white/[0.04] text-muted-foreground whitespace-nowrap"
                                >
                                  deputy: {deputy.name.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block size-7 rounded border border-dashed border-border/60" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-muted-foreground font-mono">
          Rows spanning multiple cells show 1-to-many ownership. Any empty column above is an uncovered risk.
          Click a solid A to reassign — audited as human.reassigned; the new assignee must accept on /welcome.
        </div>
      </section>

      {/* coverage timeline (P1-O1) — time gaps get the uncovered treatment */}
      <CoverageStrip />

      {/* audited reassignment confirm */}
      <Dialog open={!!reassignAgent} onOpenChange={(open) => !open && closeReassign()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Reassign {reassignAgent ? agentMeta(reassignAgent).name : ""} accountability
            </DialogTitle>
            <DialogDescription>
              Hands the &quot;A&quot; from {reassignFrom?.name ?? "the current owner"} to a new accountable
              human — written to the ledger as{" "}
              <span className="font-mono text-foreground/80">human.reassigned</span>. The assignee must
              accept on /welcome; until then their cell shows amber &quot;assigned — not yet accepted&quot;.
              One accountable human per agent stays the invariant.
            </DialogDescription>
          </DialogHeader>
          <Select value={reassignTo} onValueChange={setReassignTo}>
            <SelectTrigger className="w-full bg-white/5 border-border text-xs" aria-label="New accountable human">
              <SelectValue placeholder="Choose the new accountable human" />
            </SelectTrigger>
            <SelectContent>
              {humans
                .filter((x) => x.id !== (reassignAgent ? map[reassignAgent] : ""))
                .map((x) => (
                  <SelectItem key={x.id} value={x.id} className="text-xs">
                    {x.name} · {x.role}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeReassign}>
              Cancel
            </Button>
            <Button size="sm" disabled={!reassignTo} onClick={confirmReassign}>
              Reassign — audited
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionHead({ icon: Icon, title, sub }: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; title: string; sub?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{title}</span>
      {sub && <span className="text-[10px] text-muted-foreground/70 font-mono">· {sub}</span>}
    </div>
  );
}

function Metric({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string; value: number | string; tone?: "error";
}) {
  return (
    <div className="text-center">
      <div className={cn(
        "text-sm font-semibold tabular-nums",
        tone === "error" && "text-status-error",
      )}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono flex items-center justify-center gap-1">
        <Icon className="size-2.5" /> {label}
      </div>
    </div>
  );
}
