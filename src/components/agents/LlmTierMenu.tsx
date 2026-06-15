/**
 * LlmTierMenu — the mandatory "pick a model policy" selector. The user
 * chooses a TIER (Max capability / Balanced / Budget / Local-only) rather
 * than a raw model id, wherever an agent is added to a pod or modified
 * (pod wizard, agent profile, registry). Each tier shows its indicative
 * cost + latency and an in-tenant badge for local. Controlled: pass `value`
 * (null = nothing chosen yet) and `onChange`.
 */

import { Check, Lock } from "lucide-react";
import { LLM_TIERS, modelOptionById, type LlmTier } from "@/mock/agent-config";
import { cn } from "@/lib/utils";

export function LlmTierMenu({
  value,
  onChange,
  size = "md",
  className,
}: {
  value: LlmTier | null;
  onChange: (tier: LlmTier) => void;
  /** "sm" hides the per-tier blurb (tight spaces like the wizard dialog). */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)} role="radiogroup" aria-label="LLM tier">
      {LLM_TIERS.map((t) => {
        const m = modelOptionById(t.modelId);
        const active = value === t.id;
        const accent = `var(${t.accent})`;
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
                ~${m.costPerRunUsd.toFixed(2)}/run · p50 {m.p50s}s
              </span>
            </div>
            {size === "md" && (
              <div className="mt-1 pl-6 text-[11px] leading-snug text-muted-foreground">
                {t.blurb} <span className="font-mono text-foreground/70">· {m.label}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
