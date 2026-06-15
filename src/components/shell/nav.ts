/**
 * Left-rail navigation config — the LAUNCH / RUN / MONITOR / ADVANCED pillar
 * spine (product-vision §6, IA reorg build-order #1).
 *
 * Pure config + badge selectors; LeftRail.tsx renders from this.
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Blocks,
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
import { unackedOpen } from "@/mock/comms";
import { awaitingConfirmationCount } from "@/mock/intake";
import { slaSummary } from "@/mock/sla";
import { CONTROLS, controlsByStatus } from "@/mock/compliance";
import { problemCount } from "@/mock/status";

export type NavPillar = "LAUNCH" | "RUN" | "MONITOR" | "ADVANCED";

export type NavBadgeKey =
  | "gates"
  | "incidents"
  | "escalations"
  | "intake"
  | "sla"
  | "compliance"
  | "status";

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
  | "/registry"
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
  // LAUNCH is deliberately lean in the demo (owner call 2026-06-12): the
  // wizard owns the whole launch ritual — Catalog content lives in its
  // agent-team step (route /catalog stays for pitch deep-links), tool
  // connections live in its Connect step (the standalone hub is live-only),
  // and people/accountability has ONE home: MONITOR · Accountability (/pod).
  {
    pillar: "LAUNCH",
    label: "LAUNCH",
    items: [
      { to: "/pods/new", label: "New Pod", icon: Rocket },
      { to: "/connections", label: "Connections", icon: PlugZap, live: true, mockHidden: true },
    ],
  },
  // RUN = operate the pod day-to-day. Agents sits right after Overview (owner
  // call 2026-06-12): the agent roster is the product's CENTRAL object —
  // "how's my team doing" is a daily operating check, not an advanced/technical
  // deep-dive — so it was promoted OUT of the ADVANCED drawer. (Its deep
  // per-agent diagnostics stay on the drill-in page; the rail entry is the
  // PM-legible roster.)
  {
    pillar: "RUN",
    label: "RUN",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, live: true },
      { to: "/agents", label: "Agents", icon: Bot, live: true },
      { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
      { to: "/intake", label: "Work Intake", icon: Inbox, badgeKey: "intake" },
      { to: "/approvals", label: "Gates", icon: CheckCircle2, badgeKey: "gates" },
      { to: "/comms", label: "Comms & Escalations", icon: Megaphone, badgeKey: "escalations" },
      { to: "/incidents", label: "Incidents", icon: Siren, badgeKey: "incidents" },
    ],
  },
  // MONITOR = observe, govern, report, prove. Clustered by sub-theme (owner
  // call 2026-06-12) so the pillar is scannable instead of a flat 12-item list:
  //   prove-ROI → govern → delivery-health → audit & output.
  // Flow + Traceability were pulled DOWN from ADVANCED: Flow is human-bottleneck
  // analytics (a delivery-lead surface, not SRE telemetry) and Traceability is a
  // client-facing selling point ("end-to-end traceability"), not a tech drill-down.
  {
    pillar: "MONITOR",
    label: "MONITOR",
    items: [
      // prove-ROI — the wow-moment hero leads (product-vision §1 ROI reveal).
      // "ROI & Economics" (was "Overview · ROI") — renamed with the RUN
      // landing's Command Center → Overview rename so the rail never shows
      // two "Overview" entries.
      { to: "/economics", label: "ROI & Economics", icon: DollarSign, live: true },
      { to: "/billing", label: "Usage & Billing", icon: CreditCard },
      { to: "/pilot", label: "Pilot", icon: FlaskConical, tag: "PILOT" },
      { to: "/org", label: "Portfolio", icon: Briefcase },
      // govern — the two "rules the pod runs under", now adjacent.
      { to: "/governance", label: "Governance", icon: Scale, live: true },
      { to: "/memory", label: "Memory & Rules", icon: BookMarked },
      // delivery-health — coverage + SLA + where the humans are the bottleneck.
      { to: "/pod", label: "Accountability", icon: ShieldCheck },
      { to: "/reports", label: "SLA & Reports", icon: FileBarChart, badgeKey: "sla" },
      { to: "/flow", label: "Flow", icon: Hourglass, live: true },
      // audit & output — the append-only trail, the deliverables shelf, lineage.
      { to: "/compliance", label: "Compliance & Audit", icon: ScrollText, live: true, badgeKey: "compliance" },
      { to: "/artifacts", label: "Deliverables", icon: Package },
      { to: "/traceability", label: "Traceability", icon: GitBranch },
    ],
  },
  // ADVANCED · technical = the platform-engineer drawer (product-vision §6 intent:
  // "demote platform-engineer views… over-built for the PM persona"). After
  // promoting Agents → RUN and demoting Flow + Traceability → MONITOR, the SRE
  // trio (Observability / Orchestration / Platform status) remains. Agent Registry
  // leads it (owner call 2026-06-12): the agent-agnostic extensibility surface —
  // "register & govern ANY agent, not just SDLC" — is the platform's deepest
  // technical capability and the proof the control plane isn't a fixed workflow.
  {
    pillar: "ADVANCED",
    label: "ADVANCED · technical",
    items: [
      { to: "/registry", label: "Agent Registry", icon: Blocks },
      { to: "/observability", label: "Observability", icon: Activity, live: true },
      { to: "/orchestration", label: "Orchestration", icon: Network },
      { to: "/status", label: "Platform status", icon: Signal, badgeKey: "status" },
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

/**
 * Badge counts (mock; suppressed wholesale in real mode + read-only views by
 * LeftRail). Each mirrors the number ITS screen leads with, so the rail and
 * the page never disagree:
 *   gates       — open gates of BOTH kinds (approvals + clarifications, minus
 *                 session-resolved) via openGateCount()
 *   incidents   — open incidents DERIVED from incidents.ts
 *   escalations — unacknowledged escalations from comms.ts (moved off the
 *                 TopBar's "ESC" chip onto the Comms item, 2026-06-12)
 *   intake      — board arrivals awaiting confirm/decline ("N in Ready
 *                 awaiting you" on /intake)
 *   sla         — SLAs CURRENTLY breached (the "SLAs breached" tile on
 *                 /reports — not the 30-day event count)
 *   compliance  — controls with status "gap" (the "Gaps" stat on /compliance)
 *   status      — components not operational (0 in the seeded happy state →
 *                 no chip until one degrades)
 * A 0 renders nothing (LeftRail gates on count > 0).
 */
export function navBadgeCount(key: NavBadgeKey): number {
  switch (key) {
    case "gates":
      return openGateCount();
    case "incidents":
      return INCIDENTS_OPEN_COUNT;
    case "escalations":
      return unackedOpen().length;
    case "intake":
      return awaitingConfirmationCount();
    case "sla":
      return slaSummary().breached;
    case "compliance":
      return controlsByStatus(CONTROLS).gap;
    case "status":
      return problemCount();
  }
}
