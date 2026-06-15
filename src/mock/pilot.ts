/**
 * Pilot Scorecard (/pilot, wave 2, P1-C3) - targets-vs-actuals against the
 * criteria set in LAUNCH → Go live → Targets & budget, a week 1-6 strip,
 * the human baseline ("your numbers, not ours"), and the conversion sheet.
 *
 * Honesty rules: early weeks carry real misses (same rule as the sponsor
 * report); fee figures are labeled *pricing hypothesis* - consistent with
 * billing.ts ("Pilot pricing - set with your Q account lead") and derived
 * from economics.PRICE_PAID_USD so MONITOR numbers reconcile.
 */

import { PRICE_PAID_USD } from "./economics";

/** Rail visibility switch - the /pilot rail item renders only when true. */
export const PILOT_MODE = true;

export interface PilotPlan {
  podId: string;
  startIso: string;
  endIso: string;
  criteria: { metric: string; target: number; unit: string }[];
  weekly: { week: 1 | 2 | 3 | 4 | 5 | 6; actuals: Record<string, number> }[];
  baseline: { label: string; source: "client-agreed" | "industry-standard" };
  conversion: { pilotFeeUsd: number; creditedToYear1: true; planName: string };
}

/** Display labels for the criteria metric keys. */
export const PILOT_METRIC_LABELS: Record<string, string> = {
  ttfaaHr: "Time to first approved artifact",
  approvedArtifactsPerWeek: "Approved artifacts per pod-week",
  gateClearanceP50Hr: "Gate-clearance p50",
  validatorPassRatePct: "Validator pass-rate",
  spendVsCapPct: "Spend vs cap",
};

/** Whether a metric passes when actual ≤ target ("lte") or ≥ target ("gte"). */
export const PILOT_METRIC_DIRECTION: Record<string, "lte" | "gte"> = {
  ttfaaHr: "lte",
  approvedArtifactsPerWeek: "gte",
  gateClearanceP50Hr: "lte",
  validatorPassRatePct: "gte",
  spendVsCapPct: "lte",
};

export const PILOT_PRICING_NOTE = "Pilot fee credited to year one · pricing hypothesis";

/**
 * The seeded pilot: 6 weeks (2026-05-15 → 2026-06-26), ~62% elapsed at the
 * demo date (2026-06-10). TTFAA landed at 19h (hit); weeks 1-2 missed
 * throughput and clearance targets, week 3 nudged over the spend cap -
 * honest, then trending green. Weeks 5-6 haven't happened yet.
 */
export const PILOT_PLAN: PilotPlan = {
  podId: "automarket",
  startIso: "2026-05-15",
  endIso: "2026-06-26",
  criteria: [
    { metric: "ttfaaHr", target: 24, unit: "h" },
    { metric: "approvedArtifactsPerWeek", target: 10, unit: "artifacts / pod-week" },
    { metric: "gateClearanceP50Hr", target: 4, unit: "h (p50)" },
    { metric: "validatorPassRatePct", target: 90, unit: "%" },
    { metric: "spendVsCapPct", target: 100, unit: "% of cap" },
  ],
  weekly: [
    {
      week: 1,
      actuals: {
        ttfaaHr: 19,
        approvedArtifactsPerWeek: 4,
        gateClearanceP50Hr: 6.5,
        validatorPassRatePct: 84,
        spendVsCapPct: 88,
      },
    },
    {
      week: 2,
      actuals: {
        approvedArtifactsPerWeek: 8,
        gateClearanceP50Hr: 4.8,
        validatorPassRatePct: 88,
        spendVsCapPct: 96,
      },
    },
    {
      week: 3,
      actuals: {
        approvedArtifactsPerWeek: 11,
        gateClearanceP50Hr: 3.6,
        validatorPassRatePct: 92,
        spendVsCapPct: 104, // over cap that week - shown red, with mitigation note
      },
    },
    {
      week: 4,
      actuals: {
        approvedArtifactsPerWeek: 13,
        gateClearanceP50Hr: 2.9,
        validatorPassRatePct: 94,
        spendVsCapPct: 92,
      },
    },
    { week: 5, actuals: {} },
    { week: 6, actuals: {} },
  ],
  baseline: { label: "Senior BA, 4h/spec", source: "client-agreed" },
  conversion: {
    // 6 weeks ≈ 1.5 × the monthly plan fee already used by the net-of-fees
    // ROI math (economics.PRICE_PAID_USD) - pricing hypothesis, not a quote.
    pilotFeeUsd: PRICE_PAID_USD * 1.5,
    creditedToYear1: true,
    planName: "Dedicated tenant - year one",
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;

/** Window progress for the header chip ("day 26 of 42 · 16 days left"). */
export function pilotProgress(plan: PilotPlan = PILOT_PLAN, at: number = Date.now()): {
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  pctElapsed: number;
  ended: boolean;
} {
  const start = Date.parse(`${plan.startIso}T00:00:00Z`);
  const end = Date.parse(`${plan.endIso}T00:00:00Z`);
  const daysTotal = Math.round((end - start) / DAY);
  const rawElapsed = Math.floor((at - start) / DAY);
  const daysElapsed = Math.min(Math.max(rawElapsed, 0), daysTotal);
  return {
    daysTotal,
    daysElapsed,
    daysRemaining: daysTotal - daysElapsed,
    pctElapsed: daysTotal === 0 ? 0 : Math.round((daysElapsed / daysTotal) * 100),
    ended: at >= end,
  };
}

/** Pass/miss for one metric in one week (null = no signal yet). */
export function pilotMetricStatus(
  metric: string,
  week: PilotPlan["weekly"][number],
  plan: PilotPlan = PILOT_PLAN,
): "hit" | "miss" | null {
  const c = plan.criteria.find((x) => x.metric === metric);
  const actual = week.actuals[metric];
  if (!c || actual === undefined) return null;
  const dir = PILOT_METRIC_DIRECTION[metric] ?? "lte";
  return (dir === "lte" ? actual <= c.target : actual >= c.target) ? "hit" : "miss";
}
