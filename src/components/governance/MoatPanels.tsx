/**
 * MoatPanels - the /governance moat surfaces that surround the shared
 * walled ValidatorPanel (C3):
 *
 *   - TrustBanner            - full-width deterministic badge strip +
 *                              structural-readiness rollup.
 *   - LlmJudgePanel          - the OTHER wall: amber, dashed, gavel-marked,
 *                              "LLM-ADVISORY" - advisory signals only,
 *                              never a gate.
 *   - StructuralVsSemanticNote - the honest disclaimer alert.
 *
 * The wall between deterministic and LLM-assisted is the load-bearing
 * design decision: solid emerald + ShieldCheck vs dashed amber + Gavel.
 * Spatial split, never tabs - a tab would let a skeptic ignore it.
 */

import { Gavel, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { DETERMINISTIC_BADGE, LLM_ADVISORY_BADGE } from "@/mock/validators";
import {
  advisoryDisagreement,
  llmSignals,
  type LlmSignal,
  type StructuralReadiness,
} from "@/mock/governance-moat";

/* ------------------------------------------------------------------ */
/* Trust banner                                                         */
/* ------------------------------------------------------------------ */

export function TrustBanner({ readiness }: { readiness: StructuralReadiness }) {
  return (
    <section
      className="rounded-md border-2 border-status-done/40 bg-status-done/[0.04] backdrop-blur-md px-4 py-3 flex items-center gap-4 flex-wrap"
      aria-label="Deterministic validation trust banner"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ShieldCheck className="size-7 text-status-done shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              Validated deterministically · no model in the loop
            </span>
            <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-done/40 bg-status-done/10 text-status-done">
              {DETERMINISTIC_BADGE}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            These checks run as pure functions over the spec AST. No model scores them. Results
            are reproducible.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            structural readiness
          </div>
          <div
            className={cn(
              "text-2xl font-semibold tabular-nums leading-tight",
              readiness.blocking > 0 ? "text-status-error" : "text-status-done",
            )}
          >
            {readiness.pct}%
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            {readiness.specsReady}/{readiness.specsAssessed} specs · all checks green
          </div>
        </div>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded border",
            readiness.blocking > 0
              ? "border-status-error/50 bg-status-error/10 text-status-error"
              : "border-status-done/40 bg-status-done/10 text-status-done",
          )}
        >
          {readiness.blocking > 0
            ? `${readiness.blocking} check blocking`
            : "no blockers"}
        </span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* LLM-assisted wall - advisory, never a gate                           */
/* ------------------------------------------------------------------ */

function SignalBar({ signal }: { signal: LlmSignal }) {
  const pct = Math.round(signal.score * 100);
  return (
    <li className="py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground flex-1">{signal.label}</span>
        <span className="text-xs font-mono tabular-nums text-status-waiting">{pct}%</span>
        <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-px rounded border border-status-waiting/40 bg-status-waiting/10 text-status-waiting">
          advisory
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-status-waiting/60"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">{signal.note}</p>
    </li>
  );
}

export function LlmJudgePanel({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        // the OTHER wall: dashed, amber - never solid, never emerald
        "rounded-md border-2 border-dashed border-status-waiting/40 bg-panel/40 backdrop-blur-md",
        className,
      )}
      aria-label="LLM-assisted advisory signals"
    >
      <header className="border-b border-dashed border-status-waiting/30 p-4">
        <div className="flex items-center gap-2">
          <Gavel className="size-4 text-status-waiting shrink-0" />
          <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting/40 bg-status-waiting/10 text-status-waiting">
            {LLM_ADVISORY_BADGE}
          </span>
        </div>
        <div className="mt-2 text-sm font-semibold text-foreground">LLM-assisted signals</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Advisory only - does not block readiness.
        </p>
      </header>

      <ul className="divide-y divide-border/60 px-4">
        {llmSignals.map((s) => (
          <SignalBar key={s.id} signal={s} />
        ))}
      </ul>

      <div className="mx-4 mb-3 rounded border border-status-waiting/30 bg-status-waiting/[0.06] px-2.5 py-2 text-[11px] text-muted-foreground">
        <span className="text-status-waiting font-medium">
          Advisory disagreement - does not block.
        </span>{" "}
        {advisoryDisagreement.line}
      </div>

      <footer className="border-t border-dashed border-status-waiting/30 p-3 text-[10px] text-muted-foreground font-mono">
        Model-graded - treat as advisory. LLM-assisted signal · advisory, not a gate.
      </footer>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The honest disclaimer                                                */
/* ------------------------------------------------------------------ */

export function StructuralVsSemanticNote() {
  return (
    <div
      role="note"
      className="rounded-md border border-border bg-panel/40 backdrop-blur-md px-3 py-2.5 flex items-start gap-2.5"
    >
      <Info className="size-4 text-primary shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        Structural validators prove the spec is <span className="text-foreground">well-formed</span>;
        the LLM judge offers an <span className="text-foreground">advisory opinion on substance</span>.
        We never let a model grade its own gate.
      </p>
    </div>
  );
}
