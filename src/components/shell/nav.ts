/**
 * Left-rail navigation config — the FIRE UP / RUN / MONITOR / ADVANCED pillar
 * spine (product-vision §6, IA reorg build-order #1).
 *
 * Pure config + badge selectors; LeftRail.tsx renders from this.
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookMarked,
  Bot,
  Briefcase,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileBarChart,
  FlaskConical,
  GitBranch,
  Hourglass,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Megaphone,
  Network,
  Package,
  PlugZap,
  Rocket,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Signal,
  Siren,
} from "lucide-react";
import { openGateCount } from "@/mock/approvals";
import { INCIDENTS_OPEN_COUNT } from "@/mock/incidents";

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
  | "/intake"
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
  | "/settings"
  | "/memory"
  | "/pilot"
  | "/org"
  | "/artifacts"
  | "/status"
  | "/welcome";

export interface NavItem {
  to: NavTo;
  label: string;
  icon: LucideIcon;
  badgeKey?: NavBadgeKey;
  /** Visible to real-mode (live-connected) accounts. Default: mock-only. */
  live?: boolean;
  /**
   * Hidden from the DEMO experience (live keeps it). Owner call 2026-06-12:
   * in the demo, pod creation owns tool-connecting — a standalone
   * Connections hub reads as a second place to do the same job.
   */
  mockHidden?: boolean;
  /** Tiny mono chip rendered after the label, e.g. "PILOT". */
  tag?: string;
}

export interface NavGroup {
  pillar: NavPillar;
  /** Rendered trigger label (ADVANCED gets the "· technical" suffix). */
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  // FIRE UP is deliberately lean in the demo (owner call 2026-06-12): the
  // wizard owns the whole launch ritual — Catalog content lives in its
  // agent-team step (route /catalog stays for pitch deep-links), tool
  // connections live in its Connect step (the standalone hub is live-only),
  // and people/accountability has ONE home: MONITOR · Accountability (/pod).
  {
    pillar: "FIRE UP",
    label: "FIRE UP",
    items: [
      { to: "/pods/new", label: "New Pod", icon: Rocket },
      { to: "/connections", label: "Connections", icon: PlugZap, live: true, mockHidden: true },
    ],
  },
  {
    pillar: "RUN",
    label: "RUN",
    items: [
      { to: "/", label: "Command Center", icon: LayoutDashboard, live: true },
      { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
      { to: "/intake", label: "Work Intake", icon: Inbox },
      { to: "/approvals", label: "Gates", icon: CheckCircle2, badgeKey: "gates" },
      { to: "/comms", label: "Comms & Escalations", icon: Megaphone },
      { to: "/incidents", label: "Incidents", icon: Siren, badgeKey: "incidents" },
    ],
  },
  {
    pillar: "MONITOR",
    label: "MONITOR",
    items: [
      { to: "/economics", label: "Overview · ROI", icon: DollarSign, live: true },
      { to: "/governance", label: "Governance", icon: Scale, live: true },
      { to: "/pod", label: "Accountability", icon: ShieldCheck },
      { to: "/reports", label: "SLA & Reports", icon: FileBarChart },
      { to: "/compliance", label: "Compliance & Audit", icon: ScrollText, live: true },
      { to: "/billing", label: "Usage & Billing", icon: CreditCard },
      { to: "/memory", label: "Memory & Rules", icon: BookMarked },
      { to: "/pilot", label: "Pilot", icon: FlaskConical, tag: "PILOT" },
      { to: "/org", label: "Portfolio", icon: Briefcase },
      { to: "/artifacts", label: "Deliverables", icon: Package },
    ],
  },
  {
    pillar: "ADVANCED",
    label: "ADVANCED · technical",
    items: [
      { to: "/observability", label: "Observability", icon: Activity, live: true },
      { to: "/orchestration", label: "Orchestration", icon: Network },
      { to: "/flow", label: "Flow", icon: Hourglass, live: true },
      { to: "/traceability", label: "Traceability", icon: GitBranch },
      { to: "/agents", label: "Agents", icon: Bot, live: true },
      { to: "/status", label: "Platform status", icon: Signal },
    ],
  },
];

/** Pinned below ADVANCED, above the collapse button. */
export const SETTINGS_ITEM: NavItem = {
  to: "/settings",
  label: "Settings",
  icon: Settings,
  live: true,
};

/** Badge counts (mock): open gates of BOTH kinds (approvals + clarifications,
 * minus session-resolved) via openGateCount(); open incidents DERIVED from incidents.ts. */
export function navBadgeCount(key: NavBadgeKey): number {
  return key === "gates" ? openGateCount() : INCIDENTS_OPEN_COUNT;
}
