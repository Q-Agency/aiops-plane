/**
 * Usage & Billing (/billing, C9) — consumption transparency for the client:
 * plan framing (Dedicated tenant · pilot pricing TBD — NO invented prices),
 * consumption vs budget cap, budget alerts, the monthly statement whose line
 * items link to gate decisions, and the clearly-badged pricing simulator.
 *
 * The `budget` object defined HERE is canonical (the /economics budget panel
 * imports it from "@/mock/billing" — do not re-declare it in economics.ts;
 * billing already imports economics, and a re-export would cycle).
 */

import {
  aggregates,
  stageLabel,
  ticketEconomics,
  ticketTotalUsd,
  type CostStage,
} from "./economics";

/* ------------------------------------------------------------------ */
/* Plan — pilot framing, no invented price (C9)                         */
/* ------------------------------------------------------------------ */

export interface BillingPlan {
  name: string; //               "Dedicated tenant"
  tenancy: "Dedicated"; //       matches the TopBar tenancy badge
  /** Honest pilot framing — pricing is TBD, never a fabricated number. */
  pricingNote: string;
  billingPeriodStart: string; // ISO date
  billingPeriodEnd: string; //   ISO date
  /** Client-legible consumption unit. */
  unitName: "delivery unit";
  unitDefinition: string;
}

export const plan: BillingPlan = {
  name: "Dedicated tenant",
  tenancy: "Dedicated",
  pricingNote: "Pilot pricing — set with your Q account lead. No list price yet.",
  billingPeriodStart: "2026-06-01",
  billingPeriodEnd: "2026-06-30",
  unitName: "delivery unit",
  unitDefinition: "A delivery unit ≈ one agent-processed work item stage.",
};

/* ------------------------------------------------------------------ */
/* Budget — canonical run-rate vs cap object (C2/C9)                    */
/* ------------------------------------------------------------------ */

export type CapStatus = "on_track" | "watch" | "over";

export interface Budget {
  monthlyCapUsd: number;
  mtdSpendUsd: number;
  daysElapsed: number;
  daysInMonth: number;
  projectedMonthlyUsd: number;
  /** <80% of cap = on_track · 80–100% = watch · >100% = over. */
  capStatus: CapStatus;
  currency: "USD";
}

function capStatusFor(projected: number, cap: number): CapStatus {
  if (projected > cap) return "over";
  if (projected >= cap * 0.8) return "watch";
  return "on_track";
}

export const budget: Budget = (() => {
  const monthlyCapUsd = 4000;
  const mtdSpendUsd = +aggregates.totalCost.toFixed(2);
  const daysElapsed = 10; // demo period: June 1–10, 2026
  const daysInMonth = 30;
  const projectedMonthlyUsd = +((mtdSpendUsd / daysElapsed) * daysInMonth).toFixed(0);
  return {
    monthlyCapUsd,
    mtdSpendUsd,
    daysElapsed,
    daysInMonth,
    projectedMonthlyUsd,
    capStatus: capStatusFor(projectedMonthlyUsd, monthlyCapUsd),
    currency: "USD",
  };
})();

export const CAP_STATUS_LABELS: Record<CapStatus, string> = {
  on_track: "On track",
  watch: "Watch",
  over: "Over cap",
};

/* ------------------------------------------------------------------ */
/* Budget alerts                                                        */
/* ------------------------------------------------------------------ */

export interface BudgetAlert {
  id: string;
  label: string; //              "Notify at 80% of monthly cap"
  thresholdPct: number;
  channel: "in_app" | "slack" | "email";
  enabled: boolean;
  state: "armed" | "triggered";
  triggeredAt: string | null; // ISO or null
}

export const budgetAlerts: BudgetAlert[] = [
  {
    id: "ba-50",
    label: "Notify at 50% of monthly cap",
    thresholdPct: 50,
    channel: "in_app",
    enabled: true,
    state: "triggered",
    triggeredAt: "2026-06-07T14:20:00Z",
  },
  {
    id: "ba-80",
    label: "Notify at 80% of monthly cap",
    thresholdPct: 80,
    channel: "slack",
    enabled: true,
    state: "armed",
    triggeredAt: null,
  },
  {
    id: "ba-100",
    label: "Notify at 100% of monthly cap (pause intake)",
    thresholdPct: 100,
    channel: "slack",
    enabled: true,
    state: "armed",
    triggeredAt: null,
  },
  {
    id: "ba-email",
    label: "Weekly spend summary by email",
    thresholdPct: 0,
    channel: "email", // render with a Roadmap badge — email delivery isn't live
    enabled: false,
    state: "armed",
    triggeredAt: null,
  },
];

/* ------------------------------------------------------------------ */
/* Monthly statement — line items link to gate decisions (C9)           */
/* ------------------------------------------------------------------ */

export interface StatementLineItem {
  id: string;
  label: string; //          "AM-136 · Listing detail page — shipped"
  ticketId?: string;
  /** "Every line item links to a gate a human cleared." */
  gateId?: string;
  clearedBy?: string; //     approver display name
  kind: "consumption" | "platform" | "adjustment";
  amountUsd: number;
}

export interface UsageStatement {
  periodId: string; //       "2026-06"
  label: string; //          "June 2026"
  itemsDelivered: number;
  unitsConsumed: number;
  consumptionUsd: number;
  totalUsd: number; //       pilot: equals consumptionUsd (platform fee TBD)
  status: "current" | "paid" | "estimated";
  lineItems: StatementLineItem[];
}

