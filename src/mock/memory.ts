/**
 * Pod Memory & Constitution (/memory, wave 2, P1-A2) - the compounding
 * moat: per-client rules with provenance, plus amendment proposals MINED
 * from rejection-reason clusters and ratified through a gate, on the record.
 *
 * Gate ids in `citedByGateIds` / `rejectionGateIds` are REAL seed ids
 * (approvals.ts pattern `appr-<ticket>` / `clar-<ticket>`), so evidence
 * chips deep-link into /approvals/$gateId and /compliance.
 * Ratify writes `constitution.amended` via audit-bridge; Forget (knowledge
 * sources) is recorded as `policy.changed { field: "knowledge.sources" }`.
 */

export type RuleProvenance = "blueprint" | "client" | "ratified-amendment";

export interface ConstitutionRule {
  id: string;
  text: string;
  category: string;
  provenance: RuleProvenance;
  /** Present only when provenance === "ratified-amendment". */
  ratifiedAt?: number;
  /** Gate decisions that cited this rule (deep-link evidence). */
  citedByGateIds: string[];
}

export type AmendmentState = "proposed" | "ratified" | "dismissed";

export interface AmendmentProposal {
  id: string;
  draftText: string;
  minedFrom: {
    /** The rejection gates whose typed reasons clustered into this draft. */
    rejectionGateIds: string[];
    clusterLabel: string;
  };
  state: AmendmentState;
}

export const PROVENANCE_LABELS: Record<RuleProvenance, string> = {
  blueprint: "Blueprint default",
  client: "Client-provided",
  "ratified-amendment": "Ratified - from rejection cluster",
};

/** Render order for the rule list's category groups. */
export const RULE_CATEGORIES = [
  "Specs & acceptance criteria",
  "Architecture & integrations",
  "Process & gates",
] as const;

const DAY = 86_400_000;
const now = Date.now();

export const CONSTITUTION_RULES: ConstitutionRule[] = [
  // -- Specs & acceptance criteria ----------------------------------
  {
    id: "cr-1",
    text: "Every acceptance criterion is EARS-formatted (WHEN … THE SYSTEM SHALL …).",
    category: "Specs & acceptance criteria",
    provenance: "blueprint",
    citedByGateIds: ["appr-AM-142", "appr-AM-128"],
  },
  {
    id: "cr-2",
    text: "Pagination is cursor-based (?after=…) - offset pagination is rejected at spec review.",
    category: "Specs & acceptance criteria",
    provenance: "client",
    citedByGateIds: ["appr-AM-142"],
  },
  {
    id: "cr-3",
    text: "Saved user preferences persist per account, never per device.",
    category: "Specs & acceptance criteria",
    provenance: "ratified-amendment",
    ratifiedAt: now - 10 * DAY,
    citedByGateIds: ["clar-AM-142"],
  },
  // -- Architecture & integrations ----------------------------------
  {
    id: "cr-4",
    text: "Money amounts are integer cents in a single currency field - floats never cross a service boundary.",
    category: "Architecture & integrations",
    provenance: "client",
    citedByGateIds: ["appr-AM-133", "appr-AM-149"],
  },
  {
    id: "cr-5",
    text: "External callbacks are idempotent and carry a verifiable signature.",
    category: "Architecture & integrations",
    provenance: "blueprint",
    citedByGateIds: ["appr-AM-133"],
  },
  {
    id: "cr-6",
    text: "The mobile client consumes the identical contract schema served to web - no parallel endpoints.",
    category: "Architecture & integrations",
    provenance: "ratified-amendment",
    ratifiedAt: now - 23 * DAY,
    citedByGateIds: ["appr-AM-142", "appr-AM-145"],
  },
  // -- Process & gates -----------------------------------------------
  {
    id: "cr-7",
    text: "Rejections always carry a typed reason - the note becomes the agent's added context on rerun.",
    category: "Process & gates",
    provenance: "blueprint",
    citedByGateIds: ["appr-AM-138", "appr-AM-140"],
  },
  {
    id: "cr-8",
    text: "P0 work items require a named human approval at every gate - no auto-clear at any autonomy level.",
    category: "Process & gates",
    provenance: "client",
    citedByGateIds: ["appr-AM-149", "appr-AM-144", "appr-AM-133"],
  },
];

/**
 * Proposed amendments - mined weekly from rejection-reason clusters.
 * Cluster evidence references the seeded rejection history: AM-142's spec
 * v1 (returned for missing error-state ACs - see artifacts.ts), AM-140
 * (rerunCount 2, rejected by Zlatko), AM-131 (rerunCount 1) and AM-138's
 * design v1 ("Threading model incomplete" - compliance ae-005).
 */
export const AMENDMENT_PROPOSALS: AmendmentProposal[] = [
  {
    id: "amend-1",
    draftText:
      "Every AC set includes error-state criteria (empty results, timeouts, partial failures).",
    minedFrom: {
      rejectionGateIds: ["appr-AM-142", "appr-AM-140", "appr-AM-131"],
      clusterLabel: "3 specs rejected for missing error-state ACs",
    },
    state: "proposed",
  },
  {
    id: "amend-2",
    draftText:
      "Architectures that touch shared state declare their concurrency/threading model explicitly.",
    minedFrom: {
      rejectionGateIds: ["appr-AM-138", "appr-AM-140"],
      clusterLabel: "2 architectures rejected for unstated threading models",
    },
    state: "proposed",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

export function rulesByCategory(): { category: string; rules: ConstitutionRule[] }[] {
  return RULE_CATEGORIES.map((category) => ({
    category,
    rules: CONSTITUTION_RULES.filter((r) => r.category === category),
  })).filter((g) => g.rules.length > 0);
}

export function ruleById(id: string): ConstitutionRule | undefined {
  return CONSTITUTION_RULES.find((r) => r.id === id);
}

export function amendmentById(id: string): AmendmentProposal | undefined {
  return AMENDMENT_PROPOSALS.find((a) => a.id === id);
}
