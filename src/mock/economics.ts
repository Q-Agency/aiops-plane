import type { AgentId, Codebase } from "./types";
import { tickets } from "./tickets";

export const HUMAN_RATE_PER_HOUR = 95; // USD blended senior engineer

export type CostStage = Extract<AgentId, "ba" | "sa" | "tasklist" | "dev" | "review" | "qa">;

export const COST_STAGES: CostStage[] = ["ba", "sa", "tasklist", "dev", "review", "qa"];

export const stageLabel: Record<CostStage, string> = {
  ba: "BA",
  sa: "SA",
  tasklist: "Tasks",
  dev: "Dev",
  review: "Code Review",
  qa: "QA",
};

export interface StageCost {
  stage: CostStage;
  cloudUsd: number;        // hosted-model spend
  localUsd: number;        // amortised local vLLM compute
  reruns: number;          // re-invocations driven by a rejection downstream
  reviewMin: number;       // accumulated human-review minutes at this gate
}

export interface TicketEconomics {
  ticketId: string;
  title: string;
  cb: Codebase;
  storyPoints: number;
  merged: boolean;          // a merged PR shipped
  humanHoursEquivalent: number; // what this would have cost a human team
  stages: StageCost[];
}

// deterministic pseudo-random
const seedRand = (s: number) => {
  let x = Math.sin(s) * 10_000;
  return () => {
    x = Math.sin(x) * 10_000;
    return x - Math.floor(x);
  };
};

const STAGE_BASE: Record<CostStage, { cloud: number; local: number; review: number }> = {
  ba:       { cloud: 0.42, local: 0.04, review: 6 },
  sa:       { cloud: 0.78, local: 0.06, review: 8 },
  tasklist: { cloud: 0.18, local: 0.12, review: 3 },
  dev:      { cloud: 4.20, local: 0.30, review: 12 },
  review:   { cloud: 0.62, local: 0.08, review: 5 },
  qa:       { cloud: 1.85, local: 0.18, review: 7 },
};

const cbWeight: Record<Codebase, number> = { backend: 1.15, web: 0.95, mobile: 1.05 };

export const ticketEconomics: TicketEconomics[] = tickets.map((t, i) => {
  const rnd = seedRand(t.id.charCodeAt(3) * 31 + i * 7 + 1);
  const w = cbWeight[t.codebase];
  const reruns = t.rerunCount ?? (rnd() < 0.35 ? 1 : 0);
  const stages: StageCost[] = COST_STAGES.map((s) => {
    const base = STAGE_BASE[s];
    const jitter = 0.7 + rnd() * 0.8;
    const stageReruns = s === "dev" && reruns > 0 ? reruns : s === "review" && reruns > 1 ? 1 : 0;
    const rerunMult = 1 + stageReruns * 0.85;
    return {
      stage: s,
      cloudUsd: +(base.cloud * w * jitter * rerunMult).toFixed(2),
      localUsd: +(base.local * w * (0.6 + rnd() * 0.9) * rerunMult).toFixed(3),
      reruns: stageReruns,
      reviewMin: Math.round(base.review * (0.7 + rnd() * 0.9) * (1 + stageReruns * 0.5)),
    };
  });
  const sp = 2 + Math.round(rnd() * 6);
  const merged = t.stage === "done" || (t.stage !== "backlog" && rnd() < 0.55);
  return {
    ticketId: t.id,
    title: t.title,
    cb: t.codebase,
    storyPoints: sp,
    merged,
    humanHoursEquivalent: +(sp * (6 + rnd() * 3)).toFixed(1),
    stages,
  };
});

// helpers ----------------------------------------------------------------

export const stageTokenUsd = (s: StageCost) => s.cloudUsd + s.localUsd;
export const ticketTokenUsd = (t: TicketEconomics) =>
  t.stages.reduce((a, s) => a + stageTokenUsd(s), 0);
export const ticketReviewMin = (t: TicketEconomics) =>
  t.stages.reduce((a, s) => a + s.reviewMin, 0);
export const ticketReviewUsd = (t: TicketEconomics) =>
  +(ticketReviewMin(t) / 60 * HUMAN_RATE_PER_HOUR).toFixed(2);
export const ticketTotalUsd = (t: TicketEconomics) =>
  +(ticketTokenUsd(t) + ticketReviewUsd(t)).toFixed(2);
export const ticketRerunCount = (t: TicketEconomics) =>
  t.stages.reduce((a, s) => a + s.reruns, 0);
export const ticketRerunPenalty = (t: TicketEconomics) => {
  // rough estimate: each rerun added ~45% on its stage's cloud cost
  return +t.stages.reduce((a, s) => {
    if (!s.reruns) return a;
    const without = s.cloudUsd / (1 + s.reruns * 0.85);
    return a + (s.cloudUsd - without);
  }, 0).toFixed(2);
};

// ROI staging (slice 2, C2) ----------------------------------------------
//
// CANONICAL METRIC TRIO — every ROI surface renders exactly:
//   humanHoursDisplaced · costPerMerged · costPerStoryPoint.
// Display label for humanHoursDisplaced is "human-hours freed" (never
// "displaced" in client-facing copy — the data key stays).
// Tier badges: cost-per-approved-spec + time-to-approved-spec = "LIVE";
// costPerMerged / costPerStoryPoint = "as agents ship".
// All ROI is computed NET of plan fees (pricePaidUsd).