const juneLineItems: StatementLineItem[] = [
  {
    id: "li-jun-1",
    label: "AM-136 · Listing detail page — shipped",
    ticketId: "AM-136",
    gateId: "appr-AM-136",
    clearedBy: "Iva",
    kind: "consumption",
    amountUsd: 41.2,
  },
  {
    id: "li-jun-2",
    label: "AM-133 · Payment intent callback — dev gate cleared",
    ticketId: "AM-133",
    gateId: "appr-AM-133",
    clearedBy: "Petar",
    kind: "consumption",
    amountUsd: 38.6,
  },
  {
    id: "li-jun-3",
    label: "AM-144 · Seller KYC verification — QA gate cleared",
    ticketId: "AM-144",
    gateId: "appr-AM-144",
    clearedBy: "Iva",
    kind: "consumption",
    amountUsd: 44.9,
  },
  {
    id: "li-jun-4",
    label: "AM-142 · Vehicle search with filters — spec approved",
    ticketId: "AM-142",
    gateId: "appr-AM-142",
    clearedBy: "Zlatko",
    kind: "consumption",
    amountUsd: 12.4,
  },
  {
    id: "li-jun-5",
    label: "Overnight batch runs (3 PRs, all green)",
    kind: "consumption",
    amountUsd: 5.5,
  },
];

export const usageStatements: UsageStatement[] = [
  {
    periodId: "2026-06",
    label: "June 2026",
    itemsDelivered: aggregates.mergedCount,
    unitsConsumed: ticketEconomics.reduce((a, t) => a + t.stages.length, 0),
    consumptionUsd: budget.mtdSpendUsd,
    totalUsd: budget.mtdSpendUsd,
    status: "current",
    lineItems: juneLineItems,
  },
  {
    periodId: "2026-05",
    label: "May 2026",
    itemsDelivered: 21,
    unitsConsumed: 126,
    consumptionUsd: 1184.4,
    totalUsd: 1184.4,
    status: "paid",
    lineItems: [],
  },
  {
    periodId: "2026-04",
    label: "April 2026",
    itemsDelivered: 17,
    unitsConsumed: 104,
    consumptionUsd: 1322.8,
    totalUsd: 1322.8,
    status: "paid",
    lineItems: [],
  },
  {
    periodId: "2026-03",
    label: "March 2026",
    itemsDelivered: 11,
    unitsConsumed: 71,
    consumptionUsd: 1490.1,
    totalUsd: 1490.1,
    status: "paid",
    lineItems: [],
  },
];

/* ------------------------------------------------------------------ */
/* Consumption breakdown (by agent / by codebase)                       */
/* ------------------------------------------------------------------ */

export interface ConsumptionRow {
  key: string;
  label: string;
  items: number;
  amountUsd: number;
  sharePct: number;
}

export function consumptionByAgent(): ConsumptionRow[] {
  const byStage = new Map<CostStage, { items: number; usd: number }>();
  for (const t of ticketEconomics) {
    for (const s of t.stages) {
      const cur = byStage.get(s.stage) ?? { items: 0, usd: 0 };
      cur.items += 1;
      cur.usd += s.cloudUsd + s.localUsd;
      byStage.set(s.stage, cur);
    }
  }
  const total = [...byStage.values()].reduce((a, v) => a + v.usd, 0) || 1;
  return [...byStage.entries()]
    .map(([stage, v]) => ({
      key: stage,
      label: stageLabel[stage],
      items: v.items,
      amountUsd: +v.usd.toFixed(2),
      sharePct: +((v.usd / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.amountUsd - a.amountUsd);
}

export function consumptionByProject(): ConsumptionRow[] {
  const byCb = new Map<string, { items: number; usd: number }>();
  for (const t of ticketEconomics) {
    const cur = byCb.get(t.cb) ?? { items: 0, usd: 0 };
    cur.items += 1;
    cur.usd += ticketTotalUsd(t);
    byCb.set(t.cb, cur);
  }
  const total = [...byCb.values()].reduce((a, v) => a + v.usd, 0) || 1;
  return [...byCb.entries()]
    .map(([cb, v]) => ({
      key: cb,
      label: cb.charAt(0).toUpperCase() + cb.slice(1),
      items: v.items,
      amountUsd: +v.usd.toFixed(2),
      sharePct: +((v.usd / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.amountUsd - a.amountUsd);
}

/* ------------------------------------------------------------------ */
/* Pricing simulator — badged "MODELING — not a quote" (C9)             */
/* ------------------------------------------------------------------ */

export const PRICING_SIMULATOR_BADGE = "MODELING — not a quote";

export interface PricingScenario {
  id: "platform_pod" | "outcome_per_artifact" | "outcome_per_merged";
  label: string;
  descriptor: string;
  /** What THIS month would have cost under the scenario (modeled). */
  monthUsd: number;
}

export const pricingScenarios: PricingScenario[] = (() => {
  const consumption = budget.mtdSpendUsd;
  const approvedArtifacts = 14; // gates cleared this period (mirrors report seed)
  const merged = aggregates.mergedCount;
  return [
    {
      id: "platform_pod",
      label: "Platform + pod fee",
      descriptor: "Flat monthly platform fee per dedicated pod, consumption passed through.",
      monthUsd: +(consumption * 1.6).toFixed(0),
    },
    {
      id: "outcome_per_artifact",
      label: "+ outcome per approved artifact",
      descriptor: `Base fee plus a per-artifact outcome charge (${approvedArtifacts} approved this month).`,
      monthUsd: +(consumption * 1.2 + approvedArtifacts * 35).toFixed(0),
    },
    {
      id: "outcome_per_merged",
      label: "+ outcome per merged ticket",
      descriptor: `Base fee plus a per-merged outcome charge (${merged} merged this month).`,
      monthUsd: +(consumption * 1.2 + merged * 60).toFixed(0),
    },
  ];
})();
