/**
 * GateReviewShell — the client-grade gate review surface
 * (/approvals/$gateId, C4). The single most load-bearing surface in the
 * RUN cluster: a paying PM signs off HERE, inside Agency OS — never
 * dropped into the agent's own tool except as a labeled fallback.
 *
 * Layout (approval kind): review header bar (breadcrumb · badges · SLA ·
 * sticky Approve/Reject) over a 3-region grid — outline nav + validator
 * score (left) | rendered SPEC.md + EARS criteria (center) | the walled
 * 8-validator panel (C3) + decision panel (right).
 *
 * Clarification kind: question + options + suggested answer (center),
 * answer field + "Send answer" (right).
 *
 * Decisions write the mock decision log (recordGateDecision), emit a
 * human activity event, toast, and navigate back to /approvals where the
 * row renders resolved.
 */

import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  Check,
  Clock,
  ExternalLink,
  MessageCircleQuestion,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { gateDetailFor, type GateDetail, type SlaState } from "@/mock/gate-detail";
import {
  gateDecisions,
  recordGateDecision,
  type GateDecision,
  type GateDecisionVerb,
} from "@/mock/approvals";
import { accountableFor } from "@/mock/humans";
import { agents as allAgents } from "@/mock/agents";
import { useLive } from "@/hooks/useLiveTicker";
import { ValidatorPanel } from "@/components/governance/ValidatorPanel";
import { SpecDocument, splitSections } from "./SpecDocument";
import { EarsCriteriaList, EARS_BLOCK_ID } from "./EarsCriteriaList";
import { DecisionPanel } from "./DecisionPanel";
import { NEXT_STAGE_AFTER_APPROVAL, REJECT_REASON_MIN_CHARS } from "./gate-config";
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

export { REJECT_REASON_MIN_CHARS } from "./gate-config";

export interface GateReviewShellProps {
  gateId: string;
}

const SLA_CHIP: Record<SlaState, string> = {
  on_track: "border-status-done/40 bg-status-done/10 text-status-done",
  at_risk: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
  overdue: "border-status-error/40 bg-status-error/10 text-status-error",
};

const VALIDATOR_PANEL_ID = "gate-validators";

