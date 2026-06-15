/**
 * RoiHeroBand - the full ROI hero for the /economics (Overview / ROI)
 * landing: the C2 staging rendered exactly -
 *
 *   · a thin LIVE-tier strip on top (cost / approved spec + time to approved
 *     spec - what the BA agent earns TODAY),
 *   · the canonical trio as three dominant tiles: "Human-hours freed"
 *     (data key humanHoursDisplaced) · "Cost / merged ticket" ·
 *     "Cost / story point", merged-ticket economics badged "as agents ship",
 *   · the "Edit assumptions - your numbers, not ours" affordance (dialog →
 *     localStorage; every hours→$ figure re-derives live),
 *   · the honest footer: ROI is computed net of plan fees.
 *
 * Empty state (no merged tickets yet): tiles show "-" with the staging copy.
 */

import { useState } from "react";
import { Activity } from "lucide-react";
import { aggregates, liveTier } from "@/mock/economics";
import { cn } from "@/lib/utils";
import { RoiHeroTile } from "./RoiHeroTile";
import { RoiAssumptionsDialog } from "./RoiAssumptionsDialog";
import { useRoiAssumptions } from "./useRoiAssumptions";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 1000 ? 2 : 0 })}`;

const fmtMin = (n: number) => (n >= 60 ? `${Math.floor(n / 60)}h ${n % 60}m` : `${n}m`);

export function RoiHeroBand({ className }: { className?: string }) {
  const { derived } = useRoiAssumptions();
  const [editOpen, setEditOpen] = useState(false);
  const hasMerged = aggregates.mergedCount > 0;
  const hasApproved = liveTier.approvedSpecCount > 0;

  return (
    <section className={cn("space-y-2", className)}>
      {/* LIVE tier strip - real today via the BA agent */}
      <div className="rounded-md border border-status-done/30 bg-status-done/5 px-3 py-2 flex items-center gap-x-4 gap-y-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-status-done">
          <Activity className="size-3" />
          Live tier
          <span className="px-1.5 py-0.5 rounded border border-status-done/40 bg-status-done/10">
            LIVE
          </span>
        </span>
        {hasApproved ? (
          <>
            <span className="text-xs font-mono tabular-nums" suppressHydrationWarning>
              <span className="text-muted-foreground">Cost / approved spec </span>
              <span className="text-foreground font-semibold">
                {usd(liveTier.costPerApprovedSpecUsd)}
              </span>
            </span>
            <span className="text-xs font-mono tabular-nums">
              <span className="text-muted-foreground">Time to approved spec </span>
              <span className="text-foreground font-semibold">
                {fmtMin(liveTier.timeToApprovedSpecMin)}
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
              {liveTier.approvedSpecCount} specs approved by a human this period.
            </span>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Live-tier ROI appears with your first approved artifact.
          </span>
        )}
      </div>

      {/* The canonical trio - visually dominant */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <RoiHeroTile
          emphasis
          label="Human-hours freed"
          value={
            hasMerged
              ? `${Math.round(derived.hoursFreed).toLocaleString("en-US")} h`
              : "-"
          }
          subcaption={
            hasMerged
              ? `= ${usd(derived.hoursFreedUsd)} at your blended rate (${derived.rateLine})`
              : "Live-tier ROI (cost per approved spec) appears with your first approved artifact."
          }
          onEditAssumptions={() => setEditOpen(true)}
        />
        <RoiHeroTile
          emphasis
          tier="as_agents_ship"
          label="Cost / merged ticket"
          value={hasMerged ? usd(aggregates.costPerMerged) : "-"}
          subcaption={
            hasMerged
              ? `${aggregates.mergedCount} merged this period · vs. a human team at ${usd(derived.rate)}/h`
              : "Merged-ticket economics light up as agents ship."
          }
        />
        <RoiHeroTile
          emphasis
          tier="as_agents_ship"
          label="Cost / story point"
          value={hasMerged ? usd(aggregates.costPerStoryPoint) : "-"}
          subcaption={
            hasMerged
              ? `blended across merged tickets · vs. ~6h/point human baseline`
              : "Merged-ticket economics light up as agents ship."
          }
        />
      </div>

      <p className="text-[11px] font-mono text-muted-foreground">
        ROI is computed net of plan fees.
      </p>

      <RoiAssumptionsDialog open={editOpen} onOpenChange={setEditOpen} />
    </section>
  );
}
