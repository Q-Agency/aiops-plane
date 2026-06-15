/**
 * Demo Director engine (wave-2 COMPLETION) - the staged-event driver behind
 * the hidden ⌘⇧D presenter overlay. Each step of the 3-minute script fires
 * a staged mutation into the EXISTING mock stores (tickets, approvals,
 * incidents, notifications) - nothing in the product is special-cased; the
 * surfaces just react via useDemoTick(). The same engine ships later as the
 * guided Sample-pod onboarding tour (vision: demo infra = onboarding).
 *
 * Guarantees:
 *  - IDEMPOTENT: re-firing a fired step is a no-op (a fumbled reset never
 *    double-seeds). The guard lives in the beat functions themselves, so any
 *    future direct binding of a beat (e.g. a landing CTA) shares it.
 *  - RESTORABLE: checkpoints restore by clear-and-reapply over the staged
 *    overlay ONLY - appended notifications are removed, flipped seed fields
 *    are put back from captured before-values; seeded data is never reshaped.
 *  - LEDGER-HONEST: the only session-ledger write is `pod.launched` (the one
 *    staged beat inside the audit vocabulary), written at most once per
 *    browser session so checkpoint resets never duplicate audit rows.
 */

import { restageGate } from "./approvals";
import { appendAuditMock } from "./audit-bridge";
import { bumpDemo } from "./demo-bus";
import { restageIncident, type IncidentRestagePatch } from "./incidents";
import {
  CURRENT_USER_ID,
  notifications,
  pushNotification,
  type AppNotification,
} from "./notifications";
import { restageTicket, type TicketRestagePatch } from "./tickets";

export const DEMO_POD_ID = "automarket";
export const DEMO_SCRIPT_NAME = "3-minute pod demo";

/* ------------------------------------------------------------------ */
/* Staged overlay - everything the Director adds/flips, and how to undo */
/* ------------------------------------------------------------------ */

/** Step ids fired this session (the idempotency + step-list state). */
const fired = new Set<string>();

/** Notifications appended by staged beats (removed on checkpoint restore). */
const stagedNotifs: AppNotification[] = [];

/** Reverse-order undos for seed-field flips (restore = run in reverse). */
const flipUndos: Array<() => void> = [];

/** Audit rows are append-only - never re-written across checkpoint resets. */
const auditedOnce = new Set<string>();

function markFired(stepId: string): boolean {
  if (fired.has(stepId)) return false;
  fired.add(stepId);
  return true;
}

function stageNotification(n: Parameters<typeof pushNotification>[0]): void {
  stagedNotifs.push(pushNotification(n));
}

function flipTicket(id: string, patch: TicketRestagePatch): void {
  const prev = restageTicket(id, patch);
  if (prev) flipUndos.push(() => void restageTicket(id, prev));
}

function flipGate(gateId: string): void {
  const prev = restageGate(gateId);
  if (prev !== null) flipUndos.push(() => void restageGate(gateId, prev));
}

function flipIncident(id: string, patch: IncidentRestagePatch): void {
  const prev = restageIncident(id, patch);
  if (prev) flipUndos.push(() => void restageIncident(id, prev));
}

function auditOncePerSession(key: string, entry: Parameters<typeof appendAuditMock>[0]): void {
  if (auditedOnce.has(key)) return;
  auditedOnce.add(key);
  appendAuditMock(entry);
}

/** Clear the staged overlay: un-flip seeds, drop appended notifications. */
function clearStaged(): void {
  for (let i = flipUndos.length - 1; i >= 0; i--) flipUndos[i]();
  flipUndos.length = 0;
  for (const n of stagedNotifs) {
    const idx = notifications.indexOf(n);
    if (idx >= 0) notifications.splice(idx, 1);
  }
  stagedNotifs.length = 0;
  fired.clear();
}

/* ------------------------------------------------------------------ */
/* Beats - each mutates the existing stores, then bumps the demo bus    */
/* ------------------------------------------------------------------ */

/** 0:00 - LAUNCH complete · pod live. */
export function fireUpComplete(podId: string = DEMO_POD_ID): void {
  if (!markFired("fireup")) return;
  auditOncePerSession(`pod.launched:${podId}`, {
    action: "pod.launched",
    target: `pod ${podId}`,
    detail: "LAUNCH complete - pod live (staged demo)",
  });
  stageNotification({
    recipientId: CURRENT_USER_ID,
    kind: "digest",
    severity: "info",
    title: "Pod live · LAUNCH complete",
    body: "Agents healthy · constitution v1 active · gates armed.",
    actorId: null,
    deepLink: "/",
    channels: ["in_app", "slack"],
  });
  bumpDemo();
}

