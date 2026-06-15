/**
 * SlaStatusTab (/reports · "SLA" tab, C8) - service-level definitions as
 * target-vs-actual rows with breach history.
 *
 * Breached rows are pinned to the top with a red left-border accent; clicking
 * any row opens the SlaBreachDrawer (right Sheet) with that SLA's breach
 * timeline - each breach deep-links to the work item on /pipeline.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle, CheckCircle2, ExternalLink, Flame, Gauge, MoonStar, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { fmtDateTime } from "@/lib/time";
import {
  breachesFor, slaClockSubline, slaDefinitions, slaSummary, slaTargetLabel,
  SLA_STATUS_LABELS, type SlaDefinition, type SlaStatus,
} from "@/mock/sla";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Formatting + status meta                                             */
/* ------------------------------------------------------------------ */

function fmtVal(v: number, unit: SlaDefinition["unit"]): string {
  switch (unit) {
    case "min":
      return `${v}m`;
    case "hr":
      return `${v}h`;
    case "per_week":
      return `${v}/week`;
    case "pct":
      return `${v}%`;
  }
}

function fmtOverBy(min: number): string {
  return min >= 90 ? `${(min / 60).toFixed(min % 60 === 0 ? 0 : 1)}h` : `${min}m`;
}

const STATUS_META: Record<
  SlaStatus,
  { icon: typeof CheckCircle2; tone: string; pill: string; bar: string }
> = {
  on_track: {
    icon: CheckCircle2,
    tone: "text-status-done",
    pill: "border-status-done/40 bg-status-done/10 text-status-done",
    bar: "var(--status-done)",
  },
  at_risk: {
    icon: AlertTriangle,
    tone: "text-status-waiting",
    pill: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
    bar: "var(--status-waiting)",
  },
  breached: {
    icon: XCircle,
    tone: "text-status-error",
    pill: "border-status-error/40 bg-status-error/10 text-status-error",
    bar: "var(--status-error)",
  },
};

const STATUS_RANK: Record<SlaStatus, number> = { breached: 0, at_risk: 1, on_track: 2 };

/* ------------------------------------------------------------------ */
/* Tab                                                                  */
/* ------------------------------------------------------------------ */

