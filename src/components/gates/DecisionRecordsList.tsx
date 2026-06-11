/**
 * DecisionRecordsList — the design's architecture decision records on the
 * SA gate review: chosen option vs alternatives, the rationale, and an
 * honest confidence badge — Low-confidence decisions are marked and
 * surfaced for human attention (same honesty discipline as the spec's
 * V7 marking), because the reviewer's job is exactly these judgment calls.
 */

import { GitFork } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DecisionRecord } from "@/mock/gate-detail";

export const DESIGN_ADR_BLOCK_ID = "design-decision-records";

export function DecisionRecordsList({ records }: { records: DecisionRecord[] }) {
  return (
    <section
      id={DESIGN_ADR_BLOCK_ID}
      className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-5 scroll-mt-24"
    >
      <div className="flex items-center gap-2">
        <GitFork className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Decision records</h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          {records.length} decisions · alternatives stated
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        The judgment calls inside this design — what was chosen, what was not, and why.
        Low-confidence decisions are marked: they are where your review earns its keep.
      </p>
      <div className="mt-3 space-y-3">
        {records.map((r) => (
          <article
            key={r.id}
            className={cn(
              "rounded-md border p-3.5",
              r.confidence === "low"
                ? "border-status-waiting/40 bg-status-waiting/5"
                : "border-border bg-white/[0.02]",
            )}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-border bg-white/5">
                {r.id}
              </span>
              <span className="text-xs font-semibold">{r.title}</span>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
                  r.confidence === "low"
                    ? "border-status-waiting/50 bg-status-waiting/10 text-status-waiting"
                    : "border-status-done/40 bg-status-done/10 text-status-done",
                )}
              >
                {r.confidence === "low" ? "low confidence — review this" : "high confidence"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
                chosen: {r.choice}
              </span>
              {r.alternatives.map((alt) => (
                <span
                  key={alt}
                  className="px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground line-through decoration-muted-foreground/40"
                >
                  {alt}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{r.rationale}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
