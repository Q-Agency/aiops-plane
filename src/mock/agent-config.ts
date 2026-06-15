/**
 * Per-agent operating configuration (agent profile revamp, 2026-06-12) —
 * the PM-tunable knobs behind /agents/$agentId and the /registry configure
 * step: which MODEL the agent runs on (the model plane made switchable),
 * which TOOLS it may touch, who ANSWERS for it, where it sits on the
 * AUTONOMY ladder, and its version/eval history (the "Agent quality &
 * versions" AgentOps surface).
 *
 * Defaults are SEEDED CONSISTENT with the other planes: model defaults
 * mirror modelPlane.ts pins (Settings → Models and this screen agree),
 * autonomy defaults come from gate-policies.ts, owners from humans.ts
 * `primaryAgentId`. Edits live in a session overlay (same idiom as
 * audit-bridge): in-memory, reactive via useSyncExternalStore, and EVERY
 * mutation writes a `policy.changed` / `human.reassigned` /
 * `agent.rolled_back` row through appendAuditMock — config changes are
 * decisions, so they land on the ledger.
 */

import { useSyncExternalStore } from "react";
import { appendAuditMock } from "./audit-bridge";
import { modelPlaneFor } from "./modelPlane";
import { gatePolicyFor } from "./gate-policies";
import { humans } from "./humans";
import type { ConnectorId } from "./connectors";

/* ------------------------------------------------------------------ */
/* Model catalog — the switchable engines (model-agnostic by design)    */
/* ------------------------------------------------------------------ */

export interface ModelOption {
  /** Pinned model id — never "latest" (model-plane honesty rule). */
  id: string;
  label: string;
  provider: string;
  hosting: "api" | "in-tenant";
  region: string;
  retention: string;
  /** Indicative cost per artifact-producing run. */
  costPerRunUsd: number;
  /** Indicative p50 for a typical run of this agent class. */
  p50s: number;
  /** One-liner: when a PM would pick it. */
  note: string;
}

/**
 * Five engines, deliberately cross-vendor (labs are suppliers, not
 * competitors): three Anthropic tiers, one OpenAI (swappable-by-contract
 * proof), one self-hosted vLLM (the local-AI / privacy story). Ids match
 * modelPlane.ts pins where they overlap.
 */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "claude-opus-4-1-20250805",
    label: "Claude Opus 4.1",
    provider: "Anthropic",
    hosting: "api",
    region: "US",
    retention: "Zero-data-retention API terms",
    costPerRunUsd: 1.84,
    p50s: 38,
    note: "Frontier reasoning — architecture calls and gnarly refactors.",
  },
  {
    id: "claude-sonnet-4-5-20250929",
    label: "Claude Sonnet 4.5",
    provider: "Anthropic",
    hosting: "api",
    region: "US",
    retention: "Zero-data-retention API terms",
    costPerRunUsd: 0.62,
    p50s: 14,
    note: "The balanced default for artifact-producing runs.",
  },
  {
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    provider: "Anthropic",
    hosting: "api",
    region: "US",
    retention: "Zero-data-retention API terms",
    costPerRunUsd: 0.09,
    p50s: 4,
    note: "Fast and cheap — routing, summaries, light edits.",
  },
  {
    id: "gpt-5.1",
    label: "GPT-5.1",
    provider: "OpenAI",
    hosting: "api",
    region: "US",
    retention: "Zero-data-retention API terms",
    costPerRunUsd: 0.71,
    p50s: 16,
    note: "Swappable by contract — same harness, different engine.",
  },
  {
    id: "qwen2.5-coder-32b-instruct",
    label: "Qwen2.5-Coder 32B",
    provider: "Self-hosted vLLM",
    hosting: "in-tenant",
    region: "EU-West (in-tenant)",
    retention: "Never leaves your tenant",
    costPerRunUsd: 0.04,
    p50s: 9,
    note: "Q's local inference — privacy-critical pods and cost control.",
  },
];

export function modelOptionById(id: string): ModelOption {
  return MODEL_OPTIONS.find((m) => m.id === id) ?? MODEL_OPTIONS[1];
}

/** Short display name for chips/audit detail ("Claude Sonnet 4.5"). */
export function modelShort(id: string): string {
  return modelOptionById(id).label;
}

/* ------------------------------------------------------------------ */
/* LLM tiers — the mandatory "pick a model policy" menu                 */
/* ------------------------------------------------------------------ */

