/**
 * Gate policies (wave 2) — per-agent gate-clearance SLA + autonomy level.
 * Feeds the /welcome charter card ("you clear its gates within {sla}"),
 * the GatePolicyChip, and any surface that states what an agent's gate
 * regime is.
 *
 * Autonomy ladder (L0 strictest → L3 loosest). The Sample pod runs mostly
 * L0/L1 — autonomy is EARNED through validator pass-rates, never default.
 * SLA minutes align with gate-detail.ts (approvals ≤ 4h) and the report
 * seed (design review target 8h).
 */

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
  L0: "Review all — every artifact stops at a human gate",
  L1: "Auto-clear on green — 8/8 validator passes skip the queue; anything flagged stops",
  L2: "Spot-check — sampled human review; every decision still on the ledger",
  L3: "Autonomous — runs without routine gates; ledger-audited",
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

/** Policy for one agent — unknown ids fall back to the strict L0 default. */
export function gatePolicyFor(agentId: string): GatePolicy {
  return GATE_POLICIES.find((p) => p.agentId === agentId) ?? { ...DEFAULT_POLICY, agentId };
}
