/**
 * FirstGateWalkthrough (/welcome stage 2) - a guided, READ-ONLY tour of a
 * Sample-pod gate (appr-AM-142 from gate-detail.ts) in coach-mark mode:
 * 4 marks - read the spec → check the validators → the decision panel →
 * where the decision lands in the ledger.
 *
 * Deliberately NOT an embed of GateReviewShell (which mutates the decision
 * log + navigates): the pane is a scaled-down, inert "screenshot" built
 * from the same mock detail, so /approvals/$gateId stays byte-identical.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Clock,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { gateDetailFor } from "@/mock/gate-detail";
import { DETERMINISTIC_BADGE } from "@/mock/validators";

/** The Sample-pod gate the walkthrough tours (canonical demo gate). */
export const WALKTHROUGH_GATE_ID = "appr-AM-142";

interface CoachMark {
  title: string;
  body: string;
}

const MARKS: CoachMark[] = [
  {
    title: "Read the spec",
    body: "The artifact under review renders here, in-app - sections, business rules, acceptance criteria. You review inside Agency OS; the agent's own tool is only a labeled fallback.",
  },
  {
    title: "Check the validators",
    body: "8 deterministic structural checks - no model in the loop. Green means the shape is right; it says nothing about whether it's the right idea. That judgement is yours.",
  },
  {
    title: "The decision panel",
    body: "Approve (optional quick-reason chips) or reject. A typed reason is REQUIRED on reject - it returns the work with your note as the agent's added context.",
  },
  {
    title: "Where the decision lands",
    body: "Every decision writes an immutable, hash-chained row to the audit ledger - actor, action, artifact. This is what you point an auditor at.",
  },
];

export interface FirstGateWalkthroughProps {
  /** Parent-owned: the walkthrough has been opened (enables the Accept CTA). */
  opened: boolean;
  /** Fired by the cover-overlay button - parent flips `opened`. */
  onOpen: () => void;
  /** Fired once when mark 4 is finished. */
  onComplete: () => void;
}

