/**
 * QaCoverageMap - the spec → test coverage map on the QA gate review (the
 * chain closing where it started): one row per acceptance criterion of the
 * ORIGINAL spec, showing the tests that verify it and their result. This
 * is what deterministic check Q1 verifies - a failing test here links a
 * filed defect (Q3), never a bare red.
 */

import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QaCoverageRow } from "@/mock/gate-detail";

export const QA_COVERAGE_BLOCK_ID = "qa-coverage-map";

export function QaCoverageMap({
  rows,
  highlight,
}: {
  rows: QaCoverageRow[];
  highlight?: boolean;
}) {
  const failing = rows.reduce(
    (a, r) => a + r.tests.filter((x) => x.status === "fail").length,
    0,
  );
  return (
    <section
      id={QA_COVERAGE_BLOCK_ID}
      className={cn(
        "rounded-md border border-border bg-panel/40 backdrop-blur-md p-5 scroll-mt-24 transition-shadow",
        highlight && "ring-2 ring-primary/60 shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_25%,transparent)]",
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">Spec → test coverage</h3>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
            failing === 0
              ? "border-status-done/40 bg-status-done/10 text-status-done"
              : "border-status-waiting/50 bg-status-waiting/10 text-status-waiting",
          )}
        >
          {rows.length}/{rows.length} criteria tested · {failing} failing
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        The chain closes where it started: every acceptance criterion of the spec, verified by a
        named test. Parity is checked deterministically (Q1); a failing test must link a filed
        defect (Q3).
      </p>
      <ul className="mt-3 divide-y divide-border/60">
        {rows.map((r) => (
          <li key={r.acId} className="py-2 flex items-start gap-2.5 flex-wrap">
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-border bg-white/5 shrink-0">
              {r.acId}
            </span>
            <span className="text-xs text-foreground/90 min-w-0">{r.summary}</span>
            <ArrowRight className="size-3 text-muted-foreground/60 shrink-0 mt-1" />
            <span className="flex flex-wrap gap-1.5">
              {r.tests.map((x) => (
                <span
                  key={x.name}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border",
                    x.status === "pass"
                      ? "border-status-done/40 bg-status-done/10 text-status-done"
                      : "border-status-error/40 bg-status-error/10 text-status-error",
                  )}
                >
                  {x.status === "pass" ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  {x.name}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