export function SlaStatusTab() {
  const [openSlaId, setOpenSlaId] = useState<string | null>(null);

  const rows = useMemo(
    () => [...slaDefinitions].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]),
    [],
  );
  const summary = slaSummary();
  const breaches30d = slaDefinitions.reduce((n, s) => n + s.breachCount30d, 0);
  const openSla = rows.find((s) => s.id === openSlaId) ?? null;

  if (slaDefinitions.length === 0) {
    return (
      <div className="glass-panel p-8 max-w-md mx-auto mt-10 text-center space-y-3">
        <Gauge className="size-6 mx-auto text-muted-foreground" />
        <div className="text-sm text-foreground">No SLAs defined for this pod yet.</div>
        <div className="text-xs text-muted-foreground">
          SLAs are set per stage when you launch a pod.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.success("Blueprint default SLAs applied (mock)")}
        >
          Use blueprint defaults
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* summary tiles */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <SummaryTile icon={CheckCircle2} label="On track" value={summary.onTrack} tone="text-status-done" />
        <SummaryTile icon={AlertTriangle} label="At risk" value={summary.atRisk} tone="text-status-waiting" />
        <SummaryTile
          icon={XCircle}
          label="SLAs breached"
          value={summary.breached}
          tone={summary.breached > 0 ? "text-status-error" : "text-muted-foreground"}
          alert={summary.breached > 0}
        />
        <SummaryTile icon={Flame} label="Breaches · 30d" value={breaches30d} tone="text-foreground" />
      </section>

      {/* definitions table */}
      <section className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="size-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Service-level targets
            </span>
            <span className="text-[10px] text-muted-foreground/70 font-mono">
              · click a row for breach history
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
            {(Object.keys(STATUS_META) as SlaStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: STATUS_META[s].bar }} />
                {SLA_STATUS_LABELS[s]}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-panel overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <Th>sla</Th>
                <Th>scope</Th>
                <Th className="text-right">target</Th>
                <Th className="text-right">actual</Th>
                <Th className="min-w-[140px]">target vs actual</Th>
                <Th>trend · 7</Th>
                <Th className="text-right">breaches 30d</Th>
                <Th>status</Th>
                <Th>last breach</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const meta = STATUS_META[s.status];
                const clockLine = slaClockSubline(s);
                return (
                  <tr
                    key={s.id}
                    onClick={() => setOpenSlaId(s.id)}
                    className={cn(
                      "border-b border-border/60 last:border-b-0 hover:bg-white/[0.03] cursor-pointer transition-colors",
                      s.status === "breached" && "border-l-2 border-l-status-error bg-status-error/[0.04]",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="text-foreground font-medium">{s.label}</div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {s.metric.replace("_", " ")}
                      </div>
                      {/* P1-O1 clock mode - coverage clocks pause when nobody is staffed */}
                      {clockLine && (
                        <div
                          className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 flex items-center gap-1"
                          title="coverage_hours clock - the SLA timer pauses outside the pod's staffed window, so overnight waits are not fake breaches"
                        >
                          <MoonStar className="size-2.5 shrink-0" />
                          {clockLine}
                        </div>
                      )}
                      {s.wouldBe24x7 != null && (
                        /* honesty hint: the fake-overnight-breach fix, made visible */
                        <div className="text-[10px] font-mono text-status-waiting/90 mt-0.5">
                          would read {fmtVal(s.wouldBe24x7, s.unit)} under a 24×7 clock
                          {s.comparator === "lte" && s.wouldBe24x7 > s.targetValue ? " - a breach" : ""}
                          {" · "}overnight idle excluded, not hidden
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        {s.scope}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {slaTargetLabel(s)}
                    </td>
                    <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums font-semibold", meta.tone)}>
                      {fmtVal(s.actualValue, s.unit)}
                    </td>
                    <td className="px-3 py-2.5">
                      <TargetVsActualBar sla={s} />
                    </td>
                    <td className="px-3 py-2.5">
                      <BreachSparkline points={s.trend} color={meta.bar} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {s.breachCount30d > 0 ? (
                        <span className={s.status === "breached" ? "text-status-error" : "text-foreground"}>
                          {s.breachCount30d}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
                          meta.pill,
                        )}
                      >
                        <meta.icon className="size-3" />
                        {SLA_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground" suppressHydrationWarning>
                      {s.lastBreachAt ? fmtDateTime(s.lastBreachAt) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <SlaBreachDrawer sla={openSla} onClose={() => setOpenSlaId(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                               */
/* ------------------------------------------------------------------ */

function SummaryTile({
  icon: Icon, label, value, tone, alert,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number;
  tone: string;
  alert?: boolean;
}) {
  return (
    <div className={cn("glass-panel p-3", alert && "border-status-error/40")}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <Icon className={cn("size-3", tone)} /> {label}
      </div>
      <div className={cn("mt-1.5 text-xl font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}

/**
 * Bar scaled to max(target, actual) with a tick at the target - honest for
 * both "stay under" (lte) and "stay above" (gte) comparators; the fill color
 * carries the verdict.
 */
function TargetVsActualBar({ sla }: { sla: SlaDefinition }) {
  const scale = Math.max(sla.targetValue, sla.actualValue) * 1.15;
  const fillPct = Math.min(100, (sla.actualValue / scale) * 100);
  const tickPct = Math.min(100, (sla.targetValue / scale) * 100);
  return (
    <div className="relative h-1.5 rounded bg-white/5 overflow-visible min-w-[120px]" title={`actual ${fmtVal(sla.actualValue, sla.unit)} vs target ${slaTargetLabel(sla)}`}>
      <div
        className="h-full rounded"
        style={{ width: `${fillPct}%`, background: STATUS_META[sla.status].bar, opacity: 0.75 }}
      />
      <div
        className="absolute -top-0.5 h-2.5 w-px bg-foreground/70"
        style={{ left: `${tickPct}%` }}
        title={`target ${slaTargetLabel(sla)}`}
      />
    </div>
  );
}

function BreachSparkline({ points, color }: { points: number[]; color: string }) {
  const W = 64;
  const H = 18;
  const P = 2;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const pts = points
    .map((v, i) => {
      const x = P + (i * (W - 2 * P)) / (points.length - 1);
      const y = P + (1 - (v - min) / span) * (H - 2 * P);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-16 h-[18px]" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" opacity="0.85" />
    </svg>
  );
}

function SlaBreachDrawer({ sla, onClose }: { sla: SlaDefinition | null; onClose: () => void }) {
  const breaches = sla ? breachesFor(sla.id) : [];
  const meta = sla ? STATUS_META[sla.status] : null;
  return (
    <Sheet open={!!sla} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto scrollbar-thin border-border bg-panel/95 backdrop-blur-md">
        {sla && meta && (
          <>
            <SheetHeader>
              <SheetTitle className="text-base">Breach history - {sla.label}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                  target {slaTargetLabel(sla)}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase tracking-wider rounded border px-1.5 py-0.5",
                    meta.pill,
                  )}
                >
                  {SLA_STATUS_LABELS[sla.status]} · now {fmtVal(sla.actualValue, sla.unit)}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-2">
              {breaches.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-4 text-center">
                  No breaches recorded in the last 30 days.
                </div>
              ) : (
                <ol className="relative border-l border-border ml-2 space-y-4 py-1">
                  {breaches.map((b) => (
                    <li key={b.id} className="ml-4">
                      <span className="absolute -left-[5px] mt-1 size-2.5 rounded-full bg-status-error border-2 border-background" />
                      <div className="text-[10px] font-mono text-muted-foreground" suppressHydrationWarning>
                        {fmtDateTime(b.occurredAt)}
                      </div>
                      <div className="mt-0.5 text-xs">
                        {b.workItemId ? (
                          <Link
                            to="/pipeline"
                            className="font-mono text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                            onClick={onClose}
                          >
                            {b.workItemId}
                            <ExternalLink className="size-2.5" />
                          </Link>
                        ) : null}
                        <span className="text-foreground ml-1">{b.workItemTitle ?? "Pod-level breach"}</span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5 tabular-nums">
                        <span className="text-status-error">{fmtVal(b.actualValue, sla.unit)}</span>
                        {" vs "}
                        {fmtVal(b.targetValue, sla.unit)} target
                        {" · "}
                        <span className="text-status-error">{fmtOverBy(b.durationOverMin)} over</span>
                        {" · "}
                        {b.stage}
                      </div>
                      {b.note && (
                        <div className="text-[11px] text-muted-foreground mt-1 border-l-2 border-border pl-2">
                          {b.note}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="mt-6 text-[10px] font-mono text-muted-foreground border-t border-border pt-3">
              Breaches feed the weekly client report - shown honestly, with the mitigation note.
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground", className)}>
      {children}
    </th>
  );
}
