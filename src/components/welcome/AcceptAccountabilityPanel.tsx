/**
 * AcceptAccountabilityPanel (/welcome stage 3) — the duties summary + the
 * primary "Accept accountability" CTA. The CTA stays disabled until the
 * first-gate walkthrough has been opened; accepting confirms via
 * alert-dialog ("Acceptance is written to the audit ledger. Coverage is
 * accepted, not assigned.") and lists every covered agent explicitly —
 * one Accept covers all. "This isn't me" notifies the Pod Admin (mock).
 */

import { useState } from "react";
import { Handshake, UserX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { agents as allAgents } from "@/mock/agents";
import { gatePolicyFor } from "@/mock/gate-policies";
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

function agentName(id: string): string {
  return allAgents.find((a) => a.id === id)?.name ?? id.toUpperCase();
}

export interface AcceptAccountabilityPanelProps {
  humanName: string;
  /** Every agent this acceptance covers — a single Accept covers all. */
  agentIds: string[];
  /** Deputy variant: owner the coverage stands in for. */
  deputyOf?: string;
  /** False until the walkthrough has been opened. */
  ready: boolean;
  onAccept: () => void;
}

export function AcceptAccountabilityPanel({
  humanName,
  agentIds,
  deputyOf,
  ready,
  onAccept,
}: AcceptAccountabilityPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const names = agentIds.map(agentName);
  const listed = names.join(" + ");

  const duties = [
    ...agentIds.map(
      (id) =>
        `Clear the ${agentName(id)}'s gates within its SLA (${gatePolicyFor(id).slaLabel.replace("≤ ", "")}) — approve, reject, or answer.`,
    ),
    "Rejecting requires a typed reason — your note becomes the agent's added context on the rerun.",
    "Every decision you make lands on the immutable audit ledger under your name.",
    deputyOf
      ? `You cover when ${deputyOf} is OOO; accountability stays with ${deputyOf}.`
      : "Going OOO? Hand coverage to a deputy — accountability stays with you.",
  ];

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        Your duties{agentIds.length > 1 ? ` · ${agentIds.length} agents` : ""}
      </div>
      <ul className="space-y-1.5">
        {duties.map((d, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="size-1 rounded-full bg-primary/70 shrink-0 mt-1.5" />
            <span>{d}</span>
          </li>
        ))}
      </ul>

      <div className="pt-2 border-t border-border/60 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          disabled={!ready}
          onClick={() => setConfirmOpen(true)}
          title={ready ? undefined : "Open the first-gate walkthrough first"}
          className={cn(
            "h-9 px-4 rounded-md border text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5",
            ready
              ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
              : "border-border bg-white/[0.03] text-muted-foreground/60 cursor-not-allowed",
          )}
        >
          <Handshake className="size-3.5" /> Accept accountability
        </button>
        {!ready && (
          <span className="text-[10px] font-mono text-muted-foreground">
            unlocks after the walkthrough is opened
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() =>
            toast.success("Pod Admin notified", {
              description: `"This isn't me / wrong role" sent for ${humanName} — the invite will be re-issued to the right person.`,
            })
          }
          className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <UserX className="size-3" /> This isn&apos;t me / wrong role
        </button>
      </div>

      {/* accept confirm */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Accept accountability for {listed}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Acceptance is written to the audit ledger. Coverage is accepted, not assigned.
              {agentIds.length > 1 && (
                <> This single acceptance covers all listed agents: {names.join(", ")}.</>
              )}
              {deputyOf && (
                <> Deputy coverage — accountability stays with {deputyOf}.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onAccept();
              }}
            >
              Accept — record on the ledger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
