/**
 * Platform Status (/status, wave 2, Blind spot 5) — per-tenant component
 * health, 90-day uptime, and the honest degradation story ("agents keep
 * working; gates remain answerable in Slack; the ledger backfills with
 * gap-markers").
 *
 * All 90-day history is DETERMINISTIC (hand-rolled dip table anchored at
 * the demo date 2026-06-10 — no randomness), so reloads look stable. The
 * 3-day degraded stretch on Ledger sync matches the Compliance gap-marker
 * seed.
 */

export type ComponentState = "operational" | "degraded" | "down";

export interface StatusComponent {
  id: string;
  label: string;
  state: ComponentState;
  /** Epoch ms — present while degraded/down ("since {t}"). */
  since?: number;
  lastIncidentAt?: number;
}

export interface UptimeDay {
  componentId: string;
  /** ISO day, e.g. "2026-05-12". */
  day: string;
  pct: number;
}

export const platformSla = {
  uptimeTargetPct: 99.9,
  ledgerRpoMin: 15,
} as const;

/** The three-line honesty card (vision §8 "Platform availability & DR"). */
export const DEGRADATION_EXPLAINER = [
  "Your agents continue working — the control plane is not in their execution path.",
  "Gates remain answerable in Slack while the dashboard is unreachable.",
  "The ledger backfills on reconnect and marks any gap honestly in Compliance.",
] as const;

const DAY_MS = 86_400_000;
/** Demo anchor — matches the billing period (June 1–10, 2026). */
const ANCHOR_UTC = Date.UTC(2026, 5, 10);

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const STATUS_COMPONENTS: StatusComponent[] = [
  {
    id: "dashboard",
    label: "Dashboard / control plane",
    state: "operational",
    lastIncidentAt: ANCHOR_UTC - 74 * DAY_MS,
  },
  {
    id: "ledger",
    label: "Ledger sync",
    state: "operational",
    lastIncidentAt: ANCHOR_UTC - 30 * DAY_MS, // end of the 3-day degraded stretch
  },
  {
    id: "gateway",
    label: "Agent gateway",
    state: "operational",
    lastIncidentAt: ANCHOR_UTC - 55 * DAY_MS,
  },
  {
    id: "slack",
    label: "Slack bridge",
    state: "operational",
    lastIncidentAt: ANCHOR_UTC - 21 * DAY_MS,
  },
  {
    id: "tools",
    label: "Connected tools",
    state: "operational",
    lastIncidentAt: ANCHOR_UTC - 12 * DAY_MS,
  },
];

/**
 * Deterministic dip table: componentId → { daysAgo → pct }. Every other
 * day is a flat 100. The ledger 32→30-days-ago stretch is the headline
 * degraded period (sync gap, marked in Compliance).
 */
const DIPS: Record<string, Record<number, number>> = {
  dashboard: { 74: 99.6 },
  ledger: { 32: 96.4, 31: 94.8, 30: 98.9 },
  gateway: { 55: 99.4 },
  slack: { 21: 98.2 },
  tools: { 12: 99.5 },
};

/** 90 seeded days per component, oldest → newest (450 rows). */
export const uptimeDays: UptimeDay[] = STATUS_COMPONENTS.flatMap((c) => {
  const dips = DIPS[c.id] ?? {};
  const days: UptimeDay[] = [];
  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    days.push({
      componentId: c.id,
      day: isoDay(ANCHOR_UTC - daysAgo * DAY_MS),
      pct: dips[daysAgo] ?? 100,
    });
  }
  return days;
});

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

export function uptimeDaysFor(componentId: string): UptimeDay[] {
  return uptimeDays.filter((d) => d.componentId === componentId);
}

/** 90-day average uptime for one component (two decimals). */
export function uptimePctFor(componentId: string): number {
  const days = uptimeDaysFor(componentId);
  if (days.length === 0) return 100;
  const sum = days.reduce((a, d) => a + d.pct, 0);
  return +(sum / days.length).toFixed(2);
}

/** Worst current component state → overall pill. */
export function overallState(): ComponentState {
  if (STATUS_COMPONENTS.some((c) => c.state === "down")) return "down";
  if (STATUS_COMPONENTS.some((c) => c.state === "degraded")) return "degraded";
  return "operational";
}

export const OVERALL_PILL_COPY: Record<ComponentState, string> = {
  operational: "All systems operational",
  degraded: "Degraded — your agents are unaffected",
  down: "Disruption — your agents are unaffected",
};
