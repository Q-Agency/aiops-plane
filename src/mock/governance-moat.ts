/**
 * Governance moat — fleet-level aggregation of the 8 deterministic
 * structural validators (validators.ts) across every spec BA has emitted,
 * plus the visually-walled LLM-advisory signals (C3).
 *
 * Consumed by /governance (GovernanceView): the trust banner, the two
 * walled validator panels, and the per-spec structural table. Per-artifact
 * results stay in validators.ts `validatorsFor` — this module only
 * aggregates them; it never re-declares check ids.
 *
 * Honest language: deterministic checks prove specs are WELL-FORMED
 * (structural), not that they're the right idea (semantic). LLM signals
 * are advisory — they never gate.
 */

import { tickets } from "./tickets";
import { approvals } from "./approvals";
import type { Stage, Ticket } from "./types";
import {
  CHECK_DESCRIPTORS,
  CHECK_LABELS,
  VALIDATOR_IDS,
  validatorsFor,
  validatorScore,
  type ValidatorCheck,
  type ValidatorCheckId,
} from "./validators";

/* ------------------------------------------------------------------ */
/* Assessed specs — every ticket BA has emitted a spec for              */
/* ------------------------------------------------------------------ */

export interface AssessedSpec {
  ticketId: string;
  title: string;
  codebase: Ticket["codebase"];
  stage: Ticket["stage"];
  /** The 8 per-artifact structural checks (validators.ts). */
  checks: ValidatorCheck[];
  /** 0–100 — passed/total. */
  score: number;
  failing: ValidatorCheckId[];
  warning: ValidatorCheckId[];
  /** Open spec-review gate id (→ /approvals/$gateId) when one exists. */
  reviewGateId?: string;
}

const STAGE_ORDER: Stage[] = [
  "backlog", "ready-spec", "spec-review", "ready-design", "design-review",
  "ready-tasks", "tasks-review", "ready-dev", "dev-review", "ready-qa",
  "qa-review", "done",
];

const SPEC_EMITTED_FROM = STAGE_ORDER.indexOf("spec-review");

/** Tickets whose spec exists = stage at/past spec-review. Call per render. */
export function assessedSpecs(): AssessedSpec[] {
  return tickets
    .filter((t) => STAGE_ORDER.indexOf(t.stage) >= SPEC_EMITTED_FROM)
    .map((t) => {
      const checks = validatorsFor(t.id);
      const gate = t.stage === "spec-review" ? approvals.find((a) => a.ticketId === t.id) : undefined;
      return {
        ticketId: t.id,
        title: t.title,
        codebase: t.codebase,
        stage: t.stage,
        checks,
        score: validatorScore(checks),
        failing: checks.filter((c) => c.status === "fail").map((c) => c.id),
        warning: checks.filter((c) => c.status === "warn").map((c) => c.id),
        reviewGateId: gate?.id,
      };
    });
}

/* ------------------------------------------------------------------ */
/* Deterministic wall — per-check aggregate across all assessed specs   */
/* ------------------------------------------------------------------ */

export interface MoatValidatorRow {
  id: ValidatorCheckId;
  label: string;
  descriptor: string;
  check: "deterministic";
  /** Aggregate: fail = at least one spec fails; partial = warns only. */
  status: "pass" | "fail" | "partial";
  /** % of assessed specs that hard-pass this check (0–100). */
  coverage: number;
  detail: string;
  /** A failing deterministic check blocks structural readiness. */
  blocksReadiness: boolean;
  failingSpecs: string[];
  warnSpecs: string[];
}

export function moatValidators(): MoatValidatorRow[] {
  const specs = assessedSpecs();
  const total = specs.length;
  return VALIDATOR_IDS.map((id) => {
    const failingSpecs = specs.filter((s) => s.failing.includes(id)).map((s) => s.ticketId);
    const warnSpecs = specs.filter((s) => s.warning.includes(id)).map((s) => s.ticketId);
    const passing = total - failingSpecs.length - warnSpecs.length;
    const status: MoatValidatorRow["status"] =
      failingSpecs.length > 0 ? "fail" : warnSpecs.length > 0 ? "partial" : "pass";
    const detail =
      status === "pass"
        ? `All ${total} assessed specs pass`
        : status === "fail"
          ? `${passing}/${total} specs pass · fails on ${failingSpecs.join(", ")}`
          : `${passing}/${total} specs hard-pass · drift on ${warnSpecs.join(", ")}`;
    return {
      id,
      label: CHECK_LABELS[id],
      descriptor: CHECK_DESCRIPTORS[id],
      check: "deterministic" as const,
      status,
      coverage: total === 0 ? 0 : Math.round((passing / total) * 100),
      detail,
      blocksReadiness: status === "fail",
      failingSpecs,
      warnSpecs,
    };
  });
}