/**
 * Tier presets layered over MODEL_OPTIONS. Choosing an agent's LLM is a
 * POLICY decision (capability vs cost vs data-residency), so the product
 * makes you pick a TIER — not hunt a model id — whenever an agent is added
 * to a pod or modified. Each tier resolves to one default model; the exact
 * model stays overridable on the agent profile (advanced).
 */
export type LlmTier = "max" | "balanced" | "budget" | "local";

export interface LlmTierDef {
  id: LlmTier;
  label: string;
  /** One-line "when to pick this". */
  blurb: string;
  /** Default model id this tier resolves to. */
  modelId: string;
  /** CSS var for the accent. */
  accent: string;
  /** Local/in-tenant tier — data never leaves the tenant. */
  inTenant?: boolean;
}

export const LLM_TIERS: LlmTierDef[] = [
  {
    id: "max",
    label: "Max capability",
    blurb: "Frontier reasoning — the hardest specs, architecture and gnarly refactors. Premium cost.",
    modelId: "claude-opus-4-1-20250805",
    accent: "--status-waiting",
  },
  {
    id: "balanced",
    label: "Balanced",
    blurb: "The recommended default — strong quality at a moderate price.",
    modelId: "claude-sonnet-4-5-20250929",
    accent: "--primary",
  },
  {
    id: "budget",
    label: "Budget",
    blurb: "Fast and cheap — routing, summaries, light edits and high-volume work.",
    modelId: "claude-haiku-4-5-20251001",
    accent: "--status-done",
  },
  {
    id: "local",
    label: "Local only",
    blurb: "Runs on Q's managed H200 rig — data never leaves your tenant.",
    modelId: "qwen2.5-coder-32b-instruct",
    accent: "--agent-curator",
    inTenant: true,
  },
];

export function llmTierDef(tier: LlmTier): LlmTierDef {
  return LLM_TIERS.find((t) => t.id === tier) ?? LLM_TIERS[1];
}

/** Which tier a model id belongs to (frontier/in-tenant classified). */
export function tierForModel(modelId: string): LlmTier {
  const exact = LLM_TIERS.find((t) => t.modelId === modelId);
  if (exact) return exact.id;
  const m = modelOptionById(modelId);
  if (m.hosting === "in-tenant") return "local";
  if (m.id === "gpt-5.1") return "max"; // cross-vendor frontier
  return "balanced";
}

/** The tier an agent currently runs at (derived from its model). */
export function agentTier(agentId: string): LlmTier {
  return tierForModel(agentModel(agentId).id);
}

/** Set an agent's LLM by tier — resolves to the tier's model (audited). */
export function setAgentTier(agentId: string, agentName: string, tier: LlmTier): void {
  setAgentModel(agentId, agentName, llmTierDef(tier).modelId);
}

/**
 * Default model per agent — the modelPlane.ts pin when the agent has a
 * row there (ids differ: agents.ts says curator/pm, the plane says
 * knowledge/devops), else a sensible tier for the role.
 */
const PLANE_ALIAS: Record<string, string> = { curator: "knowledge" };

function defaultModelId(agentId: string): string {
  const plane = modelPlaneFor(PLANE_ALIAS[agentId] ?? agentId);
  if (plane && MODEL_OPTIONS.some((m) => m.id === plane.pinnedModel)) {
    return plane.pinnedModel;
  }
  // curator's plane row is an embeddings model — its generation runs local;
  // pm has no plane row (coordination tier).
  if (agentId === "curator") return "qwen2.5-coder-32b-instruct";
  if (agentId === "pm") return "claude-haiku-4-5-20251001";
  return "claude-sonnet-4-5-20250929";
}

/* ------------------------------------------------------------------ */
/* Tool access — which connectors the agent may touch                   */
/* ------------------------------------------------------------------ */

/**
 * Default tool grants per agent. REQUIRED tools are the ones the role's
 * core loop breaks without (QA can't verify without Playwright — the
 * mandatory-connector canon, scoped per agent here).
 */
const DEFAULT_TOOLS: Record<string, ConnectorId[]> = {
  curator: ["gdrive", "notion", "slack"],
  ba: ["teamwork", "slack", "gdrive"],
  sa: ["github", "slack", "notion"],
  tasklist: ["teamwork", "github"],
  dev: ["github", "slack"],
  review: ["github", "slack"],
  qa: ["playwright", "github", "slack"],
  pm: ["teamwork", "slack", "email"],
};

