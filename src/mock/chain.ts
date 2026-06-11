/**
 * THE CHAIN — single source of truth for the SDLC pipeline contract.
 *
 * Every LAUNCH surface (catalog grid, pipeline preview, blueprints,
 * readiness) derives from this module. No other file re-declares the
 * produces/consumes graph.
 *
 * Edge rule: an edge A → B exists iff `A.produces ∈ B.consumes`.
 */

export type ArtifactKind =
  | "spec"
  | "design"
  | "uix-ui-spec"
  | "tasks"
  | "code"
  | "review"
  | "test"
  | "release"
  | "knowledge";

export type ChainRoleId =
  | "ba"
  | "sa"
  | "uiux"
  | "tasklist"
  | "dev"
  | "review"
  | "qa"
  | "devops"
  | "knowledge";

export type RoleAvailability = "live" | "roadmap";
export type ContractConformance = "certified" | "partial" | "untested";

export interface ChainRole {
  id: ChainRoleId;
  produces: ArtifactKind;
  consumes: ArtifactKind[];
  availability: RoleAvailability;
  conformance: ContractConformance;
  /** Indicative — display only; raw COGS never shown inside LAUNCH. */
  costPerTicketUsd: number;
  latencyP50Min: number;
  /** false = pod-wide peer (knowledge): never a pipeline node, no edges. */
  pipeline: boolean;
}

export const CONTRACT_VERSION = "contract v0.5";

export const CHAIN_ROLES: Record<ChainRoleId, ChainRole> = {
  ba: {
    id: "ba",
    produces: "spec",
    consumes: [],
    availability: "live",
    conformance: "certified",
    costPerTicketUsd: 1.2,
    latencyP50Min: 14,
    pipeline: true,
  },
  sa: {
    id: "sa",
    produces: "design",
    consumes: ["spec"],
    availability: "roadmap",
    conformance: "certified",
    costPerTicketUsd: 1.8,
    latencyP50Min: 22,
    pipeline: true,
  },
  uiux: {
    id: "uiux",
    produces: "uix-ui-spec",
    consumes: ["design"],
    availability: "roadmap",
    conformance: "partial",
    costPerTicketUsd: 1.5,
    latencyP50Min: 18,
    pipeline: true,
  },
  tasklist: {
    id: "tasklist",
    produces: "tasks",
    consumes: ["uix-ui-spec"],
    availability: "roadmap",
    conformance: "partial",
    costPerTicketUsd: 0.4,
    latencyP50Min: 8,
    pipeline: true,
  },
  dev: {
    id: "dev",
    produces: "code",
    consumes: ["tasks"],
    availability: "roadmap",
    conformance: "partial",
    costPerTicketUsd: 6.5,
    latencyP50Min: 180,
    pipeline: true,
  },
  review: {
    id: "review",
    produces: "review",
    consumes: ["code"],
    availability: "roadmap",
    conformance: "partial",
    costPerTicketUsd: 0.9,
    latencyP50Min: 12,
    pipeline: true,
  },
  qa: {
    id: "qa",
    produces: "test",
    consumes: ["code", "review"],
    availability: "roadmap",
    conformance: "partial",
    costPerTicketUsd: 2.2,
    latencyP50Min: 35,
    pipeline: true,
  },
  devops: {
    id: "devops",
    produces: "release",
    consumes: ["test"],
    availability: "roadmap",
    conformance: "partial",
    costPerTicketUsd: 1.1,
    latencyP50Min: 15,
    pipeline: true,
  },
  knowledge: {
    id: "knowledge",
    produces: "knowledge",
    consumes: [],
    // Fleet truth: the Knowledge Base agent is OPERATING today (the pitch's
    // "BA + Knowledge Base — operating" chips; dashboard federation is the
    // next step) — and since 2026-06-12 it is MANDATORY in every pod
    // (catalog.MANDATORY_ROLE_IDS), so it cannot read "Roadmap".
    availability: "live",
    conformance: "partial",
    costPerTicketUsd: 0.3,
    latencyP50Min: 2,
    pipeline: false,
  },
};

/** Contract order of the pipeline rail (pod-wide peers excluded). */
export const PIPELINE_ORDER: ChainRoleId[] = [
  "ba",
  "sa",
  "uiux",
  "tasklist",
  "dev",
  "review",
  "qa",
  "devops",
];

export function isChainRoleId(id: string): id is ChainRoleId {
  return id in CHAIN_ROLES;
}

/** The pipeline role that produces an artifact (null for pod-wide artifacts). */
export function producerOf(artifact: ArtifactKind): ChainRoleId | null {
  return PIPELINE_ORDER.find((id) => CHAIN_ROLES[id].produces === artifact) ?? null;
}

export interface ChainEdge {
  from: ChainRoleId;
  to: ChainRoleId;
  artifact: ArtifactKind;
}

/**
 * All satisfied edges among the selected roles.
 * Edge rule: A → B exists iff A.produces ∈ B.consumes (pipeline roles only).
 */
export function edgesFor(selectedIds: readonly ChainRoleId[]): ChainEdge[] {
  const selected = PIPELINE_ORDER.filter((id) => selectedIds.includes(id));
  const edges: ChainEdge[] = [];
  for (const to of selected) {
    for (const artifact of CHAIN_ROLES[to].consumes) {
      const from = selected.find((id) => CHAIN_ROLES[id].produces === artifact);
      if (from) edges.push({ from, to, artifact });
    }
  }
  return edges;
}

export interface ChainGap {
  /** Selected consumer whose required input has no selected producer. */
  roleId: ChainRoleId;
  /** The artifact nobody selected produces. */
  missing: ArtifactKind;
  /** Catalog role that would close the gap (drives the "+ Add Tasklist" / "+ Add Review" auto-suggest). */
  fixRoleId: ChainRoleId | null;
}

/**
 * Input gaps in the current selection. Adding `dev` without a `tasks`
 * producer yields `{ roleId: "dev", missing: "tasks", fixRoleId: "tasklist" }`;
 * adding `qa` without `review` yields `fixRoleId: "review"`.
 */
export function missingInputsFor(selectedIds: readonly ChainRoleId[]): ChainGap[] {
  const selected = PIPELINE_ORDER.filter((id) => selectedIds.includes(id));
  const produced = new Set(selected.map((id) => CHAIN_ROLES[id].produces));
  const gaps: ChainGap[] = [];
  for (const roleId of selected) {
    for (const missing of CHAIN_ROLES[roleId].consumes) {
      if (!produced.has(missing)) {
        gaps.push({ roleId, missing, fixRoleId: producerOf(missing) });
      }
    }
  }
  return gaps;
}

/** Indicative summed per-ticket cost across the selection (display only). */
export function estCost(selectedIds: readonly ChainRoleId[]): number {
  return selectedIds
    .filter(isChainRoleId)
    .reduce((sum, id) => sum + CHAIN_ROLES[id].costPerTicketUsd, 0);
}

/** End-to-end p50 latency in minutes (pipeline roles only — peers add none). */
export function estLatency(selectedIds: readonly ChainRoleId[]): number {
  return selectedIds
    .filter((id) => isChainRoleId(id) && CHAIN_ROLES[id].pipeline)
    .reduce((sum, id) => sum + CHAIN_ROLES[id].latencyP50Min, 0);
}

/** "3h 15m" / "45m" formatting for estLatency output. */
export function formatLatency(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
