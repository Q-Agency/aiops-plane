/**
 * Tracker-trigger boundary (vision §2 "The tracker boundary") — the board is
 * the doorbell, Agency OS is the house. Tickets LIVE in Jira/Teamwork (we
 * never create/edit/close them); a scoped ticket entering the agreed column
 * IS the start signal. Agent→agent activation is ALWAYS inside Agency OS —
 * nothing here ever grows agent columns on the client board.
 *
 * This module owns the mock seams for that boundary:
 *  - START POLICY (per-pod): "operator" = confirm-first (each board arrival
 *    waits for the operator's confirmation in /intake — the right default
 *    for early Q-led pods) vs "tracker" = auto-start (the drag starts the
 *    chain immediately). The board is the ONLY start signal in both. Tiny
 *    reactive store in the demo-bus idiom (useSyncExternalStore, SSR-safe).
 *  - TRIGGER_RULE: which connector/board/column rings the doorbell.
 *  - WRITE_BACK_MAPPING: pod moment → plain tracker status posted back to
 *    the ticket with artifact links (never ask twice). The per-stage editor
 *    seed lives in connectors.ts STATUS_MAP_DEFAULT; this is the
 *    moment-level summary the demo narrates.
 *  - simulateDragArrival(): demo seam retelling "the client drags a ticket
 *    into Ready" — the row ARRIVES (idempotent; second call returns the
 *    same ticket). Our write-backs are tagged [AgencyOS] so the listener
 *    ignores its own moves (echo-loop prevention); drag-back = park+notify.
 *  - START PROVENANCE: how a START happened — "drag-to-ready" (auto-start:
 *    the drag itself started it) vs "manual-pull" (confirm-first: the
 *    operator confirmed it). Recorded AT START TIME by recordStart(); an
 *    arrival alone has no provenance (nothing started yet).
 *  - DECLINED arrivals: decline returns the ticket to the board (To-Do) —
 *    the row drops back to the "on the board" state, mock-level.
 *
 * intake.ts threads arrived/declined/provenance into the picker rows; this
 * module never imports intake.ts (no cycle).
 */

import { useSyncExternalStore } from "react";
import { BACKLOG, type BacklogTicket } from "./backlog";
import { bumpDemo } from "./demo-bus";

/* ------------------------------------------------------------------ */
/* Trigger mode — operator-driven vs tracker-driven                     */
/* ------------------------------------------------------------------ */

export type TriggerMode = "operator" | "tracker";

/** Short copy builders can reuse so the two modes read identically everywhere.
 *  SINGLE DOORBELL (owner-clarified 2026-06-11): the board drag is the ONLY start
 *  signal in BOTH modes — the policy decides whether the pod starts immediately
 *  (auto-start) or waits for the operator's confirmation (confirm-first).
 *  Agency OS never originates activation. */
/** Display name of the start policy (ids stay "operator"/"tracker" internally). */
export const START_POLICY_NAME: Record<TriggerMode, string> = {
  operator: "confirm-first",
  tracker: "auto-start",
};

let triggerMode: TriggerMode = "operator"; // confirm-first — the early default for Q-led pods

const triggerSubs = new Set<() => void>();

export function getTriggerMode(): TriggerMode {
  return triggerMode;
}

/** Flip the pod's trigger mode and notify subscribed views. */
export function setTriggerMode(mode: TriggerMode): void {
  if (mode === triggerMode) return;
  triggerMode = mode;
  for (const fn of triggerSubs) fn();
}

function subscribeTriggerMode(fn: () => void): () => void {
  triggerSubs.add(fn);
  return () => {
    triggerSubs.delete(fn);
  };
}

/**
 * Reactive trigger mode — useSyncExternalStore over the module value.
 * SSR-safe: the snapshot fn is module-stable and returns a primitive.
 */
export function useTriggerMode(): TriggerMode {
  return useSyncExternalStore(subscribeTriggerMode, getTriggerMode, getTriggerMode);
}

/* ------------------------------------------------------------------ */
/* Trigger rule — the doorbell (LAUNCH 3b grows this from the scope)   */
/* ------------------------------------------------------------------ */

export interface TriggerRule {
  connectorId: string;
  board: string;
  column: string;
}

/**
 * The agreed start-signal column. NOTE: this is a BOARD COLUMN name — the
 * write-back STATUS list lives in connectors.ts CLIENT_STATUS_OPTIONS
 * (Teamwork's "Ready" column maps to the "To Do — Refined" status in the
 * backlog.ts seeds; simulateDragArrival flips the row's status accordingly).
 */
export const TRIGGER_RULE: TriggerRule = {
  connectorId: "teamwork", // connectors.ts ConnectorId — Live
  board: "AutoMarket delivery",
  column: "Ready",
};

/* ------------------------------------------------------------------ */
/* Write-back — never ask twice                                         */
/* ------------------------------------------------------------------ */

