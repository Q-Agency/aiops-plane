/**
 * OrgView — /org Org Portfolio Rollup (wave 2, P1-C2): every pod in the
 * client org on one page.
 *
 *   1. Header — org chip + period selector (re-scopes the KPI band).
 *   2. Org KPI band — the canonical ROI trio summed across pods, NET of
 *      plan fees (reuses the RoiHeroTile pattern from /economics).
 *   3. OrgRollupTable — one row per pod from the pod store; row click
 *      switches the active pod and lands on that pod's /economics.
 *   4. ExpansionHintCard — the expansion engine's home.
 *
 * States: multi-pod populated · single pod ("one pod live" note) ·
 * loading (skeleton rows until the pod store hydrates).
 */

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RoiHeroTile } from "@/components/monitor/RoiHeroTile";
import { useRoiAssumptions } from "@/components/monitor/useRoiAssumptions";
import { usePods, type LaunchedPod } from "@/lib/pods/pod-store";
import { ExpansionHintCard } from "./ExpansionHintCard";
import { OrgRollupTable } from "./OrgRollupTable";
import { ORG_PERIODS, orgTotals, podStats, type OrgPeriodId } from "./pod-stats";

const ORG_NAME = "AutoMarket Group";

const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const usd2 = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function OrgView() {
  const { pods, hydrated, setActivePod } = usePods();
  const { derived } = useRoiAssumptions();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<OrgPeriodId>("current");

  const totals = useMemo(
    () => orgTotals(pods.map((p) => podStats(p)), derived.rate, period),
    [pods, derived.rate, period],
  );
  const periodLabel = (ORG_PERIODS.find((p) => p.id === period) ?? ORG_PERIODS[0]).label;

  const openPod = (pod: LaunchedPod) => {
    setActivePod(pod.id);
    toast(`Switched to ${pod.name}`, {
      description: "Opening Overview · ROI scoped to this pod.",
    });
    void navigate({ to: "/economics" });
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      {/* 1 · Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            org · portfolio
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Your pods</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            Every pod in your org — status, ROI net of plan fees, open gates and incidents, spend
            vs cap.
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase tracking-wider gap-1.5"
          >
            <Building2 className="size-3" />
            <span suppressHydrationWarning>
              {ORG_NAME} · {pods.length} pod{pods.length === 1 ? "" : "s"}
            </span>
          </Badge>
          <Select value={period} onValueChange={(v) => setPeriod(v as OrgPeriodId)}>
            <SelectTrigger className="h-7 w-40 text-xs" aria-label="Rollup period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_PERIODS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2 · Org KPI band — canonical trio, net of plan fees */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <div className="rounded-md border border-primary/30 bg-panel/40 backdrop-blur-md p-4 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Return on investment · {periodLabel.toLowerCase()}
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-semibold font-mono tabular-nums text-primary"
              suppressHydrationWarning
            >
              {totals.mergedCount > 0 ? `${totals.roiMultiple}×` : "—"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">net of plan fees</span>
          </div>
          <span className="text-xs text-muted-foreground" suppressHydrationWarning>
            across {totals.podCount} pod{totals.podCount === 1 ? "" : "s"} ·{" "}
            {usd0(totals.valueUsd)} value vs {usd0(totals.allInCostUsd)} all-in
          </span>
        </div>
        <RoiHeroTile
          label="Human-hours freed"
          value={totals.mergedCount > 0 ? `${totals.hoursFreed.toLocaleString("en-US")} h` : "—"}
          subcaption={`= ${usd0(totals.valueUsd)} at your blended rate (${derived.rateLine})`}
        />
        <RoiHeroTile
          label="Cost / merged ticket"
          value={totals.mergedCount > 0 ? usd2(totals.costPerMergedUsd) : "—"}
          tier="as_agents_ship"
          subcaption={`${totals.mergedCount} merged across pods`}
        />
        <RoiHeroTile
          label="Cost / story point"
          value={totals.storyPoints > 0 ? usd2(totals.costPerStoryPointUsd) : "—"}
          tier="as_agents_ship"
          subcaption={`${totals.storyPoints} story points across pods`}
        />
      </section>

      {/* 3 · Pod table */}
      <section className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Pods · click a row to open its Overview · ROI
          </span>
          {hydrated && pods.length === 1 && (
            <span className="text-[11px] text-muted-foreground font-mono">
              One pod live — the portfolio view grows with you.
            </span>
          )}
        </div>
        {!hydrated ? (
          <div className="glass-panel p-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <OrgRollupTable pods={pods} onOpenPod={openPod} />
        )}
      </section>

      {/* 4 · Expansion engine */}
      <ExpansionHintCard />
    </div>
  );
}
