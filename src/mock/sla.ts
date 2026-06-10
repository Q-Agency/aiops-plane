/**
 * SLA (C8, /reports "SLA" tab) — the single SLA shape: per-stage/pod
 * service-level definitions with target-vs-actual and breach history.
 *
 * The Exec Digest's lighter SlaTarget { id; label; targetMin; actualMin;
 * breached } is DERIVED here via slaTargets() — no separate file/shape.
 */

import type { Stage } from "./types";

export type SlaMetric = "response_time" | "gate_clearance" | "delivery_cadence" | "rework_rate";

export type SlaStatus = "on_track" | "at_risk" | "breached";

export interface SlaDefinition {
  id: string; //                 "sla-gate-clearance"
  podId: string; //              "automarket"
  metric: SlaMetric;
  label: string; //              "Gate clearance (all gates)"
  scope: "pod" | Stage;
  targetValue: number;
  unit: "min" | "hr" | "per_week" | "pct";
  comparator: "lte" | "gte";
  actualValue: number;
  status: SlaStatus;
  breachCount30d: number;
  /** Last 7 buckets — drives the inline sparkline. */
  trend: number[];
  lastBreachAt?: number; // epoch ms
}

export interface SlaBreach {
  id: string;
  slaId: string;
  occurredAt: number; // epoch ms
  actualValue: number;
  targetValue: number;
  stage: Stage;
  workItemId?: string;
  workItemTitle?: string;
  durationOverMin: number;
  note?: string;
}

const now = Date.now();
const hr = 3_600_000;
const day = 24 * hr;

export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  on_track: "On track",
  at_risk: "At risk",
  breached: "Breached",
};

export const slaDefinitions: SlaDefinition[] = [
  {
    id: "sla-ba-response",
    podId: "automarket",
    metric: "response_time",
    label: "BA spec response",
    scope: "ready-spec",
    targetValue: 30,
    unit: "min",
    comparator: "lte",
    actualValue: 14,
    status: "on_track",
    breachCount30d: 0,
    trend: [18, 16, 12, 15, 14, 13, 14],
  },
  {
    id: "sla-clarification-response",
    podId: "automarket",
    metric: "response_time",
    label: "Clarification response",
    scope: "pod",
    targetValue: 120,
    unit: "min",
    comparator: "lte",
    actualValue: 95,
    status: "at_risk",
    breachCount30d: 1,
    trend: [60, 72, 80, 88, 105, 98, 95],
    lastBreachAt: now - 6 * day,
  },
  {
    id: "sla-gate-clearance",
    podId: "automarket",
    metric: "gate_clearance",
    label: "Gate clearance (all gates)",
    scope: "pod",
    targetValue: 4,
    unit: "hr",
    comparator: "lte",
    actualValue: 3.1,
    status: "at_risk",
    breachCount30d: 3,
    trend: [2.4, 2.8, 3.6, 4.4, 3.2, 2.9, 3.1],
    lastBreachAt: now - 2 * day,
  },
  {
    id: "sla-design-clearance",
    podId: "automarket",
    metric: "gate_clearance",
    label: "Design review clearance",
    scope: "design-review",
    targetValue: 8,
    unit: "hr",
    comparator: "lte",
    actualValue: 26,
    status: "breached",
    breachCount30d: 4,
    trend: [6, 7, 9, 12, 18, 22, 26],
    lastBreachAt: now - 2 * hr,
  },
  {
    id: "sla-delivery-cadence",
    podId: "automarket",
    metric: "delivery_cadence",
    label: "Weekly delivery cadence",
    scope: "pod",
    targetValue: 3,
    unit: "per_week",
    comparator: "gte",
    actualValue: 4,
    status: "on_track",
    breachCount30d: 0,
    trend: [3, 4, 3, 5, 4, 4, 4],
  },
  {
    id: "sla-rework-rate",
    podId: "automarket",
    metric: "rework_rate",
    label: "Rework rate",
    scope: "pod",
    targetValue: 15,
    unit: "pct",
    comparator: "lte",
    actualValue: 12,
    status: "on_track",
    breachCount30d: 1,
    trend: [16, 14, 13, 12, 11, 13, 12],
    lastBreachAt: now - 19 * day,
  },
];