/**
 * Moment-level write-back summary: plain status + artifact links posted to
 * the ticket so the client never runs two tools for one job. Clarifications
 * land in the ticket thread / Slack (single-homed conversations).
 */
export const WRITE_BACK_MAPPING: { podStage: string; trackerStatus: string }[] = [
  { podStage: "First agent pickup", trackerStatus: "In Progress" },
  { podStage: "Human gate open", trackerStatus: "In Review" },
  { podStage: "Released / merged", trackerStatus: "Done + artifact links" },
];

/* ------------------------------------------------------------------ */
/* Provenance — how a ticket entered the pod                            */
/* ------------------------------------------------------------------ */

export type TicketProvenance = "manual-pull" | "drag-to-ready";

/**
 * The canon honesty line every trigger-mode surface renders verbatim:
 * the board only rings the doorbell — orchestration never leaves the house.
 */
export const TRIGGER_HONESTY =
  "activation always comes from the board — Agency OS confirms or auto-accepts, never originates · agent-to-agent activation runs inside Agency OS";

const provenanceById = new Map<string, TicketProvenance>();

/**
 * How the START happened (only meaningful once a ticket is in the pod).
 * Default "manual-pull": every pre-seeded pod ticket entered via an
 * operator-confirmed start (confirm-first was the pod's policy from day one).
 */
export function provenanceOf(id: string): TicketProvenance {
  return provenanceById.get(id) ?? "manual-pull";
}

/**
 * Record HOW a start happened, at start time: "manual-pull" when the
 * operator confirmed it (confirm-first), "drag-to-ready" when the drag
 * itself started it (auto-start). The start mechanism wins — an arrival's
 * earlier drag does NOT make an operator-confirmed start an auto-start.
 */
export function recordStart(id: string, provenance: TicketProvenance): void {
  provenanceById.set(id, provenance);
}

/* ------------------------------------------------------------------ */
/* Simulated drag arrival — the demo's doorbell ring                    */
/* ------------------------------------------------------------------ */

/** Seeded client-board row that "gets dragged into Ready" (backlog.ts). */
const DRAG_ARRIVAL_ID = "AM-112";
const DRAG_ARRIVAL_TITLE = "Dealer KYB document upload";

const arrivedIds = new Set<string>();
const declinedIds = new Set<string>();
let arrival: { ticketId: string; title: string } | null = null;

/** True once the drag arrival happened — intake.ts widens scope with this. */
export function isDragArrived(id: string): boolean {
  return arrivedIds.has(id);
}

/** Declined-the-start: the ticket went back to To-Do on the board. */
export function isDeclined(id: string): boolean {
  return declinedIds.has(id);
}

/**
 * Decline-the-start (vision §2): the arrival is cancelled — the ticket
 * returns to To-Do on the board and the row drops back to the "on the
 * board" state (visible, not confirmable). A later re-drag can ring the
 * doorbell again (simulateDragArrival clears the decline for its target).
 */
export function recordDecline(id: string): void {
  declinedIds.add(id);
  arrivedIds.delete(id);
  provenanceById.delete(id);
  if (arrival?.ticketId === id) arrival = null;
  const row = BACKLOG.find((t) => t.id === id);
  if (row) row.status = "Backlog"; // back to To-Do on the client board
  bumpDemo();
}

/** Current arrival without triggering one (null until the drag happens). */
export function getDragArrival(): { ticketId: string; title: string } | null {
  return arrival;
}

/**
 * Retells the board's start signal: the client drags AM-112 into the
 * "Ready" column → the row ARRIVES (its client-board status moves to
 * "To Do — Refined"). Whether it then waits (confirm-first) or starts
 * immediately (auto-start) is the caller's job — an arrival alone carries
 * NO start provenance. IDEMPOTENT: a second call returns the same ticket.
 * The ticket itself stays in the tracker — we flipped a column, not CRUD.
 */
export function simulateDragArrival(): { ticketId: string; title: string } {
  if (arrival) return arrival;
  let row = BACKLOG.find((t) => t.id === DRAG_ARRIVAL_ID);
  if (!row) {
    // "creates" path — only if another slice reshuffles the backlog seeds
    row = {
      id: DRAG_ARRIVAL_ID,
      title: DRAG_ARRIVAL_TITLE,
      status: "Backlog",
      ageLabel: "13d",
      project: "AutoMarket",
      labels: ["client-owned"],
      component: "Onboarding",
    } satisfies BacklogTicket;
    BACKLOG.unshift(row);
  }
  row.status = "To Do — Refined"; // the drag moved it out of Backlog on the client board
  declinedIds.delete(DRAG_ARRIVAL_ID); // a re-drag rings the doorbell again
  arrivedIds.add(DRAG_ARRIVAL_ID);
  arrival = { ticketId: DRAG_ARRIVAL_ID, title: row.title };
  bumpDemo();
  return arrival;
}
