/**
 * Outbound feed (vision §2 "Slack-first communication") — agents reach out
 * PROACTIVELY through the tools humans already use to talk with each other.
 * Slack is the first-class channel (email too; Teams next): daily digests,
 * daily preparations, weekly reports and escalations are PUSHED on the pod's
 * schedule. The dashboard is optional depth — one deep link from the message
 * to the exact decision, never a required habit.
 *
 * Numbers reconcile with the existing mocks: today's digest mirrors
 * report.ts rep-2026-w24 (3 delivered · AM-128 spec waiting on Ana · spend
 * on track vs the cap); the Friday weekly mirrors rep-2026-w23 (sent: 4
 * shipped · 17 gates · $412.50 · zero breaches); escalations mirror
 * comms.ts esc1/esc4; the clarification echo mirrors the Demo Director's
 * AM-142 question. AUDIT: nothing here writes — if a builder ever logs the
 * weekly send it maps to the EXISTING `report.sent` verb (the echo maps to
 * `clarification.answered`); no new vocabulary.
 */

import { sponsorMember } from "./roles";

export type OutboundKind =
  | "daily_digest"
  | "daily_preparation"
  | "weekly_report"
  | "escalation"
  | "clarification_echo";

export interface OutboundItem {
  id: string;
  kind: OutboundKind;
  /** "08:00" or a weekday label. */
  at: string;
  channels: ("slack" | "email")[];
  /** "#automarket-pod" or "sponsor@…". */
  target: string;
  summaryMd: string;
  /** "every morning" | "Fridays" | "as it happens" */
  cadence: string;
  /**
   * Optional dashboard deep link — the "optional depth" behind the push.
   * Escalations point at the surface the seed references; the weekly report
   * points at /reports (canonical surface). Read-only: following it writes
   * nothing.
   */
  deepLink?: { to: "/incidents" | "/approvals" | "/reports"; label: string };
}

/** Display names so every surface labels the kinds identically. */
export const OUTBOUND_KIND_LABEL: Record<OutboundKind, string> = {
  daily_digest: "Daily digest",
  daily_preparation: "Daily preparation",
  weekly_report: "Weekly report",
  escalation: "Escalation",
  clarification_echo: "Clarification echo",
};

/** Today-first timeline; builders re-sort as their surface needs. */
export const OUTBOUND_FEED: OutboundItem[] = [
  {
    id: "ob-prep-today",
    kind: "daily_preparation",
    at: "07:45",
    channels: ["slack"],
    target: "#automarket-pod",
    summaryMd:
      "**Today's preparation** — AM-150 (VIN decoder) dev in flight · design gate on AM-138 due 14:00 · AM-139 spec drafting begins after standup.",
    cadence: "every morning",
  },
  {
    id: "ob-digest-today",
    kind: "daily_digest",
    at: "08:00",
    channels: ["slack"],
    target: "#automarket-pod",
    summaryMd:
      "**Daily digest** — 3 shipped (AM-136 · AM-133 · AM-131) · 1 gate waiting on Ana (AM-128 spec review) · spend on track vs the monthly cap.",
    cadence: "every morning",
  },
  {
    id: "ob-echo-am142",
    kind: "clarification_echo",
    at: "09:12",
    channels: ["slack"],
    target: "AM-142 ticket thread (Teamwork)",
    summaryMd:
      "**Answered in Slack, echoed to the ticket** — BA asked \"saved filter chips: per account or per device?\" · Zlatko: per account. Write-back tagged [AgencyOS] so our listener ignores its own move.",
    cadence: "as it happens",
  },
  {
    id: "ob-esc-qa",
    kind: "escalation",
    at: "09:55",
    channels: ["slack"],
    target: "Petra (DM)",
    summaryMd:
      "**Escalation** — QA escape-rate spiked on AM-131 (selector drift recurring) · Healer repaired 1 of 2 → routed to Petra with a one-click triage link.",
    cadence: "as it happens",
    deepLink: { to: "/incidents", label: "open the incident →" },
  },
  {
    id: "ob-esc-design",
    kind: "escalation",
    at: "Yesterday 11:20",
    channels: ["slack"],
    target: "Marin (DM) · #automarket-pod",
    summaryMd:
      "**Escalation** — design gate on AM-138 stale 26h, over SLA · 2 downstream tickets blocked → escalated to Marin with the review deep link.",
    cadence: "as it happens",
    deepLink: { to: "/approvals", label: "open the gate →" },
  },
  {
    id: "ob-weekly-fri",
    kind: "weekly_report",
    at: "Friday 16:00",
    channels: ["slack", "email"],
    target: `#automarket-leads · ${sponsorMember.name} (sponsor)`,
    summaryMd:
      "**Weekly delivery report** — 4 shipped · 17 gates cleared inside target · $412.50 spend · zero SLA breaches. Full client report linked.",
    cadence: "Fridays",
    deepLink: { to: "/reports", label: "view the report →" },
  },
];

/**
 * Honesty line for the surface header (Live/Roadmap-true): Slack and email
 * sends ship today; the Teams channel is roadmap. The richer email connector
 * (replies, recipient lists) stays request-access in connectors.ts.
 */
export const OUTBOUND_HONESTY = "Slack first-class · email live · Teams next";
