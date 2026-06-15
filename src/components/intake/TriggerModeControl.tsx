/**
 * Trigger-mode surfaces for Work Intake (vision §2 "The tracker boundary"):
 * the board is the doorbell, AI PodOps is the house.
 *
 *  - TriggerModeControl - segmented operator-driven / tracker-driven switch
 *    (per-pod policy). Switching confirms via alert-dialog ("Recorded in the
 *    ledger") → `policy.changed` on the session ledger + toast. Honesty line
 *    underneath: activation between agents is never configurable here.
 *  - TriggerListeningBanner - tracker-driven only: the pod is listening to
 *    the agreed board column (TRIGGER_RULE), plus the demo affordance that
 *    retells the client's drag (simulateDragArrival → provenance chip).
 *  - WriteBackStrip - the write-back mapping one-liner + echo-loop honesty
 *    note ("our own write-backs are tagged - the listener ignores them").
 *
 * Standard (mock) experience only; state is session-scoped (trigger.ts).
 */

import { useState } from "react";
import { MousePointerClick, Radio } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePods } from "@/lib/pods/pod-store";
import { appendAuditMock } from "@/mock/audit-bridge";
import { connectorById, type ConnectorId } from "@/mock/connectors";
import { pullTickets } from "@/mock/intake";
import {
  START_POLICY_NAME,
  TRIGGER_HONESTY,
  TRIGGER_RULE,
  WRITE_BACK_MAPPING,
  getDragArrival,
  setTriggerMode,
  simulateDragArrival,
  useTriggerMode,
  type TriggerMode,
} from "@/mock/trigger";

/** Segmented-control labels (short); ledger names come from START_POLICY_NAME. */
const MODE_BUTTON_LABEL: Record<TriggerMode, string> = {
  operator: "Confirm-first - you approve each arrival",
  tracker: "Auto-start - the drag starts the chain",
};

/* ------------------------------------------------------------------ */
/* Segmented control + ledger-confirmed switch                          */
/* ------------------------------------------------------------------ */

