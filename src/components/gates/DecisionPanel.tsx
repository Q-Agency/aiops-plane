/**
 * DecisionPanel - the right-rail decision surface of the gate review (C4).
 *
 * Approval gates: optional quick-reason chips + Approve (confirm dialog is
 * owned by the parent) / Reject (REQUIRES a typed reason, min 10 chars).
 * Clarification gates: the answer field + "Send answer".
 *
 * Also renders: the failing-checks override warning, the already-decided
 * read-only stamp, the prior-decision (rejected-then-fixed) history, and
 * the quiet "Open in BA flow-observer" fallback link.
 */

import { forwardRef } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  History,
  Loader2,
  ShieldAlert,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GateDetail } from "@/mock/gate-detail";
import type { GateDecision } from "@/mock/approvals";
import { REJECT_REASON_MIN_CHARS, type RejectTarget } from "./gate-config";

/** Optional structured quick-reasons (C4) - one click fills the note. */
export const APPROVE_QUICK_REASONS = [
  "Looks good - ship it",
  "Meets all acceptance criteria",
  "Reviewed with the client",
] as const;

function agoLabel(ts: number): string {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

const VERB_LABEL: Record<GateDecision["decision"], string> = {
  approved: "Approved",
  rejected: "Rejected & returned",
  answered: "Answered",
};

export interface DecisionPanelProps {
  detail: GateDetail;
  agentName: string;
  reason: string;
  setReason: (v: string) => void;
  /** Hard-failing deterministic checks - approving overrides them (note required). */
  failingCount: number;
  resolvedDecision: GateDecision | null;
  /** Decision in flight - buttons spin + disable (shared with the mobile bar). */
  submitting?: boolean;
  onApproveRequest: () => void;
  onReject: () => void;
  onAnswer: () => void;
  /** Root-cause reject targets in chain order (vision §2) - picker shown when >1. */
  rejectTargets?: RejectTarget[];
  rejectTarget?: RejectTarget | null;
  onRejectTargetChange?: (t: RejectTarget) => void;
  /** "proposed from AM-144-QA-1's root-cause trace…" - when the report proposed it. */
  rejectProposalNote?: string | null;
  /** Agents downstream of the selected target - stale, re-run forward. */
  rejectCascadeNames?: string[];
}

export const DecisionPanel = forwardRef<HTMLTextAreaElement, DecisionPanelProps>(
  function DecisionPanel(
    {
      detail,
      agentName,
      reason,
      setReason,
      failingCount,
      resolvedDecision,
      submitting = false,
      onApproveRequest,
      onReject,
      onAnswer,
      rejectTargets = [],
      rejectTarget = null,
      onRejectTargetChange,
      rejectProposalNote = null,
      rejectCascadeNames = [],
    },
    textareaRef,
  ) {
    const isClarification = detail.kind === "clarification";
    const trimmed = reason.trim();
    const rejectDisabled = trimmed.length < REJECT_REASON_MIN_CHARS;
    const answerDisabled = trimmed.length === 0;
    const overrideRequired = failingCount > 0 && !isClarification;

    /* ---------- already-decided stamp ---------- */
    if (resolvedDecision) {
      const ok = resolvedDecision.decision !== "rejected";
      return (
        <section
          className={cn(
            "rounded-md border bg-panel/40 backdrop-blur-md p-4 space-y-2",
            ok ? "border-status-done/40" : "border-status-error/40",
          )}
        >
          <div className="flex items-center gap-2">
            {ok ? (
              <CheckCircle2 className="size-4 text-status-done" />
            ) : (
              <Undo2 className="size-4 text-status-error" />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                ok ? "text-status-done" : "text-status-error",
              )}
            >
              {VERB_LABEL[resolvedDecision.decision]}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground" suppressHydrationWarning>
              {agoLabel(resolvedDecision.ts)}
            </span>
          </div>
          {resolvedDecision.reason && (
            <p className="text-xs text-foreground/90 border-l-2 border-border pl-2.5">
              “{resolvedDecision.reason}”
            </p>
          )}
          <p className="text-[10px] font-mono text-muted-foreground">
            Recorded in the audit log ·{" "}
            {resolvedDecision.actor ?? "when-only attribution until real auth"}
          </p>
        </section>
      );
    }

    /* ---------- live decision panel ---------- */
    return (
      <section className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          {isClarification ? "Your answer" : "Decision"}
        </div>

        {overrideRequired && (
          <div className="rounded border border-status-error/40 bg-status-error/10 px-2.5 py-2 flex items-start gap-2">
            <ShieldAlert className="size-3.5 text-status-error shrink-0 mt-0.5" />
            <p className="text-[11px] text-status-error leading-relaxed">
              {failingCount} structural {failingCount === 1 ? "check is" : "checks are"} failing -
              approving overrides {failingCount === 1 ? "it" : "them"}; your note is required.
            </p>
          </div>
        )}

        {!isClarification && rejectTargets.length > 1 && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Reject sends back to - the root cause
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reject target">
              {rejectTargets.map((t) => (
                <button
                  key={t.stage}
                  type="button"
                  aria-pressed={rejectTarget?.stage === t.stage}
                  onClick={() => onRejectTargetChange?.(t)}
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-1 rounded border transition-colors",
                    rejectTarget?.stage === t.stage
                      ? "border-status-error/60 bg-status-error/10 text-status-error"
                      : "border-border bg-white/5 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.agentName}
                </button>
              ))}
            </div>
            {rejectProposalNote && (
              <p className="text-[10px] font-mono text-status-waiting">{rejectProposalNote}</p>
            )}
            {rejectCascadeNames.length > 0 && (
              <p className="text-[10px] font-mono text-muted-foreground">
                {rejectTarget?.agentName} re-runs first - downstream{" "}
                {rejectCascadeNames.join(", ")} are stale and re-run forward.
              </p>
            )}
          </div>
        )}

        {!isClarification && (
          <div className="flex flex-wrap gap-1.5">
            {APPROVE_QUICK_REASONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setReason(q)}
                className={cn(
                  "text-[10px] font-mono px-1.5 py-1 rounded border transition-colors",
                  reason === q
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-white/5 text-muted-foreground hover:text-foreground",
                )}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <label
            htmlFor="gate-decision-note"
            className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground"
          >
            {isClarification ? "Answer (required)" : "Decision note (required on reject)"}
          </label>
          <textarea
            id="gate-decision-note"
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder={
              isClarification
                ? "Type your answer - it becomes the agent's added context."
                : "Why is this good enough to ship? Rejections require a typed reason (min 10 chars) - it becomes the agent's added context on rerun."
            }
            className="w-full rounded-md border border-border bg-white/5 px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 resize-none"
          />
        </div>

        {isClarification ? (
          <button
            type="button"
            disabled={answerDisabled || submitting}
            onClick={onAnswer}
            className="w-full h-9 rounded-md border border-primary/50 bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider disabled:opacity-40 hover:bg-primary/25 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            Send answer
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onApproveRequest}
              className="h-9 rounded-md border border-status-done/50 bg-status-done/15 text-status-done text-xs font-semibold uppercase tracking-wider hover:bg-status-done/25 transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}{" "}
              Approve {detail.gateLabel.split(" ")[0].toLowerCase()}
            </button>
            <button
              type="button"
              disabled={rejectDisabled || submitting}
              onClick={onReject}
              title={
                rejectDisabled
                  ? `Reject requires a typed reason (min ${REJECT_REASON_MIN_CHARS} chars) - it becomes the agent's added context on rerun.`
                  : undefined
              }
              className="h-9 rounded-md border border-status-error/50 bg-status-error/15 text-status-error text-xs font-semibold uppercase tracking-wider disabled:opacity-40 hover:bg-status-error/25 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}{" "}
              Reject &amp; return to {rejectTarget?.agentName ?? agentName}
            </button>
          </div>
        )}

        {detail.priorDecisions.length > 0 && (
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              <History className="size-3" /> Prior decisions
            </div>
            <ul className="space-y-2">
              {detail.priorDecisions.map((p, i) => (
                <li key={i} className="text-[11px] leading-relaxed">
                  <span className="text-status-error font-medium">Rejected</span>
                  <span className="text-muted-foreground">
                    {" "}
                    by {p.actor} · {Math.round(p.atOffsetMin / 60)}h ago
                  </span>
                  <div className="text-foreground/90 border-l-2 border-border pl-2 mt-0.5">
                    “{p.reason}”
                  </div>
                  {p.feedback && p.feedback.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      {p.feedback.map((f, j) => (
                        <li key={j} className="pl-2">- {f}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <a
          href={detail.flowObserverHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3" /> Open in BA flow-observer ↗
        </a>
      </section>
    );
  },
);