/**
 * 0:30 - AM-142 dragged to Ready · pod starts (the tracker-boundary beat:
 * the client's drag is the doorbell; the chain runs inside Agency OS).
 * TRUTHFUL under the demo pod's confirm-first default: the drag SENT the
 * ticket and the operator's confirmation started it - so the narration
 * says "sent … start confirmed", and start provenance stays the default
 * operator-confirmed ("drag-to-ready" is reserved for auto-start starts).
 */
export function seedInflow(podId: string = DEMO_POD_ID): void {
  if (!markFired("inflow")) return;
  flipTicket("AM-142", { stage: "ready-spec", state: "running", updatedAt: Date.now() });
  stageNotification({
    recipientId: CURRENT_USER_ID,
    kind: "delivered",
    severity: "info",
    title: "AM-142 dragged to Ready · pod starts",
    body: `Vehicle search with filters - the drag on the client board sent it to ${podId}; start confirmed (confirm-first). BA picked it up (drafting spec.md).`,
    actorId: "ba",
    ticketId: "AM-142",
    deepLink: "/pipeline",
    channels: ["in_app"],
  });
  bumpDemo();
}

/** 0:45 - BA asks a clarification (seeded gate re-timed to "just now" + bell pulse). */
export function openClarification(ticketId: string = "AM-142"): void {
  if (!markFired("clarification")) return;
  flipGate(`clar-${ticketId}`);
  stageNotification({
    recipientId: CURRENT_USER_ID,
    kind: "clarification_gate",
    severity: "warning",
    title: `Clarification needed · ${ticketId}`,
    body: "BA Agent asks: saved filter chips - per account or per device?",
    actorId: "ba",
    ticketId,
    entityId: `clar-${ticketId}`,
    deepLink: `/approvals/clar-${ticketId}`,
    channels: ["in_app", "slack"],
    actionable: true,
    actionLabel: "Answer",
    slaState: "on_track",
  });
  bumpDemo();
}

/** 1:30 - design gate goes stale → escalation (esc1 is seeded in comms.ts; the staged beat is the routed alert). */
export function raiseEscalation(ticketId: string = "AM-138"): void {
  if (!markFired("escalation")) return;
  stageNotification({
    recipientId: CURRENT_USER_ID,
    kind: "escalation",
    severity: "critical",
    title: "Escalation · design gate stale 26h",
    body: `${ticketId} design.md v2 over SLA - 2 downstream tickets blocked. Routed to Marin.`,
    actorId: "sa",
    ticketId,
    entityId: "esc1",
    deepLink: "/comms",
    channels: ["in_app", "slack"],
    slaState: "overdue",
  });
  bumpDemo();
}

/** 1:35 - incident opens (flips the seeded QA-down incident to open/just-now). */
export function openIncident(incidentId: string = "inc-1"): void {
  if (!markFired("incident")) return;
  flipIncident(incidentId, { status: "open", openedMinAgo: 0 });
  stageNotification({
    recipientId: CURRENT_USER_ID,
    kind: "incident_opened",
    severity: "critical",
    title: "Incident · QA Agent down",
    body: "Liveness lost just now - suggested action: Restart agent.",
    actorId: null,
    entityId: incidentId,
    deepLink: "/incidents",
    channels: ["in_app", "slack"],
    actionable: true,
    actionLabel: "Recover",
  });
  bumpDemo();
}

/** 1:50 - BA run completes · spec → review (ticket to Spec Review + gate re-timed). */
export function completeBaRun(ticketId: string = "AM-142"): void {
  if (!markFired("ba-run-complete")) return;
  flipTicket(ticketId, { stage: "spec-review", state: "waiting", updatedAt: Date.now() });
  flipGate(`appr-${ticketId}`);
  stageNotification({
    recipientId: CURRENT_USER_ID,
    kind: "approval_gate",
    severity: "warning",
    title: `Spec approval waiting · ${ticketId}`,
    body: "spec.md v3 ready - 8/8 structural checks pass. Awaiting your sign-off.",
    actorId: "ba",
    ticketId,
    entityId: `appr-${ticketId}`,
    deepLink: `/approvals/appr-${ticketId}`,
    channels: ["in_app", "slack"],
    actionable: true,
    actionLabel: "Review",
    slaState: "on_track",
  });
  bumpDemo();
}

/** 2:45 - validator panel: the moat close (highlight-only beat - no store mutation). */
export function moatClose(): void {
  if (!markFired("moat")) return;
  bumpDemo();
}

