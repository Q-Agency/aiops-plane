/**
 * GatePolicyChip — small mono chip stating an agent's gate regime:
 * autonomy level (L0–L3) + gate-clearance SLA, from gate-policies.ts.
 * Hover/focus tooltip carries the full autonomy-ladder line. Used by the
 * /welcome charter card and any surface that promises a gate policy.
 *
 * P1-G1 extension: pass the matching per-artifact policy (`artifactPolicy`,
 * ARTIFACT_GATE_POLICIES) and the tooltip also states who must clear the
 * gate, n-eyes, and the review mode. `compact` trims the chip body to
 * "L0 · ≤ 4h" for dense queue rows.
 */

import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArtifactGatePolicy, GatePolicy } from "@/mock/gate-policies";
import { REVIEW_MODE_LABEL } from "@/components/gates/gate-config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface GatePolicyChipProps {
  policy: GatePolicy;
  /** Per-ArtifactKind gate policy — enriches the tooltip (queue/review rows). */
  artifactPolicy?: ArtifactGatePolicy;
  /** Dense body for queue rows: "L0 · ≤ 4h" (full slaLabel stays in the tooltip). */
  compact?: boolean;
  className?: string;
}

/** "≤ 4h gate clearance" → "≤ 4h" for the compact queue body. */
function shortSla(slaLabel: string): string {
  return slaLabel.replace(" gate clearance", "").replace(" review window", "");
}

export function GatePolicyChip({
  policy,
  artifactPolicy,
  compact,
  className,
}: GatePolicyChipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-mono cursor-default",
              className,
            )}
          >
            <ShieldCheck className="size-3" />
            <span className="font-semibold uppercase tracking-wider">{policy.autonomy}</span>
            <span className="text-primary/50">·</span>
            <span>{compact ? shortSla(policy.slaLabel) : policy.slaLabel}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[320px] text-center">
          <div>{policy.autonomyLabel}</div>
          {artifactPolicy && (
            <div className="mt-1 font-mono text-[10px] opacity-80">
              {artifactPolicy.requiredRole} · {artifactPolicy.nEyes}-eyes ·{" "}
              {REVIEW_MODE_LABEL[artifactPolicy.reviewMode]} review · clear ≤{" "}
              {Math.round(artifactPolicy.slaClearMin / 60)}h
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