const REQUIRED_TOOLS: Record<string, ConnectorId[]> = {
  ba: ["teamwork"],
  dev: ["github"],
  review: ["github"],
  qa: ["playwright"],
  pm: ["teamwork"],
};

export function requiredToolsFor(agentId: string): Set<ConnectorId> {
  return new Set(REQUIRED_TOOLS[agentId] ?? []);
}

/* ------------------------------------------------------------------ */
/* Versions & evals — the AgentOps quality history                      */
/* ------------------------------------------------------------------ */

export interface AgentVersion {
  version: string;
  /** Eval-suite pass rate at promotion time. */
  evalPct: number;
  /** What the suite is, in role vocabulary. */
  evalLine: string;
  promotedAgo: string;
}

/**
 * Current-first version history. ba/sa/qa versions DELIBERATELY match
 * their validator-family versions (ba-spec@1.4.2 / sa-design@2.1.0 /
 * qa-report@1.0.7) — the eval family IS the agent's quality bar, one
 * version story across /governance, gate reviews and this panel.
 */
const VERSIONS: Record<string, AgentVersion[]> = {
  ba: [
    { version: "1.4.2", evalPct: 96, evalLine: "8 deterministic checks · 31-scenario suite", promotedAgo: "3d ago" },
    { version: "1.4.1", evalPct: 91, evalLine: "8 deterministic checks · 29-scenario suite", promotedAgo: "2w ago" },
    { version: "1.3.9", evalPct: 88, evalLine: "8 deterministic checks · 26-scenario suite", promotedAgo: "5w ago" },
  ],
  sa: [
    { version: "2.1.0", evalPct: 93, evalLine: "7-check design family · 19-scenario suite", promotedAgo: "1w ago" },
    { version: "2.0.4", evalPct: 89, evalLine: "7-check design family · 17-scenario suite", promotedAgo: "4w ago" },
  ],
  qa: [
    { version: "1.0.7", evalPct: 94, evalLine: "7-check report family · 24-scenario suite", promotedAgo: "5d ago" },
    { version: "1.0.6", evalPct: 90, evalLine: "7-check report family · 22-scenario suite", promotedAgo: "3w ago" },
  ],
  dev: [
    { version: "3.2.1", evalPct: 90, evalLine: "build-pass e2e suite · 42 scenarios", promotedAgo: "5d ago" },
    { version: "3.1.7", evalPct: 86, evalLine: "build-pass e2e suite · 38 scenarios", promotedAgo: "3w ago" },
  ],
  review: [
    { version: "2.4.0", evalPct: 95, evalLine: "diff-judgment suite · 33 scenarios", promotedAgo: "1w ago" },
    { version: "2.3.2", evalPct: 92, evalLine: "diff-judgment suite · 30 scenarios", promotedAgo: "6w ago" },
  ],
  tasklist: [
    { version: "1.1.3", evalPct: 97, evalLine: "decomposition suite · 21 scenarios", promotedAgo: "2w ago" },
    { version: "1.1.2", evalPct: 95, evalLine: "decomposition suite · 21 scenarios", promotedAgo: "7w ago" },
  ],
  curator: [
    { version: "0.8.2", evalPct: 92, evalLine: "retrieval-precision suite · 40 questions", promotedAgo: "4d ago" },
    { version: "0.8.1", evalPct: 87, evalLine: "retrieval-precision suite · 36 questions", promotedAgo: "3w ago" },
  ],
  pm: [
    { version: "1.6.0", evalPct: 91, evalLine: "sync-fidelity suite · 18 scenarios", promotedAgo: "1w ago" },
    { version: "1.5.4", evalPct: 89, evalLine: "sync-fidelity suite · 16 scenarios", promotedAgo: "5w ago" },
  ],
};

const FALLBACK_VERSIONS: AgentVersion[] = [
  { version: "1.0.0", evalPct: 90, evalLine: "role eval suite", promotedAgo: "1w ago" },
];

/* ------------------------------------------------------------------ */
/* Session overlay store (audit-bridge idiom)                           */
/* ------------------------------------------------------------------ */

export type AutonomyLevel = "L0" | "L1" | "L2" | "L3";

interface AgentOverrides {
  modelId?: string;
  tools?: ConnectorId[];
  ownerId?: string;
  autonomy?: AutonomyLevel;
  currentVersion?: string;
}

const overrides = new Map<string, AgentOverrides>();
const subscribers = new Set<() => void>();
let tick = 0;

