/**
 * BudgetPanel — the /economics "Run-rate vs. budget" row (C2): binds the
 * unbounded-cost fear right under the ROI hero. Left: a linear run-rate
 * gauge (projected month-end vs. the cap, green/amber/red zones). Right:
 * the month-to-date burn bar with a projected-EOM ghost segment and a cap
 * marker. Over-cap renders the inline alert deep-linking to Usage & Billing.
 *
 * Canonical `budget` lives in @/mock/billing (single source — /billing
 * renders the same numbers as client consumption).
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, Wallet } from "lucide-react";
import { budget, CAP_STATUS_LABELS, plan, type CapStatus } from "@/mock/billing";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const STATUS_CHIP: Record<CapStatus, string> = {
  on_track: "border-status-done/40 bg-status-done/10 text-status-done",
  watch: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
  over: "border-status-error/40 bg-status-error/10 text-status-error",
};

function periodEndLabel(): string {
  const d = new Date(`${plan.billingPeriodEnd}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function BudgetPanel({ className }: { className?: string }) {
  const { monthlyCapUsd, mtdSpendUsd, projectedMonthlyUsd, daysElapsed, daysInMonth, capStatus } =
    budget;
  const hasCap = monthlyCapUsd > 0;
  const endLabel = periodEndLabel();

  return (
    <section className={cn("glass-panel p-4 space-y-3", className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Wallet className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Run-rate vs. budget
          </span>
        </div>
        {hasCap ? (
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
              STATUS_CHIP[capStatus],
            )}
          >
            {CAP_STATUS_LABELS[capStatus]}
          </span>
        ) : (
          <Link to="/billing" className="text-xs text-primary hover:underline">
            Set cap →
          </Link>
        )}
      </div>

      {!hasCap ? (
        <p className="text-xs text-muted-foreground">
          No budget cap set — set one in Usage &amp; Billing to bound the monthly run-rate.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <RunRateGauge
            capUsd={monthlyCapUsd}
            projectedUsd={projectedMonthlyUsd}
            endLabel={endLabel}
          />
          <BurnBar
            capUsd={monthlyCapUsd}
            mtdUsd={mtdSpendUsd}
            projectedUsd={projectedMonthlyUsd}
            daysElapsed={daysElapsed}
            daysInMonth={daysInMonth}
            endLabel={endLabel}
          />
        </div>
      )}

      {hasCap && capStatus === "over" && (
        <div className="rounded-md border border-status-error/40 bg-status-error/10 px-3 py-2 text-xs flex items-center gap-2 flex-wrap">
          <span className="text-status-error">
            Projected run-rate exceeds the monthly cap by {usd(projectedMonthlyUsd - monthlyCapUsd)}.
          </span>
          <Link to="/billing" className="inline-flex items-center gap-1 text-primary hover:underline">
            Review usage <ArrowRight className="size-3" />
          </Link>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Run-rate gauge — projected month-end vs. cap, zoned scale            */
/* ------------------------------------------------------------------ */

function RunRateGauge({
  capUsd,
  projectedUsd,
  endLabel,
}: {
  capUsd: number;
  projectedUsd: number;
  endLabel: string;
}) {
  // Scale leaves headroom past the cap so an over-cap needle stays on-screen.
  const scale = Math.max(capUsd * 1.25, projectedUsd * 1.1);
  const pct = (v: number) => Math.min(100, (v / scale) * 100);
  const needle = pct(projectedUsd);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          Projected this month vs. cap
        </span>
        <span className="text-xs font-mono tabular-nums" suppressHydrationWarning>
          <span className="text-foreground font-semibold">{usd(projectedUsd)}</span>
          <span className="text-muted-foreground"> / {usd(capUsd)} cap</span>
        </span>
      </div>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative h-3 rounded-full overflow-hidden border border-border cursor-help">
              {/* zones: green to 80% of cap · amber to cap · red beyond */}
              <div
                className="absolute inset-y-0 left-0 bg-status-done/25"
                style={{ width: `${pct(capUsd * 0.8)}%` }}
              />
              <div
                className="absolute inset-y-0 bg-status-waiting/25"
                style={{ left: `${pct(capUsd * 0.8)}%`, width: `${pct(capUsd) - pct(capUsd * 0.8)}%` }}
              />
              <div
                className="absolute inset-y-0 bg-status-error/25"
                style={{ left: `${pct(capUsd)}%`, right: 0 }}
              />
              {/* cap tick */}
              <div
                className="absolute inset-y-0 w-px bg-foreground/60"
                style={{ left: `${pct(capUsd)}%` }}
              />
              {/* projected needle */}
              <div
                className="absolute inset-y-0 w-[3px] rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
                style={{ left: `calc(${needle}% - 1.5px)` }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-mono text-xs">
            Projected {usd(projectedUsd)} by {endLabel} · cap {usd(capUsd)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
        <span>$0</span>
        <span>cap {usd(capUsd)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MTD burn bar — actual + projected-EOM ghost segment                  */
/* ------------------------------------------------------------------ */

function BurnBar({
  capUsd,
  mtdUsd,
  projectedUsd,
  daysElapsed,
  daysInMonth,
  endLabel,
}: {
  capUsd: number;
  mtdUsd: number;
  projectedUsd: number;
  daysElapsed: number;
  daysInMonth: number;
  endLabel: string;
}) {
  const scale = Math.max(capUsd * 1.25, projectedUsd * 1.1);
  const pct = (v: number) => Math.min(100, (v / scale) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          Month-to-date burn
        </span>
        <span className="text-xs font-mono tabular-nums text-muted-foreground" suppressHydrationWarning>
          day {daysElapsed} of {daysInMonth}
        </span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden border border-border bg-white/[0.03]">
        {/* projected-EOM ghost segment */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct(projectedUsd)}%`,
            background:
              "repeating-linear-gradient(45deg, color-mix(in srgb, var(--primary) 25%, transparent) 0 4px, transparent 4px 8px)",
          }}
        />
        {/* actual MTD */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
          style={{ width: `${pct(mtdUsd)}%` }}
        />
        {/* cap marker */}
        <div className="absolute inset-y-0 w-px bg-foreground/60" style={{ left: `${pct(capUsd)}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
        <span suppressHydrationWarning>
          MTD <span className="text-foreground">{usd(mtdUsd)}</span>
        </span>
        <span suppressHydrationWarning>
          projected <span className="text-foreground">{usd(projectedUsd)}</span> by {endLabel}
        </span>
      </div>
    </div>
  );
}