export function TriggerModeControl({ className }: { className?: string }) {
  const mode = useTriggerMode();
  const [pending, setPending] = useState<TriggerMode | null>(null);

  const confirmSwitch = () => {
    const next = pending;
    if (!next || next === mode) {
      setPending(null);
      return;
    }
    setTriggerMode(next);
    appendAuditMock({
      action: "policy.changed",
      detail: `intake.startPolicy: ${START_POLICY_NAME[mode]} → ${START_POLICY_NAME[next]}`,
    });
    toast.success(`Intake start policy: ${START_POLICY_NAME[next]} - recorded in the ledger`, {
      description:
        next === "tracker"
          ? `A scoped ticket dragged into '${TRIGGER_RULE.column}' on '${TRIGGER_RULE.board}' now starts the chain immediately.`
          : "The board still starts everything - each arrival now waits for your confirmation in Work Intake.",
    });
    setPending(null);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        className="inline-flex w-fit items-center rounded-md border border-border bg-white/5 p-0.5"
        role="group"
        aria-label="Trigger mode"
      >
        {(["operator", "tracker"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => m !== mode && setPending(m)}
            className={cn(
              "px-2.5 py-1 rounded text-[11px] font-medium transition-colors",
              mode === m
                ? "border border-primary/50 bg-primary/15 text-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                : "border border-transparent text-muted-foreground hover:text-foreground cursor-pointer",
            )}
          >
            {MODE_BUTTON_LABEL[m]}
          </button>
        ))}
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">{TRIGGER_HONESTY}</span>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switch intake start policy to {pending === "tracker" ? "auto-start" : "confirm-first"}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="font-mono text-xs rounded border border-border bg-white/[0.03] px-2.5 py-2 text-foreground">
                  {pending === "tracker"
                    ? `'${TRIGGER_RULE.board}' · a scoped ticket entering '${TRIGGER_RULE.column}' starts the chain immediately - no confirmation step.`
                    : "The board remains the only start signal - each arrival waits for your confirmation in Work Intake. The safe default while trust is earned."}
                </div>
                <p className="text-[11px]">
                  Recorded in the ledger as{" "}
                  <code className="font-mono rounded bg-white/10 px-1">policy.changed</code> -
                  revocable at any time.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>
              Switch - record in ledger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Listening banner - tracker-driven only                               */
/* ------------------------------------------------------------------ */

export function TriggerListeningBanner() {
  const mode = useTriggerMode();
  const { activePod } = usePods();
  const trackerConnected = (activePod?.connections ?? []).some(
    (c) => (c.connectorId === "teamwork" || c.connectorId === "jira") && c.status === "connected",
  );
  // The pod ALWAYS listens to the board - the single doorbell. The policy only
  // decides whether an arrival starts immediately or waits for confirmation.
  if (!trackerConnected) return null;

  const connectorName = connectorById(TRIGGER_RULE.connectorId as ConnectorId).name;

  const simulate = () => {
    const already = getDragArrival() !== null;
    const arrival = simulateDragArrival();
    if (already) {
      toast.info(`${arrival.ticketId} is already in the intake list`, {
        description: "The doorbell is idempotent - one drag, one arrival.",
      });
      return;
    }
    if (mode === "tracker") {
      // Auto-start means exactly that: the drag IS the start - the ticket
      // enters the pod immediately, no confirmation step. Provenance records
      // the mechanism: the drag itself started it.
      pullTickets([arrival.ticketId], "drag-to-ready");
      toast.success(`${arrival.ticketId} arrived via drag-to-Ready - started automatically`, {
        description: `'${arrival.title}' entered through the '${TRIGGER_RULE.column}' column and is in the pod (auto-start) - BA picks it up; the chain runs inside AI PodOps.`,
      });
    } else {
      toast.success(`${arrival.ticketId} arrived via drag-to-Ready - waiting for your confirmation`, {
        description: `'${arrival.title}' sits in '${TRIGGER_RULE.column}' - confirm-first policy: you approve the start in Work Intake.`,
      });
    }
  };

  return (
    <div className="rounded-md border border-status-running/40 bg-status-running/5 backdrop-blur-md px-4 py-2.5 flex items-center gap-3 flex-wrap anim-in">
      <span className="relative flex size-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-running opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-status-running" />
      </span>
      <span className="text-xs text-foreground/95 inline-flex items-center gap-1.5 flex-wrap">
        <Radio className="size-3.5 text-status-running" />
        Listening to {connectorName} · board &lsquo;{TRIGGER_RULE.board}&rsquo; · column{" "}
        <span className="font-mono text-status-running">{TRIGGER_RULE.column}</span>{" "}
        {mode === "tracker" ? "→ starts the chain" : "→ arrives for your confirmation"}
      </span>
      <div className="flex-1" />
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={simulate}
        title="Demo affordance - retells the client's drag on the board"
      >
        <MousePointerClick className="size-3.5" />
        Simulate a drag on the board
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Write-back strip - never ask twice, never echo                       */
/* ------------------------------------------------------------------ */

/** "writes back: In Progress → In Review (gate open) → Done + artifact links" */
const WRITE_BACK_LINE = `writes back: ${WRITE_BACK_MAPPING.map((r) =>
  r.podStage === "Human gate open" ? `${r.trackerStatus} (gate open)` : r.trackerStatus,
).join(" → ")}`;

export function WriteBackStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "px-4 py-2 border-t border-border bg-white/[0.02] flex items-center gap-x-3 gap-y-1 flex-wrap",
        className,
      )}
    >
      <span className="text-[11px] font-mono text-foreground/90">{WRITE_BACK_LINE}</span>
      <span className="text-[10px] text-muted-foreground">
        our own write-backs are tagged - the listener ignores them
      </span>
    </div>
  );
}
