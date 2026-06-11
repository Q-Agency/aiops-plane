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
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
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
import { artifactGatePolicyFor, gatePolicyFor } from "@/mock/gate-policies";
import { appendAuditMock } from "@/mock/audit-bridge";
import { bumpDemo } from "@/mock/demo-bus";
import { restageTicket } from "@/mock/tickets";
import { useLive } from "@/hooks/useLiveTicker";
import { ValidatorPanel } from "@/components/governance/ValidatorPanel";
import { DESIGN_HONESTY_LINE, QA_HONESTY_LINE } from "@/mock/validators";
import { GatePolicyChip } from "./GatePolicyChip";
import { SpecDocument, splitSections } from "./SpecDocument";
import { EarsCriteriaList, EARS_BLOCK_ID } from "./EarsCriteriaList";
import { DesignTraceMap, DESIGN_TRACE_BLOCK_ID } from "./DesignTraceMap";
import { DecisionRecordsList, DESIGN_ADR_BLOCK_ID } from "./DecisionRecordsList";
import { QaCoverageMap, QA_COVERAGE_BLOCK_ID } from "./QaCoverageMap";
import { DefectsList, QA_DEFECTS_BLOCK_ID } from "./DefectsList";
import { DecisionPanel } from "./DecisionPanel";
import {
  artifactKindForGate,
  APPROVAL_ADVANCE,
  REJECT_REASON_MIN_CHARS,
  REJECT_TARGETS,
  REVIEW_MODE_LABEL,
  SAMPLED_HINT,
  stageForSuspected,
  type RejectTarget,
} from "./gate-config";
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
  // submitting = the brief optimistic-submit beat (spinner + disabled actions)
  const [submitting, setSubmitting] = useState(false);
  // <md only — validators collapse behind a toggle (desktop always open)
  const [mobileValidatorsOpen, setMobileValidatorsOpen] = useState(false);
  const [resolvedDecision, setResolvedDecision] = useState<GateDecision | null>(
    () => gateDecisions.find((d) => d.gateId === detail.gateId) ?? null,
  );
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const flashTimer = useRef<number | null>(null);

  const accountable = accountableFor(detail.agentId);
  const agent = allAgents.find((a) => a.id === detail.agentId);
  const agentName = agent?.name ?? detail.agentId.toUpperCase();
  const isClarification = detail.kind === "clarification";
  // Design gates carry the spec→design coverage map + decision records and
  // swap the validator wall to the SA's check family; QA gates carry the
  // spec→test coverage map + defects/verdict and the report's own family
  // (gate-detail.ts).
  const isDesign = Boolean(detail.designTrace);
  const isQa = Boolean(detail.qaCoverage);

  // Root-cause reject targeting (vision §2 "rework follows the artifact
  // chain"): targets in chain order; default = the gate's own agent —
  // unless the QA report's defects propose an upstream root cause
  // (highest severity wins; the human can override).
  const proposal = useMemo(() => {
    const targets = detail.kind === "approval" ? (REJECT_TARGETS[detail.gateLabel] ?? []) : [];
    if (targets.length === 0)
      return { targets, target: null as RejectTarget | null, note: null as string | null };
    const own = targets[targets.length - 1];
    const sev = { critical: 0, medium: 1, low: 2 } as const;
    const top = [...(detail.defects ?? [])].sort((a, b) => sev[a.severity] - sev[b.severity])[0];
    const stage = top ? stageForSuspected(top.suspectedStage) : null;
    const target = targets.find((x) => x.stage === stage);
    if (top && target && target.stage !== own.stage) {
      return {
        targets,
        target,
        note: `proposed from ${top.id}'s root-cause trace — override if you disagree`,
      };
    }
    return { targets, target: own, note: null };
  }, [detail]);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(proposal.target);
  // Stages between the target and this gate — stale by the consumes-graph.
  const cascadeNames = useMemo(() => {
    if (!rejectTarget) return [];
    const i = proposal.targets.findIndex((x) => x.stage === rejectTarget.stage);
    return proposal.targets.slice(i + 1).map((x) => x.agentName);
  }, [rejectTarget, proposal.targets]);
  const failingCount = detail.validators.filter((v) => v.status === "fail").length;
  const passingCount = detail.validators.filter((v) => v.status === "pass").length;
  const nextStage = APPROVAL_ADVANCE[detail.gateLabel]?.label ?? "the next stage";
  // P1-G1 — the policy regime behind this gate (artifact row where mapped)
  const gatePolicy = gatePolicyFor(detail.agentId);
  const artifactKind = isClarification ? null : artifactKindForGate(detail.gateLabel);
  const artifactPolicy = artifactKind ? artifactGatePolicyFor(artifactKind) : undefined;
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
    // Validator-row click lands on the block the check verifies: the EARS
    // list on spec gates, the coverage map on design/QA gates.
    scrollTo(isDesign ? DESIGN_TRACE_BLOCK_ID : isQa ? QA_COVERAGE_BLOCK_ID : EARS_BLOCK_ID);
    setEarsFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setEarsFlash(false), 1600);
  }

  function decide(decision: GateDecisionVerb) {
    if (submitting) return;
    setSubmitting(true);
    // brief submit beat — action bars show spinner + disable, then resolve
    window.setTimeout(() => {
      const entry = recordGateDecision({
        gateId: detail.gateId,
        ticketId: detail.ticketId,
        gateKind: detail.kind,
        decision,
        reason: reason.trim(),
        actor: null, // when-only until auth
      });
      // The decision MOVES the ticket (vision §2: stages change only as
      // consequences of audited decisions) — visible on the Pipeline board.
      if (decision === "rejected" && rejectTarget) {
        restageTicket(detail.ticketId, {
          stage: rejectTarget.stage,
          state: "running",
          updatedAt: Date.now(),
          rerunCount: detail.rerunCount + 1,
        });
        bumpDemo();
      } else if (decision === "approved") {
        const nextStageId = APPROVAL_ADVANCE[detail.gateLabel]?.stage;
        if (nextStageId) {
          restageTicket(detail.ticketId, {
            stage: nextStageId,
            state: nextStageId === "done" ? "approved" : "running",
            updatedAt: Date.now(),
          });
          bumpDemo();
        }
      }
      // session audit ledger — vocabulary: gate.approved|rejected|override, clarification.answered
      appendAuditMock({
        action:
          decision === "answered"
            ? "clarification.answered"
            : decision === "rejected"
              ? "gate.rejected"
              : failingCount > 0
                ? "gate.override"
                : "gate.approved",
        target: detail.gateId,
        detail:
          decision === "rejected" && rejectTarget
            ? `${detail.gateLabel} → ${rejectTarget.stageLabel}: ${reason.trim()}` +
              (cascadeNames.length
                ? ` · downstream re-runs forward (${cascadeNames.join(", ")})`
                : "")
            : reason.trim(),
      });
      setResolvedDecision(entry);
      emit("human", detail.ticketId);
      const msg =
        decision === "approved"
          ? `${detail.ticketId} approved — moved to ${nextStage}. Recorded in the audit log.`
          : decision === "rejected"
            ? `${detail.ticketId} sent back to ${rejectTarget?.agentName ?? agentName}` +
              (cascadeNames.length
                ? ` — downstream ${cascadeNames.join(", ")} re-run forward.`
                : " — rerunning with your note as added context.")
            : `Answer sent to ${agentName} — rerunning.`;
      toast.success(msg, {
        action: {
          label: "View on board",
          onClick: () =>
            navigate({ to: "/pipeline", search: { ticket: detail.ticketId } as never }),
        },
      });
      navigate({ to: "/approvals" });
    }, 450);
  }

  function requestApprove() {
    if (submitting) return;
    if (failingCount > 0 && reason.trim().length === 0) {
      focusNote(
        `${failingCount} structural ${failingCount === 1 ? "check is" : "checks are"} failing — approving overrides ${failingCount === 1 ? "it" : "them"}; type your override note first.`,
      );
      return;
    }
    setConfirmOpen(true);
  }

  function requestReject() {
    if (submitting) return;
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
          {/* P1-G1 — the gate's policy regime + review mode */}
          <GatePolicyChip policy={gatePolicy} artifactPolicy={artifactPolicy} compact />
          {artifactPolicy && (
            <span className="text-[10px] font-mono text-muted-foreground">
              Review mode: {REVIEW_MODE_LABEL[artifactPolicy.reviewMode]}
              {artifactPolicy.reviewMode === "auto-with-sampling" && ` · ${SAMPLED_HINT}`}
            </span>
          )}
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
          {/* The QA agent's verdict is the most decision-relevant signal —
              surface it in the header (the full block sits below the fold). */}
          {detail.releaseRecommendation && (
            <button
              type="button"
              onClick={() => scrollTo(QA_DEFECTS_BLOCK_ID)}
              className={cn(
                "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border cursor-pointer transition-colors",
                detail.releaseRecommendation.verdict === "hold"
                  ? "border-status-waiting/50 bg-status-waiting/10 text-status-waiting hover:bg-status-waiting/20"
                  : "border-status-done/40 bg-status-done/10 text-status-done hover:bg-status-done/20",
              )}
              title="Jump to Defects & verdict"
            >
              QA recommends: {detail.releaseRecommendation.verdict === "hold" ? "HOLD" : "SHIP"} ↓
            </button>
          )}
          <span className="text-[10px] font-mono text-muted-foreground">
            {detail.artifactLabel}
          </span>
          <div className="flex-1" />
          {/* sticky header decisions (approval kind, while undecided; <md uses the bottom bar) */}
          {!isClarification && !resolved && (
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={requestApprove}
                className="h-8 px-3 rounded-md border border-status-done/50 bg-status-done/15 text-status-done text-[11px] font-semibold uppercase tracking-wider hover:bg-status-done/25 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Approve
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={requestReject}
                className="h-8 px-3 rounded-md border border-status-error/50 bg-status-error/15 text-status-error text-[11px] font-semibold uppercase tracking-wider hover:bg-status-error/25 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />} Reject
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
                  {detail.designTrace && (
                    <li>
                      <button
                        type="button"
                        onClick={() => scrollTo(DESIGN_TRACE_BLOCK_ID)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-white/[0.03] transition-colors"
                      >
                        Spec → design coverage
                      </button>
                    </li>
                  )}
                  {detail.decisionRecords && (
                    <li>
                      <button
                        type="button"
                        onClick={() => scrollTo(DESIGN_ADR_BLOCK_ID)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-white/[0.03] transition-colors"
                      >
                        Decision records
                      </button>
                    </li>
                  )}
                  {detail.qaCoverage && (
                    <li>
                      <button
                        type="button"
                        onClick={() => scrollTo(QA_COVERAGE_BLOCK_ID)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-white/[0.03] transition-colors"
                      >
                        Spec → test coverage
                      </button>
                    </li>
                  )}
                  {detail.defects && (
                    <li>
                      <button
                        type="button"
                        onClick={() => scrollTo(QA_DEFECTS_BLOCK_ID)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-white/[0.03] transition-colors"
                      >
                        Defects & verdict
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
                    {detail.validatorFamily ? ` · ${detail.validatorFamily}` : ""}
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
                {detail.designTrace && (
                  <DesignTraceMap rows={detail.designTrace} highlight={earsFlash} />
                )}
                {detail.decisionRecords && (
                  <DecisionRecordsList records={detail.decisionRecords} />
                )}
                {detail.qaCoverage && (
                  <QaCoverageMap rows={detail.qaCoverage} highlight={earsFlash} />
                )}
                {detail.defects && (
                  <DefectsList
                    defects={detail.defects}
                    recommendation={detail.releaseRecommendation}
                  />
                )}
              </>
            )}
          </div>

          {/* right rail (single column <xl): validators + decision (decision LAST) */}
          <div className="space-y-5">
            {!isClarification && detail.validators.length > 0 && (
              <div id={VALIDATOR_PANEL_ID} className="scroll-mt-24">
                {/* <md: validators collapse behind this toggle (desktop unaffected) */}
                <button
                  type="button"
                  onClick={() => setMobileValidatorsOpen((o) => !o)}
                  className="md:hidden w-full flex items-center justify-between rounded-md border border-status-done/30 bg-panel/40 backdrop-blur-md px-3 py-2.5"
                >
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-status-done" />
                    Validators · {passingCount}/{detail.validators.length} structural · deterministic
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      mobileValidatorsOpen && "rotate-180",
                    )}
                  />
                </button>
                <div className={cn(mobileValidatorsOpen ? "block mt-2 md:mt-0" : "hidden md:block")}>
                  <ValidatorPanel
                    checks={detail.validators}
                    compact
                    honestyLine={
                      isDesign ? DESIGN_HONESTY_LINE : isQa ? QA_HONESTY_LINE : undefined
                    }
                    onCheckClick={() => flashEars()}
                  />
                </div>
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
              submitting={submitting}
              onApproveRequest={requestApprove}
              onReject={requestReject}
              onAnswer={() => decide("answered")}
              rejectTargets={proposal.targets}
              rejectTarget={rejectTarget}
              onRejectTargetChange={setRejectTarget}
              rejectProposalNote={
                rejectTarget && rejectTarget.stage === proposal.target?.stage
                  ? proposal.note
                  : null
              }
              rejectCascadeNames={cascadeNames}
            />
          </div>
        </div>

        {/* <md sticky bottom action bar — decision-reason canon intact */}
        {!resolved && (
          <div className="md:hidden sticky bottom-0 z-10 -mx-4 -mb-4 mt-4 border-t border-border bg-background/90 backdrop-blur-md px-4 pt-3 pb-4 space-y-2">
            {isClarification ? (
              <button
                type="button"
                disabled={reason.trim().length === 0 || submitting}
                onClick={() => decide("answered")}
                className="w-full h-11 rounded-md border border-primary/50 bg-primary/15 text-primary text-sm font-semibold uppercase tracking-wider disabled:opacity-40 hover:bg-primary/25 transition-colors inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Send answer
              </button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={requestApprove}
                    className="h-11 rounded-md border border-status-done/50 bg-status-done/15 text-status-done text-sm font-semibold uppercase tracking-wider disabled:opacity-40 hover:bg-status-done/25 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={reason.trim().length < REJECT_REASON_MIN_CHARS || submitting}
                    onClick={requestReject}
                    className="h-11 rounded-md border border-status-error/50 bg-status-error/15 text-status-error text-sm font-semibold uppercase tracking-wider disabled:opacity-40 hover:bg-status-error/25 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                    Reject
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                  A reason is required on reject and is written to the audit log.
                </p>
              </>
            )}
          </div>
        )}
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
