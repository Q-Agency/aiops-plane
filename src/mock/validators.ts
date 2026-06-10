/**
 * Validators — the shared check-id vocabulary for the zero-LLM structural moat.
 *
 * These are BA's REAL validator registry ids (mirrors `_STRUCTURAL_CHECK_IDS`
 * in the BA repo, agents/ba/pipeline/validators.py). 8 deterministic,
 * zero-LLM structural checks; V3 (open-question marker scanner) is retired.
 *
 * Consumed by: the Gate Review validator panel (/approvals/$gateId), the
 * Governance moat walls (/governance), and any surface that renders the
 * "DETERMINISTIC — NO MODEL IN THE LOOP" badge. Define the vocabulary ONCE
 * here — never re-declare check ids elsewhere.
 *
 * Honest language: these prove the spec is WELL-FORMED (structural), not
 * that it is the right idea (semantic).
 */

export type ValidatorCheckId =
  | "V1_ears_coverage" //               EARS coverage ≥80% of ACs
  | "V2_missing_section" //             all canonical SPEC.md sections present
  | "V4_ac_id_parity" //                AC IDs match between Sections 4 ↔ 11
  | "V5_br_references" //               referenced business rules exist in Section 5
  | "V6_eh_message_parity" //           error-handling messages match Sections 14 ↔ 7
  | "V7_decision_confidence_parity" //  Low-confidence decisions marked consistently
  | "V8_metadata_header" //             spec metadata header present
  | "V9_duplicate_ids"; //              no duplicate IDs within an owning section

export type ValidatorStatus = "pass" | "warn" | "fail";

export interface ValidatorCheck {
  id: ValidatorCheckId;
  /** Short display label, e.g. "V1 - EARS coverage". */
  label: string;
  /** One-line "what this checks" descriptor — same on every artifact. */
  descriptor: string;
  kind: "structural";
  /** Always true — pure functions over the spec, no model in the loop. */
  deterministic: true;
  status: ValidatorStatus;
  /** Per-artifact result detail line. */
  detail: string;
}

export const VALIDATOR_IDS: ValidatorCheckId[] = [
  "V1_ears_coverage",
  "V2_missing_section",
  "V4_ac_id_parity",
  "V5_br_references",
  "V6_eh_message_parity",
  "V7_decision_confidence_parity",
  "V8_metadata_header",
  "V9_duplicate_ids",
];

export const CHECK_LABELS: Record<ValidatorCheckId, string> = {
  V1_ears_coverage: "V1 - EARS coverage",
  V2_missing_section: "V2 - Missing section",
  V4_ac_id_parity: "V4 - AC ID parity",
  V5_br_references: "V5 - BR references",
  V6_eh_message_parity: "V6 - EH message parity",
  V7_decision_confidence_parity: "V7 - Decision confidence parity",
  V8_metadata_header: "V8 - Metadata header",
  V9_duplicate_ids: "V9 - Duplicate IDs",
};

export const CHECK_DESCRIPTORS: Record<ValidatorCheckId, string> = {
  V1_ears_coverage: "Every acceptance criterion is EARS-formatted — coverage ≥ 80%",
  V2_missing_section: "All canonical SPEC.md sections present",
  V4_ac_id_parity: "AC IDs match between Sections 4 ↔ 11",
  V5_br_references: "Every referenced business rule exists in Section 5",
  V6_eh_message_parity: "Error-handling messages match between Sections 14 ↔ 7",
  V7_decision_confidence_parity: "Low-confidence decisions marked consistently",
  V8_metadata_header: "Spec metadata header present",
  V9_duplicate_ids: "No duplicate IDs within an owning section",
};

/** Exact badge copy — reuse verbatim wherever the moat is rendered. */
export const DETERMINISTIC_BADGE = "DETERMINISTIC — NO MODEL IN THE LOOP";
export const LLM_ADVISORY_BADGE = "LLM-ADVISORY";
export const STRUCTURAL_HONESTY_LINE =
  "Structural quality, not semantic — we check the shape of the spec, not whether it's the right idea.";

