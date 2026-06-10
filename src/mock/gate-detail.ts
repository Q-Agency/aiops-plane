/**
 * Gate detail — everything the client-grade gate review surface
 * (/approvals/$gateId, C4) renders for ONE gate: artifact header data,
 * rendered SPEC.md, the EARS acceptance-criteria list, the 8-validator
 * results (validators.ts), SLA chip data, and — for clarification gates —
 * the question + suggested answer.
 *
 * Built per-gate from the existing seeds: approvals.ts (both gate kinds),
 * tickets.ts, trace.ts (specMd/designMd/buildLineage), humans.ts
 * (accountability), validators.ts (the moat).
 */

import type { AgentId, Approval, Ticket } from "./types";
import { approvals, clarificationGates, type ClarificationGate } from "./approvals";
import { tickets } from "./tickets";
import { buildLineage, designMd, specMd } from "./trace";
import { accountableFor } from "./humans";
import { validatorsFor, validatorScore, type ValidatorCheck } from "./validators";

export type GateKind = "approval" | "clarification";

export type SlaState = "on_track" | "at_risk" | "overdue";

export interface GateSla {
  /** Clearance target in minutes (gate ≤ 4h, clarification ≤ 2h per C8). */
  targetMin: number;
  /** Gate age in minutes at module evaluation. */
  ageMin: number;
  state: SlaState;
  /** Chip copy, e.g. "Due in 3h 48m" / "26h over SLA". */
  label: string;
}

/** One EARS-shaped acceptance criterion (read-only validator state, not a human checklist). */
export interface EarsCriterion {
  id: string; //          "AC-1"
  text: string; //        the full criterion line
  trigger: string; //     EARS trigger clause ("WHEN …")
  response: string; //    EARS response clause ("THE SYSTEM SHALL …")
  measurable: boolean; // has a measurable bound (latency, count, …)
  valid: boolean; //      structurally valid EARS shape
}

export interface PriorDecision {
  decision: "approved" | "rejected";
  actor: string;
  atOffsetMin: number; // minutes ago
  reason: string;
  feedback?: string[];
}

export interface GateDetail {
  gateId: string; //              "appr-AM-142" | "clar-AM-142"
  kind: GateKind;
  ticketId: string;
  ticketTitle: string;
  /** Header badge, e.g. "Spec approval" / "Clarification". */
  gateLabel: string;
  /** Producing (approval) or asking (clarification) agent. */
  agentId: AgentId;
  /** Human id from humans.ts — accountable for this gate. */
  accountableHumanId: string;
  /** "spec.md · AM-142" */
  artifactLabel: string;
  openedAt: number;
  sla: GateSla;
  /** Rendered artifact body (markdown-ish mock). Empty for clarifications. */
  specMarkdown: string;
  /** EARS acceptance criteria (spec gates; empty list otherwise). */
  earsCriteria: EarsCriterion[];
  /** The 8 deterministic structural checks for this artifact. */
  validators: ValidatorCheck[];
  /** 0–100 — passed/total. */
  validatorScore: number;
  /** Present only when kind === "clarification". */
  clarification?: {
    question: string;
    options?: string[];
    suggestedAnswer?: string;
  };
  rerunCount: number;
  /** Rejection-loop history ("this spec was returned once — v2"). */
  priorDecisions: PriorDecision[];
  /** Quiet secondary fallback — the agent's own tool (mock href). */
  flowObserverHref: string;
}

const MIN = 60_000;

/** Gate-clearance targets (C8): approvals ≤ 4h, clarifications ≤ 2h. */
export const APPROVAL_SLA_TARGET_MIN = 240;
export const CLARIFICATION_SLA_TARGET_MIN = 120;

const GATE_AGENT: Record<Approval["gate"], AgentId> = {
  "Spec Review": "ba",
  "Design Review": "sa",
  "Tasks Review": "tasklist",
  "Dev Review": "dev",
  "QA Review": "qa",
};

const GATE_BADGE: Record<Approval["gate"], string> = {
  "Spec Review": "Spec approval",
  "Design Review": "Design approval",
  "Tasks Review": "Tasks approval",
  "Dev Review": "Code approval",
  "QA Review": "QA approval",
};

