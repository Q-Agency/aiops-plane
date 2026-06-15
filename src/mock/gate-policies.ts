/**
 * Gate policies (wave 2) - per-agent gate-clearance SLA + autonomy level.
 * Feeds the /welcome charter card ("you clear its gates within {sla}"),
 * the GatePolicyChip, and any surface that states what an agent's gate
 * regime is.
 *
 * Autonomy ladder (L0 strictest → L3 loosest). The Sample pod runs mostly
 * L0/L1 - autonomy is EARNED through validator pass-rates, never default.
 * SLA minutes align with gate-detail.ts (approvals ≤ 4h) and the report
 * seed (design review target 8h).
 */

import {
  isChainRoleId,
  producerOf,
  type ArtifactKind,
  type ChainRoleId,
} from "./chain";

export interface GatePolicy {
  agentId: string;
  /** Gate-clearance target in minutes. */
  gateClearMin: number;
  /** Chip copy, e.g. "≤ 4h gate clearance". */
  slaLabel: string;
  autonomy: "L0" | "L1" | "L2" | "L3";
  autonomyLabel: string;
}

export const AUTONOMY_LABELS: Record<GatePolicy["autonomy"], string> = {
  L0: "Review all - every artifact stops at a human gate",
  L1: "Auto-clear on green - 8/8 validator passes skip the queue; anything flagged stops",
  L2: "Spot-check - sampled human review; every decision still on the ledger",
  L3: "Autonomous - runs without routine gates; ledger-audited",
};

export const GATE_POLICIES: GatePolicy[] = [
  { agentId: "ba",        gateClearMin: 240,  slaLabel: "≤ 4h gate clearance",  autonomy: "L0", autonomyLabel: AUTONOMY_LABELS.L0 },
  { agentId: "sa",        gateClearMin: 480,  slaLabel: "≤ 8h gate clearance",  autonomy: "L0", autonomyLabel: AUTONOMY_LABELS.L0 },
  { agentId: "uiux",      gateClearMin: 480,  slaLabel: "≤ 8h gate clearance",  autonomy: "L1", autonomyLabel: AUTONOMY_LABELS.L1 },
  { agentId: "tasklist",  gateClearMin: 240,  slaLabel: "≤ 4h gate clearance",  autonomy: "L2", autonomyLabel: AUTONOMY_LABELS.L2 },
  { agentId: "dev",       gateClearMin: 720,  slaLabel: "≤ 12h gate clearance", autonomy: "L0", autonomyLabel: AUTONOMY_LABELS.L0 },
  { agentId: "review",    gateClearMin: 480,  slaLabel: "≤ 8h gate clearance",  autonomy: "L1", autonomyLabel: AUTONOMY_LABELS.L1 },
  { agentId: "qa",        gateClearMin: 480,  slaLabel: "≤ 8h gate clearance",  autonomy: "L1", autonomyLabel: AUTONOMY_LABELS.L1 },
  { agentId: "devops",    gateClearMin: 240,  slaLabel: "≤ 4h gate clearance",  autonomy: "L0", autonomyLabel: AUTONOMY_LABELS.L0 },
  { agentId: "knowledge", gateClearMin: 1440, slaLabel: "≤ 24h review window",  autonomy: "L2", autonomyLabel: AUTONOMY_LABELS.L2 },
];

const DEFAULT_POLICY: GatePolicy = {
  agentId: "unknown",
  gateClearMin: 240,
  slaLabel: "≤ 4h gate clearance",
  autonomy: "L0",
  autonomyLabel: AUTONOMY_LABELS.L0,
};

/** Policy for one agent - unknown ids fall back to the strict L0 default. */
export function gatePolicyFor(agentId: string): GatePolicy {
  return GATE_POLICIES.find((p) => p.agentId === agentId) ?? { ...DEFAULT_POLICY, agentId };
}

/* ------------------------------------------------------------------ */
/* Wave-2 COMPLETION (P1-G1) - the policy layer behind the gates.      */
/* Settings → "Gate policies & autonomy" (GatePolicyTable +            */
/* AutonomyLadder) reads everything below. Edits/grants write          */
/* `policy.changed {field, before, after}` via the audit bridge -      */
/* THIS file stays a read-only seed.                                   */
/* ------------------------------------------------------------------ */

