/**
 * Work Intake (/intake, C10) — how tickets actually enter the pod:
 * pick from the connected tracker's backlog (pre-filtered by the pod's
 * scope rule) or paste one ticket by hand, with a per-ticket routing
 * preview derived from chain.ts (the first pipeline agent with empty
 * `consumes` — BA — takes it first).
 *
 * The picker rows derive from backlog.ts (the client board); pulls land
 * in tickets.ts via the addTicket seam and fire a notifications.ts entry.
 */

import { BACKLOG, type BacklogTicket } from "./backlog";
import { addTicket, tickets } from "./tickets";
import type { Ticket } from "./types";
import { CHAIN_ROLES, PIPELINE_ORDER, type ChainRoleId } from "./chain";
import { pushNotification } from "./notifications";

export interface IntakeTicket {
  id: string;
  title: string;
  labels: string[];
  priority: "P0" | "P1" | "P2" | "P3";
  ageDays: number;
  /** Matches the pod's scope rule (AutoMarket · label `pod-owned`). */
  inScope: boolean;
  /** Already in the pod (renders greyed, "In pod" badge — no double-pull). */
  pulled: boolean;
  component: string;
}

/** The active scope rule sentence (mirrors the pod's Connect 3b slice). */
export const INTAKE_SCOPE_SENTENCE = "Showing your pod's scope: AutoMarket · label `pod-owned`.";

/** Connector identity for the header chip ("Teamwork · Connected"). */
export const INTAKE_CONNECTOR_ID = "teamwork" as const;

/**
 * Client-board rows the client recently labeled `pod-owned` but that are
 * not yet pulled — these make the picker actionable on a fresh pod.
 */
const NEWLY_IN_SCOPE = new Set(["AM-109", "AM-111", "AM-114", "AM-119"]);

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
 * The picker rows — the client board sample from backlog.ts, scope-matched.
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
      (row.labels.includes("pod-owned") || NEWLY_IN_SCOPE.has(row.id)),
    pulled: isPulled(row.id),
    component: row.component,
  }));
  // canonical demo ticket first, then in-scope, then the rest by age
  return rows.sort((a, b) => {
    if (a.id === "AM-142") return -1;
    if (b.id === "AM-142") return 1;
    if (a.inScope !== b.inScope) return a.inScope ? -1 : 1;
    return a.ageDays - b.ageDays;
  });
}

/** Pickable = in scope and not yet pulled. */
export function pickableTickets(): IntakeTicket[] {
  return intakeBacklog().filter((t) => t.inScope && !t.pulled);
}

export function inScopeCount(): number {
  return intakeBacklog().filter((t) => t.inScope).length;
}

/** "… stay with your team" count (the full client board minus scope). */
export function outOfScopeCount(): number {
  return 220 - inScopeCount(); // BACKLOG_TOTAL mirrors backlog.ts
}

/* ------------------------------------------------------------------ */
/* Routing preview — derived from chain.ts, never stored                */
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

/** First pipeline agent whose `consumes` is empty — BA by contract. */
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
/* Pull / compose — the mutations behind the CTA                        */
/* ------------------------------------------------------------------ */

/**
 * Pulls picked tracker tickets into the pod: each lands at the top of the
 * Pipeline Backlog (tickets.ts) and fires a bell notification.
 * Returns the created tickets (already-pulled ids are skipped).
 */
export function pullTickets(ids: string[]): Ticket[] {
  const board = intakeBacklog();
  const created: Ticket[] = [];
  for (const id of ids) {
    if (isPulled(id)) continue;
    const row = board.find((t) => t.id === id);
    if (!row) continue;
    const t = addTicket({
      id: row.id,
      title: row.title,
      priority: row.priority,
      codebase: row.labels.includes("frontend") ? "web" : "backend",
    });
    created.push(t);
    pushNotification({
      recipientId: "zlatko",
      kind: "delivered",
      severity: "info",
      title: `${t.id} pulled into the pod`,
      body: "Routing to BA Agent — first stop Ready for Spec.",
      ticketId: t.id,
      deepLink: "/pipeline",
      channels: ["in_app"],
    });
  }
  return created;
}

export interface ComposeDraft {
  title: string;
  description?: string;
  priority?: Ticket["priority"];
  labels?: string[];
}

/**
 * "Paste one ticket" composer — creates a pod ticket directly (no tracker
 * needed; a pod is never dead-ended). A one-line title is enough — the BA
 * asks for the rest.
 */
export function composeTicket(draft: ComposeDraft): Ticket {
  const t = addTicket({
    title: draft.title,
    priority: draft.priority ?? "P2",
  });
  pushNotification({
    recipientId: "zlatko",
    kind: "delivered",
    severity: "info",
    title: `${t.id} added to the pod`,
    body: "Pasted ticket routed to BA Agent — first stop Ready for Spec.",
    ticketId: t.id,
    deepLink: "/pipeline",
    channels: ["in_app"],
  });
  return t;
}
