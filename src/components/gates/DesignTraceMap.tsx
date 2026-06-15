/**
 * DesignTraceMap - the spec → architecture coverage map on the SA gate review
 * (architecture twin of the EARS block): one row per acceptance criterion of the
 * CONSUMED spec, showing which architecture sections address it. This is the
 * consumes-graph made reviewable - and exactly what deterministic check D1
 * verifies, so a failing D1 click lands here with the uncovered rows red.
 */

import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignTraceRow } from "@/mock/gate-detail";

export const DESIGN_TRACE_BLOCK_ID = "design-trace-map";

export function DesignTraceMap({
  rows,
  highlight,
}: {
  rows: DesignTraceRow[];
  highlight?: boolean;
}) {
  const uncovered = rows.filter((r) => !r.covered).length;
  return (
    <section
      id={DESIGN_TRACE_BLOCK_ID}
      className={cn(
        "rounded-md border border-border bg-panel/40 backdrop-blur-md p-5 scroll-mt-24 transition-shadow",
        highlight && "ring-2 ring-primary/60 shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_25%,transparent)]",
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">Spec → architecture coverage</h3>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
            uncovered === 0
              ? "border-status-done/40 bg-status-done/10 text-status-done"
              : "border-status-error/40 bg-status-error/10 text-status-error",
          )}
        >
          {rows.length - uncovered}/{rows.length} criteria covered
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        This architecture consumes <span className="font-mono">spec.md@v2</span> - every acceptance
        criterion must land in an architecture section. Checked deterministically (D1), not by a model.
      </p>
      <ul className="mt-3 divide-y divide-border/60">
        {rows.map((r) => (
          <li key={r.acId} className="py-2 flex items-start gap-2.5 flex-wrap">
            {r.covered ? (
              <CheckCircle2 className="size-3.5 text-status-done shrink-0 mt-0.5" />
            ) : (
              <XCircle className="size-3.5 text-status-error shrink-0 mt-0.5" />
            )}
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-border bg-white/5 shrink-0">
              {r.acId}
            </span>
            <span className="text-xs text-foreground/90 min-w-0">{r.summary}</span>
            <ArrowRight className="size-3 text-muted-foreground/60 shrink-0 mt-1" />
            {r.covered ? (
              <span className="flex flex-wrap gap-1.5">
                {r.sections.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary"
                  >
                    {s}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-[11px] px-1.5 py-0.5 rounded border border-status-error/40 bg-status-error/10 text-status-error">
                not addressed - D1 fails
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
