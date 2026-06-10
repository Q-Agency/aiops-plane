/**
 * StatusView — /status "Platform status" (wave 2, Blind spot 5): the
 * per-tenant status page, client-clean and calm — header with the overall
 * pill, component health rows with 90-day uptime bars, the degradation
 * honesty card, and the SLA footer (uptime target + ledger RPO). Doubles
 * as the procurement artifact ("what happens when *you* go down").
 */

import { usePods, SAMPLE_POD, TENANCY_LINE } from "@/lib/pods/pod-store";
import {
  overallState,
  OVERALL_PILL_COPY,
  platformSla,
  STATUS_COMPONENTS,
  type ComponentState,
} from "@/mock/status";
import { cn } from "@/lib/utils";
import { DegradationExplainer } from "./DegradationExplainer";
import { StatusComponentRow } from "./StatusComponentRow";

const PILL_TONE: Record<ComponentState, string> = {
  operational: "border-status-done/40 bg-status-done/10 text-status-done",
  degraded: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
  down: "border-status-error/40 bg-status-error/10 text-status-error",
};

const PILL_DOT: Record<ComponentState, string> = {
  operational: "bg-status-done",
  degraded: "bg-status-waiting animate-pulse",
  down: "bg-status-error animate-pulse",
};

export function StatusView() {
  const { activePod } = usePods();
  const tenant = activePod?.name ?? SAMPLE_POD.name;
  const overall = overallState();

  return (
    <div className="p-4 lg:p-6 h-full overflow-y-auto scrollbar-thin">
      {/* client-clean centered column */}
      <div className="mx-auto w-full max-w-3xl space-y-4 pb-10">
        <header className="flex items-start justify-between gap-3 flex-wrap pt-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              platform status
            </div>
            <h1 className="text-xl font-semibold tracking-tight mt-0.5">
              Platform status — {tenant}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {TENANCY_LINE} · component health and 90-day uptime for your tenant.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
              PILL_TONE[overall],
            )}
          >
            <span className={cn("size-1.5 rounded-full", PILL_DOT[overall])} />
            {OVERALL_PILL_COPY[overall]}
          </span>
        </header>

        {/* component health + per-component uptime bars */}
        <div className="space-y-2.5">
          {STATUS_COMPONENTS.map((c) => (
            <StatusComponentRow key={c.id} component={c} />
          ))}
        </div>

        <DegradationExplainer />

        <footer className="text-center text-[11px] font-mono text-muted-foreground pt-1">
          Uptime target {platformSla.uptimeTargetPct}% · ledger RPO {platformSla.ledgerRpoMin} min
        </footer>
      </div>
    </div>
  );
}