export interface RoiAssumptions {
  /** The hourly rate behind every hours→$ conversion. */
  blendedRateUsdPerHr: number;
  /** What the comparison assumes. */
  baselineNote: string;
  /** Provenance — flips to "client-provided" when edited ("your numbers, not ours"). */
  source: "Q-default" | "client-provided";
}

export const roiAssumptions: RoiAssumptions = {
  blendedRateUsdPerHr: HUMAN_RATE_PER_HOUR, // 95
  baselineNote: "senior BA · 4h per spec — senior engineer · 6h per story point",
  source: "Q-default",
};

/** localStorage key for the client-side "Edit assumptions" override (C2). */
export const ROI_ASSUMPTIONS_STORAGE_KEY = "aiops_roi_assumptions";

/**
 * Plan fees this billing period. Internal to the net-of-fees ROI math —
 * NEVER rendered as a quoted price (C9: pilot pricing is TBD framing).
 */
export const PRICE_PAID_USD = 1500;

// aggregate -------------------------------------------------------------

export const aggregates = (() => {
  const totalCost = ticketEconomics.reduce((a, t) => a + ticketTotalUsd(t), 0);
  const totalTokens = ticketEconomics.reduce((a, t) => a + ticketTokenUsd(t), 0);
  const totalLocal = ticketEconomics.reduce(
    (a, t) => a + t.stages.reduce((b, s) => b + s.localUsd, 0), 0,
  );
  const totalCloud = ticketEconomics.reduce(
    (a, t) => a + t.stages.reduce((b, s) => b + s.cloudUsd, 0), 0,
  );
  const merged = ticketEconomics.filter((t) => t.merged);
  const storyPoints = merged.reduce((a, t) => a + t.storyPoints, 0);
  const humanHours = ticketEconomics.reduce((a, t) => a + t.humanHoursEquivalent, 0);
  const reviewMin = ticketEconomics.reduce((a, t) => a + ticketReviewMin(t), 0);
  // hypothetical: if everything ran cloud-only, local share would have been cloud-priced ~6x
  const offloadSavings = totalLocal * 5.2;
  // overnight batch API at ~50% discount on ~30% of dev/qa spend
  const batchSavings = ticketEconomics.reduce((a, t) => {
    const eligible = t.stages.filter((s) => s.stage === "dev" || s.stage === "qa")
      .reduce((b, s) => b + s.cloudUsd, 0);
    return a + eligible * 0.30 * 0.50;
  }, 0);
  return {
    totalCost: +totalCost.toFixed(2),
    totalTokens: +totalTokens.toFixed(2),
    totalLocal: +totalLocal.toFixed(2),
    totalCloud: +totalCloud.toFixed(2),
    mergedCount: merged.length,
    costPerMerged: merged.length ? +(totalCost / merged.length).toFixed(2) : 0,
    costPerStoryPoint: storyPoints ? +(totalCost / storyPoints).toFixed(2) : 0,
    humanHoursDisplaced: +humanHours.toFixed(1),
    humanHoursDisplacedUsd: +(humanHours * HUMAN_RATE_PER_HOUR).toFixed(2),
    humanReviewMin: reviewMin,
    offloadSavings: +offloadSavings.toFixed(2),
    batchSavings: +batchSavings.toFixed(2),
    /** Plan fees this period — ROI derives net of this (C2). */
    pricePaidUsd: PRICE_PAID_USD,
    /** NET of plan fees: value ÷ (compute + plan fees). */
    roiMultiple: +(
      (humanHours * HUMAN_RATE_PER_HOUR) /
      Math.max(1, totalCost + PRICE_PAID_USD)
    ).toFixed(1),
  };
})();

// live-tier metrics (C2) — badged "LIVE": real today via the BA agent ------

export const liveTier = (() => {
  // tickets whose spec has been approved (past spec-review in the lifecycle)
  const preSpec = new Set(["backlog", "ready-spec", "spec-review"]);
  const approvedSpecs = tickets.filter((t) => !preSpec.has(t.stage)).length;
  const baSpendUsd = ticketEconomics.reduce((a, t) => {
    const ba = t.stages.find((s) => s.stage === "ba");
    if (!ba) return a;
    return a + stageTokenUsd(ba) + (ba.reviewMin / 60) * HUMAN_RATE_PER_HOUR;
  }, 0);
  return {
    /** Count of specs a human approved this period. */
    approvedSpecCount: approvedSpecs,
    /** "Cost / approved spec" — badge LIVE. */
    costPerApprovedSpecUsd: approvedSpecs
      ? +(baSpendUsd / approvedSpecs).toFixed(2)
      : 0,
    /** "Time to approved spec" (request → human sign-off), minutes — badge LIVE. */
    timeToApprovedSpecMin: 38,
  };
})();

// cost-per-ticket trend (21 days, falling as local share grows) ----------

export interface TrendPoint {
  day: string;
  costPerTicket: number;
  localSharePct: number;
  annotation?: string;
}

export const trend: TrendPoint[] = (() => {
  const n = 21;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const baseCost = 38 - 22 * t;            // dollars per merged ticket
    const noise = Math.sin(i * 1.3) * 1.6;
    const localShare = 18 + 46 * t;          // % local
    const annotation =
      i === 6 ? "curator → local Qwen-2.5"
      : i === 13 ? "tasklist → local"
      : i === 18 ? "overnight batch API on"
      : undefined;
    return {
      day: `d-${n - i}`,
      costPerTicket: +Math.max(8, baseCost + noise).toFixed(2),
      localSharePct: +Math.min(72, localShare).toFixed(1),
      annotation,
    };
  });
})();
