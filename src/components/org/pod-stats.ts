/**
 * Per-pod portfolio stats for /org (wave 2, P1-C2).
 *
 * Demo-binding rule: each pod keeps its own dataset. The sample pod renders
 * the canonical mock numbers (economics aggregates, billing budget, live
 * open-gate / open-incident counts); every other launched pod derives a
 * smaller variation DETERMINISTICALLY from a hash of its pod id - stable
 * across renders and sessions, no second dataset invented.
 */

import type { LaunchedPod } from "@/lib/pods/pod-store";
import { openGateCount } from "@/mock/approvals";
import { budget } from "@/mock/billing";
import { aggregates, PRICE_PAID_USD } from "@/mock/economics";
import { openIncidents } from "@/mock/incidents";

export interface PodStats {
  podId: string;
  /** Canonical trio inputs (this period). */
  hoursFreed: number;
  computeCostUsd: number;
  planFeeUsd: number;
  mergedCount: number;
  storyPoints: number;
  costPerMergedUsd: number;
  costPerStoryPointUsd: number;
  /** RUN counters. */
  openGates: number;
  openIncidents: number;
  /** Budget posture. */
  mtdSpendUsd: number;
  capUsd: number;
}

/* ------------------------------------------------------------------ */
/* Deterministic variation from the pod id                              */
/* ------------------------------------------------------------------ */

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable 0..1 per (pod id, salt) - same id always yields the same numbers. */
function unit(id: string, salt: number): number {
  const x = Math.sin((hash32(id) % 100_000) + salt * 977.13) * 10_000;
  return x - Math.floor(x);
}

/* ------------------------------------------------------------------ */
/* Per-pod stats                                                        */
/* ------------------------------------------------------------------ */

export function podStats(pod: LaunchedPod): PodStats {
  if (pod.sample) {
    const storyPoints =
      aggregates.costPerStoryPoint > 0
        ? Math.round(aggregates.totalCost / aggregates.costPerStoryPoint)
        : 0;
    return {
      podId: pod.id,
      hoursFreed: aggregates.humanHoursDisplaced,
      computeCostUsd: aggregates.totalCost,
      planFeeUsd: PRICE_PAID_USD,
      mergedCount: aggregates.mergedCount,
      storyPoints,
      costPerMergedUsd: aggregates.costPerMerged,
      costPerStoryPointUsd: aggregates.costPerStoryPoint,
      openGates: openGateCount(),
      openIncidents: openIncidents().length,
      mtdSpendUsd: budget.mtdSpendUsd,
      capUsd: budget.monthlyCapUsd,
    };
  }

  // A pod still setting up has no delivery economics yet - honest zeros.
  if (pod.status === "setup") {
    return {
      podId: pod.id,
      hoursFreed: 0,
      computeCostUsd: 0,
      planFeeUsd: PRICE_PAID_USD,
      mergedCount: 0,
      storyPoints: 0,
      costPerMergedUsd: 0,
      costPerStoryPointUsd: 0,
      openGates: 0,
      openIncidents: 0,
      mtdSpendUsd: 0,
      capUsd: budget.monthlyCapUsd,
    };
  }

  // Live/paused non-sample pods: 25-70% of the sample pod's scale, jittered
  // per metric so two pods never share a number.
  const scale = 0.25 + unit(pod.id, 1) * 0.45;
  const mergedCount = Math.max(1, Math.round(aggregates.mergedCount * scale));
  const storyPoints = Math.max(
    mergedCount * 2,
    Math.round((aggregates.totalCost / Math.max(aggregates.costPerStoryPoint, 1)) * scale),
  );
  const computeCostUsd = +(aggregates.totalCost * scale * (0.85 + unit(pod.id, 2) * 0.3)).toFixed(2);
  const hoursFreed = +(aggregates.humanHoursDisplaced * scale * (0.8 + unit(pod.id, 3) * 0.4)).toFixed(1);
  const capUsd = budget.monthlyCapUsd;
  // ~1 in 5 pods carries the over-cap row state (deterministic per id).
  const overCap = unit(pod.id, 9) > 0.82;
  const mtdSpendUsd = +(
    capUsd * (overCap ? 1.02 + unit(pod.id, 4) * 0.1 : 0.35 + unit(pod.id, 4) * 0.45)
  ).toFixed(2);

  return {
    podId: pod.id,
    hoursFreed,
    computeCostUsd,
    planFeeUsd: PRICE_PAID_USD,
    mergedCount,
    storyPoints,
    costPerMergedUsd: +(computeCostUsd / mergedCount).toFixed(2),
    costPerStoryPointUsd: +(computeCostUsd / Math.max(1, storyPoints)).toFixed(2),
    openGates: Math.floor(unit(pod.id, 5) * 4),
    openIncidents: unit(pod.id, 6) > 0.75 ? 1 : 0,
    mtdSpendUsd,
    capUsd,
  };
}

/* ------------------------------------------------------------------ */
/* Org rollup (the KPI band) - canonical trio summed across pods        */
/* ------------------------------------------------------------------ */

export type OrgPeriodId = "current" | "last" | "qtd";

export const ORG_PERIODS: {
  id: OrgPeriodId;
  label: string;
  /** Scales delivery activity (hours, cost, merged, points). */
  activityFactor: number;
  /** Plan-fee months inside the period (fees scale by time, not activity). */
  feeMonths: number;
}[] = [
  { id: "current", label: "This period", activityFactor: 1, feeMonths: 1 },
  { id: "last", label: "Last period", activityFactor: 0.78, feeMonths: 1 },
  { id: "qtd", label: "Quarter to date", activityFactor: 2.6, feeMonths: 3 },
];

export interface OrgTotals {
  podCount: number;
  hoursFreed: number;
  /** hoursFreed × blended rate. */
  valueUsd: number;
  /** Compute + plan fees across pods (the net-of-plan-fees denominator). */
  allInCostUsd: number;
  roiMultiple: number;
  mergedCount: number;
  storyPoints: number;
  costPerMergedUsd: number;
  costPerStoryPointUsd: number;
}

export function orgTotals(
  stats: PodStats[],
  rateUsdPerHr: number,
  period: OrgPeriodId = "current",
): OrgTotals {
  const p = ORG_PERIODS.find((x) => x.id === period) ?? ORG_PERIODS[0];
  const hoursFreed = Math.round(stats.reduce((a, s) => a + s.hoursFreed, 0) * p.activityFactor);
  const computeUsd = stats.reduce((a, s) => a + s.computeCostUsd, 0) * p.activityFactor;
  const feesUsd = stats.reduce((a, s) => a + s.planFeeUsd, 0) * p.feeMonths;
  const mergedCount = Math.round(stats.reduce((a, s) => a + s.mergedCount, 0) * p.activityFactor);
  const storyPoints = Math.round(stats.reduce((a, s) => a + s.storyPoints, 0) * p.activityFactor);
  const valueUsd = Math.round(hoursFreed * rateUsdPerHr);
  const allInCostUsd = Math.round(computeUsd + feesUsd);
  return {
    podCount: stats.length,
    hoursFreed,
    valueUsd,
    allInCostUsd,
    roiMultiple: +(valueUsd / Math.max(1, allInCostUsd)).toFixed(1),
    mergedCount,
    storyPoints,
    costPerMergedUsd: mergedCount ? +(computeUsd / mergedCount).toFixed(2) : 0,
    costPerStoryPointUsd: storyPoints ? +(computeUsd / storyPoints).toFixed(2) : 0,
  };
}
