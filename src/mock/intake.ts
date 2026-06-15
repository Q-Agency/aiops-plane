/**
 * Work Intake (/intake, C10) - the confirmation surface of the SINGLE
 * DOORBELL (vision §2, the tracker boundary): the board sends work (a
 * scoped ticket dragged into the agreed column = "arrived"); the operator
 * confirms or declines each start. Nothing here originates work - rows
 * that the board has NOT sent are visible but not confirmable.
 *
 * The rows derive from backlog.ts (the client board); confirmed starts
 * land in tickets.ts via the addTicket seam and fire a notifications.ts
 * entry. Trigger modes, the trigger rule, write-back mapping and the
 * simulated drag arrival live in trigger.ts - this file threads `arrived`
 * + provenance into the rows. (The old "paste a ticket" composer was
 * removed 2026-06-11: tickets are created on the board, never here.)
 */

import { BACKLOG, type BacklogTicket } from "./backlog";
import { addTicket, tickets } from "./tickets";
import type { Ticket } from "./types";
import { CHAIN_ROLES, PIPELINE_ORDER, type ChainRoleId } from "./chain";
import { pushNotification } from "./notifications";
import {
  isDeclined,
  isDragArrived,
  provenanceOf,
  recordStart,
  type TicketProvenance,
} from "./trigger";

export interface IntakeTicket {
  id: string;
  title: string;
  labels: string[];
  priority: "P0" | "P1" | "P2" | "P3";
  ageDays: number;
  /** Matches the pod's scope rule (AutoMarket · label `pod-owned`). */
  inScope: boolean;
  /** Already in the pod (renders greyed, "In pod" badge - no double-start). */
  pulled: boolean;
  /**
   * The board SENT this ticket (it sits in the agreed start column -
   * "Ready"). Only arrived rows are confirmable/declinable: the single
   * doorbell means AI PodOps never starts work the board didn't send.
   */
  arrived: boolean;
  component: string;
  /**
   * How the ticket entered the pod - "drag-to-ready" when the client's drag
   * auto-started it, "manual-pull" when the operator confirmed the start
   * (confirm-first). Only meaningful once `pulled`.
   */
  provenance?: TicketProvenance;
}

/** The active scope rule sentence (mirrors the pod's Connect 3b slice). */
export const INTAKE_SCOPE_SENTENCE =
  "Your pod's scope: AutoMarket · `pod-owned` plus tickets the client flagged for the pod.";

/** Connector identity for the header chip ("Teamwork · Connected"). */
export const INTAKE_CONNECTOR_ID = "teamwork" as const;

/**
 * Client-board rows inside the pod's scope rule but not yet in the pod -
 * these make the picker meaningful on a fresh pod. The set deliberately
 * SPLITS into two visible states:
 *   AM-112 / AM-117 / AM-120 - in scope, NOT sent ("on the board"): visible
 *   but never confirmable (the single doorbell - AM-112 is the simulate-drag
 *   target, so the demo can watch it flip states);
 *   AM-109 / AM-111 / AM-114 / AM-119 - see ARRIVED_SEEDS below.
 */
const NEWLY_IN_SCOPE = new Set([
  "AM-109",
  "AM-111",
  "AM-112",
  "AM-114",
  "AM-117",
  "AM-119",
  "AM-120",
]);

/**
 * Rows the client has already DRAGGED into the start column ("Ready") -
 * the board sent them before this session opened; they sit awaiting the
 * operator's confirmation (confirm-first). The single-doorbell seeds.
 */
const ARRIVED_SEEDS = new Set(["AM-109", "AM-111", "AM-114", "AM-119"]);

function priorityFor(row: BacklogTicket, i: number): IntakeTicket["priority"] {
  if (row.labels.includes("bug")) return "P1";
  const cycle: IntakeTicket["priority"][] = ["P2", "P3", "P2", "P1"];
  return cycle[i % cycle.length];
}

function ageDaysFrom(ageLabel: string): number {
  const n = parseInt(ageLabel, 10);
  if (Number.isNaN(n)) return 0;
  return ageLabel.endsWith("h") ? Math.max(0, Math.round(n / 24)) : n;
}

/** True once the ticket exists in the pod's live ticket list. */
export function isPulled(id: string): boolean {
  return tickets.some((t) => t.id === id);
}

/**
 * The picker rows - the client board sample from backlog.ts, scope-matched.
 * AM-142 sits at the top (the canonical demo ticket; already in pod).
 * Call this per render: `pulled` reflects live tickets.ts state.
 */
