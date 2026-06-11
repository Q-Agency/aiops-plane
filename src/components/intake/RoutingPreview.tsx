/**
 * RoutingPreview — the compact per-ticket routing rail (C10): shows exactly
 * where a board-sent arrival lands once its start is confirmed — "AM-142 →
 * Backlog → Ready for Spec → BA Agent runs first · Ana accountable". Steps
 * derive from chain.ts (the first pipeline agent whose `consumes` is empty —
 * BA); the accountable human from the active pod's accountability map
 * (pod-store), falling back to the sample-pod ownership in humans.ts.
 * Always renders a REAL tracker id — under the single doorbell there is no
 * "ticket that doesn't exist yet" on this screen.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePods } from "@/lib/pods/pod-store";
import { accountableFor, humans } from "@/mock/humans";
import { routingPreview } from "@/mock/intake";

export interface RoutingPreviewProps {
  /** Real tracker/ticket id — rendered mono and deep-linked to the Pipeline. */
  ticketId: string;
  className?: string;
}

export function useBaAccountable(): { name: string; firstName: string } {
  const { activePod } = usePods();
  const podHumanId = activePod?.accountability?.ba ?? null;
  const human = (podHumanId && humans.find((h) => h.id === podHumanId)) || accountableFor("ba");
  return { name: human.name, firstName: human.name.split(" ")[0] };
}

export function RoutingPreview({ ticketId, className }: RoutingPreviewProps) {
  const { firstName } = useBaAccountable();
  const preview = routingPreview(ticketId);
  const [queue, stage, agentStep] = preview.steps;

  return (
    <Link
      to="/pipeline"
      search={{ ticket: ticketId }}
      title={`Open ${ticketId} on the Pipeline board`}
      className="block"
    >
      <div
        className={cn(
          "flex items-center gap-1.5 flex-wrap rounded-md border border-border bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-mono",
          "hover:border-primary/40 transition-colors",
          className,
        )}
      >
        <span className="shrink-0 text-foreground">{ticketId}</span>
        <ArrowRight className="size-3 text-muted-foreground/60 shrink-0" />
        <span className="text-muted-foreground shrink-0">{queue}</span>
        <ArrowRight className="size-3 text-muted-foreground/60 shrink-0" />
        <span className="text-muted-foreground shrink-0">{stage}</span>
        <ArrowRight className="size-3 text-muted-foreground/60 shrink-0" />
        <span className="inline-flex items-center gap-1 text-agent-ba shrink-0">
          <Bot className="size-3" /> {agentStep}
        </span>
        <span className="text-muted-foreground/70 shrink-0">· spec.md · {firstName} accountable</span>
      </div>
    </Link>
  );
}
