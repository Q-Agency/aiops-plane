/**
 * AmendmentCard — section 2 of /memory (P1-A2): a draft rule mined from a
 * rejection-reason cluster. Evidence chips deep-link to the /compliance
 * audit ledger (hover-card peeks the typed reason; gate canon link inside).
 * Ratify confirms via alert-dialog ("Recorded in the ledger"); Dismiss
 * requires a short typed reason — consistent with the reject canon.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Pickaxe, ShieldCheck, Sparkles, Stamp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Textarea } from "@/components/ui/textarea";
import type { AmendmentProposal } from "@/mock/memory";
import { citingDecisionFor, fmtShortDate, VERB_TONE } from "./memory-ui";

function EvidenceChip({ gateId }: { gateId: string }) {
  const d = citingDecisionFor(gateId);
  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <Link
          to="/compliance"
          hash="audit"
          className="text-[11px] font-mono px-2 py-0.5 rounded border border-border bg-white/5 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          {gateId}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-80 bg-panel/90 backdrop-blur-md border-border/60">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
                VERB_TONE[d.verb],
              )}
            >
              {d.verb}
            </span>
            <span className="text-xs text-foreground">{d.actorName ?? "when-only"}</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              {fmtShortDate(d.ts)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">“{d.detail}”</p>
          <Link
            to="/approvals/$gateId"
            params={{ gateId }}
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
          >
            open gate <ArrowRight className="size-3" />
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function AmendmentCard({
  amendment,
  onRatify,
  onDismiss,
}: {
  amendment: AmendmentProposal;
  /** Parent appends `constitution.amended` + moves the rule into the Constitution. */
  onRatify: () => void;
  /** Parent collapses the card; `reason` is the required typed dismissal note. */
  onDismiss: (reason: string) => void;
}) {
  const [ratifyOpen, setRatifyOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [reason, setReason] = useState("");

  // Re-seed the typed reason every time the dismiss dialog opens.
  useEffect(() => {
    if (dismissOpen) setReason("");
  }, [dismissOpen]);

  const today = fmtShortDate(Date.now());

  return (
    <div className="glass-panel p-4">
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-md grid place-items-center bg-status-waiting/10 border border-status-waiting/40 shrink-0">
          <Pickaxe className="size-4 text-status-waiting" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-mono text-status-waiting">
              proposed amendment
            </span>
            <code className="text-[10px] font-mono text-muted-foreground">{amendment.id}</code>
          </div>
          <p className="text-sm font-medium mt-1">“{amendment.draftText}”</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="size-3 text-primary shrink-0" />
            <span>{amendment.minedFrom.clusterLabel} → proposed rule</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              evidence
            </span>
            {amendment.minedFrom.rejectionGateIds.map((gateId) => (
              <EvidenceChip key={gateId} gateId={gateId} />
            ))}
            <Link
              to="/compliance"
              hash="audit"
              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
            >
              view in audit ledger <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setDismissOpen(true)}>
          Dismiss
        </Button>
        <Button size="sm" onClick={() => setRatifyOpen(true)}>
          <Stamp className="size-4" />
          Ratify (recorded)
        </Button>
      </div>

      {/* Ratify — "Recorded in the ledger" confirm */}
      <AlertDialog open={ratifyOpen} onOpenChange={setRatifyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ratify this amendment?</AlertDialogTitle>
            <AlertDialogDescription>
              Recorded in the ledger — <code className="font-mono">constitution.amended</code>{" "}
              lands with timestamp, and the rule joins the Constitution with provenance
              “Ratified {today} — from rejection cluster”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-xs text-muted-foreground border border-border rounded-md bg-white/[0.02] px-3 py-2">
            “{amendment.draftText}”
          </div>
          <Alert className="bg-panel/40 border-border">
            <ShieldCheck className="size-4" />
            <AlertDescription className="text-xs text-muted-foreground">
              Written to the audit ledger with timestamp · actor “when-only” until real auth.
            </AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRatifyOpen(false);
                onRatify();
              }}
            >
              Ratify (recorded)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dismiss — short typed reason required (reject canon) */}
      <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Dismiss this proposal?</DialogTitle>
            <DialogDescription>
              Dismissals carry a short typed reason — consistent with every reject in the pod.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Reason (required)
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why is this rule wrong for the pod? (kept with the proposal)"
              className="bg-white/5 border-border text-xs resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDismissOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={reason.trim().length === 0}
              onClick={() => {
                setDismissOpen(false);
                onDismiss(reason.trim());
              }}
            >
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
