/**
 * ValidatorPanel — the C3 walled deterministic-validator panel: the moat.
 *
 * Renders one artifact family's deterministic checks (validators.ts) —
 * the BA's 8 spec checks or the SA's 7 design checks — inside a visually
 * WALLED section — solid emerald-tinted border, ShieldCheck iconography,
 * the "DETERMINISTIC — NO MODEL IN THE LOOP" badge — so it can never be
 * confused with LLM/advisory signals (those get a separate amber/dashed
 * treatment + "LLM-ADVISORY" badge, NOT this component).
 *
 * Shared by: Gate Review (/approvals/$gateId, right rail · compact) and
 * Governance (/governance, left wall · full).
 */

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DETERMINISTIC_BADGE,
  STRUCTURAL_HONESTY_LINE,
  passedCount,
  validatorHeadline,
  type AnyCheckId,
  type ValidatorCheck,
  type ValidatorStatus,
} from "@/mock/validators";

/** Fleet-level extras per check — set on /governance, absent on gate review. */
export interface ValidatorRowMeta {
  /** % of assessed specs that hard-pass this check (0–100). */
  coverage?: number;
  /** Failing deterministic check = blocks structural readiness. */
  blocksReadiness?: boolean;
  /** Spec ids failing this check (expand-on-click). */
  failingSpecs?: string[];
  /** Spec ids with warn-level drift on this check. */
  warnSpecs?: string[];
}

export interface ValidatorPanelProps {
  /** One family's structural checks (validatorsFor / designValidatorsFor). */
  checks: ValidatorCheck[];
  /** Compact = right-rail density: no descriptors, tighter rows. */
  compact?: boolean;
  /** Per-check aggregate meta (governance wall). */
  meta?: Partial<Record<AnyCheckId, ValidatorRowMeta>>;
  /** Override the computed headline (e.g. "across 14 specs"). */
  headline?: string;
  /** Family-true honesty line (defaults to the spec wording). */
  honestyLine?: string;
  /** Row click — gate review scrolls to the offending block; governance expands failing specs. */
  onCheckClick?: (id: AnyCheckId) => void;
  className?: string;
}

const STATUS_META: Record<
  ValidatorStatus,
  { icon: typeof CheckCircle2; tone: string; pill: string; label: string }
> = {
  pass: {
    icon: CheckCircle2,
    tone: "text-status-done",
    pill: "border-status-done/40 bg-status-done/10 text-status-done",
    label: "pass",
  },
  warn: {
    icon: AlertTriangle,
    tone: "text-status-waiting",
    pill: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
    label: "warn",
  },
  fail: {
    icon: XCircle,
    tone: "text-status-error",
    pill: "border-status-error/40 bg-status-error/10 text-status-error",
    label: "fail",
  },
};

export function ValidatorPanel({
  checks,
  compact = false,
  meta,
  headline,
  honestyLine,
  onCheckClick,
  className,
}: ValidatorPanelProps) {
  const allPass = passedCount(checks) === checks.length && checks.length > 0;
  const [expandedId, setExpandedId] = useState<AnyCheckId | null>(null);
  // failing checks pinned to top (C4 has-failures state)
  const ordered = [...checks].sort((a, b) => {
    const rank = (s: ValidatorStatus) => (s === "fail" ? 0 : s === "warn" ? 1 : 2);
    return rank(a.status) - rank(b.status);
  });

  return (
    <section
      className={cn(
        // the WALL: solid emerald-tinted border — never dashed, never amber
        "rounded-md border-2 border-status-done/40 bg-panel/40 backdrop-blur-md",
        className,
      )}
      aria-label="Deterministic structural validators"
    >
      <header className={cn("border-b border-status-done/25", compact ? "p-3" : "p-4")}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-status-done shrink-0" />
          <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-done/40 bg-status-done/10 text-status-done">
            {DETERMINISTIC_BADGE}
          </span>
        </div>
        <div
          className={cn(
            "mt-2 text-sm font-semibold",
            allPass ? "text-status-done" : "text-foreground",
          )}
        >
          {headline ?? validatorHeadline(checks)}
        </div>
        {!compact && (
          <p className="mt-1 text-xs text-muted-foreground">
            {honestyLine ?? STRUCTURAL_HONESTY_LINE}
          </p>
        )}
      </header>

      <ul className={cn("divide-y divide-border/60", compact ? "px-3" : "px-4")}>
        {ordered.map((c) => {
          const statusMeta = STATUS_META[c.status];
          const Icon = statusMeta.icon;
          const rowMeta = meta?.[c.id];
          const interactive = Boolean(onCheckClick);
          const expanded = expandedId === c.id;
          const offenders = [...(rowMeta?.failingSpecs ?? []), ...(rowMeta?.warnSpecs ?? [])];
          const row = (
            <>
              <Icon className={cn("size-3.5 shrink-0 mt-0.5", statusMeta.tone)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground">{c.label}</span>
                  {rowMeta?.blocksReadiness && (
                    <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-px rounded border border-status-error/50 bg-status-error/15 text-status-error">
                      blocks readiness
                    </span>
                  )}
                </div>
                {!compact && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">{c.detail}</div>
                )}
                {expanded && offenders.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      offending specs ·
                    </span>
                    {offenders.map((id) => (
                      <span
                        key={id}
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                          rowMeta?.failingSpecs?.includes(id)
                            ? "border-status-error/40 bg-status-error/10 text-status-error"
                            : "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
                        )}
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {rowMeta?.coverage !== undefined && (
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0 mt-0.5">
                  {rowMeta.coverage}%
                </span>
              )}
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border shrink-0",
                  statusMeta.pill,
                )}
              >
                {statusMeta.label}
              </span>
            </>
          );
          return (
            <li key={c.id} title={c.descriptor}>
              {interactive ? (
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(expanded ? null : c.id);
                    onCheckClick?.(c.id);
                  }}
                  className={cn(
                    "w-full flex items-start gap-2.5 text-left hover:bg-white/[0.02] transition-colors",
                    compact ? "py-2" : "py-2.5",
                  )}
                >
                  {row}
                </button>
              ) : (
                <div className={cn("flex items-start gap-2.5", compact ? "py-2" : "py-2.5")}>
                  {row}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <footer
        className={cn(
          "border-t border-status-done/25 text-[10px] text-muted-foreground font-mono",
          compact ? "p-2.5" : "p-3",
        )}
      >
        Pure code over the spec — reproducible, model-free. Checked in code, no LLM.
      </footer>
    </section>
  );
}
