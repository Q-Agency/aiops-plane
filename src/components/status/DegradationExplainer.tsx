/**
 * DegradationExplainer - the "How degradation works" honesty card on
 * /status: the three lines (verbatim from src/mock/status.ts
 * DEGRADATION_EXPLAINER) behind the procurement story - agents keep
 * working, gates stay answerable in Slack, the ledger backfills with
 * gap-markers.
 */

import type { LucideIcon } from "lucide-react";
import { Bot, History, MessagesSquare, ShieldQuestion } from "lucide-react";
import { DEGRADATION_EXPLAINER } from "@/mock/status";

const LINE_ICONS: LucideIcon[] = [Bot, MessagesSquare, History];

export function DegradationExplainer() {
  return (
    <section className="glass-panel p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldQuestion className="size-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">How degradation works</h2>
      </div>
      <p className="text-xs text-muted-foreground">If AI PodOps is unreachable:</p>
      <ul className="space-y-2.5">
        {DEGRADATION_EXPLAINER.map((line, i) => {
          const Icon = LINE_ICONS[i] ?? Bot;
          return (
            <li key={line} className="flex items-start gap-2.5">
              <span className="size-6 shrink-0 rounded-md border border-border bg-white/[0.03] grid place-items-center mt-px">
                <Icon className="size-3.5 text-primary" />
              </span>
              <span className="text-xs text-foreground leading-relaxed">{line}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
