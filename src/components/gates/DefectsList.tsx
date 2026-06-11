/**
 * DefectsList — the QA review's filed defects + the agent's ship/hold
 * verdict. Each defect names its SUSPECTED ROOT-CAUSE STAGE — the rework
 * canon on a decision surface: a reject from this gate should target the
 * stage where the failure was born (QA's report proposes it via
 * traceability; the human confirms or overrides).
 */

import { Bug, PackageCheck, PackageX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QaDefect, ReleaseRecommendation } from "@/mock/gate-detail";

export const QA_DEFECTS_BLOCK_ID = "qa-defects";

const SEVERITY_PILL: Record<QaDefect["severity"], string> = {
  critical: "border-status-error/50 bg-status-error/10 text-status-error",
  medium: "border-status-waiting/50 bg-status-waiting/10 text-status-waiting",
  low: "border-border bg-white/5 text-muted-foreground",
};

export function DefectsList({
  defects,
  recommendation,
}: {
  defects: QaDefect[];
  recommendation?: ReleaseRecommendation;
}) {
  return (
    <section
      id={QA_DEFECTS_BLOCK_ID}
      className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-5 scroll-mt-24"
    >
      <div className="flex items-center gap-2">
        <Bug className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Defects & verdict</h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          {defects.length} filed · each names its suspected root-cause stage
        </span>
      </div>

      {recommendation && (
        <div
          className={cn(
            "mt-3 rounded-md border px-3 py-2.5 flex items-start gap-2",
            recommendation.verdict === "hold"
              ? "border-status-waiting/50 bg-status-waiting/10"
              : "border-status-done/40 bg-status-done/10",
          )}
        >
          {recommendation.verdict === "hold" ? (
            <PackageX className="size-4 text-status-waiting shrink-0 mt-0.5" />
          ) : (
            <PackageCheck className="size-4 text-status-done shrink-0 mt-0.5" />
          )}
          <div>
            <div
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                recommendation.verdict === "hold" ? "text-status-waiting" : "text-status-done",
              )}
            >
              QA recommends: {recommendation.verdict === "hold" ? "HOLD" : "SHIP"}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{recommendation.note}</p>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-3">
        {defects.map((d) => (
          <article key={d.id} className="rounded-md border border-border bg-white/[0.02] p-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-border bg-white/5">
                {d.id}
              </span>
              <span className="text-xs font-semibold">{d.title}</span>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
                  SEVERITY_PILL[d.severity],
                )}
              >
                {d.severity}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
                traces to: {d.suspectedStage}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{d.evidence}</p>
          </article>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Rework follows the artifact chain: rejecting this gate can target the root-cause stage
        directly — everything downstream of the corrected artifact re-runs forward.
      </p>
    </section>
  );
}
