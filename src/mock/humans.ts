import type { AgentId } from "./types";

export interface Human {
  id: string;
  name: string;
  role: string;
  initials: string;
  /** Primary agent — used for avatar color */
  primaryAgentId: AgentId;
  /** Workload telemetry (mock, deterministic per human) */
  workload: {
    pendingApprovals: number;
    decisionsToday: number;
    avgApprovalMin: number;
    slaBreaches: number;
  };
}

export const humans: Human[] = [
  {
    id: "ana",
    name: "Ana Kovač",
    role: "Lead Business Analyst",
    initials: "AK",
    primaryAgentId: "ba",
    workload: { pendingApprovals: 3, decisionsToday: 11, avgApprovalMin: 14, slaBreaches: 0 },
  },
  {
    id: "marin",
    name: "Marin Crnković",
    role: "Solution Architect",
    initials: "MC",
    primaryAgentId: "sa",
    workload: { pendingApprovals: 2, decisionsToday: 7, avgApprovalMin: 26, slaBreaches: 1 },
  },
  {
    id: "ivan",
    name: "Ivan Horvat",
    role: "Engineering Lead",
    initials: "IH",
    primaryAgentId: "dev",
    workload: { pendingApprovals: 4, decisionsToday: 9, avgApprovalMin: 38, slaBreaches: 1 },
  },
  {
    id: "petra",
    name: "Petra Novak",
    role: "QA Lead",
    initials: "PN",
    primaryAgentId: "qa",
    workload: { pendingApprovals: 2, decisionsToday: 6, avgApprovalMin: 22, slaBreaches: 0 },
  },
  {
    id: "zlatko",
    name: "Zlatko",
    role: "AI Department Lead",
    initials: "ZL",
    primaryAgentId: "curator",
    workload: { pendingApprovals: 1, decisionsToday: 4, avgApprovalMin: 9, slaBreaches: 0 },
  },
];

/** Display name → human id (for legacy `approver` string matching in tickets) */
export const APPROVER_TO_HUMAN: Record<string, string> = {
  Zlatko: "zlatko",
  Ana: "ana",
  Marin: "marin",
  Iva: "ivan",
  Petar: "ivan",
  Luka: "petra",
};

export const OWNERSHIP: Record<AgentId, string> = {
  curator:  "zlatko",
  ba:       "ana",
  pm:       "ana",
  sa:       "marin",
  tasklist: "marin",
  dev:      "ivan",
  review:   "ivan",
  qa:       "petra",
};

export function ownershipMap(): Record<AgentId, string> {
  return OWNERSHIP;
}

export function accountableFor(agentId: AgentId): Human {
  const id = OWNERSHIP[agentId];
  return humans.find((h) => h.id === id) ?? humans[0];
}

export function agentsOf(humanId: string): AgentId[] {
  return (Object.keys(OWNERSHIP) as AgentId[]).filter((a) => OWNERSHIP[a] === humanId);
}

export function activeHumans(): Human[] {
  const ids = new Set(Object.values(OWNERSHIP));
  return humans.filter((h) => ids.has(h.id));
}

/** Resolve a ticket.approver string (e.g. "Iva") to a Human via the alias map. */
export function humanByApprover(approver: string): Human | undefined {
  const id = APPROVER_TO_HUMAN[approver];
  return id ? humans.find((h) => h.id === id) : undefined;
}
