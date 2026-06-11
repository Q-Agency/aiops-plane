/**
 * RoiHeroRow — Row 0 of the Overview (RUN landing) (the wow-moment TEASER).
 * Compact rendering of the C2 canonical trio (human-hours freed ·
 * cost / merged ticket · cost / story point) with the tier badges and the
 * net-of-fees ROI multiple; the whole row deep-links to /economics
 * ("promoted here, full story there" — the full reveal + Edit assumptions
 * live on Overview / ROI).
 *
 * ROLES slice: the exported RoiHeroRow now wraps the hero in the
 * RoleLandingRouter — this is Row 0 of the standard-mode "/" cockpit, and
 * index.tsx is frozen, so the role-scoped landing switch (PM cockpit /
 * QA gate queue / sponsor digest) mounts HERE. PM view renders the hero
 * exactly as before.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { aggregates, liveTier } from "@/mock/economics";
import { cn } from "@/lib/utils";
import { RoleLandingRouter } from "@/components/roles/RoleLandingRouter";
import { useRoiAssumptions } from "./useRoiAssumptions";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 1000 ? 2 : 0 })}`;

const TIER_CHIP: Record<"live" | "ship", string> = {
  live: "border-status-done/40 bg-status-done/10 text-status-done",
  ship: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
};

function Metric({
  label,
  value,
  tier,
}: {
  label: string;
  value: string;
  tier?: "live" | "ship";
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground truncate">
          {label}
        </span>
        {tier && (
          <span
            className={cn(
              "text-[9px] uppercase tracking-wider font-mono px-1 py-px rounded border shrink-0",
              TIER_CHIP[tier],
            )}
          >
            {tier === "live" ? "LIVE" : "AS AGENTS SHIP"}
          </span>
        )}
      </div>
      <div className="mt-0.5 text-lg font-semibold font-mono tabular-nums" suppressHydrationWarning>
        {value}
      </div>
    </div>
  );
}

/** Standard-mode "/" Row 0 — hosts the role-landing switch (see header). */
export function RoiHeroRow() {
  return (
    <RoleLandingRouter>
      <RoiHeroRowCore />
    </RoleLandingRouter>
  );
}

function RoiHeroRowCore() {
  const { derived } = useRoiAssumptions();
  const hasMerged = aggregates.mergedCount > 0;

  return (
    <Link
      to="/economics"
      aria-label="View ROI — Overview / ROI"
      className="glass-panel block px-4 py-3 group"
    >
      <div className="flex items-center gap-4 lg:gap-6 flex-wrap">
        {/* ROI multiple — net of plan fees */}
        <div className="pr-4 lg:pr-6 border-r border-border">
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Return on investment · this period
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span
              className="text-2xl font-semibold font-mono tabular-nums text-primary"
              suppressHydrationWarning
            >
              {hasMerged ? `${derived.roiMultiple}×` : "—"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              net of plan fees
            </span>
          </div>
        </div>

        {/* canonical trio (compact) */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 min-w-0">
          <Metric
            label="Human-hours freed"
            value={
              hasMerged ? `${Math.round(derived.hoursFreed).toLocaleString("en-US")} h` : "—"
            }
          />
          <Metric
            label="Cost / merged ticket"
            value={hasMerged ? usd(aggregates.costPerMerged) : "—"}
            tier="ship"
          />
          <Metric
            label="Cost / story point"
            value={hasMerged ? usd(aggregates.costPerStoryPoint) : "—"}
            tier="ship"
          />
        </div>

        {/* live-tier teaser + deep link */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            {liveTier.approvedSpecCount > 0 ? (
              <>
                <span className={cn("px-1 py-px rounded border text-[9px] uppercase tracking-wider", TIER_CHIP.live)}>
                  LIVE
                </span>
                <span className="tabular-nums" suppressHydrationWarning>
                  {usd(liveTier.costPerApprovedSpecUsd)} / approved spec
                </span>
              </>
            ) : (
              <span>Live-tier ROI appears with your first approved artifact.</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-primary group-hover:underline">
            View ROI <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
