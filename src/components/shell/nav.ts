/**
 * Left-rail navigation config — the FIRE UP / RUN / MONITOR / ADVANCED pillar
 * spine (product-vision §6, IA reorg build-order #1).
 *
 * Pure config + badge selectors; LeftRail.tsx renders from this.
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  CheckCircle2,
  CreditCard,
  Database,
  DollarSign,
  FileBarChart,
  GitBranch,
  Hourglass,
  KanbanSquare,
  LayoutDashboard,
  Megaphone,
  Network,
  PlugZap,
  Rocket,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Siren,
  Store,
  Users,
} from "lucide-react";
import { approvals } from "@/mock/approvals";
import { INCIDENTS_OPEN_COUNT } from "@/mock/incidents-stub";

export type NavPillar = "FIRE UP" | "RUN" | "MONITOR" | "ADVANCED";

export type NavBadgeKey = "gates" | "incidents";

/** Every rail destination (all are real file-based routes). */
export type NavTo =
  | "/"
  | "/pods/new"
  | "/catalog"
  | "/connections"
  | "/pod"
  | "/pipeline"
  | "/approvals"
  | "/comms"
  | "/incidents"
  | "/economics"
  | "/governance"
  | "/reports"
  | "/compliance"
  | "/billing"
  | "/observability"
  | "/orchestration"
  | "/flow"
  | "/traceability"
  | "/agents"
  | "/knowledge"
  | "/settings";

export interface NavItem {
  to: NavTo;
  label: string;
  icon: LucideIcon;
  badgeKey?: NavBadgeKey;
}

export interface NavGroup {
  pillar: NavPillar;
  /** Rendered trigger label (ADVANCED gets the "· technical" suffix). */
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    pillar: "FIRE UP",
    label: "FIRE UP",
    items: [
      { to: "/pods/new", label: "New Pod", icon: Rocket },
      { to: "/catalog", label: "Catalog", icon: Store },
      { to: "/connections", label: "Connections", icon: PlugZap },
      { to: "/pod", label: "People & Roles", icon: Users },
    ],
  },
  {
    pillar: "RUN",
    label: "RUN",
    items: [
      { to: "/", label: "Command Center", icon: LayoutDashboard },
      { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
      { to: "/approvals", label: "Gates", icon: CheckCircle2, badgeKey: "gates" },
      { to: "/comms", label: "Comms & Escalations", icon: Megaphone },
      { to: "/incidents", label: "Incidents", icon: Siren, badgeKey: "incidents" },
    ],
  },
  {
    pillar: "MONITOR",
    label: "MONITOR",
    items: [
      { to: "/economics", label: "Overview · ROI", icon: DollarSign },
      { to: "/governance", label: "Governance", icon: Scale },
      { to: "/pod", label: "Accountability", icon: ShieldCheck },
      { to: "/reports", label: "SLA & Reports", icon: FileBarChart },
      { to: "/compliance", label: "Compliance & Audit", icon: ScrollText },
      { to: "/billing", label: "Usage & Billing", icon: CreditCard },
    ],
  },
  {
    pillar: "ADVANCED",
    label: "ADVANCED · technical",
    items: [
      { to: "/observability", label: "Observability", icon: Activity },
      { to: "/orchestration", label: "Orchestration", icon: Network },
      { to: "/flow", label: "Flow", icon: Hourglass },
      { to: "/traceability", label: "Traceability", icon: GitBranch },
      { to: "/agents", label: "Agents", icon: Bot },
      { to: "/knowledge", label: "Knowledge", icon: Database },
    ],
  },
];

/** Pinned below ADVANCED, above the collapse button. */
export const SETTINGS_ITEM: NavItem = { to: "/settings", label: "Settings", icon: Settings };

/** Badge counts (mock): open gates from approvals, open incidents from the stub. */
export function navBadgeCount(key: NavBadgeKey): number {
  return key === "gates" ? approvals.length : INCIDENTS_OPEN_COUNT;
}
