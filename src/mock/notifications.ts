/**
 * Notifications (C6) — the canonical per-user notification dataset.
 * Drives the TopBar bell popover AND the /notifications inbox; the bell
 * defers to this shape (never re-declare a lighter one).
 *
 * Read-state is a client-side overlay persisted to localStorage under
 * NOTIF_READ_STORAGE_KEY ("aiops_notif_read") — SSR-safe helpers below
 * (call them inside a mounted useEffect, never during render on the server).
 *
 * Deep links follow the canonical URLs (C1): gates → /approvals/$gateId,
 * incidents → /incidents, SLA/report → /reports.
 */

export type NotificationKind =
  | "clarification_gate"
  | "approval_gate"
  | "escalation"
  | "sla_at_risk"
  | "sla_breach"
  | "incident_opened"
  | "run_failed"
  | "tool_disconnected"
  | "digest"
  | "comment"
  | "delivered";

export type NotificationChannel = "in_app" | "email" | "slack" | "push";

export type NotificationSeverity = "info" | "warning" | "critical";

export interface AppNotification {
  id: string; //                    "ntf-1"
  recipientId: string; //           human id from humans.ts
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string; //                 "Clarification needed · AM-142"
  body: string; //                  one-line preview
  ts: number; //                    epoch ms
  read: boolean; //                 seed state; the localStorage overlay adds to it
  actorId?: string | null; //       agent/human that triggered it; null = "when-only"
  ticketId?: string;
  entityId?: string; //             gate/incident id ("appr-AM-142")
  deepLink: string; //              "/approvals/appr-AM-142"
  channels: NotificationChannel[]; // where it was delivered
  actionable?: boolean; //          renders an inline action button
  actionLabel?: string; //          "Approve" | "Answer" | "Re-auth"
  slaState?: "on_track" | "at_risk" | "overdue";
}

/** Per-user, per-event delivery matrix (the /notifications Preferences tab). */
export interface NotificationPref {
  recipientId: string;
  kind: NotificationKind;
  channels: Record<NotificationChannel, boolean>;
}

/** Channel availability honesty: In-app + Slack Live; Email + Push Roadmap. */
export const CHANNEL_AVAILABILITY: Record<NotificationChannel, "live" | "roadmap"> = {
  in_app: "live",
  slack: "live",
  email: "roadmap",
  push: "roadmap",
};

export const KIND_LABELS: Record<NotificationKind, string> = {
  clarification_gate: "Clarification gate",
  approval_gate: "Approval gate",
  escalation: "Escalation",
  sla_at_risk: "SLA at risk",
  sla_breach: "SLA breach",
  incident_opened: "Incident opened",
  run_failed: "Run failed",
  tool_disconnected: "Tool disconnected",
  digest: "Digest",
  comment: "Comment",
  delivered: "Delivered",
};

/** The demo operator — bell counts default to this user. */
export const CURRENT_USER_ID = "zlatko";

const now = Date.now();
const min = 60_000;
const hr = 60 * min;