/** Per-ArtifactKind gate policy - one row per pipeline artifact (chain.ts). */
export interface ArtifactGatePolicy {
  artifactKind: ArtifactKind;
  /** Role label that must clear this gate (matches roles.ts/humans.ts vocabulary). */
  requiredRole: string;
  /** 2 = a second reviewer countersigns (code, release). */
  nEyes: 1 | 2;
  /** Clearance SLA in minutes - aligned with GATE_POLICIES per producing agent. */
  slaClearMin: number;
  delegation: "deputy-allowed" | "none";
  overridePolicy: "pod-admin-only" | "accountable-human";
  reviewMode: "full" | "batch" | "auto-with-sampling";
}

/**
 * Blueprint defaults, one row per pipeline ArtifactKind (knowledge is a
 * pod-wide peer - no pipeline gate). spec/design/code = full review;
 * tasks/review = batch; test = auto-with-sampling.
 */
export const ARTIFACT_GATE_POLICIES: ArtifactGatePolicy[] = [
  { artifactKind: "spec",        requiredRole: "Lead BA",            nEyes: 1, slaClearMin: 240, delegation: "deputy-allowed", overridePolicy: "accountable-human", reviewMode: "full" },
  { artifactKind: "design",      requiredRole: "Solution Architect", nEyes: 1, slaClearMin: 480, delegation: "deputy-allowed", overridePolicy: "accountable-human", reviewMode: "full" },
  { artifactKind: "uix-ui-spec", requiredRole: "Design Lead",        nEyes: 1, slaClearMin: 480, delegation: "deputy-allowed", overridePolicy: "accountable-human", reviewMode: "full" },
  { artifactKind: "tasks",       requiredRole: "Engineering Lead",   nEyes: 1, slaClearMin: 240, delegation: "deputy-allowed", overridePolicy: "accountable-human", reviewMode: "batch" },
  { artifactKind: "code",        requiredRole: "Engineering Lead",   nEyes: 2, slaClearMin: 720, delegation: "none",           overridePolicy: "pod-admin-only",    reviewMode: "full" },
  { artifactKind: "review",      requiredRole: "Engineering Lead",   nEyes: 1, slaClearMin: 480, delegation: "deputy-allowed", overridePolicy: "accountable-human", reviewMode: "batch" },
  { artifactKind: "test",        requiredRole: "QA Lead",            nEyes: 1, slaClearMin: 480, delegation: "deputy-allowed", overridePolicy: "accountable-human", reviewMode: "auto-with-sampling" },
  { artifactKind: "release",     requiredRole: "Pod Admin (PM)",     nEyes: 2, slaClearMin: 240, delegation: "none",           overridePolicy: "pod-admin-only",    reviewMode: "full" },
];

/** Row lookup - unknown kinds fall back to the strict spec-row defaults. */
export function artifactGatePolicyFor(kind: ArtifactKind): ArtifactGatePolicy {
  return (
    ARTIFACT_GATE_POLICIES.find((p) => p.artifactKind === kind) ?? {
      ...ARTIFACT_GATE_POLICIES[0],
      artifactKind: kind,
    }
  );
}

/* ---------------- Autonomy ladder (per agent) ---------------- */

/**
 * The four-rung ladder rendered by AutonomyLadder. Promotions are proposed
 * by the system on deterministic validator streaks, granted by the
 * accountable human, and written to the ledger (`policy.changed`).
 */
export const AUTONOMY_LEVELS: {
  id: "L0" | "L1" | "L2" | "L3";
  label: string;
  description: string;
}[] = [
  { id: "L0", label: "L0 - Review all",          description: "Every artifact stops at a human gate before it moves." },
  { id: "L1", label: "L1 - Batch review",         description: "Green artifacts (8/8 validators) queue into a daily review batch; anything flagged stops immediately." },
  { id: "L2", label: "L2 - Sample 1-in-5",        description: "One in five green artifacts is pulled for human review; every decision still lands on the ledger." },
  { id: "L3", label: "L3 - Auto-clear low-risk",  description: "Low-risk green artifacts clear without a gate - ledger-audited, revocable at any time." },
];