function check(
  id: ValidatorCheckId,
  status: ValidatorStatus,
  detail: string,
): ValidatorCheck {
  return {
    id,
    label: CHECK_LABELS[id],
    descriptor: CHECK_DESCRIPTORS[id],
    kind: "structural",
    deterministic: true,
    status,
    detail,
  };
}

/** Sample set — all 8 checks passing (the AM-142 approval beat). */
export const VALIDATOR_SET_ALL_PASS: ValidatorCheck[] = [
  check("V1_ears_coverage", "pass", "7/7 ACs EARS-formatted · coverage 100%"),
  check("V2_missing_section", "pass", "16/16 canonical sections present"),
  check("V4_ac_id_parity", "pass", "AC-1…AC-7 referenced consistently in §4 and §11"),
  check("V5_br_references", "pass", "4 business rules referenced · all defined in §5"),
  check("V6_eh_message_parity", "pass", "6 error messages match between §14 and §7"),
  check("V7_decision_confidence_parity", "pass", "2 Low-confidence decisions, both marked in §13"),
  check("V8_metadata_header", "pass", "Header present: ticket, version, agent, contract v0.5"),
  check("V9_duplicate_ids", "pass", "0 duplicate IDs across owning sections"),
];

/** Sample set — 6 of 8 passing (demoable imperfection: V1 fails, V6 warns). */
export const VALIDATOR_SET_SIX_OF_EIGHT: ValidatorCheck[] = [
  check("V1_ears_coverage", "fail", "5/7 ACs EARS-formatted · coverage 71% — below the 80% bar"),
  check("V2_missing_section", "pass", "16/16 canonical sections present"),
  check("V4_ac_id_parity", "pass", "AC-1…AC-7 referenced consistently in §4 and §11"),
  check("V5_br_references", "pass", "3 business rules referenced · all defined in §5"),
  check(
    "V6_eh_message_parity",
    "warn",
    "1 of 5 error messages drifted between §14 and §7 (timeout copy)",
  ),
  check("V7_decision_confidence_parity", "pass", "1 Low-confidence decision, marked in §13"),
  check("V8_metadata_header", "pass", "Header present: ticket, version, agent, contract v0.5"),
  check("V9_duplicate_ids", "pass", "0 duplicate IDs across owning sections"),
];

/** Count of hard passes (warn/fail both count against the score). */
export function passedCount(checks: ValidatorCheck[]): number {
  return checks.filter((c) => c.status === "pass").length;
}

/** 0–100 score = passed / total. */
export function validatorScore(checks: ValidatorCheck[]): number {
  if (checks.length === 0) return 0;
  return Math.round((passedCount(checks) / checks.length) * 100);
}

/** "8/8 checks pass" / "6 of 8 structural checks pass" headline helper. */
export function validatorHeadline(checks: ValidatorCheck[]): string {
  const p = passedCount(checks);
  return p === checks.length
    ? `Structurally ready — ${p}/${checks.length} checks pass`
    : `${p} of ${checks.length} structural checks pass`;
}

/** Tickets whose spec gets the imperfect set (rejected-once history etc.). */
const SIX_OF_EIGHT_TICKETS = new Set(["AM-140", "AM-149"]);

/**
 * Per-artifact validator results, deterministic by ticket id.
 * AM-142 (the demo spine) and most artifacts: 8/8. AM-140 / AM-149: 6/8.
 */
export function validatorsFor(ticketId: string): ValidatorCheck[] {
  const set = SIX_OF_EIGHT_TICKETS.has(ticketId)
    ? VALIDATOR_SET_SIX_OF_EIGHT
    : VALIDATOR_SET_ALL_PASS;
  // return copies so callers can't mutate the seed sets
  return set.map((c) => ({ ...c }));
}