export function GateReviewShell({ gateId }: GateReviewShellProps) {
  const detail = useMemo(() => gateDetailFor(gateId), [gateId]);

  if (!detail) {
    // error / gate-unavailable state — the fallback deep-link goes prominent
    return (
      <div className="h-full grid place-items-center p-6">
        <div className="max-w-md w-full rounded-md border border-border bg-panel/40 backdrop-blur-md p-8 text-center space-y-4">
          <div className="text-sm font-semibold">Couldn't render this gate in-app</div>
          <p className="text-xs text-muted-foreground">
            This gate may already be resolved, or the link is stale.
          </p>
          <a
            href="https://q-ba-dashboard.ngrok.app/flow"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md border border-primary/50 bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider hover:bg-primary/25 transition-colors"
          >
            <ExternalLink className="size-3.5" /> Open in BA flow-observer ↗
          </a>
          <div>
            <Link
              to="/approvals"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3" /> Back to Gates
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // key by gateId — gate→gate navigation must remount (fresh reason/prefill state)
  return <GateReviewBody key={detail.gateId} detail={detail} />;
}

function GateReviewBody({ detail }: { detail: GateDetail }) {
  const navigate = useNavigate();
  const { emit } = useLive();
  const [reason, setReason] = useState(
    detail.kind === "clarification" ? (detail.clarification?.suggestedAnswer ?? "") : "",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [earsFlash, setEarsFlash] = useState(false);
  const [resolvedDecision, setResolvedDecision] = useState<GateDecision | null>(
    () => gateDecisions.find((d) => d.gateId === detail.gateId) ?? null,
  );
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const flashTimer = useRef<number | null>(null);

  const accountable = accountableFor(detail.agentId);
  const agent = allAgents.find((a) => a.id === detail.agentId);
  const agentName = agent?.name ?? detail.agentId.toUpperCase();
  const isClarification = detail.kind === "clarification";
  const failingCount = detail.validators.filter((v) => v.status === "fail").length;
  const nextStage = NEXT_STAGE_AFTER_APPROVAL[detail.gateLabel] ?? "the next stage";
  const sections = useMemo(
    () => splitSections(detail.specMarkdown).sections,
    [detail.specMarkdown],
  );

  function focusNote(message?: string) {
    noteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    noteRef.current?.focus();
    if (message) toast.info(message);
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function flashEars() {
    scrollTo(EARS_BLOCK_ID);
    setEarsFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setEarsFlash(false), 1600);
  }

  function decide(decision: GateDecisionVerb) {
    const entry = recordGateDecision({
      gateId: detail.gateId,
      ticketId: detail.ticketId,
      gateKind: detail.kind,
      decision,
      reason: reason.trim(),
      actor: null, // when-only until auth
    });
    setResolvedDecision(entry);
    emit("human", detail.ticketId);
    const msg =
      decision === "approved"
        ? `${detail.ticketId} approved — advancing to ${nextStage}. Recorded in the audit log.`
        : decision === "rejected"
          ? `${detail.ticketId} returned to ${agentName} — rerunning with your note as added context.`
          : `Answer sent to ${agentName} — rerunning.`;
    toast.success(msg);
    navigate({ to: "/approvals" });
  }

  function requestApprove() {
    if (failingCount > 0 && reason.trim().length === 0) {
      focusNote(
        `${failingCount} structural ${failingCount === 1 ? "check is" : "checks are"} failing — approving overrides ${failingCount === 1 ? "it" : "them"}; type your override note first.`,
      );
      return;
    }
    setConfirmOpen(true);
  }

  function requestReject() {
    if (reason.trim().length < REJECT_REASON_MIN_CHARS) {
      focusNote(`Reject requires a typed reason (min ${REJECT_REASON_MIN_CHARS} chars).`);
      return;
    }
    decide("rejected");
  }

  const resolved = Boolean(resolvedDecision);

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* review header bar */}
      <header className="border-b border-border bg-panel/40 backdrop-blur-md px-4 lg:px-6 py-3 space-y-1.5">
        <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <Link to="/approvals" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3" /> Gates
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span>{detail.gateLabel}</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground">{detail.ticketId}</span>
        </nav>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm text-foreground">{detail.ticketId}</span>
          <span className="text-sm text-foreground font-medium truncate max-w-[34ch]">
            {detail.ticketTitle}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
            {detail.gateLabel}
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bot className="size-3.5" /> {agentName} · {accountable.name} accountable
          </span>
          <span
            suppressHydrationWarning
            className={cn(
              "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
              SLA_CHIP[detail.sla.state],
            )}
          >
            <Clock className="size-3" /> {detail.sla.label}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {detail.artifactLabel}
          </span>
          <div className="flex-1" />
          {/* sticky header decisions (approval kind, while undecided) */}
          {!isClarification && !resolved && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={requestApprove}
                className="h-8 px-3 rounded-md border border-status-done/50 bg-status-done/15 text-status-done text-[11px] font-semibold uppercase tracking-wider hover:bg-status-done/25 transition-colors inline-flex items-center gap-1.5"
              >
                <Check className="size-3.5" /> Approve
              </button>
              <button
                type="button"
                onClick={requestReject}
                className="h-8 px-3 rounded-md border border-status-error/50 bg-status-error/15 text-status-error text-[11px] font-semibold uppercase tracking-wider hover:bg-status-error/25 transition-colors inline-flex items-center gap-1.5"
              >
                <X className="size-3.5" /> Reject
              </button>
            </div>
          )}
        </div>
      </header>

      {/* body */}
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin p-4 lg:p-6">
        {resolved && (
          <div className="mb-4 rounded-md border border-status-done/40 bg-status-done/10 px-3 py-2 text-xs text-status-done">
            This gate is already decided — the decision panel shows the recorded outcome.
          </div>
        )}
        {detail.rerunCount > 0 && detail.priorDecisions.length > 0 && (
          <div className="mb-4 rounded-md border border-status-waiting/40 bg-status-waiting/10 px-3 py-2 text-xs text-status-waiting">
            This artifact was returned {detail.rerunCount}× — now v{detail.rerunCount + 1}. Last
            feedback: “{detail.priorDecisions[0].reason}”
          </div>
        )}

        <div
          className={cn(
            "grid gap-5",
            isClarification
              ? "xl:grid-cols-[minmax(0,1fr)_340px]"
              : "xl:grid-cols-[200px_minmax(0,1fr)_340px]",
          )}
        >
          {/* left rail: outline + validator score (approval only) */}
          {!isClarification && (
            <aside className="hidden xl:block space-y-4 sticky top-0 self-start">
              <nav className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-3">
                <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-2">
                  Outline
                </div>
                <ul className="space-y-1">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => scrollTo(s.id)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-white/[0.03] transition-colors"
                      >
                        {s.title}
                      </button>
                    </li>
                  ))}
                  {detail.earsCriteria.length > 0 && (
                    <li>
                      <button
                        type="button"
                        onClick={() => scrollTo(EARS_BLOCK_ID)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-white/[0.03] transition-colors"
                      >
                        Acceptance criteria (EARS)
                      </button>
                    </li>
                  )}
                  {detail.validators.length > 0 && (
                    <li>
                      <button
                        type="button"
                        onClick={() => scrollTo(VALIDATOR_PANEL_ID)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-white/[0.03] transition-colors"
                      >
                        Validators
                      </button>
                    </li>
                  )}
                </ul>
              </nav>

              {detail.validators.length > 0 && (
                <div className="rounded-md border border-status-done/30 bg-panel/40 backdrop-blur-md p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                    <ShieldCheck className="size-3 text-status-done" /> Structural score
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-2xl font-semibold tabular-nums",
                      failingCount > 0 ? "text-status-error" : "text-status-done",
                    )}
                  >
                    {detail.validatorScore}
                    <span className="text-xs text-muted-foreground font-normal"> /100</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        failingCount > 0 ? "bg-status-error/70" : "bg-status-done/70",
                      )}
                      style={{ width: `${detail.validatorScore}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                    deterministic · zero-LLM
                  </div>
                </div>
              )}
            </aside>
          )}

          {/* center: artifact / question */}
          <div className="min-w-0 space-y-5">
            {isClarification ? (
              <section className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageCircleQuestion className="size-4 text-primary" />
                  The agent needs an answer to proceed
                </div>
                <p className="text-sm text-foreground">{detail.clarification?.question}</p>
                {detail.clarification?.options && (
                  <div className="flex flex-wrap gap-2">
                    {detail.clarification.options.map((o) => (
                      <button
                        key={o}
                        type="button"
                        disabled={resolved}
                        onClick={() => setReason(o)}
                        className={cn(
                          "px-2.5 py-1.5 rounded border text-xs transition-colors disabled:opacity-50",
                          reason === o
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border bg-white/5 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
                {detail.clarification?.suggestedAnswer && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-[10px] uppercase tracking-wider font-mono mr-1.5">
                      agent suggests
                    </span>
                    {detail.clarification.suggestedAnswer}
                  </p>
                )}
              </section>
            ) : (
              <>
                <SpecDocument markdown={detail.specMarkdown} />
                <EarsCriteriaList criteria={detail.earsCriteria} highlight={earsFlash} />
              </>
            )}
          </div>

          {/* right rail: validators + decision */}
          <div className="space-y-5">
            {!isClarification && detail.validators.length > 0 && (
              <div id={VALIDATOR_PANEL_ID} className="scroll-mt-24">
                <ValidatorPanel
                  checks={detail.validators}
                  compact
                  onCheckClick={() => flashEars()}
                />
              </div>
            )}

            <DecisionPanel
              ref={noteRef}
              detail={detail}
              agentName={agentName}
              reason={reason}
              setReason={setReason}
              failingCount={failingCount}
              resolvedDecision={resolvedDecision}
              onApproveRequest={requestApprove}
              onReject={requestReject}
              onAnswer={() => decide("answered")}
            />
          </div>
        </div>
      </div>

      {/* approve confirm (C4) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Approve {detail.gateLabel.split(" ")[0].toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Advances {detail.ticketId} to {nextStage}. Recorded in the audit log.
              {failingCount > 0 && (
                <>
                  {" "}
                  <span className="text-status-error">
                    {failingCount} structural {failingCount === 1 ? "check" : "checks"} failing —
                    your note is recorded as the override reason.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => decide("approved")}>
              Approve — advance {detail.ticketId}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