/** Aggregate rows reshaped as ValidatorCheck[] so the shared walled
 *  ValidatorPanel (C3) renders the SAME component on /governance and the
 *  gate review — check-for-check. */
export function moatChecks(): ValidatorCheck[] {
  return moatValidators().map((r) => ({
    id: r.id,
    label: r.label,
    descriptor: r.descriptor,
    kind: "structural" as const,
    deterministic: true as const,
    status: r.status === "fail" ? "fail" : r.status === "partial" ? "warn" : "pass",
    detail: r.detail,
  }));
}

/* ------------------------------------------------------------------ */
/* Structural readiness rollup                                          */
/* ------------------------------------------------------------------ */

export interface StructuralReadiness {
  /** % of assessed specs with zero failing checks. */
  pct: number;
  /** Count of deterministic checks currently failing somewhere (blockers). */
  blocking: number;
  specsAssessed: number;
  specsReady: number;
}

export function structuralReadiness(): StructuralReadiness {
  const specs = assessedSpecs();
  const ready = specs.filter((s) => s.failing.length === 0).length;
  const blocking = moatValidators().filter((r) => r.blocksReadiness).length;
  return {
    pct: specs.length === 0 ? 0 : Math.round((ready / specs.length) * 100),
    blocking,
    specsAssessed: specs.length,
    specsReady: ready,
  };
}

/* ------------------------------------------------------------------ */
/* LLM-assisted wall — advisory signals, never a gate                   */
/* ------------------------------------------------------------------ */

export interface LlmSignal {
  id: "judge_agreement" | "persona_approval";
  label: string;
  /** 0–1 model-graded score. */
  score: number;
  kind: "judge" | "persona";
  advisory: true;
  note: string;
}

export const llmSignals: LlmSignal[] = [
  {
    id: "judge_agreement",
    label: "LLM judge agreement",
    score: 0.84,
    kind: "judge",
    advisory: true,
    note: "Judge agreed with the human gate decision on 84% of reviewed specs (trailing 30d).",
  },
  {
    id: "persona_approval",
    label: "Persona approval",
    score: 0.91,
    kind: "persona",
    advisory: true,
    note: "Synthetic reviewer personas approved 91% of specs on first read.",
  },
];

/** The demoable separation beat: the judge disagrees, structure passes —
 *  rendered as "advisory disagreement — does not block." */
export const advisoryDisagreement = {
  ticketId: "AM-133",
  line: "Judge scored AM-133 below its bar; all 8 structural checks pass. Advisory disagreement — does not block.",
};

/* ------------------------------------------------------------------ */
/* Facet completeness — counted from extracted facets (structural)      */
/* ------------------------------------------------------------------ */

export const FACET_DIMENSIONS = [
  "user_roles",
  "business_rules",
  "acceptance_criteria",
  "scope_boundaries",
  "error_handling",
  "data_model",
] as const;

export type FacetDimension = (typeof FACET_DIMENSIONS)[number];

export const FACET_LABELS: Record<FacetDimension, string> = {
  user_roles: "User roles",
  business_rules: "Business rules",
  acceptance_criteria: "Acceptance criteria",
  scope_boundaries: "Scope boundaries",
  error_handling: "Error handling",
  data_model: "Data model",
};

/** Counted facet coverage per dimension (0–100) — extraction counts, not grades. */
export const facetCompleteness: Record<FacetDimension, number> = {
  user_roles: 92,
  business_rules: 88,
  acceptance_criteria: 95,
  scope_boundaries: 84,
  error_handling: 78,
  data_model: 90,
};

export const facetCompletenessAvg = Math.round(
  FACET_DIMENSIONS.reduce((s, d) => s + facetCompleteness[d], 0) / FACET_DIMENSIONS.length,
);
