/**
 * EarsCriteriaList - the EARS acceptance-criteria block of the gate
 * review (C4). Renders each criterion in EARS shape with per-criterion
 * STRUCTURAL badges (has trigger? measurable response? AC-ID?).
 *
 * Read-only validator state - this is NOT a human checklist; the checks
 * come from the deterministic validators, a reviewer can't tick them.
 */

import { CheckCircle2, ListChecks, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EarsCriterion } from "@/mock/gate-detail";

export const EARS_BLOCK_ID = "gate-ears";

function StructBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "text-[9px] uppercase tracking-wider font-mono px-1 py-px rounded border",
        ok
          ? "border-status-done/40 bg-status-done/10 text-status-done"
          : "border-border bg-white/5 text-muted-foreground",
      )}
    >
      {label} {ok ? "✓" : "-"}
    </span>
  );
}

export function EarsCriteriaList({
  criteria,
  highlight = false,
}: {
  criteria: EarsCriterion[];
  /** Flashes the block (validator-row click-through). */
  highlight?: boolean;
}) {
  if (criteria.length === 0) return null;
  return (
    <section
      id={EARS_BLOCK_ID}
      className={cn(
        "rounded-md border border-border bg-panel/40 backdrop-blur-md p-5 scroll-mt-24 transition-shadow",
        highlight && "ring-2 ring-primary/50 shadow-[0_0_12px_var(--primary)]",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <ListChecks className="size-4 text-primary" />
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          Acceptance criteria (EARS)
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Structural readout per criterion - validator state, not a human checklist.
      </p>
      <ul className="space-y-3">
        {criteria.map((c) => (
          <li key={c.id} className="flex items-start gap-2.5">
            {c.valid ? (
              <CheckCircle2 className="size-3.5 text-status-done shrink-0 mt-0.5" />
            ) : (
              <XCircle className="size-3.5 text-status-error shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs text-foreground leading-relaxed">
                <span className="font-mono text-muted-foreground mr-2">{c.id}</span>
                <span className="text-primary/90 font-medium">{c.trigger}</span>
                {", "}
                <span>{c.response}.</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <StructBadge ok={Boolean(c.trigger)} label="trigger" />
                <StructBadge ok={c.measurable} label="measurable" />
                <StructBadge ok={Boolean(c.id)} label="AC-ID" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
