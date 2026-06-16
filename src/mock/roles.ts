/**
 * Roles & members (C11) - the five role personas and what each can see/do.
 * Powers the "Members & roles" panel on /pod and the read-only "What each
 * role sees" capability matrix card.
 *
 * Honesty: RBAC is mocked - roles shape landings and gate attribution in
 * the mock; access is NOT enforced. NO per-role redirects/landings ship in
 * this slice (defaultLanding is forward-looking config only).
 */

import { humans, type Human } from "./humans";

export type RoleId = "pod_admin" | "eng_lead" | "qa_lead" | "sponsor" | "viewer";

export interface RoleCapabilities {
  read: boolean; //      view all pod surfaces
  act: boolean; //       answer clarifications, trigger recovery
  approve: boolean; //   approve/reject gates
  configure: boolean; // LAUNCH, connections, members, budget caps
  export: boolean; //    reports, statements, audit ledger
}

export interface Role {
  id: RoleId;
  label: string;
  description: string;
  /** Forward-looking config - NOT wired to redirects in this slice. */
  defaultLanding: string;
  readOnly: boolean;
  capabilities: RoleCapabilities;
  /** Human-readable capability strings for the "What each role sees" card. */
  sees: string[];
}

export const CAPABILITY_LABELS: Record<keyof RoleCapabilities, string> = {
  read: "View",
  act: "Act on gates",
  approve: "Approve / reject",
  configure: "Configure pod",
  export: "Export reports",
};

export const roles: Role[] = [
  {
    id: "pod_admin",
    label: "Pod Admin (PM)",
    description: "Runs the pod day to day - owns intake, gates, incidents, budget.",
    defaultLanding: "/",
    readOnly: false,
    capabilities: { read: true, act: true, approve: true, configure: true, export: true },
    sees: [
      "Everything - full LAUNCH / RUN / MONITOR rail",
      "Approves any gate; answers clarifications",
      "Configures connections, members, budget caps",
      "Exports reports, statements, the audit ledger",
    ],
  },
  {
    id: "eng_lead",
    label: "Engineering Lead",
    description: "Owns Dev/Review agents - triages run failures and code gates.",
    defaultLanding: "/pipeline",
    readOnly: false,
    capabilities: { read: true, act: true, approve: true, configure: false, export: false },
    sees: [
      "Pipeline, Gates (code/architecture scope), Incidents, Traceability",
      "Approves Dev/Architecture review gates",
      "Triggers run recovery (retry / resume)",
      "No pod configuration or billing controls",
    ],
  },
  {
    id: "qa_lead",
    label: "QA Lead",
    description: "Owns the QA agent - clears QA gates and watches quality posture.",
    defaultLanding: "/approvals",
    readOnly: false,
    capabilities: { read: true, act: true, approve: true, configure: false, export: false },
    sees: [
      "Gates (QA scope), Governance quality posture, Incidents (QA)",
      "Approves QA review gates",
      "Sees the deterministic validator panel",
      "No pod configuration or billing controls",
    ],
  },
  {
    id: "sponsor",
    label: "Client Sponsor",
    description: "Pays for the pod - reads ROI, SLA and weekly reports. Read-only.",
    defaultLanding: "/economics",
    readOnly: true,
    capabilities: { read: true, act: false, approve: false, configure: false, export: true },
    sees: [
      "Overview · ROI, SLA & Reports, Compliance & Audit, Usage & Billing",
      "Downloads the weekly client report",
      "No operator dials - cannot approve, act, or configure",
    ],
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Read-only observer - status surfaces only, no exports.",
    defaultLanding: "/economics",
    readOnly: true,
    capabilities: { read: true, act: false, approve: false, configure: false, export: false },
    sees: [
      "Overview · ROI and SLA status, read-only",
      "No actions, no exports, no configuration",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Assignments - joins humans.ts; sponsor is an external member         */
/* ------------------------------------------------------------------ */

export interface RoleAssignment {
  humanId: string; // humans.ts id, or "client-sponsor" (external)
  roleId: RoleId;
}

export const roleAssignments: RoleAssignment[] = [
  { humanId: "ana", roleId: "pod_admin" },
  { humanId: "zlatko", roleId: "pod_admin" },
  { humanId: "ivan", roleId: "eng_lead" },
  { humanId: "marin", roleId: "eng_lead" },
  { humanId: "petra", roleId: "qa_lead" },
  { humanId: "client-sponsor", roleId: "sponsor" },
];

/** Display-only member shape for people who are NOT in humans.ts. */
export interface ExternalMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarUrl: string;
}

/** The client-side sponsor seat (kept OUT of humans.ts so rosters/matrices don't change). */
export const sponsorMember: ExternalMember = {
  id: "client-sponsor",
  name: "Sandra Weiss",
  role: "Client Sponsor · AutoMarket GmbH",
  initials: "SW",
  avatarUrl: "https://randomuser.me/api/portraits/women/65.jpg",
};

export function roleById(id: RoleId): Role {
  return roles.find((r) => r.id === id) ?? roles[roles.length - 1];
}

export function roleOf(humanId: string): RoleId | undefined {
  return roleAssignments.find((a) => a.humanId === humanId)?.roleId;
}

export function membersOf(roleId: RoleId): string[] {
  return roleAssignments.filter((a) => a.roleId === roleId).map((a) => a.humanId);
}

export function landingFor(roleId: RoleId): string {
  return roleById(roleId).defaultLanding;
}

/** humans.ts member (or undefined for the external sponsor seat). */
export function memberHuman(humanId: string): Human | undefined {
  return humans.find((h) => h.id === humanId);
}
