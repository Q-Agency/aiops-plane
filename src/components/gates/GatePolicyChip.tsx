/**
 * GatePolicyChip — small mono chip stating an agent's gate regime:
 * autonomy level (L0–L3) + gate-clearance SLA, from gate-policies.ts.
 * Hover/focus tooltip carries the full autonomy-ladder line. Used by the
 * /welcome charter card and any surface that promises a gate policy.
 */

import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GatePolicy } from "@/mock/gate-policies";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface GatePolicyChipProps {
  policy: GatePolicy;
  className?: string;
}

export function GatePolicyChip({ policy, className }: GatePolicyChipProps) {
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
            <span>{policy.slaLabel}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[300px] text-center">
          {policy.autonomyLabel}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
