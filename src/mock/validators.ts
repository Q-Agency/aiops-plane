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

/**
 * SA design check ids (sa-design family) — the DESIGN artifact's own
 * deterministic structural checks. Deliberately a separate, 7-check family:
 * "the 8 validators" is the BA's moat claim and never describes these.
 */
export type DesignCheckId =
  | "D1_spec_coverage" //          every spec AC maps to ≥1 design section
  | "D2_interface_contracts" //    every endpoint declares auth + notes/schema
  | "D3_data_model_integrity" //   every FK/reference resolves to a defined entity
  | "D4_component_reachability" // no orphan components — consumed or marked entry
  | "D5_failure_modes" //          every external dependency states timeout/retry/fallback
  | "D6_nfr_budget" //             latency budget decomposed within the spec bound
  | "D7_consumed_version_pin"; //  header pins the spec version consumed

/**
 * QA check ids (qa-report family) — the QA REPORT's own deterministic
 * structural checks. They verify the report's shape (coverage, links,
 * evidence), never whether the product works — a structurally perfect
 * report can still say "HOLD".
 */
export type QaCheckId =
  | "Q1_ac_test_parity" //        every spec AC has ≥1 mapped test
  | "Q2_suite_completeness" //    all planned suites executed
  | "Q3_defect_links" //          every failed test links a filed defect
  | "Q4_env_matrix" //            declared environment matrix fully run
  | "Q5_perf_evidence" //         NFR criteria carry measured numbers vs budget
  | "Q6_flaky_quarantine" //      flaky/healed tests recorded, never silently skipped
  | "Q7_consumed_version_pin"; // report pins the PR + spec version consumed

/** Any structural check id, across artifact families. */
export type AnyCheckId = ValidatorCheckId | DesignCheckId | QaCheckId;

export type ValidatorStatus = "pass" | "warn" | "fail";

