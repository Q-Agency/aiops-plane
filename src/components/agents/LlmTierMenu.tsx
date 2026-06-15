/**
 * LlmTierMenu — the mandatory model-policy selector. The user picks a TIER
 * (Max capability / Balanced / Budget / Local-only), and each tier is a
 * BLEND of models — a different model per sub-role (generation, supervisor,
 * judge). The menu never presents a tier as one model: it shows the blended
 * cost, an "N-model blend" tag, and (in `md`) the per-role composition.
 * Controlled: pass `value` (null = nothing chosen yet) and `onChange`.
 */

import { Check, Lock } from "lucide-react";
import {
  LLM_TIERS,
  tierComposition,
  tierCostPerRun,
  tierModelCount,
  tierP50,
  type LlmTier,
} from "@/mock/agent-config";
import { cn } from "@/lib/utils";

export function LlmTierMenu({
  value,
  onChange,
  size = "md",
  className,
}: {
  value: LlmTier | null;
  onChange: (tier: LlmTier) => void;
  /** "sm" hides the per-role composition (tight spaces like the wizard dialog). */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)} role="radiogroup" aria-label="LLM tier">
      {LLM_TIERS.map((t) => {
        const active = value === t.id;
        const accent = `var(${t.accent})`;
        const cost = tierCostPerRun(t.id);
        const blend = tierModelCount(t.id);
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t.id)}
            data-test={`llm-tier-${t.id}`}
            className={cn(
              "w-full text-left rounded-lg border px-3 py-2 transition-colors",
              active ? "bg-white/[0.04]" : "border-border bg-white/[0.02] hover:border-white/20",
            )}
            style={
              active ? { borderColor: accent, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined
            }
          >
            <div className="flex items-center gap-2">
              <span
                className="grid size-4 shrink-0 place-items-center rounded-full border"
                style={{
                  borderColor: active ? accent : "var(--border)",
                  background: active ? accent : "transparent",
                }}
              >
                {active && <Check className="size-2.5 text-black/85" />}
              </span>
              <span
                className="text-[13px] font-semibold"
                style={active ? { color: accent } : undefined}
              >
                {t.label}
              </span>
              {t.inTenant && (
                <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-status-done/40 text-status-done bg-status-done/10">
                  <Lock className="size-2.5" /> in-tenant
                </span>
              )}
              <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                ~${cost.toFixed(2)}/run · p50 {tierP50(t.id)}s
              </span>
            </div>

            {/* Blend tag — always shown so a tier never reads as one model */}
            <div className="mt-1 pl-6 flex items-center gap-1.5">
              <span
                className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                style={{ color: accent, borderColor: `color-mix(in oklab, ${accent} 35%, transparent)` }}
              >
                {blend}-model blend
              </span>
              {size === "sm" && (
                <span className="font-mono text-[10px] text-muted-foreground/80 truncate">
                  gen {tierComposition(t.id)[0].model.label}
                </span>
              )}
            </div>

            {size === "md" && (
              <div className="mt-1.5 pl-6 space-y-1">
                <p className="text-[11px] leading-snug text-muted-foreground">{t.blurb}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px]">
                  {tierComposition(t.id).map((c) => (
                    <span key={c.role}>
                      <span className="text-muted-foreground/70">{c.label}:</span>{" "}
                      <span className="text-foreground/80">{c.model.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