export function intakeBacklog(): IntakeTicket[] {
  const rows = BACKLOG.map((row, i) => ({
    id: row.id,
    title: row.title,
    labels: row.labels,
    priority: priorityFor(row, i),
    ageDays: ageDaysFrom(row.ageLabel),
    inScope:
      row.project === "AutoMarket" &&
      (row.labels.includes("pod-owned") ||
        NEWLY_IN_SCOPE.has(row.id) ||
        isDragArrived(row.id)),
    pulled: isPulled(row.id),
    // Declined arrivals drop back to "on the board" - the decline returned
    // them to To-Do; a re-drag (simulateDragArrival) can ring again.
    arrived: (ARRIVED_SEEDS.has(row.id) || isDragArrived(row.id)) && !isDeclined(row.id),
    component: row.component,
    provenance: provenanceOf(row.id),
  }));
  // canonical demo ticket first, then in-scope, then the rest by age
  return rows.sort((a, b) => {
    if (a.id === "AM-142") return -1;
    if (b.id === "AM-142") return 1;
    if (a.inScope !== b.inScope) return a.inScope ? -1 : 1;
    return a.ageDays - b.ageDays;
  });
}

export function inScopeCount(): number {
  return intakeBacklog().filter((t) => t.inScope).length;
}

/**
 * Board-sent arrivals still awaiting the operator's confirm/decline
 * (confirm-first) - `arrived` and not yet pulled into the pod. The SAME
 * derivation TicketPickerTable shows as "{n} in Ready awaiting you", reused
 * by the rail's Work Intake badge so the two never disagree. Demo-reactive:
 * confirming, declining, or simulating a drag changes it on the next tick.
 */
export function awaitingConfirmationCount(): number {
  return intakeBacklog().filter((t) => t.arrived && !t.pulled).length;
}

/** "… stay with your team" count (the full client board minus scope). */
export function outOfScopeCount(): number {
  return 220 - inScopeCount(); // BACKLOG_TOTAL mirrors backlog.ts
}

/* ------------------------------------------------------------------ */
/* Routing preview - derived from chain.ts, never stored                */
/* ------------------------------------------------------------------ */

export interface RoutingPreview {
  ticketId: string;
  /** "Backlog" → "Ready for Spec" → "BA Agent runs first" */
  steps: string[];
  firstAgentId: ChainRoleId;
  /** One-liner: "AM-142 → Backlog → Ready for Spec → BA Agent runs first" */
  line: string;
}

const AGENT_DISPLAY: Partial<Record<ChainRoleId, string>> = {
  ba: "BA Agent",
  sa: "SA Agent",
  uiux: "UI/UX Agent",
  tasklist: "Tasklist Agent",
  dev: "Dev Agent",
  review: "Review Agent",
  qa: "QA Agent",
  devops: "DevOps Agent",
};

/** First pipeline agent whose `consumes` is empty - BA by contract. */
export function firstPipelineAgent(): ChainRoleId {
  return (
    PIPELINE_ORDER.find(
      (id) => CHAIN_ROLES[id].pipeline && CHAIN_ROLES[id].consumes.length === 0,
    ) ?? "ba"
  );
}

export function routingPreview(ticketId: string): RoutingPreview {
  const first = firstPipelineAgent();
  const agentName = AGENT_DISPLAY[first] ?? first.toUpperCase();
  const steps = ["Backlog", "Ready for Spec", `${agentName} runs first`];
  return {
    ticketId,
    steps,
    firstAgentId: first,
    line: `${ticketId} → ${steps.join(" → ")}`,
  };
}

/* ------------------------------------------------------------------ */
/* Start - the mutation behind Confirm start / auto-start               */
/* ------------------------------------------------------------------ */

/**
 * Starts board-sent arrivals in the pod: each lands at the top of the
 * Pipeline Backlog (tickets.ts) and fires a bell notification. Returns the
 * created tickets (already-started ids are skipped).
 * `provenance` records HOW the start happened - "manual-pull" (the operator
 * confirmed it; confirm-first) or "drag-to-ready" (the drag itself started
 * it; auto-start). ENFORCES the single doorbell: rows the board did not
 * send (arrived=false) are skipped - AI PodOps does not originate work.
 */
export function pullTickets(
  ids: string[],
  provenance: TicketProvenance = "manual-pull",
): Ticket[] {
  const board = intakeBacklog();
  const created: Ticket[] = [];
  for (const id of ids) {
    if (isPulled(id)) continue;
    const row = board.find((t) => t.id === id);
    if (!row) continue;
    if (!row.arrived) continue; // single doorbell - the board didn't send it
    const t = addTicket({
      id: row.id,
      title: row.title,
      priority: row.priority,
      codebase: row.labels.includes("frontend") ? "web" : "backend",
    });
    recordStart(row.id, provenance);
    created.push(t);
    pushNotification({
      recipientId: "zlatko",
      kind: "delivered",
      severity: "info",
      title: `${t.id} entered the pod`,
      body: "Routing to BA Agent - first stop Ready for Spec.",
      ticketId: t.id,
      deepLink: "/pipeline",
      channels: ["in_app"],
    });
  }
  return created;
}
