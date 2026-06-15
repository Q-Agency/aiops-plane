/**
 * DemoStepRow (wave-2 COMPLETION) - one beat of the Demo Director's step
 * list: state dot (pending / current / fired), mono script timestamp, and
 * the verbatim script label. The current step glows; fired steps tick.
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoStep } from "@/mock/demoDirector";
import type { DemoStepStatus } from "./useDemoScript";

export function DemoStepRow({ step, status }: { step: DemoStep; status: DemoStepStatus }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
        status === "current" && "bg-primary/10 ring-1 ring-primary/40",
      )}
      title={`${step.at} - ${step.label}`}
    >
      <span className="w-4 shrink-0 grid place-items-center">
        {status === "fired" ? (
          <Check className="size-3 text-status-done" />
        ) : (
          <span
            className={cn(
              "size-2 rounded-full",
              status === "current"
                ? "bg-primary animate-pulse shadow-[0_0_8px_1px] shadow-primary/60"
                : "border border-border bg-transparent",
            )}
          />
        )}
      </span>
      <span className="w-7 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
        {step.at}
      </span>
      <span
        className={cn(
          "truncate",
          status === "pending" ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {step.label}
      </span>
    </div>
  );
}
