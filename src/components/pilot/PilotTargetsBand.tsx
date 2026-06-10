/**
 * PilotTargetsBand (/pilot, P1-C3) — one target-vs-actual tile per pilot
 * criterion, fed by the latest weekly signal in PILOT_PLAN.
 *
 * Honesty rules (same as the sponsor report): a missed latest signal renders
 * red with a one-line mitigation; a recovered metric keeps its earlier misses
 * on the record ("missed wk 1–2 · recovered"). Each tile click-throughs to
 * the surface that owns the number (TTFAA → /reports, spend → /billing,
 * validator pass-rate → /governance, …).
 */

import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import {
  PILOT_METRIC_DIRECTION,
  PILOT_METRIC_LABELS,
  PILOT_PLAN,
  pilotMetricStatus,
  type PilotPlan,
} from "@/mock/pilot";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Per-metric wiring                                                    */
/* ------------------------------------------------------------------ */

/** Tile click-through — the surface that owns each number. */
const TILE_LINKS = {
  ttfaaHr: "/reports",
  approvedArtifactsPerWeek: "/artifacts",
  gateClearanceP50Hr: "/approvals",
  validatorPassRatePct: "/governance",
  spendVsCapPct: "/billing",
} as const;

const TILE_LINK_LABELS: Record<keyof typeof TILE_LINKS, string> = {
  ttfaaHr: "SLA & Reports",
  approvedArtifactsPerWeek: "Deliverables",
  gateClearanceP50Hr: "Gates",
  validatorPassRatePct: "Governance",
  spendVsCapPct: "Usage & Billing",
};

/** One-line mitigation per metric — rendered whenever the record shows a miss. */
const MITIGATIONS: Record<string, string> = {
  ttfaaHr: "Escalated to your Q account lead — first artifact re-targeted inside the window.",
  approvedArtifactsPerWeek:
    "Wk 1–2 ramp ran below target — intake widened from your backlog; above target since wk 3.",
  gateClearanceP50Hr:
    "Wk 1–2 clearance ran slow — approver nudges enabled in Slack; under target since wk 3.",
  validatorPassRatePct:
    "Wk 1–2 under target — two constitution rules ratified from your rejections; passing since wk 3.",
  spendVsCapPct: "Wk 3 ran 104% of cap — caps tightened with your account lead; back under in wk 4.",
};

function fmtMetricValue(metric: string, v: number): string {
  switch (metric) {
    case "ttfaaHr":
    case "gateClearanceP50Hr":
      return `${v}h`;
    case "validatorPassRatePct":
      return `${v}%`;
    case "spendVsCapPct":
      return `${v}% of cap`;
    default:
      return `${v}`;
  }
}

function targetLabel(metric: string, target: number): string {
  // TTFAA keeps the canonical "< 24h" copy; everything else uses ≤ / ≥.
  if (metric === "ttfaaHr") return `< ${fmtMetricValue(metric, target)}`;
  const dir = PILOT_METRIC_DIRECTION[metric] ?? "lte";
  return `${dir === "lte" ? "≤" : "≥"} ${fmtMetricValue(metric, target)}`;
}

/** Latest week carrying a signal for this metric (TTFAA only fires once). */
function latestSignal(
  metric: string,
): { week: PilotPlan["weekly"][number]; value: number } | null {
  for (let i = PILOT_PLAN.weekly.length - 1; i >= 0; i--) {
    const week = PILOT_PLAN.weekly[i];
    const value = week.actuals[metric];
    if (value !== undefined) return { week, value };
  }
  return null;
}

const dateLabel = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/* ------------------------------------------------------------------ */
/* Band                                                                 */
/* ------------------------------------------------------------------ */

export function PilotTargetsBand() {
  const firstSignalBy = Date.parse(`${PILOT_PLAN.startIso}T00:00:00Z`) + 7 * 86_400_000;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
      {PILOT_PLAN.criteria.map((c) => {
        const latest = latestSignal(c.metric);
        const status = latest ? pilotMetricStatus(c.metric, latest.week) : null;
        const missedWeeks = PILOT_PLAN.weekly
          .filter((w) => pilotMetricStatus(c.metric, w) === "miss")
          .map((w) => w.week);
        const recovered = status === "hit" && missedWeeks.length > 0;
        const href = TILE_LINKS[c.metric as keyof typeof TILE_LINKS] ?? "/reports";
        const linkLabel = TILE_LINK_LABELS[c.metric as keyof typeof TILE_LINKS] ?? "Reports";

        return (
          <Link
            key={c.metric}
            to={href}
            aria-label={`${PILOT_METRIC_LABELS[c.metric] ?? c.metric} — open ${linkLabel}`}
            className={cn(
              "glass-panel p-4 flex flex-col gap-1.5 group transition-colors",
              status === "miss" && "border-status-error/50 bg-status-error/[0.04]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                {PILOT_METRIC_LABELS[c.metric] ?? c.metric}
              </span>
              <StatusChip status={status} />
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={cn(
                  "text-2xl font-semibold font-mono tabular-nums",
                  !latest
                    ? "text-muted-foreground/50"
                    : status === "miss"
                      ? "text-status-error"
                      : "text-foreground",
                )}
              >
                {latest ? fmtMetricValue(c.metric, latest.value) : "—"}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                target {targetLabel(c.metric, c.target)}
              </span>
            </div>

            <div className="text-[11px] text-muted-foreground leading-snug">
              {!latest ? (
                <>first signal expected by {dateLabel(firstSignalBy)}</>
              ) : status === "miss" ? (
                <span className="text-status-error/90">{MITIGATIONS[c.metric]}</span>
              ) : recovered ? (
                <>
                  <span className="text-status-waiting font-mono">
                    missed wk {missedWeeks.join(" & ")} · recovered
                  </span>{" "}
                  — {MITIGATIONS[c.metric]}
                </>
              ) : c.metric === "ttfaaHr" ? (
                <>landed in week {latest.week.week} — one-time metric, inside target</>
              ) : (
                <>wk {latest.week.week} actual · inside target every week</>
              )}
            </div>

            <span className="mt-auto pt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
              View {linkLabel}
              <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </Link>
        );
      })}
    </section>
  );
}

function StatusChip({ status }: { status: "hit" | "miss" | null }) {
  return (
    <span
      className={cn(
        "shrink-0 text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
        status === "hit" && "border-status-done/40 bg-status-done/10 text-status-done",
        status === "miss" && "border-status-error/40 bg-status-error/10 text-status-error",
        status === null && "border-border text-muted-foreground",
      )}
    >
      {status === "hit" ? "On target" : status === "miss" ? "Missed" : "Pending"}
    </span>
  );
}
