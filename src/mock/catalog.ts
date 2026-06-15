/**
 * Agent catalog - display layer over THE CHAIN (src/mock/chain.ts).
 *
 * Joins chain facts (produces/consumes/availability/cost/latency) with
 * display data. Where an Agent record exists in src/mock/agents.ts
 * (ba, sa, tasklist, dev, review, qa, curator=knowledge) we reuse its
 * name/color/engine and expose `agentId` so views can join sparkline /
 * successRate. `uiux` and `devops` are display stubs that live HERE -
 * agents.ts is untouched.
 */

import { agents } from "./agents";
import type { AgentId } from "./types";
import {
  CHAIN_ROLES,
  CONTRACT_VERSION,
  PIPELINE_ORDER,
  type ArtifactKind,
  type ChainRoleId,
  type ContractConformance,
  type RoleAvailability,
} from "./chain";

export interface CatalogEntry {
  id: ChainRoleId;
  name: string;
  roleLine: string;
  /** css var token, e.g. "agent-ba" */
  color: string;
  engine: string;
  produces: ArtifactKind;
  consumes: ArtifactKind[];
  availability: RoleAvailability;
  contractVersion: string;
  conformance: ContractConformance;
  costPerTicketUsd: number;
  latencyP50Min: number;
  /** 3-5 bullets for the detail dialog. */
  capabilities: string[];
  /** One-sentence "what it does" - richer than roleLine. */
  summary: string;
  /** Existing mock Agent id (join for successRate/sparkline); absent for uiux/devops stubs. */
  agentId?: AgentId;
  /** Pod-wide peer (knowledge): installable card, never a pipeline node. */
  podWide?: boolean;
}

const agentById = (id: AgentId) => {
  const a = agents.find((x) => x.id === id);
  if (!a) throw new Error(`mock agent missing: ${id}`);
  return a;
};

function entry(
  id: ChainRoleId,
  display: Pick<
    CatalogEntry,
    "name" | "roleLine" | "color" | "engine" | "capabilities" | "summary"
  > &
    Partial<Pick<CatalogEntry, "agentId" | "podWide">>,
): CatalogEntry {
  const chain = CHAIN_ROLES[id];
  return {
    id,
    produces: chain.produces,
    consumes: chain.consumes,
    availability: chain.availability,
    contractVersion: CONTRACT_VERSION,
    conformance: chain.conformance,
    costPerTicketUsd: chain.costPerTicketUsd,
    latencyP50Min: chain.latencyP50Min,
    ...display,
  };
}

const ba = agentById("ba");
const sa = agentById("sa");
const tasklist = agentById("tasklist");
const dev = agentById("dev");
const review = agentById("review");
const qa = agentById("qa");
const curator = agentById("curator");

