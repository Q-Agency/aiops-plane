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
  /* ---- P1-O1 capacity & coverage (all optional — purely additive) ---- */
  /** Daily working-hours window in the human's own timezone. */
  workingHours?: { tz: string; start: string; end: string; days: string };
  status?: "available" | "ooo";
  /** Epoch ms — only meaningful while status === "ooo". */
  oooUntil?: number;
  /** Deputy who COVERS while OOO/saturated — accountability STAYS with the owner. */
  delegateId?: string;
  /** Throttle threshold: when open gates reach this, upstream intake pauses. */
  capacityGatesPerDay?: number;
}

const DAY_MS = 24 * 3_600_000;

export const humans: Human[] = [
  {
    id: "ana",
    name: "Ana Kovač",
    role: "Lead Business Analyst",
    initials: "AK",
    primaryAgentId: "ba",
    workload: { pendingApprovals: 3, decisionsToday: 11, avgApprovalMin: 14, slaBreaches: 0 },
    workingHours: { tz: "Europe/Zagreb", start: "08:00", end: "16:00", days: "Mon–Fri" },
    status: "available",
    capacityGatesPerDay: 16,
  },
  {
    id: "marin",
    name: "Marin Crnković",
    role: "Solution Architect",
    initials: "MC",
    primaryAgentId: "sa",
    workload: { pendingApprovals: 2, decisionsToday: 7, avgApprovalMin: 26, slaBreaches: 1 },
    workingHours: { tz: "Europe/Zagreb", start: "09:00", end: "17:00", days: "Mon–Fri" },
    /* THE one seeded OOO — Ivan covers, accountability stays with Marin. */
    status: "ooo",
    oooUntil: Date.now() + 3 * DAY_MS,
    delegateId: "ivan",
    capacityGatesPerDay: 12,
  },
  {
    id: "ivan",
    name: "Ivan Horvat",
    role: "Engineering Lead",
    initials: "IH",
    primaryAgentId: "dev",
    workload: { pendingApprovals: 4, decisionsToday: 9, avgApprovalMin: 38, slaBreaches: 1 },
    workingHours: { tz: "Europe/Zagreb", start: "10:00", end: "18:00", days: "Mon–Fri" },
    status: "available",
    /* The saturated-human callout: 9 decisions today vs capacity 10. */
    capacityGatesPerDay: 10,
  },
  {
    id: "petra",
    name: "Petra Novak",
    role: "QA Lead",
    initials: "PN",
    primaryAgentId: "qa",
    workload: { pendingApprovals: 2, decisionsToday: 6, avgApprovalMin: 22, slaBreaches: 0 },
    workingHours: { tz: "Europe/Zagreb", start: "09:00", end: "17:00", days: "Mon–Fri" },
    status: "available",
    capacityGatesPerDay: 12,
  },
  {
    id: "zlatko",
    name: "Zlatko",
    role: "AI Department Lead",
    initials: "ZL",
    primaryAgentId: "curator",
    workload: { pendingApprovals: 1, decisionsToday: 4, avgApprovalMin: 9, slaBreaches: 0 },
    workingHours: { tz: "Europe/Zagreb", start: "07:00", end: "15:00", days: "Mon–Fri" },
    status: "available",
    capacityGatesPerDay: 8,
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

/* ------------------------------------------------------------------ */
/* P1-O1 — capacity, deputies, coverage                                 */
/* ------------------------------------------------------------------ */

export function humanById(id: string): Human | undefined {
  return humans.find((h) => h.id === id);
}

/** The deputy who covers while `h` is OOO/saturated — owner keeps the "A". */
export function delegateOf(h: Human): Human | undefined {
  return h.delegateId ? humanById(h.delegateId) : undefined;
}

/** Canonical throttle-policy line (the amber state's tooltip, P1-O1). */
export const THROTTLE_POLICY_LINE =
  "Policy 'throttle': when a human's open gates reach capacity, upstream intake pauses — agents keep working, new gates queue instead of piling on.";

export interface CapacityInfo {
  used: number;
  cap: number;
  /** Within 1 gate of the cap — the amber "near capacity" state. */
  near: boolean;
  /** At/over cap — upstream intake is paused (throttle policy). */
  atCap: boolean;
}

/** Today's decisions vs the throttle cap — null when no cap is set. */
export function capacityInfo(h: Human): CapacityInfo | null {
  if (!h.capacityGatesPerDay) return null;
  const used = h.workload.decisionsToday;
  const cap = h.capacityGatesPerDay;
  return { used, cap, near: used >= cap - 1, atCap: used >= cap };
}

/** "09:00" → minutes from midnight (540). */
export function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** 540 → "09:00" (1440 wraps to "00:00"). */
export function minToHm(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface CoverageGap {
  /** Minutes from midnight, [startMin, endMin) — render segments never wrap;
   *  an overnight gap is split in two segments sharing one `label`. */
  startMin: number;
  endMin: number;
  /** Display label, e.g. "18:00–07:00" for the wrapped overnight gap. */
  label: string;
}

/** Merged daily working-hours windows of AVAILABLE accountable humans (OOO excluded). */
function availableWindows(): { startMin: number; endMin: number }[] {
  const wins = activeHumans()
    .filter((h) => h.status !== "ooo" && h.workingHours)
    .map((h) => ({ startMin: hmToMin(h.workingHours!.start), endMin: hmToMin(h.workingHours!.end) }))
    .sort((a, b) => a.startMin - b.startMin);
  const merged: { startMin: number; endMin: number }[] = [];
  for (const w of wins) {
    const last = merged[merged.length - 1];
    if (last && w.startMin <= last.endMin) last.endMin = Math.max(last.endMin, w.endMin);
    else merged.push({ ...w });
  }
  return merged;
}

/**
 * Daily timeline windows where NO accountable human is inside working hours —
 * the red "uncovered" treatment on the coverage strip. OOO humans don't count
 * as coverage (their deputy's own hours do).
 */
export function coverageGaps(): CoverageGap[] {
  const merged = availableWindows();
  if (merged.length === 0) return [{ startMin: 0, endMin: 1440, label: "00:00–24:00" }];
  const gaps: CoverageGap[] = [];
  for (let i = 1; i < merged.length; i++) {
    const s = merged[i - 1].endMin;
    const e = merged[i].startMin;
    if (e > s) gaps.push({ startMin: s, endMin: e, label: `${minToHm(s)}–${minToHm(e)}` });
  }
  const first = merged[0];
  const last = merged[merged.length - 1];
  if (first.startMin > 0 || last.endMin < 1440) {
    // Overnight wrap gap — one label, up to two render segments.
    const label = `${minToHm(last.endMin)}–${minToHm(first.startMin)}`;
    if (last.endMin < 1440) gaps.push({ startMin: last.endMin, endMin: 1440, label });
    if (first.startMin > 0) gaps.push({ startMin: 0, endMin: first.startMin, label });
  }
  return gaps;
}

/**
 * The pod's overall staffed window (earliest start → latest end of available
 * humans) — what a coverage_hours SLA clock runs on. Mock seeds are contiguous.
 */
export function coverageWindow(): { tz: string; start: string; end: string } {
  const av = activeHumans().filter((h) => h.status !== "ooo" && h.workingHours);
  const tz = av[0]?.workingHours?.tz ?? "Europe/Zagreb";
  if (av.length === 0) return { tz, start: "—", end: "—" };
  const start = Math.min(...av.map((h) => hmToMin(h.workingHours!.start)));
  const end = Math.max(...av.map((h) => hmToMin(h.workingHours!.end)));
  return { tz, start: minToHm(start), end: minToHm(end) };
}