function fmtDur(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export function slaFor(openedAt: number, targetMin: number): GateSla {
  const ageMin = Math.max(0, Math.round((Date.now() - openedAt) / MIN));
  const state: SlaState =
    ageMin >= targetMin ? "overdue" : ageMin >= targetMin * 0.5 ? "at_risk" : "on_track";
  const label =
    state === "overdue"
      ? `${fmtDur(ageMin - targetMin)} over SLA`
      : `Due in ${fmtDur(targetMin - ageMin)}`;
  return { targetMin, ageMin, state, label };
}

/* ------------------------------------------------------------------ */
/* EARS acceptance criteria                                             */
/* ------------------------------------------------------------------ */

/**
 * EARS-shaped readout of the spec's AC block (mirrors the 5 ACs that
 * specMd(ticket) renders). Deterministic per ticket; read-only.
 */
export function earsCriteriaFor(t: Ticket): EarsCriterion[] {
  const feature = t.title.toLowerCase();
  return [
    {
      id: "AC-1",
      text: "WHEN a search request is made under 50 RPS sustained load, THE SYSTEM SHALL respond with p95 latency < 200ms.",
      trigger: "WHEN a search request is made under 50 RPS sustained load",
      response: "THE SYSTEM SHALL respond with p95 latency < 200ms",
      measurable: true,
      valid: true,
    },
    {
      id: "AC-2",
      text: `WHEN ${feature} yields zero results, THE SYSTEM SHALL render the empty-state hint with a CTA to broaden filters.`,
      trigger: `WHEN ${feature} yields zero results`,
      response: "THE SYSTEM SHALL render the empty-state hint with a CTA to broaden filters",
      measurable: false,
      valid: true,
    },
    {
      id: "AC-3",
      text: "WHEN results exceed one page, THE SYSTEM SHALL paginate by cursor (?after=…) — never offset.",
      trigger: "WHEN results exceed one page",
      response: "THE SYSTEM SHALL paginate by cursor (?after=…), never offset",
      measurable: false,
      valid: true,
    },
    {
      id: "AC-4",
      text: "WHEN the mobile client consumes the contract, THE SYSTEM SHALL serve the identical schema consumed by web.",
      trigger: "WHEN the mobile client consumes the contract",
      response: "THE SYSTEM SHALL serve the identical schema consumed by web",
      measurable: false,
      valid: true,
    },
    {
      id: "AC-5",
      text: `WHEN ${feature} is invoked, THE SYSTEM SHALL emit a telemetry event with payload size and duration.`,
      trigger: `WHEN ${feature} is invoked`,
      response: "THE SYSTEM SHALL emit a telemetry event with payload size and duration",
      measurable: true,
      valid: true,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Detail assembly                                                      */
/* ------------------------------------------------------------------ */

function ticketFor(id: string): Ticket | undefined {
  return tickets.find((t) => t.id === id);
}

function priorDecisionsFor(t: Ticket): PriorDecision[] {
  if (!t.rerunCount) return [];
  const lineage = buildLineage(t);
  return lineage
    .filter((n) => n.status === "rejected-then-fixed" && n.reject)
    .map((n) => ({
      decision: "rejected" as const,
      actor: n.approver ?? t.approver,
      atOffsetMin: n.approvedAtOffsetMin ?? n.producedAtOffsetMin,
      reason: n.reject!.reason,
      feedback: n.reject!.feedback,
    }));
}

function artifactBody(gate: Approval["gate"], t: Ticket): string {
  switch (gate) {
    case "Spec Review":
      return specMd(t);
    case "Design Review":
      return designMd(t).md;
    default:
      return `# ${t.id} · ${t.title}\n\n> ${gate} artifact — rendered preview lands with the ${gate} facet renderer.\n\nOpen the artifact in Traceability for the full body.`;
  }
}

function detailFromApproval(a: Approval): GateDetail | undefined {
  const t = ticketFor(a.ticketId);
  if (!t) return undefined;
  const agentId = GATE_AGENT[a.gate];
  const checks = validatorsFor(t.id);
  const isSpec = a.gate === "Spec Review";
  return {
    gateId: a.id,
    kind: "approval",
    ticketId: t.id,
    ticketTitle: t.title,
    gateLabel: GATE_BADGE[a.gate],
    agentId,
    accountableHumanId: accountableFor(agentId).id,
    artifactLabel: a.artifact,
    openedAt: a.openedAt,
    sla: slaFor(a.openedAt, APPROVAL_SLA_TARGET_MIN),
    specMarkdown: artifactBody(a.gate, t),
    earsCriteria: isSpec ? earsCriteriaFor(t) : [],
    validators: checks,
    validatorScore: validatorScore(checks),
    rerunCount: t.rerunCount ?? 0,
    priorDecisions: priorDecisionsFor(t),
    flowObserverHref: `https://q-ba-dashboard.ngrok.app/flow/${t.id.toLowerCase()}`,
  };
}

function detailFromClarification(c: ClarificationGate): GateDetail | undefined {
  const t = ticketFor(c.ticketId);
  if (!t) return undefined;
  return {
    gateId: c.id,
    kind: "clarification",
    ticketId: t.id,
    ticketTitle: t.title,
    gateLabel: "Clarification",
    agentId: c.agentId,
    accountableHumanId: c.accountable,
    artifactLabel: `question · ${t.id}`,
    openedAt: c.openedAt,
    sla: slaFor(c.openedAt, CLARIFICATION_SLA_TARGET_MIN),
    specMarkdown: "",
    earsCriteria: [],
    validators: [],
    validatorScore: 0,
    clarification: {
      question: c.question,
      options: c.options,
      suggestedAnswer: c.proposedAnswer,
    },
    rerunCount: t.rerunCount ?? 0,
    priorDecisions: [],
    flowObserverHref: `https://q-ba-dashboard.ngrok.app/flow/${t.id.toLowerCase()}`,
  };
}

/** Detail for one gate id of either kind ("appr-*" / "clar-*"). */
export function gateDetailFor(gateId: string): GateDetail | undefined {
  const a = approvals.find((x) => x.id === gateId);
  if (a) return detailFromApproval(a);
  const c = clarificationGates.find((x) => x.id === gateId);
  if (c) return detailFromClarification(c);
  return undefined;
}

/** All open gates as details — approvals + clarifications, newest first. */
export function allGateDetails(): GateDetail[] {
  const fromApprovals = approvals
    .map(detailFromApproval)
    .filter((d): d is GateDetail => Boolean(d));
  const fromClarifications = clarificationGates
    .map(detailFromClarification)
    .filter((d): d is GateDetail => Boolean(d));
  return [...fromApprovals, ...fromClarifications].sort((a, b) => b.openedAt - a.openedAt);
}