function bump() {
  tick++;
  for (const fn of subscribers) fn();
}

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange);
  return () => subscribers.delete(onStoreChange);
}

function getTick(): number {
  return tick;
}

/** Re-renders the caller whenever any agent's config changes. */
export function useAgentConfigTick(): number {
  return useSyncExternalStore(subscribe, getTick, getTick);
}

function ov(agentId: string): AgentOverrides {
  let o = overrides.get(agentId);
  if (!o) {
    o = {};
    overrides.set(agentId, o);
  }
  return o;
}

/* ---------------- merged getters (defaults + overlay) ---------------- */

export function agentModel(agentId: string): ModelOption {
  return modelOptionById(ov(agentId).modelId ?? defaultModelId(agentId));
}

export function agentTools(agentId: string): ConnectorId[] {
  return ov(agentId).tools ?? DEFAULT_TOOLS[agentId] ?? ["slack"];
}

export function agentOwner(agentId: string): { id: string; name: string; role: string } {
  const id = ov(agentId).ownerId ?? humans.find((h) => h.primaryAgentId === agentId)?.id ?? "zlatko";
  const h = humans.find((x) => x.id === id) ?? humans[humans.length - 1];
  return { id: h.id, name: h.name, role: h.role };
}

export function agentAutonomy(agentId: string): AutonomyLevel {
  return ov(agentId).autonomy ?? gatePolicyFor(agentId).autonomy;
}

export function agentVersions(agentId: string): (AgentVersion & { current: boolean })[] {
  const list = VERSIONS[agentId] ?? FALLBACK_VERSIONS;
  const current = ov(agentId).currentVersion ?? list[0].version;
  return list.map((v) => ({ ...v, current: v.version === current }));
}

/* ---------------- audited mutations ---------------- */

export function setAgentModel(agentId: string, agentName: string, modelId: string): void {
  const before = agentModel(agentId);
  if (before.id === modelId) return;
  const after = modelOptionById(modelId);
  ov(agentId).modelId = modelId;
  appendAuditMock({
    action: "policy.changed",
    target: agentName,
    detail: `${agentId}.model: ${before.label} → ${after.label}${after.hosting === "in-tenant" ? " (in-tenant)" : ` (${after.provider})`}`,
  });
  bump();
}

export function toggleAgentTool(agentId: string, agentName: string, tool: ConnectorId): void {
  if (requiredToolsFor(agentId).has(tool)) return; // required — not unplugable
  const current = agentTools(agentId);
  const has = current.includes(tool);
  ov(agentId).tools = has ? current.filter((t) => t !== tool) : [...current, tool];
  appendAuditMock({
    action: "policy.changed",
    target: agentName,
    detail: `${agentId}.tools: ${has ? "−" : "+"}${tool}`,
  });
  bump();
}

export function setAgentOwner(agentId: string, agentName: string, ownerId: string): void {
  const before = agentOwner(agentId);
  if (before.id === ownerId) return;
  const after = humans.find((h) => h.id === ownerId);
  if (!after) return;
  ov(agentId).ownerId = ownerId;
  appendAuditMock({
    action: "human.reassigned",
    target: agentName,
    detail: `accountable owner: ${before.name} → ${after.name}`,
  });
  bump();
}

/**
 * Move the agent on the ladder. Downgrades are always allowed (safety is
 * one click); upgrades are only written when `granted` — the caller must
 * hold a system proposal (autonomy is EARNED, never self-served).
 */
export function setAgentAutonomy(
  agentId: string,
  agentName: string,
  level: AutonomyLevel,
  opts?: { granted?: boolean },
): void {
  const before = agentAutonomy(agentId);
  if (before === level) return;
  ov(agentId).autonomy = level;
  const up = level > before;
  appendAuditMock({
    action: "policy.changed",
    target: agentName,
    detail: `${agentId}.autonomy: ${before} → ${level} ${up ? (opts?.granted ? "(granted on validator streak)" : "(raised)") : "(stepped down by PM)"}`,
  });
  bump();
}

export function rollbackAgentVersion(agentId: string, agentName: string, version: string): void {
  const before = agentVersions(agentId).find((v) => v.current)?.version;
  if (before === version) return;
  ov(agentId).currentVersion = version;
  appendAuditMock({
    action: "agent.rolled_back",
    target: agentName,
    detail: `${agentId}: v${before} → v${version} (instant, evals re-run on next promotion)`,
  });
  bump();
}
