import { tickets } from "./tickets";
import { humans, OWNERSHIP, humanByApprover } from "./humans";
import type { AgentId } from "./types";

export type ReviewGate = "Spec" | "Design" | "Tasks" | "Dev" | "QA";

export const GATES: ReviewGate[] = ["Spec", "Design", "Tasks", "Dev", "QA"];

// which agent each gate reviews -> drives accountable human
export const GATE_AGENT: Record<ReviewGate, AgentId> = {
  Spec: "ba",
  Design: "sa",
  Tasks: "tasklist",
  Dev: "review",
  QA: "qa",
};

export const GATE_SLA_MIN: Record<ReviewGate, number> = {
  Spec: 60,
  Design: 90,
  Tasks: 45,
  Dev: 120,
  QA: 60,
};

const seed = (k: number) => {
  let x = Math.sin(k) * 10_000;
  return () => {
    x = Math.sin(x) * 10_000;
    return x - Math.floor(x);
  };
};

/* ------------- gate cycle-time -------------- */

export interface GateStat {
  gate: ReviewGate;
  avgWaitMin: number;
  p95WaitMin: number;
  open: number;
  breaches: number;
  slaMin: number;
}

export const gateStats: GateStat[] = GATES.map((g, i) => {
  const r = seed(g.charCodeAt(0) + i * 11);
  const avg = Math.round(
    g === "Design" ? 180 + r() * 60 :
    g === "Dev" ? 145 + r() * 50 :
    g === "QA" ? 70 + r() * 30 :
    g === "Spec" ? 38 + r() * 20 :
    25 + r() * 18,
  );
  return {
    gate: g,
    avgWaitMin: avg,
    p95WaitMin: Math.round(avg * (2.4 + r() * 0.6)),
    open: Math.floor(1 + r() * 5),
    breaches: avg > GATE_SLA_MIN[g] ? Math.floor(1 + r() * 4) : 0,
    slaMin: GATE_SLA_MIN[g],
  };
});

/* ----------- wait vs work per ticket ---------- */

export interface TicketFlow {
  ticketId: string;
  title: string;
  agentMin: number;
  waitMin: number;
  totalMin: number;
  gateWait: Partial<Record<ReviewGate, number>>;
  approver: string;
}

export const ticketFlow: TicketFlow[] = tickets.map((t, i) => {
  const r = seed(t.id.charCodeAt(3) + i * 7);
  // agent compute: based on codebase complexity
  const agent = Math.round(
    (t.codebase === "backend" ? 95 : t.codebase === "mobile" ? 80 : 65) +
    r() * 60 + (t.rerunCount ?? 0) * 40,
  );
  const gateWait: Partial<Record<ReviewGate, number>> = {};
  GATES.forEach((g) => {
    const base = gateStats.find((x) => x.gate === g)!.avgWaitMin;
    // ticket only hits gates up to its current stage; approximate
    gateWait[g] = Math.round(base * (0.4 + r() * 1.4));
  });
  const wait = Object.values(gateWait).reduce<number>((a, v) => a + (v ?? 0), 0);
  return {
    ticketId: t.id,
    title: t.title,
    agentMin: agent,
    waitMin: wait,
    totalMin: agent + wait,
    gateWait,
    approver: t.approver,
  };
});

/* ----------- reviewer load ---------- */

export interface ReviewerLoad {
  humanId: string;
  name: string;
  initials: string;
  agents: AgentId[];
  queueDepth: number;
  avgApprovalMin: number;
  throughput: number; // decisions / day
  slaBreaches: number;
  utilization: number; // 0-100
}

export const reviewerLoad: ReviewerLoad[] = humans
  .filter((h) => Object.values(OWNERSHIP).includes(h.id))
  .map((h) => {
    const owned = (Object.keys(OWNERSHIP) as AgentId[]).filter((a) => OWNERSHIP[a] === h.id);
    const r = seed(h.id.charCodeAt(0) * 13);
    const util = Math.min(99, Math.round(40 + h.workload.pendingApprovals * 12 + r() * 25));
    return {
      humanId: h.id,
      name: h.name,
      initials: h.initials,
      agents: owned,
      queueDepth: h.workload.pendingApprovals,
      avgApprovalMin: h.workload.avgApprovalMin,
      throughput: h.workload.decisionsToday,
      slaBreaches: h.workload.slaBreaches,
      utilization: util,
    };
  });

// resolve ticket → reviewer load
export function loadForTicket(approver: string): ReviewerLoad | undefined {
  const h = humanByApprover(approver);
  return h ? reviewerLoad.find((r) => r.humanId === h.id) : undefined;
}

/* ----------- backup heatmap (gate × hour) ---------- */

export interface HeatCell { gate: ReviewGate; hour: number; depth: number }

export const heatmap: HeatCell[] = (() => {
  const out: HeatCell[] = [];
  GATES.forEach((g, gi) => {
    const r = seed(g.charCodeAt(0) + gi * 5);
    for (let h = 0; h < 24; h++) {
      // workday morning spike + overnight pile-up on Design/Dev
      const morningPeak = Math.exp(-Math.pow((h - 9) / 2.5, 2)) * 6;
      const overnight = (g === "Design" || g === "Dev")
        ? Math.exp(-Math.pow((h - 23) / 3, 2)) * 5 + (h < 6 ? 3 : 0)
        : 0;
      const depth = Math.max(0, Math.round(morningPeak + overnight + r() * 1.4));
      out.push({ gate: g, hour: h, depth });
    }
  });
  return out;
})();

/* ----------- bottleneck impact ---------- */

export interface BottleneckImpact {
  gate: ReviewGate;
  currentAvgMin: number;
  targetAvgMin: number;
  cycleTimeDropPct: number;
  ticketsAffected: number;
}

export const bottlenecks: BottleneckImpact[] = (() => {
  const totalCycle = ticketFlow.reduce((a, t) => a + t.totalMin, 0) / ticketFlow.length;
  return [...gateStats]
    .sort((a, b) => b.avgWaitMin - a.avgWaitMin)
    .slice(0, 3)
    .map((g) => {
      const target = Math.round(g.slaMin * 1.1);
      const saved = Math.max(0, g.avgWaitMin - target);
      return {
        gate: g.gate,
        currentAvgMin: g.avgWaitMin,
        targetAvgMin: target,
        cycleTimeDropPct: +((saved / totalCycle) * 100).toFixed(1),
        ticketsAffected: g.open + g.breaches + 2,
      };
    });
})();

export const flowAggregates = (() => {
  const totalAgent = ticketFlow.reduce((a, t) => a + t.agentMin, 0);
  const totalWait = ticketFlow.reduce((a, t) => a + t.waitMin, 0);
  const total = totalAgent + totalWait;
  return {
    waitPct: +((totalWait / total) * 100).toFixed(1),
    agentPct: +((totalAgent / total) * 100).toFixed(1),
    avgTotalMin: Math.round(total / ticketFlow.length),
    avgAgentMin: Math.round(totalAgent / ticketFlow.length),
    avgWaitMin: Math.round(totalWait / ticketFlow.length),
    breachesTotal: gateStats.reduce((a, g) => a + g.breaches, 0),
  };
})();

export const fmtDur = (m: number) =>
  m >= 60 ? `${(m / 60).toFixed(1)}h` : `${m}m`;