/** An agent's position on the ladder + any system-proposed promotion. */
export interface AutonomyStatus {
  agentId: string;
  level: "L0" | "L1" | "L2" | "L3";
  /** System-proposed promotion target (granted by the accountable human). */
  eligibleFor?: "L1" | "L2" | "L3";
  /** Deterministic validator-streak evidence behind the proposal. */
  evidence?: {
    consecutivePassingSpecs: number;
    rejectionRatePct: number;
    line: string;
  };
}

/** Current level comes from GATE_POLICIES - one source for both surfaces. */
const levelOf = (agentId: string): AutonomyStatus["level"] =>
  gatePolicyFor(agentId).autonomy;

/**
 * Ladder seed for the chain agents. BA is the showcase: a 47-spec 8/8
 * streak (validators.ts vocabulary) makes it eligible for L2.
 */
export const AUTONOMY_LADDER: AutonomyStatus[] = [
  {
    agentId: "ba",
    level: levelOf("ba"),
    eligibleFor: "L2",
    evidence: {
      consecutivePassingSpecs: 47,
      rejectionRatePct: 4,
      line: "BA eligible for L2: 47 consecutive 8/8 specs · 4% rejection",
    },
  },
  { agentId: "sa", level: levelOf("sa") },
  { agentId: "uiux", level: levelOf("uiux") },
  { agentId: "tasklist", level: levelOf("tasklist") },
  { agentId: "dev", level: levelOf("dev") },
  {
    agentId: "review",
    level: levelOf("review"),
    eligibleFor: "L2",
    evidence: {
      consecutivePassingSpecs: 31,
      rejectionRatePct: 6,
      line: "Review eligible for L2: 31 consecutive clean passes · 6% rejection",
    },
  },
  { agentId: "qa", level: levelOf("qa") },
  { agentId: "devops", level: levelOf("devops") },
  { agentId: "knowledge", level: levelOf("knowledge") },
];

/** Ladder lookup - unknown agents sit at strict L0 with no proposal. */
export function autonomyStatusFor(agentId: string): AutonomyStatus {
  return AUTONOMY_LADDER.find((a) => a.agentId === agentId) ?? { agentId, level: "L0" };
}

/* ---------------- Preview stat ("what would this change do?") ---------------- */

/**
 * Avg human review minutes per gate - matches the engineering-lead
 * workload seed in humans.ts (avgApprovalMin 38). 14 gates × 38m ≈ 9h.
 */
const AVG_GATE_REVIEW_MIN = 38;

/**
 * Last-week gate volume per agent, consistent with the approvals seed
 * (one open gate per in-review ticket) extrapolated over a week - BA is
 * the spec's showcase: 14 of 22 would have auto-cleared.
 */
const PREVIEW_SEED: Record<ChainRoleId, { wouldAutoClear: number; of: number }> = {
  ba:        { wouldAutoClear: 14, of: 22 },
  sa:        { wouldAutoClear: 6,  of: 9 },
  uiux:      { wouldAutoClear: 8,  of: 11 },
  tasklist:  { wouldAutoClear: 12, of: 13 },
  dev:       { wouldAutoClear: 9,  of: 18 },
  review:    { wouldAutoClear: 15, of: 19 },
  qa:        { wouldAutoClear: 16, of: 21 },
  devops:    { wouldAutoClear: 4,  of: 7 },
  knowledge: { wouldAutoClear: 5,  of: 5 },
};

/** Accepts an agent id OR an ArtifactKind (resolved to its producer). */
function resolvePreviewAgent(agentIdOrKind: string): ChainRoleId {
  if (isChainRoleId(agentIdOrKind)) return agentIdOrKind;
  return producerOf(agentIdOrKind as ArtifactKind) ?? "ba";
}

/**
 * The "what would this policy have done" stat rendered inside every
 * policy-edit / autonomy-grant confirm dialog:
 * "Would have auto-cleared 14 of 22 gates last week, saving ~9h."
 */
export function autonomyPreviewStat(agentIdOrKind: string): {
  wouldAutoClear: number;
  of: number;
  hoursSaved: number;
  line: string;
} {
  const seed = PREVIEW_SEED[resolvePreviewAgent(agentIdOrKind)];
  const hoursSaved = Math.max(1, Math.round((seed.wouldAutoClear * AVG_GATE_REVIEW_MIN) / 60));
  return {
    ...seed,
    hoursSaved,
    line: `Would have auto-cleared ${seed.wouldAutoClear} of ${seed.of} gates last week, saving ~${hoursSaved}h.`,
  };
}
