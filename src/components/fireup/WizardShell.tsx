/**
 * WizardShell — owns ALL chrome of the LAUNCH wizard (D1):
 * header (step title + sub + pod name + autosave), stepper breadcrumb,
 * footer Back/Next. Step components render BODY ONLY via the registry.
 *
 * Gating (D2): steps FLAG (amber warnings, Next always enabled);
 * Readiness (golive) BLOCKS — "Launch pod" disables while any required
 * check fails.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  computeReadiness,
  podSummaryLine,
  TENANCY_LINE,
  usePods,
  type WizardStepId,
} from "@/lib/pods/pod-store";
import { LAUNCH_REQUEST_EVENT } from "./launch-event";
import { STEPS, stepIndex } from "./steps";

function SavedIndicator({ updatedAt }: { updatedAt: number | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  if (!updatedAt) {
    return (
      <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
        Draft autosaves locally
      </span>
    );
  }
  const secs = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
  const label =
    secs < 5
      ? "Saved · just now"
      : secs < 60
        ? `Saved · ${secs}s ago`
        : `Saved · ${Math.floor(secs / 60)}m ago`;
  return (
    <span
      className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-status-done"
      suppressHydrationWarning
    >
      <Check className="size-3" />
      {label}
    </span>
  );
}

export function WizardShell({ step }: { step: WizardStepId }) {
  const navigate = useNavigate();
  const { draft, hydrated, createDraft, updateDraft, launchDraft } = usePods();

  const idx = Math.max(0, stepIndex(step));
  const active = STEPS[idx];

  // Ensure a working draft exists once client state has hydrated (SSR-safe).
  // `launchingRef` stops the effect from re-creating an empty draft in the
  // window between launchDraft() clearing it and the navigation away.
  const launchingRef = useRef(false);
  useEffect(() => {
    if (hydrated && !draft && !launchingRef.current) createDraft(null);
  }, [hydrated, draft, createDraft]);

  const readiness = useMemo(() => computeReadiness(draft), [draft]);
  const uncoveredCount = readiness.uncovered.length;

  const goTo = (id: WizardStepId) => {
    void navigate({ to: "/pods/new", search: { step: id } });
  };

  const isLaunchStep = active.id === "golive";
  const launchDisabled = isLaunchStep && (!draft || readiness.blocked);

  const handleNext = () => {
    if (isLaunchStep) {
      // Delegate to StepGoLive's launch sequence (warn-confirm + overlay)
      // when its body is mounted — it cancels the event to take over.
      const delegated = !window.dispatchEvent(
        new Event(LAUNCH_REQUEST_EVENT, { cancelable: true }),
      );
      if (delegated) return;
      // Fallback: instant launch.
      launchingRef.current = true;
      const pod = launchDraft();
      if (pod) {
        toast.success(`Pod launched — ${pod.name} is live`, {
          description: `${podSummaryLine(pod)} · ${TENANCY_LINE}`,
        });
        void navigate({ to: "/" });
      } else {
        launchingRef.current = false;
      }
      return;
    }
    goTo(STEPS[idx + 1].id);
  };

  const handleSaveAndExit = () => {
    toast("Draft saved", {
      description: "Your draft is saved — you can resume any time from LAUNCH → New Pod.",
    });
    void navigate({ to: "/" });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="h-full min-h-0 flex flex-col">
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-panel/40 backdrop-blur-md px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-md bg-primary/15 border border-primary/40 grid place-items-center text-primary shrink-0">
              <Rocket className="size-4" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-sm font-semibold truncate">Launch a new pod</div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Step {idx + 1} of {STEPS.length} · {active.label}
              </div>
            </div>
          </div>
          <Input
            value={draft?.name ?? ""}
            placeholder="Untitled Pod"
            aria-label="Pod name"
            disabled={!draft}
            onChange={(e) => updateDraft({ name: e.target.value })}
            className="h-8 w-44 sm:w-56 bg-white/5 border-border text-sm"
          />
          <div className="flex-1" />
          <SavedIndicator updatedAt={draft?.updatedAt ?? null} />
          <Button variant="ghost" size="sm" onClick={handleSaveAndExit}>
            Save &amp; exit
          </Button>
        </div>

        {/* Stepper breadcrumb */}
        <div className="shrink-0 border-b border-border bg-panel/20 px-6 py-2.5 overflow-x-auto scrollbar-thin">
          <ol className="flex items-center gap-1 min-w-max">
            {STEPS.map((s, i) => {
              const state = i < idx ? "done" : i === idx ? "current" : "todo";
              return (
                <li key={s.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => i <= idx && goTo(s.id)}
                    disabled={i > idx}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors",
                      state === "current" && "bg-primary/15 text-foreground",
                      state === "done" &&
                        "text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer",
                      state === "todo" && "text-muted-foreground/50 cursor-default",
                    )}
                  >
                    <span
                      className={cn(
                        "size-5 rounded-full grid place-items-center text-[10px] font-mono border shrink-0",
                        state === "done" &&
                          "border-status-done/60 bg-status-done/15 text-status-done",
                        state === "current" &&
                          "border-primary bg-primary/20 text-primary shadow-[0_0_8px_var(--primary)]",
                        state === "todo" && "border-border bg-white/5",
                      )}
                    >
                      {state === "done" ? <Check className="size-3" /> : i + 1}
                    </span>
                    <span className="whitespace-nowrap">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <span
                      className={cn("h-px w-4 sm:w-6", i < idx ? "bg-primary/60" : "bg-border")}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Step body */}
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="mb-5">
              <h1 className="text-lg font-semibold">{active.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{active.sub}</p>
            </div>
            <active.Component />
          </div>
        </div>

        {/* Footer nav */}
        <div className="shrink-0 border-t border-border bg-panel/40 backdrop-blur-md px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={idx === 0}
            onClick={() => goTo(STEPS[idx - 1].id)}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
          <div className="flex-1" />
          {active.id === "people" && uncoveredCount > 0 && (
            <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded-md border border-status-waiting/50 bg-status-waiting/10 text-status-waiting">
              {uncoveredCount} uncovered — you&apos;ll be blocked at launch
            </span>
          )}
          {isLaunchStep && launchDisabled ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    disabled
                    className="shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_40%,transparent)]"
                  >
                    <Rocket className="size-4" />
                    {active.nextLabel}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Resolve all required checks to launch.</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              onClick={handleNext}
              className={cn(
                isLaunchStep &&
                  "glow-pulse shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
              )}
            >
              {isLaunchStep && <Rocket className="size-4" />}
              {active.nextLabel}
              {!isLaunchStep && <ChevronRight className="size-4" />}
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
