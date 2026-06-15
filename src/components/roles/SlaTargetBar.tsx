/**
 * SlaTargetBar - one "target vs actual" mini-bar on the Exec Status Digest.
 * Renders a DERIVED `SlaTarget` projection (sla.ts `slaTargets()`), never a
 * second stored shape - the SLA definitions on /reports stay the source.
 */

import { cn } from "@/lib/utils";
import type { SlaTarget } from "@/mock/sla";

function fmtMin(m: number): string {
  if (m >= 90) {
    const h = m / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
  }
  return `${m}m`;
}

export function SlaTargetBar({ target }: { target: SlaTarget }) {
  const ratio = target.targetMin > 0 ? target.actualMin / target.targetMin : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const tone = target.breached
    ? "bg-status-error"
    : ratio >= 0.8
      ? "bg-status-waiting"
      : "bg-status-done";

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-foreground truncate">{target.label}</span>
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">
          {fmtMin(target.actualMin)} actual · target ≤ {fmtMin(target.targetMin)}
          {target.breached && <span className="text-status-error"> · breached</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 border border-border/60 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-[width]", tone)}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
    </div>
  );
}