export const notifications: AppNotification[] = [
  {
    id: "ntf-1",
    recipientId: "zlatko",
    kind: "clarification_gate",
    severity: "warning",
    title: "Clarification needed · AM-142",
    body: "BA Agent asks: saved filter chips — per account or per device?",
    ts: now - 9 * min,
    read: false,
    actorId: "ba",
    ticketId: "AM-142",
    entityId: "clar-AM-142",
    deepLink: "/approvals/clar-AM-142",
    channels: ["in_app", "slack"],
    actionable: true,
    actionLabel: "Answer",
    slaState: "on_track",
  },
  {
    id: "ntf-2",
    recipientId: "zlatko",
    kind: "approval_gate",
    severity: "warning",
    title: "Spec approval waiting · AM-142",
    body: "spec.md v3 ready — 8/8 structural checks pass. Awaiting your sign-off.",
    ts: now - 12 * min,
    read: false,
    actorId: "ba",
    ticketId: "AM-142",
    entityId: "appr-AM-142",
    deepLink: "/approvals/appr-AM-142",
    channels: ["in_app", "slack"],
    actionable: true,
    actionLabel: "Review",
    slaState: "on_track",
  },
  {
    id: "ntf-3",
    recipientId: "zlatko",
    kind: "incident_opened",
    severity: "critical",
    title: "Incident · QA Agent down",
    body: "Liveness lost 6m — suggested action: Restart agent.",
    ts: now - 6 * min,
    read: false,
    actorId: null,
    entityId: "inc-1",
    deepLink: "/incidents",
    channels: ["in_app", "slack"],
    actionable: true,
    actionLabel: "Recover",
  },
  {
    id: "ntf-4",
    recipientId: "zlatko",
    kind: "tool_disconnected",
    severity: "critical",
    title: "GitHub token expired",
    body: "Dev runs blocked until re-authentication. OAuth health check failing 47m.",
    ts: now - 47 * min,
    read: false,
    actorId: null,
    entityId: "inc-4",
    deepLink: "/incidents",
    channels: ["in_app", "slack"],
    actionable: true,
    actionLabel: "Re-auth",
  },
  {
    id: "ntf-5",
    recipientId: "marin",
    kind: "escalation",
    severity: "critical",
    title: "Escalation · design gate stale 26h",
    body: "AM-138 design.md v2 over SLA — 2 downstream tickets blocked.",
    ts: now - 26 * hr,
    read: false,
    actorId: "sa",
    ticketId: "AM-138",
    entityId: "esc1",
    deepLink: "/comms",
    channels: ["in_app", "slack"],
    slaState: "overdue",
  },
  {
    id: "ntf-6",
    recipientId: "zlatko",
    kind: "sla_breach",
    severity: "critical",
    title: "SLA breach · Design review clearance",
    body: "AM-138 cleared the 8h design-review target 18h ago and still waits.",
    ts: now - 2 * hr,
    read: false,
    actorId: null,
    ticketId: "AM-138",
    entityId: "sla-design-clearance",
    deepLink: "/reports",
    channels: ["in_app", "slack"],
    slaState: "overdue",
  },
  {
    id: "ntf-7",
    recipientId: "zlatko",
    kind: "run_failed",
    severity: "warning",
    title: "Run failed · AM-131 build",
    body: "Dev build failed (TS2345). Auto-retry 1/3 also failed.",
    ts: now - 22 * min,
    read: false,
    actorId: "dev",
    ticketId: "AM-131",
    entityId: "inc-2",
    deepLink: "/incidents",
    channels: ["in_app", "slack"],
    actionable: true,
    actionLabel: "Retry",
  },
  {
    id: "ntf-8",
    recipientId: "petra",
    kind: "approval_gate",
    severity: "warning",
    title: "QA approval waiting · AM-144",
    body: "qa.report ready on Seller KYC verification — 18m in queue.",
    ts: now - 18 * min,
    read: false,
    actorId: "qa",
    ticketId: "AM-144",
    entityId: "appr-AM-144",
    deepLink: "/approvals/appr-AM-144",
    channels: ["in_app", "slack"],
    actionable: true,
    actionLabel: "Review",
    slaState: "on_track",
  },
  {
    id: "ntf-9",
    recipientId: "zlatko",
    kind: "sla_at_risk",
    severity: "warning",
    title: "SLA at risk · gate clearance",
    body: "AM-149 dev review at 70m of the 4h clearance target and aging.",
    ts: now - 70 * min,
    read: true,
    actorId: null,
    ticketId: "AM-149",
    entityId: "sla-gate-clearance",
    deepLink: "/reports",
    channels: ["in_app"],
    slaState: "at_risk",
  },
  {
    id: "ntf-10",
    recipientId: "zlatko",
    kind: "digest",
    severity: "info",
    title: "Daily digest · 09:00 UTC",
    body: "4 shipped · 3 at gates · 1 escalation · overnight loops all green.",
    ts: now - 42 * min,
    read: true,
    actorId: "pm",
    deepLink: "/comms",
    channels: ["in_app", "slack"],
  },
  {
    id: "ntf-11",
    recipientId: "zlatko",
    kind: "delivered",
    severity: "info",
    title: "Delivered · AM-136 listing detail page",
    body: "Shipped to production after QA sign-off. Cycle time 4.1 days.",
    ts: now - 6 * hr,
    read: true,
    actorId: "qa",
    ticketId: "AM-136",
    deepLink: "/pipeline",
    channels: ["in_app"],
  },
  {
    id: "ntf-12",
    recipientId: "ana",
    kind: "approval_gate",
    severity: "warning",
    title: "Spec approval waiting · AM-128",
    body: "Search autocomplete spec v2 — 110m in queue, nearing the 4h target.",
    ts: now - 110 * min,
    read: false,
    actorId: "ba",
    ticketId: "AM-128",
    entityId: "appr-AM-128",
    deepLink: "/approvals/appr-AM-128",
    channels: ["in_app", "slack"],
    actionable: true,
    actionLabel: "Review",
    slaState: "at_risk",
  },
  {
    id: "ntf-13",
    recipientId: "zlatko",
    kind: "comment",
    severity: "info",
    title: "Curator flagged a source conflict",
    body: "SOW v4 vs Slack decision on AM-149 escrow — synthesis picked the SOW.",
    ts: now - 95 * min,
    read: true,
    actorId: "curator",
    ticketId: "AM-149",
    deepLink: "/comms",
    channels: ["in_app"],
  },
  {
    id: "ntf-14",
    recipientId: "zlatko",
    kind: "sla_at_risk",
    severity: "warning",
    title: "Sync stale · Drive sources amber 12h",
    body: "Curator's Drive sync degraded — spec context may miss the latest SOW.",
    ts: now - 12 * hr,
    read: true,
    actorId: null,
    entityId: "inc-5",
    deepLink: "/incidents",
    channels: ["in_app"],
  },
];

