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
import { buildLineage, designMd, qaReportMd, specMd } from "./trace";
import { accountableFor } from "./humans";
import {
  BA_VALIDATOR_FAMILY,
  DESIGN_VALIDATOR_FAMILY,
  QA_VALIDATOR_FAMILY,
  designValidatorsFor,
  qaValidatorsFor,
  validatorsFor,
  validatorScore,
  type ValidatorCheck,
} from "./validators";

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

/**
 * One row of the spec → design coverage map (design gates): where each
 * acceptance criterion of the CONSUMED spec landed in the design. The
 * consumes-graph made reviewable — and exactly what check D1 verifies.
 */
export interface DesignTraceRow {
  acId: string; //          "AC-1"
  summary: string; //       short criterion summary for the row
  sections: string[]; //    design section titles that address it
  covered: boolean;
}

/** One architecture decision record (design gates). */
export interface DecisionRecord {
  id: string; //            "ADR-1"
  title: string;
  choice: string;
  alternatives: string[];
  rationale: string;
  confidence: "high" | "low";
}

/** One row of the spec → test coverage map (QA gates). */
export interface QaCoverageRow {
  acId: string;
  summary: string;
  tests: { name: string; status: "pass" | "fail" }[];
}

/** One filed defect with its suspected root-cause stage (QA gates). */
export interface QaDefect {
  id: string; //            "AM-144-QA-1"
  title: string;
  severity: "critical" | "medium" | "low";
  /** Where the failure was born — the reject target the rework canon uses. */
  suspectedStage: string; // "Design (SA)" | "Implementation (Dev)"
  evidence: string;
}