export interface ValidatorCheck {
  id: AnyCheckId;
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

/** Family tag rendered beside BA spec-check results (matches model provenance). */
export const BA_VALIDATOR_FAMILY = "ba-spec@1.4.2";

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

/* ------------------------------------------------------------------ */
/* SA design checks (sa-design family) — the design review's own wall   */
/* ------------------------------------------------------------------ */

export const DESIGN_CHECK_LABELS: Record<DesignCheckId, string> = {
  D1_spec_coverage: "D1 - Spec coverage",
  D2_interface_contracts: "D2 - Interface contracts",
  D3_data_model_integrity: "D3 - Data-model integrity",
  D4_component_reachability: "D4 - Component reachability",
  D5_failure_modes: "D5 - Failure modes",
  D6_nfr_budget: "D6 - NFR budget",
  D7_consumed_version_pin: "D7 - Consumed version pin",
};

export const DESIGN_CHECK_DESCRIPTORS: Record<DesignCheckId, string> = {
  D1_spec_coverage: "Every spec acceptance criterion maps to ≥1 design section",
  D2_interface_contracts: "Every API endpoint declares auth scope and contract notes",
  D3_data_model_integrity: "Every data-model reference resolves to a defined entity",
  D4_component_reachability: "No orphan components — each is consumed or marked an entry point",
  D5_failure_modes: "Every external dependency states timeout / retry / fallback",
  D6_nfr_budget: "Latency budget decomposed across hops within the spec's bound",
  D7_consumed_version_pin: "Header pins the exact spec version this design consumed",
};

/** Honest language for the design family (mirror of STRUCTURAL_HONESTY_LINE). */
export const DESIGN_HONESTY_LINE =
  "Structural quality, not semantic — we check the shape of the design, not whether it's the right architecture.";

/** Family tag rendered beside design-check results (matches model provenance). */
export const DESIGN_VALIDATOR_FAMILY = "sa-design@2.1.0";

function designCheck(
  id: DesignCheckId,
  status: ValidatorStatus,
  detail: string,
): ValidatorCheck {
  return {
    id,
    label: DESIGN_CHECK_LABELS[id],
    descriptor: DESIGN_CHECK_DESCRIPTORS[id],
    kind: "structural",
    deterministic: true,
    status,
    detail,
  };
}

/** Sample set — all 7 design checks passing (AM-138, the clean review). */
export const DESIGN_SET_ALL_PASS: ValidatorCheck[] = [
  designCheck("D1_spec_coverage", "pass", "5/5 ACs mapped to design sections"),
  designCheck("D2_interface_contracts", "pass", "4 endpoints · auth scope + notes on all 4"),
  designCheck("D3_data_model_integrity", "pass", "6 columns · 1 FK resolves (users.user_id)"),
  designCheck("D4_component_reachability", "pass", "5 components · all consumed or entry"),
  designCheck("D5_failure_modes", "pass", "2 external dependencies · both state timeout + fallback"),
  designCheck("D6_nfr_budget", "pass", "p95 budget 180ms decomposed ≤ spec bound 200ms"),
  designCheck("D7_consumed_version_pin", "pass", "Header pins spec.md@v2 (the approved version)"),
];

/** Sample set — 5 of 7 (AM-140: returned twice; D1 fails, D5 warns). */
export const DESIGN_SET_FIVE_OF_SEVEN: ValidatorCheck[] = [
  designCheck("D1_spec_coverage", "fail", "3/5 ACs mapped — AC-2 and AC-5 have no design section"),
  designCheck("D2_interface_contracts", "pass", "4 endpoints · auth scope + notes on all 4"),
  designCheck("D3_data_model_integrity", "pass", "6 columns · 1 FK resolves (users.user_id)"),
  designCheck("D4_component_reachability", "pass", "5 components · all consumed or entry"),
  designCheck(
    "D5_failure_modes",
    "warn",
    "1 of 2 external dependencies (payments-webhook) missing a fallback",
  ),
  designCheck("D6_nfr_budget", "pass", "p95 budget 180ms decomposed ≤ spec bound 200ms"),
  designCheck("D7_consumed_version_pin", "pass", "Header pins spec.md@v2 (the approved version)"),
];

/** Tickets whose design gets the imperfect set (AM-140: rerunCount 2). */
const FIVE_OF_SEVEN_DESIGNS = new Set(["AM-140"]);

/** Per-design check results, deterministic by ticket id. */
export function designValidatorsFor(ticketId: string): ValidatorCheck[] {
  const set = FIVE_OF_SEVEN_DESIGNS.has(ticketId)
    ? DESIGN_SET_FIVE_OF_SEVEN
    : DESIGN_SET_ALL_PASS;
  return set.map((c) => ({ ...c }));
}

/* ------------------------------------------------------------------ */
/* QA checks (qa-report family) — the QA review's own wall              */
/* ------------------------------------------------------------------ */

export const QA_CHECK_LABELS: Record<QaCheckId, string> = {
  Q1_ac_test_parity: "Q1 - AC ↔ test parity",
  Q2_suite_completeness: "Q2 - Suite completeness",
  Q3_defect_links: "Q3 - Defect links",
  Q4_env_matrix: "Q4 - Environment matrix",
  Q5_perf_evidence: "Q5 - Perf evidence",
  Q6_flaky_quarantine: "Q6 - Flaky quarantine",
  Q7_consumed_version_pin: "Q7 - Consumed version pin",
};

export const QA_CHECK_DESCRIPTORS: Record<QaCheckId, string> = {
  Q1_ac_test_parity: "Every spec acceptance criterion has ≥1 mapped test",
  Q2_suite_completeness: "All suites in the test plan were executed",
  Q3_defect_links: "Every failed test links a filed defect — no bare failures",
  Q4_env_matrix: "The declared environment matrix was fully run",
  Q5_perf_evidence: "NFR criteria carry measured numbers against the budget",
  Q6_flaky_quarantine: "Flaky/healed tests are recorded — never silently skipped",
  Q7_consumed_version_pin: "Report pins the exact PR and spec version it verified",
};

/** Honest language for the QA family — the sharpest structural-vs-semantic beat. */
export const QA_HONESTY_LINE =
  "Structural quality, not semantic — we check the shape of the report, not whether the product works. A structurally perfect report can still say HOLD.";

/** Family tag rendered beside QA-check results (matches model provenance). */
export const QA_VALIDATOR_FAMILY = "qa-report@1.0.7";

function qaCheck(id: QaCheckId, status: ValidatorStatus, detail: string): ValidatorCheck {
  return {
    id,
    label: QA_CHECK_LABELS[id],
    descriptor: QA_CHECK_DESCRIPTORS[id],
    kind: "structural",
    deterministic: true,
    status,
    detail,
  };
}

/**
 * AM-144's set: ALL 7 pass — deliberately, while the report itself files
 * 2 defects and recommends HOLD. The checks prove the report is complete
 * and traceable; the verdict is the report's content. That distinction IS
 * the moat's honesty story.
 */
export const QA_SET_ALL_PASS: ValidatorCheck[] = [
  qaCheck("Q1_ac_test_parity", "pass", "5/5 ACs have ≥1 mapped test"),
  qaCheck("Q2_suite_completeness", "pass", "3/3 planned suites executed (web · mobile · api)"),
  qaCheck("Q3_defect_links", "pass", "2 failed tests · both link a filed defect"),
  qaCheck("Q4_env_matrix", "pass", "4/4 environment cells run (chrome/safari × ios/android)"),
  qaCheck("Q5_perf_evidence", "pass", "AC-1 carries measured p95 174ms vs the 200ms budget"),
  qaCheck("Q6_flaky_quarantine", "pass", "1 healed selector drift recorded — none silently skipped"),
  qaCheck("Q7_consumed_version_pin", "pass", "Report pins PR #421 + spec.md@v2"),
];

/** Per-report check results, deterministic by ticket id. */
export function qaValidatorsFor(_ticketId: string): ValidatorCheck[] {
  return QA_SET_ALL_PASS.map((c) => ({ ...c }));
}
