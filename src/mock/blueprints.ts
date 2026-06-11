/**
 * Pod blueprints — LAUNCH step 1. A blueprint pre-fills the whole wizard.
 * Connector honesty (load-bearing): `connectorIds` are Live, connect-now;
 * `optionalConnectorIds` are Roadmap, rendered as "Optional · Roadmap" —
 * a blueprint never leads with a connector the buyer can't connect today.
 */

import type { ChainRoleId } from "./chain";
import type { ConnectorId } from "./connectors";

export type BlueprintId = "web-app" | "mobile" | "maintenance" | "scratch";

export interface PodBlueprint {
  id: BlueprintId;
  name: string;
  /** lucide-react icon name hint. */
  icon: string;
  /** One-line outcome. */
  outcomeLine: string;
  agentIds: ChainRoleId[];
  /** Live connectors, ordered live-first. */
  connectorIds: ConnectorId[];
  /** Roadmap connectors — "Optional · Roadmap" chips. */
  optionalConnectorIds: ConnectorId[];
  defaultSlaLine: string;
  recommendedRolesLine: string;
  /** Card meta row, e.g. "fires up ~7 agents · 5 connectors". */
  meta: string;
  popular?: boolean;
}

export const BLUEPRINTS: PodBlueprint[] = [
  {
    id: "web-app",
    name: "Web App Delivery Pod",
    icon: "Globe",
    outcomeLine: "Ship features on a web codebase — spec to merged PR.",
    agentIds: ["ba", "sa", "uiux", "tasklist", "dev", "review", "qa"],
    connectorIds: ["teamwork", "slack", "github"],
    optionalConnectorIds: ["jira", "gdrive", "email"],
    defaultSlaLine: "30m first response · 4h gate clear · weekly delivery",
    recommendedRolesLine: "Pod Admin · Engineering Lead · QA Lead accountable",
    meta: "fires up ~7 agents · 5 connectors",
    popular: true,
  },
  {
    id: "mobile",
    name: "Mobile App Pod",
    icon: "Smartphone",
    outcomeLine: "Deliver mobile releases (Flutter) — store-ready builds.",
    agentIds: ["ba", "sa", "uiux", "tasklist", "dev", "review", "qa"],
    connectorIds: ["teamwork", "slack", "github"],
    optionalConnectorIds: ["jira", "email"],
    defaultSlaLine: "1h first response · 8h gate clear · biweekly release",
    recommendedRolesLine: "Pod Admin · Engineering Lead · QA Lead accountable",
    meta: "fires up ~7 agents · 5 connectors",
  },
  {
    id: "maintenance",
    name: "Maintenance & Support Pod",
    icon: "Wrench",
    outcomeLine: "Keep a live product healthy — bugfixes, patches, small features.",
    agentIds: ["ba", "dev", "review", "qa"],
    connectorIds: ["teamwork", "slack", "github"],
    optionalConnectorIds: ["jira", "email"],
    defaultSlaLine: "15m first response · 2h gate clear · continuous delivery",
    recommendedRolesLine: "Pod Admin · Engineering Lead accountable",
    meta: "fires up ~4 agents · 5 connectors",
  },
  {
    id: "scratch",
    name: "Start from scratch",
    icon: "PencilRuler",
    outcomeLine: "Hand-pick every agent, tool and person.",
    agentIds: [],
    connectorIds: [],
    optionalConnectorIds: [],
    defaultSlaLine: "Set your own SLAs",
    recommendedRolesLine: "Full control",
    meta: "you choose everything",
  },
];

export function blueprintById(id: BlueprintId | null): PodBlueprint | null {
  if (!id) return null;
  return BLUEPRINTS.find((b) => b.id === id) ?? null;
}