/** The QA agent's verdict — content, not a structural check. */
export interface ReleaseRecommendation {
  verdict: "ship" | "hold";
  note: string;
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
  /**
   * The deterministic structural checks for this artifact — the BA's 8
   * (spec gates) or the SA's 7 (design gates). Empty for gate kinds whose
   * check family isn't built yet (never borrow another artifact's checks).
   */
  validators: ValidatorCheck[];
  /** 0–100 — passed/total. */
  validatorScore: number;
  /** Family tag for the validator wall, e.g. "ba-spec@1.4.2" / "sa-design@2.1.0". */
  validatorFamily?: string;
  /** Spec → design coverage map (design gates only). */
  designTrace?: DesignTraceRow[];
  /** Architecture decision records (design gates only). */
  decisionRecords?: DecisionRecord[];
  /** Spec → test coverage map (QA gates only). */
  qaCoverage?: QaCoverageRow[];
  /** Filed defects with suspected root-cause stages (QA gates only). */
  defects?: QaDefect[];
  /** The QA agent's ship/hold verdict (QA gates only). */
  releaseRecommendation?: ReleaseRecommendation;
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
/* Design-gate blocks — coverage map + decision records                 */
/* ------------------------------------------------------------------ */

/**
 * Where each spec AC landed in the design (mirrors the design.md sections
 * trace.ts renders). AM-140 — the returned-twice design — leaves AC-2 and
 * AC-5 uncovered, exactly what its failing D1 check reports.
 */
export function designTraceFor(t: Ticket): DesignTraceRow[] {
  const uncovered = t.id === "AM-140" ? new Set(["AC-2", "AC-5"]) : new Set<string>();
  const rows: Array<[string, string, string[]]> = [
    ["AC-1", "p95 < 200ms under 50 RPS", ["NFR budgets"]],
    ["AC-2", "zero-results empty state", ["API contract", "Architecture & components"]],
    ["AC-3", "cursor pagination, never offset", ["API contract", "Constraints"]],
    ["AC-4", "identical schema for web + mobile", ["API contract", "Architecture & components"]],
    ["AC-5", "telemetry event on invocation", ["Failure modes & fallbacks"]],
  ];
  return rows.map(([acId, summary, sections]) => ({
    acId,
    summary,
    sections: uncovered.has(acId) ? [] : sections,
    covered: !uncovered.has(acId),
  }));
}

/** The design's decision records — one deliberately marked Low-confidence. */
export function decisionRecordsFor(t: Ticket): DecisionRecord[] {
  return [
    {
      id: "ADR-1",
      title: "Read path",
      choice: "Cursor pagination over the existing GIN-indexed tsvector",
      alternatives: ["Offset pagination", "Dedicated search cluster"],
      rationale:
        "Reuses listings_search_idx and the ops surface the team already runs; revisit a dedicated cluster only past ~2M active listings.",
      confidence: "high",
    },
    {
      id: "ADR-2",
      title: "Client data layer",
      choice: "React Query (web) + generated Dio client in a BLoC (mobile), one shared contract",
      alternatives: ["Hand-rolled fetch per client", "GraphQL gateway"],
      rationale:
        "One typed contract consumed twice keeps web and mobile schema-identical (AC-4) with no gateway to operate.",
      confidence: "high",
    },
    {
      id: "ADR-3",
      title: `Rollout of ${t.title.toLowerCase()}`,
      choice: "Feature-flagged 10% canary behind the existing flag service",
      alternatives: ["Big-bang release"],
      rationale:
        "Load shape under real filters is uncertain — canary bounds the blast radius while NFR budgets are confirmed.",
      confidence: "low",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* QA-gate blocks — spec → test coverage + defects + verdict            */
/* ------------------------------------------------------------------ */

/**
 * Where each spec AC is verified by tests (mirrors qaReport's suite —
 * AC-5's telemetry test fails, which is defect QA-2). Q1 checks parity.
 */
export function qaCoverageFor(_t: Ticket): QaCoverageRow[] {
  return [
    { acId: "AC-1", summary: "p95 < 200ms under 50 RPS", tests: [{ name: "k6 soak 50 RPS × 10min — p95 174ms", status: "pass" }] },
    { acId: "AC-2", summary: "zero-results empty state", tests: [{ name: "shows empty state when filters yield zero results", status: "pass" }] },
    { acId: "AC-3", summary: "cursor pagination, never offset", tests: [{ name: "honours cursor pagination across 5 pages", status: "pass" }] },
    { acId: "AC-4", summary: "identical schema for web + mobile", tests: [{ name: "mobile: BLoC emits Loading → Success", status: "pass" }] },
    { acId: "AC-5", summary: "telemetry event on invocation", tests: [{ name: "telemetry event fires once per query", status: "fail" }] },
  ];
}

/** The filed defects — each with its suspected ROOT-CAUSE stage (rework canon). */
export function defectsFor(t: Ticket): QaDefect[] {
  return [
    {
      id: `${t.id}-QA-1`,
      title: "429 response missing Retry-After header",
      severity: "medium",
      suspectedStage: "Design (SA)",
      evidence:
        "design.md's failure-mode section omits Retry-After in the 429 contract — Dev implemented to design. Fixing the design re-runs Dev and QA forward.",
    },
    {
      id: `${t.id}-QA-2`,
      title: "Duplicate telemetry event under StrictMode",
      severity: "low",
      suspectedStage: "Implementation (Dev · web)",
      evidence:
        "Double-fire guard missing in useListingSearch effect — AC-5's test fails; isolated to the web client.",
    },
  ];
}

export function releaseRecommendationFor(_t: Ticket): ReleaseRecommendation {
  return {
    verdict: "hold",
    note: "Ship after QA-1 is fixed and re-verified — its root cause sits in the design, so the reject should target Design (SA), not just Dev. QA-2 can ride the next train.",
  };
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
    case "QA Review":
      return qaReportMd(t);
    default:
      return `# ${t.id} · ${t.title}\n\n> ${gate} artifact — rendered preview lands with the ${gate} facet renderer.\n\nOpen the artifact in Traceability for the full body.`;
  }
}

function detailFromApproval(a: Approval): GateDetail | undefined {
  const t = ticketFor(a.ticketId);
  if (!t) return undefined;
  const agentId = GATE_AGENT[a.gate];
  const isSpec = a.gate === "Spec Review";
  const isDesign = a.gate === "Design Review";
  const isQa = a.gate === "QA Review";
  // Each gate renders ITS OWN check family — spec gets the BA's 8, design
  // the SA's 7, QA the report's 7; gates whose family isn't built yet get
  // none (never borrow another artifact's checks — that was a truth bug).
  const checks = isSpec
    ? validatorsFor(t.id)
    : isDesign
      ? designValidatorsFor(t.id)
      : isQa
        ? qaValidatorsFor(t.id)
        : [];
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
    validatorFamily: isSpec
      ? BA_VALIDATOR_FAMILY
      : isDesign
        ? DESIGN_VALIDATOR_FAMILY
        : isQa
          ? QA_VALIDATOR_FAMILY
          : undefined,
    designTrace: isDesign ? designTraceFor(t) : undefined,
    decisionRecords: isDesign ? decisionRecordsFor(t) : undefined,
    qaCoverage: isQa ? qaCoverageFor(t) : undefined,
    defects: isQa ? defectsFor(t) : undefined,
    releaseRecommendation: isQa ? releaseRecommendationFor(t) : undefined,
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
