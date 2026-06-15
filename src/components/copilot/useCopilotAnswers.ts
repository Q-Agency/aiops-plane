/**
 * useCopilotAnswers - conversation state for the Pod Copilot (⌘J).
 *
 * Wraps matchCopilot (src/mock/copilot.ts, zero-LLM keyword matching) in a
 * small in-component history: user turns, answers-with-receipts, proposed
 * actions, honest fallbacks. NOTHING EXECUTES UNCONFIRMED - a matched NL op
 * only becomes a ledger row when confirmAction() appends the previewed row
 * via appendAuditMock (pod-store has no pause/resume mutations yet, so the
 * session audit ledger + toast IS the mock execution).
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { appendAuditMock } from "@/mock/audit-bridge";
import { matchCopilot, type CopilotAnswer, type ProposedAction } from "@/mock/copilot";

export type ActionStatus = "pending" | "confirmed" | "cancelled";

export type CopilotItem =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "answer"; answer: CopilotAnswer }
  | { id: number; kind: "fallback" }
  | {
      id: number;
      kind: "action";
      action: ProposedAction;
      status: ActionStatus;
      /** Session-ledger id once confirmed (assigned by appendAuditMock). */
      ledgerId?: number;
      /** The detail actually written (typed reason where one is required). */
      writtenDetail?: string;
    };

/** Keep the in-sheet history small - it's a copilot, not a transcript. */
const MAX_ITEMS = 40;

/** Mirrors the auditPreview contract: pause intents carry "reason required". */
export function actionRequiresReason(intent: ProposedAction["intent"]): boolean {
  return intent === "pause-agent" || intent === "pause-pod";
}

/**
 * The detail field of THE EXACT row a Confirm writes - shared by the
 * on-card preview and confirmAction so the preview can never drift from
 * what lands on the ledger. Empty reason on a required intent keeps the
 * template placeholder ("reason required") and Confirm stays disabled.
 */
export function previewDetail(action: ProposedAction, reason: string): string {
  const typed = reason.trim();
  if (actionRequiresReason(action.intent)) return typed || (action.auditPreview.detail ?? "");
  if (action.intent === "open-gate") return `navigates to /approvals/${action.target}`;
  return action.auditPreview.detail ?? "";
}

export interface ConfirmedAction {
  intent: ProposedAction["intent"];
  target: string;
  ledgerId: number;
}

export interface CopilotConversation {
  items: CopilotItem[];
  /** Match the input and append user turn + result (answer/action/fallback). */
  ask: (input: string) => void;
  /**
   * Append the previewed audit row + collapse the card. Returns the written
   * row's identity (null if blocked: missing required reason / not pending)
   * so the caller can finish intent side effects (open-gate navigation).
   */
  confirmAction: (itemId: number, reason: string) => ConfirmedAction | null;
  /** Dismiss a pending card - nothing executed, nothing written. */
  cancelAction: (itemId: number) => void;
}

let nextItemId = 1;

export function useCopilotAnswers(): CopilotConversation {
  const [items, setItems] = useState<CopilotItem[]>([]);

  const ask = useCallback((input: string) => {
    const text = input.trim();
    if (!text) return;
    const match = matchCopilot(text);
    const appended: CopilotItem[] = [{ id: nextItemId++, kind: "user", text }];
    if (match.kind === "answer") {
      appended.push({ id: nextItemId++, kind: "answer", answer: match.a });
    } else if (match.kind === "action") {
      appended.push({ id: nextItemId++, kind: "action", action: match.p, status: "pending" });
    } else {
      appended.push({ id: nextItemId++, kind: "fallback" });
    }
    setItems((prev) => [...prev, ...appended].slice(-MAX_ITEMS));
  }, []);

  const confirmAction = useCallback(
    (itemId: number, reason: string): ConfirmedAction | null => {
      const item = items.find((i) => i.id === itemId);
      if (!item || item.kind !== "action" || item.status !== "pending") return null;
      if (actionRequiresReason(item.action.intent) && !reason.trim()) return null;

      const { action } = item;
      const detail = previewDetail(action, reason);
      // Side effect OUTSIDE the state updater (StrictMode double-invokes those).
      const entry = appendAuditMock({
        action: action.auditPreview.action,
        target: action.auditPreview.target ?? action.target,
        detail,
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId && i.kind === "action"
            ? { ...i, status: "confirmed" as const, ledgerId: entry.id, writtenDetail: detail }
            : i,
        ),
      );
      toast.success(`${action.auditPreview.action} · ledger #${entry.id}`, {
        description: "Written to the session audit ledger ✓",
      });
      return { intent: action.intent, target: action.target, ledgerId: entry.id };
    },
    [items],
  );

  const cancelAction = useCallback((itemId: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId && i.kind === "action" && i.status === "pending"
          ? { ...i, status: "cancelled" as const }
          : i,
      ),
    );
  }, []);

  return { items, ask, confirmAction, cancelAction };
}