/* ------------------------------------------------------------------ */
/* Preferences (defaults matrix)                                        */
/* ------------------------------------------------------------------ */

const ALL_KINDS: NotificationKind[] = [
  "clarification_gate",
  "approval_gate",
  "escalation",
  "sla_at_risk",
  "sla_breach",
  "incident_opened",
  "run_failed",
  "tool_disconnected",
  "digest",
  "comment",
  "delivered",
];

/** Gates/escalations/incidents: in-app + Slack ON. Email/Push OFF (Roadmap). */
export const notificationPrefs: NotificationPref[] = ALL_KINDS.map((kind) => {
  const urgent = [
    "clarification_gate",
    "approval_gate",
    "escalation",
    "sla_breach",
    "incident_opened",
    "run_failed",
    "tool_disconnected",
  ].includes(kind);
  return {
    recipientId: CURRENT_USER_ID,
    kind,
    channels: { in_app: true, slack: urgent, email: false, push: false },
  };
});

/* ------------------------------------------------------------------ */
/* Alert rules (Alert rules tab seeds)                                  */
/* ------------------------------------------------------------------ */

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: { kind: NotificationKind; comparator: ">" | ">="; thresholdMin?: number };
  channels: NotificationChannel[];
  routedTo: string[]; // human ids or channel labels
  scope?: "pod" | "agent";
}

export const alertRules: AlertRule[] = [
  {
    id: "rule-1",
    name: "Spec gate overdue",
    enabled: true,
    trigger: { kind: "approval_gate", comparator: ">", thresholdMin: 240 },
    channels: ["slack", "in_app"],
    routedTo: ["#automarket-leads", "ana"],
    scope: "pod",
  },
  {
    id: "rule-2",
    name: "Critical SLA breach",
    enabled: true,
    trigger: { kind: "sla_breach", comparator: ">=" },
    channels: ["slack", "in_app"],
    routedTo: ["zlatko"],
    scope: "pod",
  },
  {
    id: "rule-3",
    name: "Incident opened → PM",
    enabled: true,
    trigger: { kind: "incident_opened", comparator: ">=" },
    channels: ["in_app", "slack"],
    routedTo: ["zlatko"],
    scope: "pod",
  },
];

/** For the ⌘K "Recent" group. */
export const recentEntities: string[] = ["AM-142", "appr-AM-142", "inc-1", "ana", "automarket"];

/* ------------------------------------------------------------------ */
/* Read-state overlay — localStorage "aiops_notif_read" (SSR-safe)      */
/* ------------------------------------------------------------------ */

export const NOTIF_READ_STORAGE_KEY = "aiops_notif_read";

/** Ids marked read this browser. Empty set on the server. */
export function readOverlay(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(NOTIF_READ_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function persistRead(ids: string[]): Set<string> {
  const next = readOverlay();
  for (const id of ids) next.add(id);
  try {
    window.localStorage.setItem(NOTIF_READ_STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    /* storage unavailable — non-fatal in mock mode */
  }
  return next;
}

export function isRead(n: AppNotification, overlay?: Set<string>): boolean {
  return n.read || (overlay ?? readOverlay()).has(n.id);
}

/* ------------------------------------------------------------------ */
/* Selectors                                                            */
/* ------------------------------------------------------------------ */

export function notificationsFor(humanId: string = CURRENT_USER_ID): AppNotification[] {
  return notifications
    .filter((n) => n.recipientId === humanId)
    .sort((a, b) => b.ts - a.ts);
}

export function unreadFor(
  humanId: string = CURRENT_USER_ID,
  overlay?: Set<string>,
): number {
  const o = overlay ?? new Set<string>(); // render-safe default: seed state only
  return notifications.filter((n) => n.recipientId === humanId && !isRead(n, o)).length;
}

export function gatesFor(humanId: string = CURRENT_USER_ID): AppNotification[] {
  return notifications.filter(
    (n) =>
      n.recipientId === humanId &&
      (n.kind === "clarification_gate" || n.kind === "approval_gate") &&
      !n.read,
  );
}

let ntfSeq = notifications.length;

/** Mock mutation seam — intake pulls / demo events append through this. */
export function pushNotification(
  n: Omit<AppNotification, "id" | "ts" | "read"> & { ts?: number },
): AppNotification {
  const entry: AppNotification = { ...n, id: `ntf-${++ntfSeq}`, ts: n.ts ?? Date.now(), read: false };
  notifications.unshift(entry);
  return entry;
}
