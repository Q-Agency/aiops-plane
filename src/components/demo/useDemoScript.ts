/**
 * useDemoScript (wave-2 COMPLETION) - timer + dispatcher for the Demo
 * Director overlay. Auto mode fires steps on the script's timestamps;
 * manual ("On my cue") pauses the timer and `stepNext()` advances one beat
 * per click. All mutation/idempotency lives in demoDirector.ts - this hook
 * only owns the clock and re-renders on the demo bus tick.
 *
 * The hook is mounted once (inside DemoDirectorOverlay, which AppShell
 * keeps mounted after first summon), so the script keeps firing across
 * route changes and even while the panel is toggled hidden.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useDemoTick } from "@/mock/demo-bus";
import {
  allStepsFired,
  CHECKPOINTS,
  DEMO_STEPS,
  fireNextStep,
  isStepFired,
  lastFiredStepId,
  nextUnfiredStep,
  restoreToCheckpoint,
  type DemoCheckpoint,
  type DemoStep,
} from "@/mock/demoDirector";

export type DemoStepStatus = "pending" | "current" | "fired";
export type DemoAdvanceMode = "auto" | "manual";

export interface DemoScript {
  steps: DemoStep[];
  checkpoints: DemoCheckpoint[];
  statusFor: (stepId: string) => DemoStepStatus;
  /** mm:ss elapsed on the script clock. */
  elapsedLabel: string;
  running: boolean;
  mode: DemoAdvanceMode;
  setMode: (mode: DemoAdvanceMode) => void;
  run: () => void;
  pause: () => void;
  /** Manual advance - fires the next pending beat and jumps the clock to it. */
  stepNext: () => void;
  /** Restore a checkpoint + rewind the step list (toasts "Demo reset to '…'"). */
  resetTo: (checkpointId: string) => void;
  allFired: boolean;
  nextStep: DemoStep | null;
}

export function useDemoScript(): DemoScript {
  // Re-render whenever a staged mutation lands (fire, restore, external beat).
  useDemoTick();

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<DemoAdvanceMode>("auto");
  const elapsedRef = useRef(0);

  const setClock = useCallback((sec: number) => {
    elapsedRef.current = sec;
    setElapsed(sec);
  }, []);

  // The script clock - interval only while running in auto mode (manual
  // mode pauses the timer per spec; Step → is the advance affordance).
  useEffect(() => {
    if (!running || mode !== "auto") return;
    const base = Date.now() - elapsedRef.current * 1000;
    const t = window.setInterval(() => {
      const sec = (Date.now() - base) / 1000;
      elapsedRef.current = sec;
      setElapsed(sec);
      for (const s of DEMO_STEPS) {
        if (s.atSec <= sec && !isStepFired(s.id)) s.fire();
      }
      if (allStepsFired()) setRunning(false);
    }, 400);
    return () => window.clearInterval(t);
  }, [running, mode]);

  const run = useCallback(() => {
    if (!allStepsFired()) setRunning(true);
  }, []);

  const pause = useCallback(() => setRunning(false), []);

  const stepNext = useCallback(() => {
    const s = fireNextStep();
    if (s) setClock(s.atSec);
  }, [setClock]);

  const resetTo = useCallback(
    (checkpointId: string) => {
      const cp = restoreToCheckpoint(checkpointId);
      setClock(cp.resumeAtSec);
      setRunning(false);
      toast.success(`Demo reset to '${cp.label}'`);
    },
    [setClock],
  );

  const allFired = allStepsFired();
  const lastFired = lastFiredStepId();
  const statusFor = useCallback(
    (stepId: string): DemoStepStatus => {
      if (!isStepFired(stepId)) return "pending";
      if (!allFired && stepId === lastFired) return "current";
      return "fired";
    },
    [allFired, lastFired],
  );

  const mm = Math.floor(elapsed / 60);
  const ss = Math.floor(elapsed % 60);

  return {
    steps: DEMO_STEPS,
    checkpoints: CHECKPOINTS,
    statusFor,
    elapsedLabel: `${mm}:${String(ss).padStart(2, "0")}`,
    running,
    mode,
    setMode,
    run,
    pause,
    stepNext,
    resetTo,
    allFired,
    nextStep: nextUnfiredStep(),
  };
}
