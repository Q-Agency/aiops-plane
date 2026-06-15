/**
 * Agent Registry (/registry, ADVANCED · technical) - the AGENT-AGNOSTIC
 * surface: proof that the platform governs *agents*, not a fixed SDLC.
 * Anything that speaks the contract - advertises an A2A Agent Card, emits
 * run-events to the ledger, honors gate/pause signals, names an accountable
 * owner - joins the fleet: gated, audited, accountable. SDLC is just the
 * first INSTALLED pack; the rest of the catalog spans support, marketing,
 * data, security, finance, IT/people-ops and legal to make the point that a
 * refund approval and a deploy approval are the SAME gate.
 *
 * Pure, deterministic data (no Date.now()/Math.random()). Icons are stored
 * as string keys and mapped to lucide components in the route view, keeping
 * this file presentation-free. The "register a custom agent" flow is driven
 * by SAMPLE_CARDS + validateAgentCard(), which always resolves - any agent
 * that speaks the contract is governable, which is the whole thesis.
 */

import type { ConnectorId } from "./connectors";

export type AgentDomain =
  | "sdlc"
  | "support"
  | "marketing"
  | "data"
  | "security"
  | "finance"
  | "itops"
  | "legal";

/**
 * Suggested tool grants per domain - seeds the configure-on-register step
 * (a registered agent gets a scoped connector vault, never blanket access).
 */
export const DOMAIN_SUGGESTED_TOOLS: Record<AgentDomain, ConnectorId[]> = {
  sdlc: ["github", "slack", "teamwork"],
  support: ["slack", "email", "notion"],
  marketing: ["notion", "gdrive", "slack"],
  data: ["gdrive", "github", "slack"],
  security: ["github", "slack", "email"],
  finance: ["gdrive", "email", "slack"],
  itops: ["slack", "email", "gdrive"],
  legal: ["gdrive", "email", "notion"],
};

export interface RegistryAgent {
  /** Stable id, unique within the catalog. */
  id: string;
  name: string;
  /** One-line "what it does". */
  role: string;
}

export interface AgentPack {
  domain: AgentDomain;
  label: string;
  /** One-line pitch for the domain. */
  blurb: string;
  /** Icon key - mapped to a lucide icon in the view (mock stays presentation-free). */
  icon: string;
  /** SDLC ships installed; the rest are one click from the fleet. */
  installed: boolean;
  agents: RegistryAgent[];
}

/** The contract/protocol version every governed agent speaks. */
export const CONTRACT_VERSION = "v1.2" as const;

/** The four contract obligations that make ANY agent governable (the moat). */
export interface GovernanceRequirement {
  id: "card" | "ledger" | "gates" | "owner";
  label: string;
  detail: string;
}

export const GOVERNANCE_REQUIREMENTS: GovernanceRequirement[] = [
  {
    id: "card",
    label: "Advertises an Agent Card",
    detail: "A2A-discoverable skills + endpoint - we know what it can do.",
  },
  {
    id: "ledger",
    label: "Emits run-events to the ledger",
    detail: "Every action lands in the append-only audit trail.",
  },
  {
    id: "gates",
    label: "Honors gate & pause signals",
    detail: "A human can approve, hold, or stop it mid-run.",
  },
  {
    id: "owner",
    label: "Names an accountable owner",
    detail: "Someone answers for what it ships.",
  },
];

/**
 * The catalog - SDLC installed, seven more domains one click away. Roles are
 * deliberately NON-SDLC outside the first pack: the breadth is the argument.
 */
