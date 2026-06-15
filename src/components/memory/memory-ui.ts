/**
 * Shared helpers for the /memory surface (P1-A2) - deterministic date
 * formatting plus the join from a rule/amendment's gate ids to the seeded
 * decision evidence (compliance AUDIT rows + clarification gates), so
 * "citing decisions" render real actors, typed reasons and timestamps.
 */

import { AUDIT } from "@/mock/compliance";
import { clarificationById } from "@/mock/approvals";
import { humans } from "@/mock/humans";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "10 Jun 2026" - locale-independent (deterministic SSR/client render). */
export function fmtShortDate(ts?: number): string {
  if (!ts) return "-";
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function humanName(id: string): string {
  return humans.find((h) => h.id === id)?.name ?? id;
}

export type CitingVerb = "approved" | "rejected" | "answered" | "decided";

export interface CitingDecision {
  gateId: string;
  verb: CitingVerb;
  /** undefined = "when-only" (no attributed actor in the seed). */
  actorName?: string;
  /** The typed reason / clarification answer behind the decision. */
  detail: string;
  ts?: number;
}

export const VERB_TONE: Record<CitingVerb, string> = {
  approved: "border-status-done/40 bg-status-done/10 text-status-done",
  rejected: "border-status-error/45 bg-status-error/10 text-status-error",
  answered: "border-status-waiting/45 bg-status-waiting/10 text-status-waiting",
  decided: "border-border bg-white/5 text-muted-foreground",
};

/**
 * Resolve one gate id ("appr-AM-142" / "clar-AM-142") to its decision
 * evidence. Approval gates join the compliance AUDIT seed by ticket;
 * clarification gates join approvals.ts. Falls back to an honest
 * "recorded at the gate" line when the seed carries no matching row.
 */
export function citingDecisionFor(gateId: string): CitingDecision {
  if (gateId.startsWith("clar-")) {
    const c = clarificationById(gateId);
    if (c) {
      return {
        gateId,
        verb: "answered",
        actorName: humanName(c.accountable),
        detail: c.proposedAnswer ?? c.question,
        ts: c.openedAt,
      };
    }
  } else {
    const ticketId = gateId.replace(/^appr-/, "");
    const row = AUDIT.find(
      (e) =>
        e.ticketId === ticketId &&
        (e.action === "gate.approved" || e.action === "gate.rejected"),
    );
    if (row) {
      return {
        gateId,
        verb: row.action === "gate.approved" ? "approved" : "rejected",
        actorName: row.actor.kind === "human" ? humanName(row.actor.id) : row.actor.id,
        detail: row.rationale,
        ts: row.ts,
      };
    }
  }
  return { gateId, verb: "decided", detail: "typed reason recorded at the gate" };
}
