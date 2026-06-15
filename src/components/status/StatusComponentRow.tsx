/**
 * StatusComponentRow - one platform component on /status: state dot +
 * last-incident line + 90-day uptime bars; the header row expands the
 * last-incident detail (derived from the deterministic uptime seed - the
 * Ledger row links to the gap marker in Compliance).
 *
 * Degraded/down current states render "since {t}" inline; the Ledger
 * component carries the active sync-gap copy when degraded (no current
 * seed exercises it - wired for the honesty demo).
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import { fmtDateTime } from "@/lib/time";
import {
  uptimeDaysFor,
  uptimePctFor,
  type ComponentState,
  type StatusComponent,
  type UptimeDay,
} from "@/mock/status";
import { cn } from "@/lib/utils";
import { UptimeBars } from "./UptimeBars";

/* ----------------------------- helpers ------------------------------- */

const STATE_DOT: Record<ComponentState, string> = {
  operational: "bg-status-done shadow-[0_0_6px_var(--status-done)]",
  degraded: "bg-status-waiting shadow-[0_0_6px_var(--status-waiting)] animate-pulse",
  down: "bg-status-error shadow-[0_0_6px_var(--status-error)] animate-pulse",
};

const STATE_LABEL: Record<ComponentState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Disruption",
};

/** Last consecutive run of <100% days (oldest → newest within the run). */
function lastIncidentRun(componentId: string): UptimeDay[] | null {
  const days = uptimeDaysFor(componentId);
  let run: UptimeDay[] = [];
  let last: UptimeDay[] | null = null;
  for (const d of days) {
    if (d.pct < 100) {
      run.push(d);
    } else {
      if (run.length > 0) last = run;
      run = [];
    }
  }
  return run.length > 0 ? run : last;
}

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function fmtDay(isoDay: string): string {
  return dayFmt.format(new Date(`${isoDay}T00:00:00Z`));
}

function agoLabel(ts?: number): string {
  if (!ts) return "no incidents in the last 90 days";
  const d = Math.max(0, Math.round((Date.now() - ts) / 86_400_000));
  if (d === 0) return "last incident · today";
  if (d === 1) return "last incident · yesterday";
  return `last incident · ${d} days ago`;
}

/** Honest one-liner per component - consistent with the seeded history. */
const COMPONENT_NOTES: Record<string, string> = {
  dashboard:
    "Brief control-plane degradation - your agents were unaffected (the control plane is not in their execution path).",
  ledger:
    "A ledger sync gap - agents kept working, the ledger backfilled on reconnect, and the gap is marked honestly in Compliance.",
  gateway:
    "Elevated gateway latency - gate decisions queued and delivered; none were lost.",
  slack: "Slack bridge delays - gates remained answerable from the dashboard.",
  tools: "A connected tool rate-limited - retries succeeded; no data was lost.",
};

/* -------------------------------- row --------------------------------- */

export function StatusComponentRow({ component }: { component: StatusComponent }) {
  const [open, setOpen] = useState(false);
  const run = lastIncidentRun(component.id);
  const avg = uptimePctFor(component.id);
  const degraded = component.state !== "operational";

  return (
    <section className="glass-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <span className={cn("size-2 rounded-full shrink-0", STATE_DOT[component.state])} />
        <span className="text-sm font-medium text-foreground">{component.label}</span>
        <span
          className={cn(
            "text-[10px] font-mono uppercase tracking-wider",
            degraded ? "text-status-waiting" : "text-status-done",
          )}
        >
          {STATE_LABEL[component.state]}
        </span>
        <span className="flex-1" />
        <span className="text-[11px] text-muted-foreground hidden sm:inline" suppressHydrationWarning>
          {degraded && component.since
            ? `since ${fmtDateTime(component.since)}`
            : agoLabel(component.lastIncidentAt)}
        </span>
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
          {avg}% · 90d
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <div className="px-4 pb-3">
        <UptimeBars componentId={component.id} />
      </div>

      {open && (
        <div className="border-t border-border/60 px-4 py-3 space-y-2 text-xs text-muted-foreground">
          {/* current degraded state - the active sync-gap honesty line */}
          {degraded && component.since && (
            <div className="text-status-waiting" suppressHydrationWarning>
              {component.id === "ledger"
                ? `Sync gap open since ${fmtDateTime(component.since)} - the gap will be marked in Compliance.`
                : `Degraded since ${fmtDateTime(component.since)} - your agents are unaffected.`}
            </div>
          )}

          {/* last incident, derived from the seeded uptime history */}
          {run ? (
            <div>
              <span className="text-foreground">{fmtDay(run[0].day)}</span> - degraded for{" "}
              {run.length} day{run.length === 1 ? "" : "s"}, lowest daily uptime{" "}
              <span className="font-mono tabular-nums text-foreground">
                {Math.min(...run.map((d) => d.pct))}%
              </span>
              .
            </div>
          ) : (
            <div>No degradation recorded in the 90-day window.</div>
          )}

          <div>{COMPONENT_NOTES[component.id] ?? "Resolved - no client action was needed."}</div>

          {component.id === "ledger" && (
            <Link
              to="/compliance"
              hash="audit"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              View the gap marker in Compliance
              <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