export const AGENT_PACKS: AgentPack[] = [
  {
    domain: "sdlc",
    label: "Software Delivery",
    blurb: "The spec-first delivery pod - BA through QA.",
    icon: "git",
    installed: true,
    agents: [
      { id: "ba", name: "BA Agent", role: "Turns tickets into specs" },
      { id: "sa", name: "SA Agent", role: "Defines the technical architecture" },
      { id: "tasklist", name: "Tasklist Agent", role: "Breaks specs into tasks" },
      { id: "dev", name: "Dev Agent", role: "Implements against the spec" },
      { id: "review", name: "Review Agent", role: "Reviews diffs before merge" },
      { id: "qa", name: "QA Agent", role: "Tests & verifies acceptance" },
    ],
  },
  {
    domain: "support",
    label: "Customer Support",
    blurb: "Deflect, triage and resolve - refunds stay gated.",
    icon: "headset",
    installed: false,
    agents: [
      { id: "triage", name: "Triage Agent", role: "Classifies & routes inbound tickets" },
      { id: "refunder", name: "Refund Resolver", role: "Applies refund policy behind a gate" },
      { id: "replydraft", name: "Reply Drafter", role: "Drafts on-brand responses for review" },
    ],
  },
  {
    domain: "marketing",
    label: "Marketing & Content",
    blurb: "Brief to draft to schedule, on-brand.",
    icon: "megaphone",
    installed: false,
    agents: [
      { id: "copywriter", name: "Campaign Copywriter", role: "Drafts campaign & ad copy" },
      { id: "seo", name: "SEO Auditor", role: "Audits pages & suggests fixes" },
      { id: "social", name: "Social Scheduler", role: "Queues & schedules posts" },
    ],
  },
  {
    domain: "data",
    label: "Data & Analytics",
    blurb: "Ask in English; get governed SQL and charts.",
    icon: "chart",
    installed: false,
    agents: [
      { id: "analyst", name: "Insight Analyst", role: "Answers questions in NL → SQL → chart" },
      { id: "pipeline", name: "Pipeline Monitor", role: "Watches ETL/dbt for breakage" },
      { id: "anomaly", name: "Anomaly Watcher", role: "Flags metric anomalies" },
    ],
  },
  {
    domain: "security",
    label: "Security & Compliance",
    blurb: "Continuous CVE, secret and access checks.",
    icon: "shield",
    installed: false,
    agents: [
      { id: "depaudit", name: "Dependency Auditor", role: "Scans dependencies for CVEs" },
      { id: "secretscan", name: "Secret Scanner", role: "Catches leaked secrets in code" },
      { id: "accessrev", name: "Access Reviewer", role: "Reviews access & flags drift" },
    ],
  },
  {
    domain: "finance",
    label: "Finance & Ops",
    blurb: "Close faster - reconciliations with an audit trail.",
    icon: "wallet",
    installed: false,
    agents: [
      { id: "invoice", name: "Invoice Reconciler", role: "Reconciles invoices to POs" },
      { id: "expense", name: "Expense Auditor", role: "Audits expenses against policy" },
      { id: "forecast", name: "Forecast Builder", role: "Builds rolling cash forecasts" },
    ],
  },
  {
    domain: "itops",
    label: "IT & People Ops",
    blurb: "Joiner-mover-leaver and onboarding, by policy.",
    icon: "users",
    installed: false,
    agents: [
      { id: "jml", name: "Access Provisioner", role: "Provisions joiner/mover/leaver access" },
      { id: "onboard", name: "Onboarding Buddy", role: "Guides new-hire onboarding" },
      { id: "asset", name: "Asset Tracker", role: "Tracks device & licence inventory" },
    ],
  },
  {
    domain: "legal",
    label: "Legal & Procurement",
    blurb: "Redlines and risk scoring against your playbook.",
    icon: "scale",
    installed: false,
    agents: [
      { id: "contract", name: "Contract Reviewer", role: "Redlines contracts vs the playbook" },
      { id: "nda", name: "NDA Triage", role: "Triages & approves standard NDAs" },
      { id: "vendor", name: "Vendor Risk Scorer", role: "Scores vendor & data-processing risk" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Register-a-custom-agent - the "add ANY agent" demonstration         */
/* ------------------------------------------------------------------ */

export interface AgentCard {
  url: string;
  name: string;
  domain: AgentDomain;
  /** Contract/protocol version it speaks. */
  version: string;
  skills: string[];
  auth: string;
  engine: string;
  /** false = parsed from an unrecognized URL (skills self-declared). */
  recognized: boolean;
}

/** "Try one" example cards - deliberately cross-domain (support/finance/security). */
export const SAMPLE_CARDS: AgentCard[] = [
  {
    url: "https://lingo.acme.io/translator/.well-known/agent-card.json",
    name: "Translation Agent",
    domain: "support",
    version: CONTRACT_VERSION,
    skills: ["translate", "detect-language", "apply-glossary"],
    auth: "API key",
    engine: "External · A2A",
    recognized: true,
  },
  {
    url: "https://price.acme.io/optimizer/.well-known/agent-card.json",
    name: "Pricing Optimizer",
    domain: "finance",
    version: CONTRACT_VERSION,
    skills: ["model-elasticity", "scan-competitors", "guard-margin"],
    auth: "OAuth2 · client-credentials",
    engine: "External · A2A",
    recognized: true,
  },
  {
    url: "https://soc.acme.io/threat-intel/.well-known/agent-card.json",
    name: "Threat-Intel Agent",
    domain: "security",
    version: CONTRACT_VERSION,
    skills: ["enrich-ioc", "correlate-cve", "triage-alert"],
    auth: "mTLS",
    engine: "External · A2A",
    recognized: true,
  },
];

function titleCase(s: string): string {
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Derive a friendly agent name from an arbitrary card URL (deterministic). */
function deriveName(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname
      .split("/")
      .filter((p) => p && !p.startsWith(".") && !p.endsWith(".json"))
      .pop();
    const base = (seg ?? u.hostname.split(".")[0]).replace(/[-_]+/g, " ");
    return `${titleCase(base)} Agent`;
  } catch {
    return "External Agent";
  }
}

/**
 * Resolve a pasted Agent-Card URL to a card. Known sample URLs return their
 * rich card; ANY other URL still resolves (the thesis: anything that speaks
 * the contract is governable) to a card parsed from the path with
 * self-declared skills. Returns null only for an empty string. Deterministic
 * - no network, no randomness.
 */
export function validateAgentCard(rawUrl: string): AgentCard | null {
  const url = rawUrl.trim();
  if (!url) return null;
  const known = SAMPLE_CARDS.find((c) => c.url === url);
  if (known) return known;
  return {
    url,
    name: deriveName(url),
    domain: "data",
    version: CONTRACT_VERSION,
    skills: ["invoke", "stream-events", "describe-skills"],
    auth: "Bearer token",
    engine: "External · A2A",
    recognized: false,
  };
}

/* ------------------------------------------------------------------ */
/* Derived counters (for the KPI strip)                                */
/* ------------------------------------------------------------------ */

export function catalogStats(): {
  domains: number;
  agents: number;
  installedAgents: number;
  availablePacks: number;
} {
  return {
    domains: AGENT_PACKS.length,
    agents: AGENT_PACKS.reduce((n, p) => n + p.agents.length, 0),
    installedAgents: AGENT_PACKS.filter((p) => p.installed).reduce(
      (n, p) => n + p.agents.length,
      0,
    ),
    availablePacks: AGENT_PACKS.filter((p) => !p.installed).length,
  };
}
