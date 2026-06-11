/**
 * RoiHeroTile — one of the three enlarged headline ROI tiles (C2):
 * "Human-hours freed" · "Cost / merged ticket" · "Cost / story point".
 *
 * Tier honesty: pass tier="live" for the live-tier metrics (cost-per-
 * approved-spec, time-to-approved-spec) and tier="as_agents_ship" for
 * merged-ticket economics. The optional onEditAssumptions affordance
 * renders the "Edit assumptions — your numbers, not ours" link (C2);
 * the editor dialog itself lives with the /economics builder and persists
 * to localStorage ROI_ASSUMPTIONS_STORAGE_KEY ("aiops_roi_assumptions").
 */

import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type RoiTier = "live" | "as_agents_ship";

export interface RoiHeroTileProps {
  /** e.g. "Human-hours freed" (NEVER "displaced" in client-facing copy). */
  label: string;
  /** Pre-formatted display value, e.g. "1,284 h" / "$31.40". */
  value: string;
  /** One-liner under the value, e.g. "= $121,980 at your blended rate ($95/h · industry standard)". */
  subcaption?: string;
  tier?: RoiTier;
  /** Visually dominant variant for the hero band. */
  emphasis?: boolean;
  /** Renders the "Edit assumptions — your numbers, not ours" affordance. */
  onEditAssumptions?: () => void;
  className?: string;
}

const TIER_META: Record<RoiTier, { label: string; chip: string }> = {
  live: {
    label: "LIVE",
    chip: "border-status-done/40 bg-status-done/10 text-status-done",
  },
  as_agents_ship: {
    label: "AS AGENTS SHIP",
    chip: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
  },
};

export function RoiHeroTile({
  label,
  value,
  subcaption,
  tier,
  emphasis = false,
  onEditAssumptions,
  className,
}: RoiHeroTileProps) {
  const tierMeta = tier ? TIER_META[tier] : null;
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-panel/40 backdrop-blur-md flex flex-col gap-1.5",
        emphasis ? "p-5" : "p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          {label}
        </span>
        {tierMeta && (
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border shrink-0",
              tierMeta.chip,
            )}
          >
            {tierMeta.label}
          </span>
        )}
      </div>

      <div
        className={cn(
          "font-mono tabular-nums text-foreground",
          emphasis ? "text-3xl font-semibold" : "text-xl font-medium",
        )}
      >
        {value}
      </div>

      {subcaption && <div className="text-xs text-muted-foreground">{subcaption}</div>}

      {onEditAssumptions && (
        <button
          type="button"
          onClick={onEditAssumptions}
          className="mt-1 inline-flex items-center gap-1.5 self-start text-[11px] text-primary hover:underline"
        >
          <SlidersHorizontal className="size-3" />
          Edit assumptions — your numbers, not ours
        </button>
      )}
    </div>
  );
}