/* ------------------------------------------------------------------ */
/* Script - the step list the overlay renders verbatim                  */
/* ------------------------------------------------------------------ */

export interface DemoStep {
  id: string;
  /** Script timestamp, e.g. "0:30". */
  at: string;
  /** Parsed seconds for the auto-advance timer. */
  atSec: number;
  /** Script beat - the row renders "{at} - {label}". */
  label: string;
  /** Idempotent staged mutation (re-fire = no-op). */
  fire: () => void;
}

function sec(at: string): number {
  const [m, s] = at.split(":").map(Number);
  return m * 60 + s;
}

export const DEMO_STEPS: DemoStep[] = [
  { id: "fireup", at: "0:00", atSec: sec("0:00"), label: "LAUNCH complete · pod live", fire: () => fireUpComplete() },
  { id: "inflow", at: "0:30", atSec: sec("0:30"), label: "AM-142 dragged to Ready · pod starts", fire: () => seedInflow() },
  { id: "clarification", at: "0:45", atSec: sec("0:45"), label: "BA asks a clarification", fire: () => openClarification("AM-142") },
  { id: "escalation", at: "1:30", atSec: sec("1:30"), label: "design gate goes stale → escalation", fire: () => raiseEscalation("AM-138") },
  { id: "incident", at: "1:35", atSec: sec("1:35"), label: "incident opens", fire: () => openIncident("inc-1") },
  { id: "ba-run-complete", at: "1:50", atSec: sec("1:50"), label: "BA run completes · spec → review", fire: () => completeBaRun("AM-142") },
  { id: "moat", at: "2:45", atSec: sec("2:45"), label: "validator panel: the moat close", fire: () => moatClose() },
];

/* ------------------------------------------------------------------ */
/* Checkpoints - snapshot/restore over the staged overlay only          */
/* ------------------------------------------------------------------ */

export interface DemoCheckpoint {
  id: "start" | "post-inflow" | "pre-monitor";
  label: string;
  /** Prefix of DEMO_STEPS re-applied on restore (clear-and-reapply). */
  applySteps: number;
  /** Where the overlay timer resumes after a reset. */
  resumeAtSec: number;
  /** Restore this checkpoint (same mechanic as the Sample pod's "Reset sample"). */
  restore: () => void;
}

export const CHECKPOINTS: DemoCheckpoint[] = [
  {
    id: "start",
    label: "Start (pod launched, empty)",
    applySteps: 0,
    resumeAtSec: 0,
    restore: () => void restoreToCheckpoint("start"),
  },
  {
    id: "post-inflow",
    label: "Post-inflow (AM-142 + clarification)",
    applySteps: 3,
    resumeAtSec: sec("0:45"),
    restore: () => void restoreToCheckpoint("post-inflow"),
  },
  {
    id: "pre-monitor",
    label: "Pre-MONITOR (escalation + incident live)",
    applySteps: 5,
    resumeAtSec: sec("1:35"),
    restore: () => void restoreToCheckpoint("pre-monitor"),
  },
];

/**
 * Clear the staged overlay, then re-fire the checkpoint's step prefix.
 * Returns the checkpoint (for the "Demo reset to '{checkpoint}'" toast).
 */
export function restoreToCheckpoint(id: string): DemoCheckpoint {
  const cp = CHECKPOINTS.find((c) => c.id === id) ?? CHECKPOINTS[0];
  clearStaged();
  for (const step of DEMO_STEPS.slice(0, cp.applySteps)) step.fire();
  bumpDemo();
  return cp;
}

/* ------------------------------------------------------------------ */
/* Step-state selectors (the overlay reads these on every demo tick)    */
/* ------------------------------------------------------------------ */

export function isStepFired(stepId: string): boolean {
  return fired.has(stepId);
}

export function allStepsFired(): boolean {
  return DEMO_STEPS.every((s) => fired.has(s.id));
}

export function nextUnfiredStep(): DemoStep | null {
  return DEMO_STEPS.find((s) => !fired.has(s.id)) ?? null;
}

/** Fire the next pending step (manual "Step →"). Returns it, or null when done. */
export function fireNextStep(): DemoStep | null {
  const next = nextUnfiredStep();
  next?.fire();
  return next;
}

/** Most recently fired step (the glowing "current" row), in script order. */
export function lastFiredStepId(): string | null {
  for (let i = DEMO_STEPS.length - 1; i >= 0; i--) {
    if (fired.has(DEMO_STEPS[i].id)) return DEMO_STEPS[i].id;
  }
  return null;
}
