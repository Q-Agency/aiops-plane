import type { AgentId, Approval, Stage } from "./types";
import { tickets } from "./tickets";

const gateMap: Partial<Record<Stage, Approval["gate"]>> = {
  "spec-review": "Spec Review",
  "design-review": "Design Review",
  "tasks-review": "Tasks Review",
  "dev-review": "Dev Review",
  "qa-review": "QA Review",
};

const artifactFor: Record<Approval["gate"], string> = {
  "Spec Review": "spec.md",
  "Design Review": "design.md",
  "Tasks Review": "tasks.json",
  "Dev Review": "PR + diff",
  "QA Review": "qa.report",
};

export const approvals: Approval[] = tickets
  .map((t) => {
    const gate = gateMap[t.stage];
    if (!gate) return null;
    return {
      id: `appr-${t.id}`,
      ticketId: t.id,
      gate,
      approver: t.approver,
      artifact: `${artifactFor[gate]} · ${t.id}`,
      openedAt: t.updatedAt,
    } satisfies Approval;
  })
  .filter(Boolean) as Approval[];

/* ------------------------------------------------------------------ */
/* Clarification gates - the second HITL gate kind (slice 2, C4)       */
/* ------------------------------------------------------------------ */

/**
 * A clarification gate: the agent needs an ANSWER to proceed (vs an
 * approval gate, which is artifact sign-off). Maps to the contract's
 * HITLGate{ kind: "clarification" }. Seeded once here - the bell,
 * the Gates queue, and the gate-review surface all key off these ids.
 */
export interface ClarificationGate {
  id: string; //                  "clar-AM-142"
  ticketId: string;
  kind: "clarification";
  agentId: AgentId; //            the agent asking
  question: string;
  options?: string[];
  proposedAnswer?: string; //     the agent's suggested answer
  accountable: string; //         human id from humans.ts
  openedAt: number; //            epoch ms
}

const now = Date.now();
const min = 60_000;

export const clarificationGates: ClarificationGate[] = [
  {
    // The canonical 0:30 demo-beat clarification (demo spine: AM-142).
    id: "clar-AM-142",
    ticketId: "AM-142",
    kind: "clarification",
    agentId: "ba",
    question:
      "Vehicle search filters: should saved filter chips persist per account or per device?",
    options: ["Per account (requires auth)", "Per device (localStorage only)"],
    proposedAnswer:
      "Per account - matches the saved-searches contract already specced in AM-147.",
    accountable: "ana",
    openedAt: now - 9 * min,
  },
  {
    // Seeded from governance.ts openDecisions d-be2 (geo search engine).
    id: "clar-AM-141",
    ticketId: "AM-141",
    kind: "clarification",
    agentId: "sa",
    question:
      "Geo search engine: PostGIS on the existing Postgres, or a dedicated Elasticsearch geo_shape cluster?",
    options: ["PostGIS on existing Postgres", "Elasticsearch geo_shape cluster"],
    proposedAnswer:
      "PostGIS - reuses the listings DB and ops surface; revisit at >2M active listings.",
    accountable: "marin",
    openedAt: now - 65 * min,
  },
];

export function clarificationById(id: string): ClarificationGate | undefined {
  return clarificationGates.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Mock decision log (C4) - gate decisions write here                  */
/* ------------------------------------------------------------------ */

export type GateDecisionVerb = "approved" | "rejected" | "answered";

export interface GateDecision {
  id: string; //                  "dec-1"
  gateId: string; //              "appr-AM-142" | "clar-AM-142"
  ticketId: string;
  gateKind: "approval" | "clarification";
  decision: GateDecisionVerb;
  /** Required typed reason (min 10 chars on reject) / the clarification answer. */
  reason: string;
  /** null = "when-only" attribution until real auth lands. */
  actor: string | null;
  ts: number;
}

/**
 * Client-side, in-memory decision log. Approve/Reject/Answer on the gate
 * review surface appends here; /approvals renders resolved rows from it.
 * Mock-only - never a substitute for the real audit ledger.
 */
export const gateDecisions: GateDecision[] = [];

let decisionSeq = 0;

export function recordGateDecision(
  d: Omit<GateDecision, "id" | "ts"> & { ts?: number },
): GateDecision {
  const entry: GateDecision = { ...d, id: `dec-${++decisionSeq}`, ts: d.ts ?? Date.now() };
  gateDecisions.unshift(entry);
  return entry;
}

export function isGateResolved(gateId: string): boolean {
  return gateDecisions.some((d) => d.gateId === gateId);
}

/** Open gates of both kinds, minus anything already decided this session. */
export function openGateCount(): number {
  return (
    approvals.filter((a) => !isGateResolved(a.id)).length +
    clarificationGates.filter((c) => !isGateResolved(c.id)).length
  );
}

/* ------------------------------------------------------------------ */
/* Demo Director seam (wave-2 COMPLETION) - additive flag, never reshapes */
/* ------------------------------------------------------------------ */

/**
 * Re-times a gate (approval "appr-…" or clarification "clar-…") so a staged
 * demo beat lands it "just now" in every queue that orders by openedAt.
 * Returns the PREVIOUS openedAt for checkpoint restore; null = unknown id.
 */
export function restageGate(gateId: string, openedAt: number = Date.now()): number | null {
  const gate =
    approvals.find((a) => a.id === gateId) ??
    clarificationGates.find((c) => c.id === gateId);
  if (!gate) return null;
  const prev = gate.openedAt;
  gate.openedAt = openedAt;
  return prev;
}
