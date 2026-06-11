import type { Codebase, Ticket } from "./types";

const now = Date.now();
const min = 60_000;
const hr = 60 * min;

export const tickets: Ticket[] = [
  { id: "AM-142", title: "Vehicle search with filters", stage: "spec-review",  state: "waiting",  approver: "Zlatko", codebase: "backend", priority: "P1", overnightEligible: false, createdAt: now - 6*hr,  updatedAt: now - 12*min },
  { id: "AM-138", title: "Buyer–seller messaging",      stage: "design-review",state: "waiting",  approver: "Marin",  codebase: "backend", priority: "P0", overnightEligible: false, createdAt: now - 22*hr, updatedAt: now - 40*min },
  { id: "AM-131", title: "Listing image upload",        stage: "ready-qa",     state: "running",  approver: "Iva",    codebase: "web",     priority: "P1", overnightEligible: true,  createdAt: now - 30*hr, updatedAt: now - 4*min,  rerunCount: 1 },
  { id: "AM-150", title: "VIN decoder service",         stage: "ready-dev",    state: "running",  approver: "Petar",  codebase: "backend", priority: "P2", overnightEligible: true,  createdAt: now - 4*hr,  updatedAt: now - 2*min },
  { id: "AM-149", title: "Offer / escrow flow",         stage: "dev-review",   state: "waiting",  approver: "Zlatko", codebase: "backend", priority: "P0", overnightEligible: false, createdAt: now - 48*hr, updatedAt: now - 70*min },
  { id: "AM-147", title: "Saved searches",              stage: "ready-tasks",  state: "running",  approver: "Ana",    codebase: "web",     priority: "P2", overnightEligible: true,  createdAt: now - 8*hr,  updatedAt: now - 9*min },
  { id: "AM-145", title: "Push notifications",          stage: "tasks-review", state: "waiting",  approver: "Marin",  codebase: "mobile",  priority: "P2", overnightEligible: false, createdAt: now - 12*hr, updatedAt: now - 25*min },
  { id: "AM-144", title: "Seller KYC verification",     stage: "qa-review",    state: "waiting",  approver: "Iva",    codebase: "backend", priority: "P0", overnightEligible: false, createdAt: now - 36*hr, updatedAt: now - 18*min },
  { id: "AM-141", title: "Price suggestion model",      stage: "ready-design", state: "idle",     approver: "Ana",    codebase: "backend", priority: "P1", overnightEligible: true,  createdAt: now - 10*hr, updatedAt: now - 90*min },
  { id: "AM-140", title: "Fraud signals service",       stage: "design-review",state: "waiting",  approver: "Zlatko", codebase: "backend", priority: "P1", overnightEligible: false, createdAt: now - 14*hr, updatedAt: now - 55*min, rerunCount: 2 },
  { id: "AM-139", title: "Image moderation pipeline",   stage: "ready-spec",   state: "idle",     approver: "Marin",  codebase: "backend", priority: "P2", overnightEligible: true,  createdAt: now - 3*hr,  updatedAt: now - 30*min },
  { id: "AM-136", title: "Listing detail page",         stage: "done",         state: "approved", approver: "Iva",    codebase: "web",     priority: "P1", overnightEligible: false, createdAt: now - 5*24*hr, updatedAt: now - 6*hr },
  { id: "AM-135", title: "Test drive scheduling",       stage: "backlog",      state: "idle",     approver: "Luka",   codebase: "mobile",  priority: "P3", overnightEligible: true,  createdAt: now - 18*hr, updatedAt: now - 18*hr },
  { id: "AM-133", title: "Payment intent callback",     stage: "dev-review",   state: "waiting",  approver: "Petar",  codebase: "backend", priority: "P0", overnightEligible: false, createdAt: now - 26*hr, updatedAt: now - 35*min },
  { id: "AM-130", title: "Mobile onboarding flow",      stage: "ready-qa",     state: "idle",     approver: "Luka",   codebase: "mobile",  priority: "P2", overnightEligible: true,  createdAt: now - 20*hr, updatedAt: now - 110*min },
  { id: "AM-128", title: "Search autocomplete",         stage: "spec-review",  state: "waiting",  approver: "Ana",    codebase: "web",     priority: "P2", overnightEligible: true,  createdAt: now - 9*hr,  updatedAt: now - 22*min },
];

/* ------------------------------------------------------------------ */
/* Work-intake seam (slice 2, C10) — confirmed/auto-started arrivals    */
/* land here                                                            */
/* ------------------------------------------------------------------ */

export interface AddTicketInput {
  /**
   * Tracker id (e.g. "AM-109") — REQUIRED: every pod ticket originates on
   * the board (the single doorbell); Agency OS never mints ticket ids.
   */
  id: string;
  title: string;
  priority?: Ticket["priority"];
  codebase?: Codebase;
  approver?: string;
}

/**
 * Mock seam for Work Intake: unshifts a new Backlog ticket into the live
 * `tickets` array (same reference every consumer reads), so started rows
 * appear at the top of the Pipeline Backlog column on the next render.
 * Derived module-load datasets (approvals, economics) intentionally do NOT
 * re-derive — a freshly started ticket has no gates or spend yet.
 */
export function addTicket(input: AddTicketInput): Ticket {
  const ts = Date.now();
  const t: Ticket = {
    id: input.id,
    title: input.title.trim(),
    stage: "backlog",
    state: "idle",
    approver: input.approver ?? "Ana",
    codebase: input.codebase ?? "web",
    priority: input.priority ?? "P2",
    overnightEligible: false,
    createdAt: ts,
    updatedAt: ts,
  };
  tickets.unshift(t);
  return t;
}

export function ticketById(id: string): Ticket | undefined {
  return tickets.find((t) => t.id === id);
}

/* ------------------------------------------------------------------ */
/* Demo Director seam (wave-2 COMPLETION) — additive flag, never reshapes */
/* ------------------------------------------------------------------ */

export interface TicketRestagePatch {
  stage?: Ticket["stage"];
  state?: Ticket["state"];
  updatedAt?: number;
}

/**
 * Flags an existing ticket for a staged demo beat (stage/state/updatedAt
 * only — same live `tickets` reference every consumer reads). Returns the
 * PREVIOUS values of exactly the patched fields so the Demo Director's
 * checkpoint restore can put them back; null = unknown id. Derived
 * module-load datasets (approvals, economics) intentionally do NOT
 * re-derive — same contract as addTicket above.
 */
export function restageTicket(id: string, patch: TicketRestagePatch): TicketRestagePatch | null {
  const t = ticketById(id);
  if (!t) return null;
  const prev: TicketRestagePatch = {};
  if (patch.stage !== undefined) {
    prev.stage = t.stage;
    t.stage = patch.stage;
  }
  if (patch.state !== undefined) {
    prev.state = t.state;
    t.state = patch.state;
  }
  if (patch.updatedAt !== undefined) {
    prev.updatedAt = t.updatedAt;
    t.updatedAt = patch.updatedAt;
  }
  return prev;
}