export function FirstGateWalkthrough({ opened, onOpen, onComplete }: FirstGateWalkthroughProps) {
  // 0 = covered, 1-4 = coach marks, 5 = done
  const [step, setStep] = useState(0);
  const detail = gateDetailFor(WALKTHROUGH_GATE_ID);

  useEffect(() => {
    if (opened && step === 0) setStep(1);
  }, [opened, step]);

  if (!detail) {
    return (
      <div className="glass-panel p-4 text-xs text-muted-foreground">
        Sample gate unavailable - open the live queue at{" "}
        <Link to="/approvals" className="text-primary hover:underline">
          /approvals
        </Link>{" "}
        instead.
      </div>
    );
  }

  const done = step > MARKS.length;
  const passCount = detail.validators.filter((v) => v.status === "pass").length;
  const excerpt = detail.specMarkdown
    .split("\n")
    .filter((l) => !l.startsWith("```"))
    .slice(0, 14);

  function next() {
    if (step >= MARKS.length) {
      setStep(MARKS.length + 1);
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="space-y-3">
      {/* framed, scaled-down read-only pane */}
      <div className="relative rounded-lg border border-border/60 bg-panel/40 backdrop-blur-md p-3 space-y-3">
        {/* cover overlay until opened */}
        {step === 0 && (
          <div className="absolute inset-0 z-20 rounded-lg bg-background/70 backdrop-blur-[3px] grid place-items-center">
            <div className="text-center space-y-3 p-6">
              <div className="text-sm font-semibold">See how a gate review works</div>
              <div className="text-[11px] text-muted-foreground font-mono">
                4 marks · read-only sample gate · {detail.ticketId}
              </div>
              <button
                type="button"
                onClick={onOpen}
                className="h-9 px-4 rounded-md border border-primary/50 bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider hover:bg-primary/25 transition-colors inline-flex items-center gap-1.5"
              >
                Open the walkthrough <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* inert miniature of the gate review surface */}
        <div className="pointer-events-none select-none space-y-3" aria-hidden="true">
          {/* mini review header */}
          <div className="flex items-center gap-2 flex-wrap rounded-md border border-border/60 bg-white/[0.02] px-3 py-2">
            <span className="font-mono text-xs text-foreground">{detail.ticketId}</span>
            <span className="text-xs font-medium truncate max-w-[26ch]">{detail.ticketTitle}</span>
            <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
              {detail.gateLabel}
            </span>
            <span
              suppressHydrationWarning
              className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-done/40 bg-status-done/10 text-status-done"
            >
              <Clock className="size-2.5" /> {detail.sla.label}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">{detail.artifactLabel}</span>
          </div>

          <div className="grid md:grid-cols-[minmax(0,1fr)_230px] gap-3">
            {/* mark 1 - the spec */}
            <Region active={step === 1} dim={opened && !done && step !== 1} mark={1}>
              <div className="p-3 space-y-1 max-h-56 overflow-hidden">
                {excerpt.map((line, i) => (
                  <ExcerptLine key={i} line={line} />
                ))}
              </div>
              <div className="px-3 pb-2 text-[9px] font-mono text-muted-foreground/70">
                … excerpt - the full document renders on the real gate
              </div>
            </Region>

            <div className="space-y-3">
              {/* mark 2 - validators */}
              <Region active={step === 2} dim={opened && !done && step !== 2} mark={2}>
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-mono text-status-done">
                      <ShieldCheck className="size-3" /> {passCount}/{detail.validators.length} checks
                    </span>
                  </div>
                  <div className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-status-done/40 bg-status-done/10 text-status-done inline-block">
                    {DETERMINISTIC_BADGE}
                  </div>
                  <ul className="space-y-1 pt-1">
                    {detail.validators.map((v) => (
                      <li key={v.id} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                        <span
                          className={cn(
                            "size-1.5 rounded-full shrink-0",
                            v.status === "pass" ? "bg-status-done" : v.status === "warn" ? "bg-status-waiting" : "bg-status-error",
                          )}
                        />
                        <span className="truncate">{v.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Region>

              {/* mark 3 - decision panel */}
              <Region active={step === 3} dim={opened && !done && step !== 3} mark={3}>
                <div className="p-3 space-y-2">
                  <div className="text-[9px] uppercase tracking-wider font-mono text-muted-foreground">
                    Decision
                  </div>
                  <div className="rounded border border-border/60 bg-white/[0.02] px-2 py-1.5 text-[10px] text-muted-foreground/70 italic">
                    Required on reject - your note becomes the agent&apos;s added context.
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex-1 h-7 rounded-md border border-status-done/50 bg-status-done/15 text-status-done text-[10px] font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1">
                      <Check className="size-3" /> Approve
                    </span>
                    <span className="flex-1 h-7 rounded-md border border-status-error/50 bg-status-error/15 text-status-error text-[10px] font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1">
                      <X className="size-3" /> Reject
                    </span>
                  </div>
                </div>
              </Region>
            </div>
          </div>

          {/* mark 4 - the ledger row */}
          <Region active={step === 4} dim={opened && !done && step !== 4} mark={4}>
            <div className="p-3 flex items-center gap-2 flex-wrap font-mono text-[10px]">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground mr-1">
                Audit ledger
              </span>
              <span className="text-foreground">ae-051</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-status-done">gate.approved</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-foreground">{WALKTHROUGH_GATE_ID}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">actor Ana Kovač</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">hash 9f3a…c2e1</span>
            </div>
          </Region>
        </div>
      </div>

      {/* coach card / completion bar */}
      {!done && step > 0 && (
        <div className="rounded-md border border-primary/40 bg-primary/10 p-3 flex items-start gap-3">
          <span className="size-5 shrink-0 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold grid place-items-center mt-0.5">
            {step}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{MARKS[step - 1].title}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{MARKS[step - 1].body}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="h-7 px-2 rounded-md border border-border bg-white/5 text-muted-foreground hover:text-foreground text-[10px] font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-1"
              >
                <ChevronLeft className="size-3" /> Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="h-7 px-2.5 rounded-md border border-primary/50 bg-primary/15 text-primary hover:bg-primary/25 text-[10px] font-semibold font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-1"
            >
              {step === MARKS.length ? "Finish" : "Next"} <ArrowRight className="size-3" />
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="rounded-md border border-status-done/40 bg-status-done/10 p-3 flex items-center gap-2 flex-wrap text-xs">
          <Check className="size-4 text-status-done shrink-0" />
          <span className="text-status-done font-medium">
            Walkthrough complete - you&apos;ve seen the whole loop.
          </span>
          <span className="flex-1" />
          <Link
            to="/approvals/$gateId"
            params={{ gateId: WALKTHROUGH_GATE_ID }}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Open this gate for real <ExternalLink className="size-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                               */
/* ------------------------------------------------------------------ */

function Region({
  active,
  dim,
  mark,
  children,
}: {
  active: boolean;
  dim: boolean;
  mark: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-md border bg-white/[0.02] transition-all duration-300",
        active ? "border-primary/70 ring-2 ring-primary/30" : "border-border/60",
        dim && "opacity-35",
      )}
    >
      {active && (
        <span className="absolute -top-2 -left-2 z-10 size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold grid place-items-center glow-pulse">
          {mark}
        </span>
      )}
      {children}
    </div>
  );
}

/** Tiny markdown-ish line renderer - screenshot fidelity, not a doc engine. */
function ExcerptLine({ line }: { line: string }) {
  if (line.startsWith("# "))
    return <div className="text-[13px] font-semibold text-foreground">{line.slice(2)}</div>;
  if (line.startsWith("## "))
    return <div className="text-[11px] font-semibold text-foreground mt-1.5">{line.slice(3)}</div>;
  if (line.startsWith("- ") || line.startsWith("* "))
    return <div className="text-[10.5px] text-muted-foreground pl-3">• {line.slice(2)}</div>;
  if (line.startsWith("> "))
    return (
      <div className="text-[10.5px] text-muted-foreground italic pl-2 border-l-2 border-border">
        {line.slice(2)}
      </div>
    );
  if (line.trim() === "") return <div className="h-1.5" />;
  return <div className="text-[10.5px] text-muted-foreground">{line}</div>;
}
