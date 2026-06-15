/**
 * PilotWeekStrip (/pilot, P1-C3) - the week 1-6 record: one column per week,
 * one status dot per metric. Weeks with no actuals yet render as pending
 * (hollow dots); a one-time metric (TTFAA) shows "-" after its signal week.
 * The period select re-scopes the strip without touching the tiles above.
 */

import { useState } from "react";
import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PILOT_METRIC_LABELS,
  PILOT_PLAN,
  pilotMetricStatus,
  pilotProgress,
} from "@/mock/pilot";
import { cn } from "@/lib/utils";

const SHORT_LABELS: Record<string, string> = {
  ttfaaHr: "TTFAA",
  approvedArtifactsPerWeek: "Artifacts / wk",
  gateClearanceP50Hr: "Clearance p50",
  validatorPassRatePct: "Validator pass",
  spendVsCapPct: "Spend vs cap",
};

function cellValueLabel(metric: string, v: number): string {
  switch (metric) {
    case "ttfaaHr":
    case "gateClearanceP50Hr":
      return `${v}h`;
    case "validatorPassRatePct":
    case "spendVsCapPct":
      return `${v}%`;
    default:
      return `${v}`;
  }
}

type StripScope = "all" | "1-3" | "4-6";

const SCOPES: { id: StripScope; label: string }[] = [
  { id: "all", label: "All weeks" },
  { id: "1-3", label: "Weeks 1-3" },
  { id: "4-6", label: "Weeks 4-6" },
];

export function PilotWeekStrip() {
  const [scope, setScope] = useState<StripScope>("all");
  const progress = pilotProgress();
  const currentWeek = progress.ended
    ? null
    : Math.min(6, Math.floor(progress.daysElapsed / 7) + 1);

  const weeks = PILOT_PLAN.weekly.filter((w) =>
    scope === "all" ? true : scope === "1-3" ? w.week <= 3 : w.week >= 4,
  );

  return (
    <section className="glass-panel p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarRange className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Week 1-6 record
          </span>
          <span className="text-[10px] text-muted-foreground/70 font-mono">
            · measured by the same ledger that runs the pod
          </span>
        </div>
        <Select value={scope} onValueChange={(v) => setScope(v as StripScope)}>
          <SelectTrigger className="h-7 w-32 text-xs" aria-label="Strip period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCOPES.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              <th className="text-left px-2 py-2 font-medium">Metric</th>
              {weeks.map((w) => {
                const pending = Object.keys(w.actuals).length === 0;
                return (
                  <th key={w.week} className="text-center px-2 py-2 font-medium">
                    <span className={cn(w.week === currentWeek && "text-primary")}>
                      Wk {w.week}
                      {w.week === currentWeek && " · now"}
                    </span>
                    {pending && (
                      <span className="block normal-case tracking-normal text-[9px] text-muted-foreground/60">
                        pending
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {PILOT_PLAN.criteria.map((c) => (
              <tr key={c.metric} className="border-b border-border/60 last:border-b-0">
                <td
                  className="px-2 py-2.5 text-foreground"
                  title={PILOT_METRIC_LABELS[c.metric] ?? c.metric}
                >
                  {SHORT_LABELS[c.metric] ?? c.metric}
                </td>
                {weeks.map((w) => {
                  const v = w.actuals[c.metric];
                  const pendingCol = Object.keys(w.actuals).length === 0;
                  const status = v !== undefined ? pilotMetricStatus(c.metric, w) : null;
                  return (
                    <td
                      key={w.week}
                      className="px-2 py-2.5 text-center"
                      title={
                        v !== undefined
                          ? `wk ${w.week} · ${PILOT_METRIC_LABELS[c.metric]}: ${cellValueLabel(c.metric, v)} vs target ${c.target} ${c.unit}`
                          : pendingCol
                            ? `wk ${w.week} - no signal yet`
                            : `wk ${w.week} - no signal (one-time metric)`
                      }
                    >
                      {v !== undefined ? (
                        <span className="inline-flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              "size-2.5 rounded-full",
                              status === "hit"
                                ? "bg-status-done shadow-[0_0_6px_var(--status-done)]"
                                : "bg-status-error shadow-[0_0_6px_var(--status-error)]",
                            )}
                          />
                          <span
                            className={cn(
                              "text-[10px] font-mono tabular-nums",
                              status === "miss" ? "text-status-error" : "text-muted-foreground",
                            )}
                          >
                            {cellValueLabel(c.metric, v)}
                          </span>
                        </span>
                      ) : pendingCol ? (
                        <span className="inline-block size-2.5 rounded-full border border-dashed border-muted-foreground/40" />
                      ) : (
                        <span className="text-muted-foreground/40 font-mono">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground border-t border-border/60 pt-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-status-done" /> hit
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-status-error" /> missed - shown honestly
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-dashed border-muted-foreground/50" />{" "}
          pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span>-</span> no signal
        </span>
      </div>
    </section>
  );
}
