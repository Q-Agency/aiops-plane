/**
 * BaselinePanel (/pilot, P1-C3) - the human baseline every pilot target is
 * measured against. "Your numbers, not ours": the baseline carries a source
 * badge (client-agreed vs industry-standard) and links to the Edit-assumptions
 * affordance on Overview · ROI rather than duplicating it.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, Ruler } from "lucide-react";
import { PILOT_PLAN, type PilotPlan } from "@/mock/pilot";
import { cn } from "@/lib/utils";

const SOURCE_BADGE: Record<PilotPlan["baseline"]["source"], { label: string; cls: string }> = {
  "client-agreed": {
    label: "Client-provided",
    cls: "border-status-done/40 bg-status-done/10 text-status-done",
  },
  "industry-standard": {
    label: "industry standard",
    cls: "border-border bg-white/5 text-muted-foreground",
  },
};

export function BaselinePanel() {
  const { baseline } = PILOT_PLAN;
  const badge = SOURCE_BADGE[baseline.source];

  return (
    <section className="glass-panel p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Ruler className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Human baseline
          </span>
        </div>
        <span
          className={cn(
            "text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
            badge.cls,
          )}
        >
          {badge.label}
        </span>
      </div>

      <div className="text-lg font-semibold">{baseline.label}</div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Every target on this scorecard is measured against the baseline you set before launch -{" "}
        <span className="text-foreground">your numbers, not ours</span>.
        {baseline.source === "client-agreed"
          ? " You provided this figure in LAUNCH → Go live → Targets & budget."
          : " This is the Q default - replace it with your own figure any time."}
      </p>

      <Link
        to="/economics"
        className="mt-auto inline-flex items-center gap-1 self-start text-[11px] text-primary hover:underline"
      >
        Edit assumptions on Overview · ROI
        <ArrowRight className="size-3" />
      </Link>
    </section>
  );
}
