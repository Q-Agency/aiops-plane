/**
 * Weekly client report (C8, /reports "Client report" tab) - the
 * sponsor-facing weekly status. CLIENT-CLEAN style (no neon/scanlines),
 * plain language. Headline numbers mirror economics.ts aggregates so
 * figures reconcile across MONITOR; humanHoursSaved DISPLAYS as
 * "human-hours freed" - never "saved/displaced" in sponsor copy.
 */

import type { Stage } from "./types";
import { aggregates } from "./economics";
import { budget } from "./billing";
import { slaSummary } from "./sla";

export interface ReportItem {
  workItemId: string;
  title: string;
  stage: Stage;
  deliveredAt: number; // epoch ms
  storyPoints: number;
}

export interface ReportGate {
  workItemId: string;
  title: string;
  kind: "approval" | "clarification";
  decision: "approved" | "rejected";
  /** Display name of the human who cleared it. */
  clearedBy: string;
  clearedAt: number; // epoch ms
  turnaroundHr: number;
}

export interface WeeklyReport {
  id: string;
  podId: string;
  podName: string;
  periodStart: number;
  periodEnd: number;
  status: "draft" | "sent";
  sentAt?: number;
  headline: {
    itemsDelivered: number;
    gatesCleared: number;
    avgCycleTimeHr: number;
    spendUsd: number;
    /** Renders as "human-hours freed". */
    humanHoursSaved: number;
  };
  delivered: ReportItem[];
  gatesCleared: ReportGate[];
  slaSummary: { onTrack: number; atRisk: number; breached: number; notable: string[] };
  upcoming: string[];
  costNote: string;
  narrative: string;
}

const now = Date.now();
const hr = 3_600_000;
const day = 24 * hr;

const sla = slaSummary();

export const reports: WeeklyReport[] = [
  // current week - draft
  {
    id: "rep-2026-w24",
    podId: "automarket",
    podName: "AutoMarket Web Pod",
    periodStart: now - 3 * day,
    periodEnd: now + 4 * day,
    status: "draft",
    headline: {
      itemsDelivered: aggregates.mergedCount,
      gatesCleared: 14,
      avgCycleTimeHr: 78,
      spendUsd: aggregates.totalCost,
      humanHoursSaved: aggregates.humanHoursDisplaced,
    },
    delivered: [
      { workItemId: "AM-136", title: "Listing detail page", stage: "done", deliveredAt: now - 6 * hr, storyPoints: 5 },
      { workItemId: "AM-133", title: "Payment intent callback", stage: "dev-review", deliveredAt: now - day, storyPoints: 4 },
      { workItemId: "AM-131", title: "Listing image upload", stage: "ready-qa", deliveredAt: now - 2 * day, storyPoints: 3 },
    ],
    gatesCleared: [
      { workItemId: "AM-136", title: "Listing detail page", kind: "approval", decision: "approved", clearedBy: "Iva", clearedAt: now - 7 * hr, turnaroundHr: 1.2 },
      { workItemId: "AM-128", title: "Search autocomplete", kind: "approval", decision: "approved", clearedBy: "Ana", clearedAt: now - day, turnaroundHr: 2.4 },
      { workItemId: "AM-140", title: "Fraud signals service", kind: "approval", decision: "rejected", clearedBy: "Zlatko", clearedAt: now - 2 * day, turnaroundHr: 3.1 },
      { workItemId: "AM-149", title: "Offer / escrow flow", kind: "clarification", decision: "approved", clearedBy: "Zlatko", clearedAt: now - 2 * day, turnaroundHr: 1.6 },
    ],
    slaSummary: {
      onTrack: sla.onTrack,
      atRisk: sla.atRisk,
      breached: sla.breached,
      notable: [
        "Design review clearance breached on AM-138 (26h vs 8h target) - reassignment in progress.",
      ],
    },
    upcoming: [
      "AM-142 Vehicle search with filters - spec approved, design starts Monday.",
      "AM-150 VIN decoder service - dev in progress, QA expected midweek.",
      "AM-139 Image moderation pipeline - spec drafting begins.",
    ],
    costNote: `Spend this period $${aggregates.totalCost.toFixed(0)} vs a $${budget.monthlyCapUsd.toLocaleString()} monthly cap - projected $${budget.projectedMonthlyUsd.toLocaleString()} by month end (${budget.capStatus === "on_track" ? "on track" : budget.capStatus === "watch" ? "watch" : "over cap"}).`,
    narrative:
      "A steady week: three items shipped or cleared their final gates, and every delivery passed a named human sign-off. One design review ran past its target - we flagged it the hour it breached and are reassigning the reviewer. Costs remain well inside the monthly cap.",
  },
  // prior week - sent
  {
    id: "rep-2026-w23",
    podId: "automarket",
    podName: "AutoMarket Web Pod",
    periodStart: now - 10 * day,
    periodEnd: now - 3 * day,
    status: "sent",
    sentAt: now - 3 * day + 2 * hr,
    headline: {
      itemsDelivered: 4,
      gatesCleared: 17,
      avgCycleTimeHr: 82,
      spendUsd: 412.5,
      humanHoursSaved: 196.4,
    },
    delivered: [
      { workItemId: "AM-117", title: "Image CDN cache headers", stage: "done", deliveredAt: now - 8 * day, storyPoints: 2 },
      { workItemId: "AM-126", title: "Listing share links", stage: "done", deliveredAt: now - 7 * day, storyPoints: 3 },
      { workItemId: "AM-124", title: "Seller profile badges", stage: "done", deliveredAt: now - 6 * day, storyPoints: 3 },
      { workItemId: "AM-122", title: "Search result sorting", stage: "done", deliveredAt: now - 4 * day, storyPoints: 5 },
    ],
    gatesCleared: [
      { workItemId: "AM-122", title: "Search result sorting", kind: "approval", decision: "approved", clearedBy: "Ana", clearedAt: now - 4 * day, turnaroundHr: 0.9 },
      { workItemId: "AM-124", title: "Seller profile badges", kind: "approval", decision: "approved", clearedBy: "Iva", clearedAt: now - 6 * day, turnaroundHr: 1.8 },
      { workItemId: "AM-126", title: "Listing share links", kind: "approval", decision: "approved", clearedBy: "Marin", clearedAt: now - 7 * day, turnaroundHr: 2.2 },
    ],
    slaSummary: {
      onTrack: 5,
      atRisk: 1,
      breached: 0,
      notable: [],
    },
    upcoming: [
      "AM-142 Vehicle search with filters enters spec.",
      "AM-138 Buyer-seller messaging design review due.",
    ],
    costNote: "Spend this period $413 vs a $4,000 monthly cap - comfortably on track.",
    narrative:
      "Four items shipped, all gates cleared inside target, zero SLA breaches. The pod's cost per shipped ticket continued to fall as more steps run on local compute.",
  },
];

/** The report being edited/shown by default (current week's draft). */
export function currentReport(): WeeklyReport {
  return reports.find((r) => r.status === "draft") ?? reports[0];
}

export function reportById(id: string): WeeklyReport | undefined {
  return reports.find((r) => r.id === id);
}

/** Mock share link for "Copy share link" (toast-only, C8). */
export const REPORT_SHARE_URL = "https://podops.q.agency/r/automarket-w24-9f3k2";
