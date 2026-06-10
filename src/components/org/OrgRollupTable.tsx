/**
 * OrgRollupTable (/org, P1-C2) — one row per pod in the client org: status,
 * agents / accountable humans, open gates & incidents, MTD spend vs cap, and
 * the ROI-trio mini. Row click switches the active pod and lands on that
 * pod's /economics — proving pod scoping is real (each pod keeps its own
 * dataset). Paused rows mute; over-cap rows carry the red state inline.
 */

import { ArrowRight } from "lucide-react";
import type { LaunchedPod } from "@/lib/pods/pod-store";
import { cn } from "@/lib/utils";
import { podStats, type PodStats } from "./pod-stats";

const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Same tones as the PodSwitcher status badges. */
const STATUS_PILL: Record<LaunchedPod["status"], { label: string; cls: string }> = {
  live: { label: "Live", cls: "border-status-done/40 bg-status-done/10 text-status-done" },
  setup: {
    label: "Setting up",
    cls: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
  },
  paused: { label: "Paused", cls: "border-border bg-white/5 text-muted-foreground" },
};

export function OrgRollupTable({
  pods,
  onOpenPod,
}: {
  pods: LaunchedPod[];
  onOpenPod: (pod: LaunchedPod) => void;
}) {
  return (
    <div className="glass-panel overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-white/[0.02] text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            <th className="text-left px-3 py-2 font-medium">Pod</th>
            <th className="text-left px-3 py-2 font-medium">Status</th>
            <th className="text-right px-3 py-2 font-medium">Agents</th>
            <th className="text-right px-3 py-2 font-medium">Humans</th>
            <th className="text-right px-3 py-2 font-medium">Open gates</th>
            <th className="text-right px-3 py-2 font-medium">Incidents</th>
            <th className="text-left px-3 py-2 font-medium min-w-[160px]">MTD spend vs cap</th>
            <th className="text-left px-3 py-2 font-medium">ROI trio · this period</th>
            <th className="w-8 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {pods.map((pod) => {
            const s = podStats(pod);
            const humans = new Set(Object.values(pod.accountability).filter(Boolean)).size;
            const over = s.capUsd > 0 && s.mtdSpendUsd > s.capUsd;
            const status = STATUS_PILL[pod.status];
            return (
              <tr
                key={pod.id}
                onClick={() => onOpenPod(pod)}
                className={cn(
                  "border-b border-border/60 last:border-b-0 cursor-pointer hover:bg-white/[0.03] transition-colors group",
                  over && "border-l-2 border-l-status-error bg-status-error/[0.04]",
                  pod.status === "paused" && "opacity-60",
                )}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)] shrink-0" />
                    <span className="text-foreground font-medium truncate max-w-48">{pod.name}</span>
                    {pod.sample && (
                      <span className="px-1.5 py-px rounded border border-border bg-white/5 text-[9px] uppercase tracking-wider font-mono text-muted-foreground shrink-0">
                        Sample
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {pod.tenancyLine}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={cn(
                        "px-1.5 py-px rounded border text-[10px] uppercase tracking-wider font-mono",
                        status.cls,
                      )}
                    >
                      {status.label}
                    </span>
                    {over && (
                      <span className="px-1.5 py-px rounded border border-status-error/40 bg-status-error/10 text-status-error text-[10px] uppercase tracking-wider font-mono">
                        Over cap
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                  {pod.agentIds.length}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{humans}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                  {s.openGates > 0 ? (
                    <span className="text-primary">{s.openGates}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                  {s.openIncidents > 0 ? (
                    <span className="text-status-error">{s.openIncidents}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <SpendVsCapCell s={s} />
                </td>
                <td className="px-3 py-2.5">
                  <RoiTrioMini s={s} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors inline-block" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cells                                                                */
/* ------------------------------------------------------------------ */

function SpendVsCapCell({ s }: { s: PodStats }) {
  if (s.mtdSpendUsd <= 0) {
    return <span className="text-[11px] text-muted-foreground">no usage yet</span>;
  }
  const pct = (s.mtdSpendUsd / Math.max(1, s.capUsd)) * 100;
  const tone =
    pct > 100 ? "var(--status-error)" : pct >= 80 ? "var(--status-waiting)" : "var(--status-done)";
  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="h-1.5 rounded bg-white/5 overflow-hidden">
        <div
          className="h-full rounded"
          style={{ width: `${Math.min(100, pct)}%`, background: tone, opacity: 0.8 }}
        />
      </div>
      <div className="text-[10px] font-mono tabular-nums text-muted-foreground" suppressHydrationWarning>
        {usd0(s.mtdSpendUsd)} / {usd0(s.capUsd)}
        {pct > 100 && <span className="text-status-error"> · over</span>}
      </div>
    </div>
  );
}

/** Canonical trio, compact: hours freed · $/merged ticket · $/story point. */
function RoiTrioMini({ s }: { s: PodStats }) {
  if (s.mergedCount === 0) {
    return <span className="text-[11px] text-muted-foreground">no delivery yet</span>;
  }
  return (
    <span
      className="font-mono tabular-nums text-[11px] text-foreground whitespace-nowrap"
      title="Human-hours freed · cost / merged ticket · cost / story point"
      suppressHydrationWarning
    >
      {Math.round(s.hoursFreed).toLocaleString("en-US")}h
      <span className="text-muted-foreground/60"> · </span>${s.costPerMergedUsd}/ticket
      <span className="text-muted-foreground/60"> · </span>${s.costPerStoryPointUsd}/pt
    </span>
  );
}