export const slaBreaches: SlaBreach[] = [
  {
    id: "br-1",
    slaId: "sla-design-clearance",
    occurredAt: now - 2 * hr,
    actualValue: 26,
    targetValue: 8,
    stage: "design-review",
    workItemId: "AM-138",
    workItemTitle: "Buyer–seller messaging",
    durationOverMin: 18 * 60,
    note: "Marin unavailable Tue–Wed · escalation esc1 open",
  },
  {
    id: "br-2",
    slaId: "sla-design-clearance",
    occurredAt: now - 4 * day,
    actualValue: 11,
    targetValue: 8,
    stage: "design-review",
    workItemId: "AM-140",
    workItemTitle: "Fraud signals service",
    durationOverMin: 3 * 60,
    note: "Cleared after reminder DM",
  },
  {
    id: "br-3",
    slaId: "sla-design-clearance",
    occurredAt: now - 9 * day,
    actualValue: 14,
    targetValue: 8,
    stage: "design-review",
    workItemId: "AM-141",
    workItemTitle: "Price suggestion model",
    durationOverMin: 6 * 60,
  },
  {
    id: "br-4",
    slaId: "sla-design-clearance",
    occurredAt: now - 16 * day,
    actualValue: 10,
    targetValue: 8,
    stage: "design-review",
    workItemId: "AM-138",
    workItemTitle: "Buyer–seller messaging",
    durationOverMin: 2 * 60,
    note: "First design pass — returned with feedback",
  },
  {
    id: "br-5",
    slaId: "sla-gate-clearance",
    occurredAt: now - 2 * day,
    actualValue: 6.5,
    targetValue: 4,
    stage: "dev-review",
    workItemId: "AM-149",
    workItemTitle: "Offer / escrow flow",
    durationOverMin: 150,
    note: "Blocked on sql-injection triage (esc2)",
  },
  {
    id: "br-6",
    slaId: "sla-gate-clearance",
    occurredAt: now - 7 * day,
    actualValue: 5.2,
    targetValue: 4,
    stage: "qa-review",
    workItemId: "AM-144",
    workItemTitle: "Seller KYC verification",
    durationOverMin: 72,
  },
  {
    id: "br-7",
    slaId: "sla-gate-clearance",
    occurredAt: now - 12 * day,
    actualValue: 4.8,
    targetValue: 4,
    stage: "dev-review",
    workItemId: "AM-133",
    workItemTitle: "Payment intent callback",
    durationOverMin: 48,
  },
  {
    id: "br-8",
    slaId: "sla-clarification-response",
    occurredAt: now - 6 * day,
    actualValue: 165,
    targetValue: 120,
    stage: "ready-spec",
    workItemId: "AM-149",
    workItemTitle: "Offer / escrow flow",
    durationOverMin: 45,
    note: "Source-conflict question waited on Zlatko",
  },
];

/* ------------------------------------------------------------------ */
/* Selectors                                                            */
/* ------------------------------------------------------------------ */

export function breachesFor(slaId: string): SlaBreach[] {
  return slaBreaches
    .filter((b) => b.slaId === slaId)
    .sort((a, b) => b.occurredAt - a.occurredAt);
}

export function slaSummary(): { onTrack: number; atRisk: number; breached: number } {
  return {
    onTrack: slaDefinitions.filter((s) => s.status === "on_track").length,
    atRisk: slaDefinitions.filter((s) => s.status === "at_risk").length,
    breached: slaDefinitions.filter((s) => s.status === "breached").length,
  };
}

/** Lighter shape for the Exec Digest's target-vs-actual bars — DERIVED. */
export interface SlaTarget {
  id: string;
  label: string;
  targetMin: number;
  actualMin: number;
  breached: boolean;
}

export function slaTargets(): SlaTarget[] {
  return slaDefinitions
    .filter((s) => s.unit === "min" || s.unit === "hr")
    .map((s) => ({
      id: s.id,
      label: s.label,
      targetMin: s.unit === "hr" ? s.targetValue * 60 : s.targetValue,
      actualMin: s.unit === "hr" ? Math.round(s.actualValue * 60) : s.actualValue,
      breached: s.status === "breached",
    }));
}

/** "≤ 4h" / "≥ 3/week" / "≤ 15%" target rendering helper. */
export function slaTargetLabel(s: SlaDefinition): string {
  const cmp = s.comparator === "lte" ? "≤" : "≥";
  switch (s.unit) {
    case "min":
      return `${cmp} ${s.targetValue}m`;
    case "hr":
      return `${cmp} ${s.targetValue}h`;
    case "per_week":
      return `${cmp} ${s.targetValue}/week`;
    case "pct":
      return `${cmp} ${s.targetValue}%`;
  }
}
