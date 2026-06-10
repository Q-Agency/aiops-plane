/**
 * PilotView — /pilot Pilot Scorecard (wave 2, P1-C3): the targets set in
 * FIRE UP → Go live → Targets & budget, measured by the same ledger that
 * runs the pod.
 *
 *   1. Header — pilot window + days-remaining chip (+ window-closed banner).
 *   2. PilotTargetsBand — target-vs-actual tiles, honest red on misses.
 *   3. PilotWeekStrip — the week 1–6 record, per-metric status dots.
 *   4. BaselinePanel + ConversionSheet — "your numbers, not ours" + the
 *      pre-filled conversion math (every figure a pricing hypothesis).
 *
 * States: mid-pilot populated (default) · pilot ended (banner + export) ·
 * not in pilot mode (calm empty state — PILOT_MODE ships true in the mock,
 * but the branch is real product behavior).
 */

import { Link } from "@tanstack/react-router";
import { CalendarRange, CheckCircle2, FileText, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PILOT_MODE, PILOT_PLAN, pilotProgress } from "@/mock/pilot";
import { BaselinePanel } from "./BaselinePanel";
import { ConversionSheet, generateConversionSheet } from "./ConversionSheet";
import { PilotTargetsBand } from "./PilotTargetsBand";
import { PilotWeekStrip } from "./PilotWeekStrip";

const dateLabel = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

export function PilotView() {
  if (!PILOT_MODE) return <NotInPilot />;

  const progress = pilotProgress();

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      {/* 1 · Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            monitor · pilot
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Pilot scorecard</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            The targets you set before launch, measured by the same ledger that runs the pod.
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider gap-1.5">
            <CalendarRange className="size-3" />
            {dateLabel(PILOT_PLAN.startIso)} → {dateLabel(PILOT_PLAN.endIso, { month: "short", day: "numeric", year: "numeric" })}
          </Badge>
          <span
            className="inline-flex items-center gap-2 px-2.5 h-6 rounded-md border border-primary/40 bg-primary/10 text-primary text-[10px] font-mono uppercase tracking-wider"
            suppressHydrationWarning
          >
            {progress.ended
              ? "window closed"
              : `day ${progress.daysElapsed} of ${progress.daysTotal} · ${progress.daysRemaining} days left`}
          </span>
        </div>
      </div>

      {/* Pilot-ended banner */}
      {progress.ended && (
        <div className="rounded-md border border-status-done/40 bg-status-done/10 px-4 py-3 flex items-center gap-3 flex-wrap">
          <CheckCircle2 className="size-4 text-status-done shrink-0" />
          <div className="text-sm flex-1 min-w-48">
            <span className="font-semibold text-status-done">
              Pilot window closed — conversion sheet ready.
            </span>{" "}
            <span className="text-xs text-muted-foreground">
              The week 1–6 record below is final.
            </span>
          </div>
          <Button size="sm" onClick={generateConversionSheet}>
            <FileText className="size-3.5 mr-1.5" />
            Export conversion sheet
          </Button>
        </div>
      )}

      {/* 2 · Targets vs actuals */}
      <PilotTargetsBand />

      {/* 3 · Week 1–6 strip */}
      <PilotWeekStrip />

      {/* 4 · Baseline + conversion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <BaselinePanel />
        <ConversionSheet ended={progress.ended} />
      </div>
    </div>
  );
}

/** Calm empty state — direct nav while the tenant isn't running a pilot. */
function NotInPilot() {
  return (
    <div className="p-4 lg:p-6 h-full overflow-y-auto scrollbar-thin">
      <div className="glass-panel p-8 max-w-md mx-auto mt-10 text-center space-y-3">
        <Gauge className="size-6 mx-auto text-muted-foreground" />
        <div className="text-sm text-foreground">This pod isn&apos;t running a pilot.</div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          Pilot targets are set in FIRE UP → Go live → Targets &amp; budget. Once a pilot window
          opens, targets-vs-actuals land here — measured by the same ledger that runs the pod.
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/economics">Open Overview · ROI</Link>
        </Button>
      </div>
    </div>
  );
}