export const CATALOG: CatalogEntry[] = [
  entry("ba", {
    name: ba.name,
    roleLine: ba.role,
    color: ba.color,
    engine: ba.engine,
    agentId: "ba",
    capabilities: [
      "EARS acceptance criteria",
      "Structural spec validation - zero-LLM, deterministic",
      "Slack clarification gates",
      "Teamwork ticket intake",
    ],
    summary:
      "Turns raw tickets into a reviewable spec.md with EARS acceptance criteria, asking your team clarifying questions in Slack when the ticket is ambiguous.",
  }),
  entry("sa", {
    name: sa.name,
    roleLine: sa.role,
    color: sa.color,
    engine: sa.engine,
    agentId: "sa",
    capabilities: [
      "architecture.md from approved specs",
      "Architecture decision records",
      "Codebase-constitution aware",
      "Contract-validated structure",
    ],
    summary:
      "Reads the approved spec and writes architecture.md - architecture, data flows and decision records that respect each codebase's constitution.",
  }),
  entry("uiux", {
    name: "UI/UX Designer",
    roleLine: "UI/UX Designer - writes UIX-UI-SPEC.md",
    color: "agent-uiux",
    engine: "LangGraph + Figma MCP",
    capabilities: [
      "Figma frames via MCP",
      "Visual spec - UIX-UI-SPEC.md",
      "Design-token compliance checks",
      "Accessibility annotations",
    ],
    summary:
      "Translates the approved architecture into UIX-UI-SPEC.md - Figma frames plus pixel-level visual specs the Dev agent can build against.",
  }),
  entry("tasklist", {
    name: tasklist.name,
    roleLine: tasklist.role,
    color: tasklist.color,
    engine: tasklist.engine,
    agentId: "tasklist",
    capabilities: [
      "tasks.json work breakdown",
      "Dependency-ordered task graph",
      "Per-task estimates & codebase routing",
    ],
    summary:
      "Breaks the visual spec into tasks.json - a dependency-ordered, estimated work breakdown routed to the right codebase.",
  }),
  entry("dev", {
    name: dev.name,
    roleLine: dev.role,
    color: dev.color,
    engine: dev.engine,
    agentId: "dev",
    capabilities: [
      "Implements tasks as reviewable PRs",
      "Backend · Web · Mobile codebases",
      "Constitution-enforced style & tests",
      "Branch-per-ticket workflow",
    ],
    summary:
      "Implements the task list as reviewable pull requests across backend, web and mobile - tests included, conventions enforced.",
  }),
  entry("review", {
    name: review.name,
    roleLine: review.role,
    color: review.color,
    engine: review.engine,
    agentId: "review",
    capabilities: [
      "Static analysis + LLM review report",
      "Severity-ranked findings",
      "Blocks merge on critical issues",
    ],
    summary:
      "Reviews every PR with static analysis plus an LLM pass, producing a severity-ranked review.md before anything reaches QA.",
  }),
  entry("qa", {
    name: qa.name,
    roleLine: qa.role,
    color: qa.color,
    engine: qa.engine,
    agentId: "qa",
    capabilities: [
      "Playwright end-to-end runs via MCP",
      "Self-healing selectors (Healer)",
      "qa.report with repro steps",
      "Regression suite per ticket",
    ],
    summary:
      "Runs Playwright end-to-end tests against the built code and review findings, healing flaky selectors and reporting reproducible failures.",
  }),
  entry("devops", {
    name: "DevOps/Release",
    roleLine: "DevOps/Release - ships what passed QA",
    color: "agent-devops",
    engine: "LangGraph",
    capabilities: [
      "Release orchestration & changelogs",
      "DORA metrics - lead time, deploy frequency, MTTR, change-failure rate",
      "Environment promotion gates",
      "Rollback playbooks",
    ],
    summary:
      "Promotes QA-passed work through environments to release, tracking the four DORA metrics so delivery performance is measurable, not anecdotal.",
  }),
  entry("knowledge", {
    name: curator.name,
    roleLine: curator.role,
    color: curator.color,
    engine: curator.engine,
    agentId: "curator",
    podWide: true,
    capabilities: [
      "Project memory & context bundles",
      "Source freshness telemetry",
      "Pod-wide retrieval for every agent",
      "Runs pod-wide - not a pipeline stage",
    ],
    summary:
      "Curates the pod's project knowledge - every other agent draws on its context bundles. Runs pod-wide as a peer, not in the pipeline rail.",
  }),
];

export function catalogEntry(id: ChainRoleId): CatalogEntry {
  const e = CATALOG.find((c) => c.id === id);
  if (!e) throw new Error(`catalog entry missing: ${id}`);
  return e;
}

/** The togglable set: 8 pipeline stages + Knowledge. PM is never togglable. */
export const TOGGLABLE_IDS: ChainRoleId[] = [...PIPELINE_ORDER, "knowledge"];

/**
 * Mandatory in EVERY pod (owner call, 2026-06-12): the Knowledge Base
 * agent holds the pod's shared context - the moat's cornerstone (SOW as
 * source of truth, every agent and human drawing on the same context).
 * Its toggle renders locked, every blueprint includes it, and the wizard
 * re-adds it if a draft ever loses it.
 */
export const MANDATORY_ROLE_IDS = new Set<ChainRoleId>(["knowledge"]);

/** PM Supervisor - always-on, non-togglable; rendered in its own "Always-on" subsection. */
export const ALWAYS_ON = (() => {
  const pm = agentById("pm");
  return {
    id: "pm" as const,
    name: pm.name,
    roleLine: pm.role,
    color: pm.color,
    engine: pm.engine,
    summary:
      "Supervises the whole pipeline - sequencing handoffs, watching SLAs and escalating to humans. Included in every pod, always on.",
  };
})();
