/**
 * AutonomyLadder - Settings "Gate policies & autonomy" (#gates, P1-G1b):
 * per chain agent, the earned autonomy rung (L0 review-all → L3
 * auto-low-risk) plus the system-proposed promotions. Promotion criteria
 * are deterministic validator streaks - proposed by the system, granted by
 * the accountable human, written to the ledger.
 *
 *  - Grant: alert-dialog confirm (evidence + preview stat + "Recorded in
 *    the ledger") → optimistic level bump + `policy.changed` + toast.
 *  - Dismiss: typed reason REQUIRED (reject canon) → proposal closed,
 *    reason on the ledger.
 *
 * Standard (mock) experience only; session-scoped state.
 */

import { useState } from "react";
import { Gauge, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { appendAuditMock } from "@/mock/audit-bridge";
import { catalogEntry } from "@/mock/catalog";
import { isChainRoleId, type ChainRoleId } from "@/mock/chain";
import {
  AUTONOMY_LADDER,
  AUTONOMY_LEVELS,
  autonomyPreviewStat,
  type AutonomyStatus,
} from "@/mock/gate-policies";
import { accountableFor } from "@/mock/humans";
import type { AgentId } from "@/mock/types";
import { cn } from "@/lib/utils";

type Level = AutonomyStatus["level"];

/* ------------------------- agent display joins ------------------------ */

/** chain.ts role id → agents.ts id (for the accountable-human join). */
const CHAIN_TO_AGENT: Partial<Record<ChainRoleId, AgentId>> = {
  ba: "ba",
  sa: "sa",
  tasklist: "tasklist",
  dev: "dev",
  review: "review",
  qa: "qa",
  knowledge: "curator",
};

function accountableName(chainId: string): string {
  if (isChainRoleId(chainId)) {
    const agentId = CHAIN_TO_AGENT[chainId];
    if (agentId) return accountableFor(agentId).name;
  }
  return "Pod Admin";
}

function agentDisplay(chainId: string): { name: string; color: string } {
  if (isChainRoleId(chainId)) {
    const entry = catalogEntry(chainId);
    return { name: entry.name, color: `var(--${entry.color})` };
  }
  return { name: chainId, color: "var(--muted-foreground)" };
}

/** "L2" → "Sample 1-in-5" (from the canonical AUTONOMY_LEVELS labels). */
function rungLabel(id: Level): string {
  const label = AUTONOMY_LEVELS.find((l) => l.id === id)?.label ?? id;
  return label.includes("- ") ? label.split("- ")[1] : label;
}

const LEVEL_ORDER: Level[] = ["L0", "L1", "L2", "L3"];

/* ----------------------------- row state ------------------------------ */

interface RowState {
  level: Level;
  proposal: "open" | "granted" | "dismissed" | null;
}

function initialRows(): Record<string, RowState> {
  const out: Record<string, RowState> = {};
  for (const a of AUTONOMY_LADDER) {
    out[a.agentId] = { level: a.level, proposal: a.eligibleFor ? "open" : null };
  }
  return out;
}

/* -------------------------------- view -------------------------------- */

export function AutonomyLadder() {
  const [rows, setRows] = useState<Record<string, RowState>>(initialRows);
  const [grantFor, setGrantFor] = useState<AutonomyStatus | null>(null);
  const [dismissFor, setDismissFor] = useState<AutonomyStatus | null>(null);
  const [reason, setReason] = useState("");

  const confirmGrant = () => {
    const a = grantFor;
    if (!a?.eligibleFor) return;
    const before = rows[a.agentId]?.level ?? a.level;
    const after = a.eligibleFor;
    const { name } = agentDisplay(a.agentId);
    const granter = accountableName(a.agentId);
    setRows((rs) => ({ ...rs, [a.agentId]: { level: after, proposal: "granted" } }));
    appendAuditMock({
      action: "policy.changed",
      target: `autonomy:${a.agentId}`,
      detail: `autonomy-level: ${before} → ${after} - granted on ${a.evidence?.line ?? "validator streak"}`,
      actorName: granter,
    });
    toast.success("Autonomy granted · recorded in the ledger", {
      description: `${name}: ${before} → ${after} (${rungLabel(after)}) - granted by ${granter}.`,
    });
    setGrantFor(null);
  };

  const confirmDismiss = () => {
    const a = dismissFor;
    if (!a?.eligibleFor || reason.trim().length < 4) return;
    const level = rows[a.agentId]?.level ?? a.level;
    const { name } = agentDisplay(a.agentId);
    setRows((rs) => ({ ...rs, [a.agentId]: { level, proposal: "dismissed" } }));
    appendAuditMock({
      action: "policy.changed",
      target: `autonomy:${a.agentId}`,
      detail: `autonomy-proposal: ${a.eligibleFor} dismissed - level stays ${level} · reason: ${reason.trim()}`,
    });
    toast("Proposal dismissed", {
      description: `${name} stays at ${level} - typed reason recorded in the ledger.`,
    });
    setDismissFor(null);
    setReason("");
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Autonomy ladder</h3>
      </div>
      <p className="text-xs text-muted-foreground max-w-3xl">
        Deterministic checks are the precondition for safe delegation - promotion criteria are
        validator streaks, not vibes. Proposed by the system, granted by the accountable human,
        written to the ledger.
      </p>

      {/* Rung legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {AUTONOMY_LEVELS.map((l) => (
          <div key={l.id} className="rounded border border-border bg-white/[0.02] p-2.5">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
                {l.id}
              </span>
              <span className="text-xs font-medium">{rungLabel(l.id)}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{l.description}</p>
          </div>
        ))}
      </div>

      {/* Per-agent rows */}
      <ul className="divide-y divide-border/60">
        {AUTONOMY_LADDER.map((a) => {
          const state = rows[a.agentId] ?? { level: a.level, proposal: null };
          const { name, color } = agentDisplay(a.agentId);
          const levelIdx = LEVEL_ORDER.indexOf(state.level);
          return (
            <li key={a.agentId} className="py-3 flex items-start gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-44">
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-sm text-foreground">{name}</span>
              </div>

              {/* Current rung chip + rung dots */}
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-mono">
                  <ShieldCheck className="size-3" />
                  <span className="font-semibold uppercase tracking-wider">{state.level}</span>
                  <span className="text-primary/50">·</span>
                  <span>{rungLabel(state.level)}</span>
                </span>
                <span className="flex items-center gap-1" aria-hidden>
                  {LEVEL_ORDER.map((l, i) => (
                    <span
                      key={l}
                      className={cn(
                        "size-1.5 rounded-sm",
                        i <= levelIdx ? "bg-primary" : "bg-white/10",
                      )}
                    />
                  ))}
                </span>
              </div>

              {/* Proposal column */}
              <div className="flex-1 min-w-60">
                {a.eligibleFor && a.evidence && state.proposal === "open" && (
                  <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-dashed border-primary/50 text-primary">
                        System-proposed
                      </span>
                      <span className="text-xs font-medium text-foreground">{a.evidence.line}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <TrendingUp className="size-3 text-primary shrink-0 mt-0.5" />
                      {autonomyPreviewStat(a.agentId).line}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" className="h-7 text-xs" onClick={() => setGrantFor(a)}>
                        Grant {a.eligibleFor}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setReason("");
                          setDismissFor(a);
                        }}
                      >
                        Dismiss
                      </Button>
                      <span className="text-[10px] text-muted-foreground">
                        Grant rests with {accountableName(a.agentId)} - the accountable human.
                      </span>
                    </div>
                  </div>
                )}
                {state.proposal === "granted" && (
                  <span className="text-[11px] text-status-done">
                    Promotion granted this session - on the ledger ✓
                  </span>
                )}
                {state.proposal === "dismissed" && (
                  <span className="text-[11px] text-muted-foreground">
                    Proposal dismissed - typed reason on the ledger.
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Grant confirm */}
      <AlertDialog open={grantFor !== null} onOpenChange={(open) => !open && setGrantFor(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {grantFor?.eligibleFor
                ? `Grant ${grantFor.eligibleFor} (${rungLabel(grantFor.eligibleFor)}) to ${agentDisplay(grantFor.agentId).name}?`
                : "Grant promotion?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {grantFor?.evidence && (
                  <div className="font-mono text-xs rounded border border-border bg-white/[0.03] px-2.5 py-2 text-foreground">
                    {grantFor.evidence.line}
                  </div>
                )}
                {grantFor && (
                  <div className="flex items-start gap-2 rounded border border-primary/30 bg-primary/5 px-2.5 py-2">
                    <TrendingUp className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground">
                      {autonomyPreviewStat(grantFor.agentId).line}
                    </span>
                  </div>
                )}
                <p className="text-[11px]">
                  Recorded in the ledger as{" "}
                  <code className="font-mono rounded bg-white/10 px-1">policy.changed</code> -
                  revocable at any time.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGrant}>Grant - record in ledger</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dismiss - typed reason required (reject canon) */}
      <Dialog
        open={dismissFor !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDismissFor(null);
            setReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dismissFor?.eligibleFor
                ? `Dismiss the ${dismissFor.eligibleFor} proposal for ${agentDisplay(dismissFor.agentId).name}?`
                : "Dismiss proposal?"}
            </DialogTitle>
            <DialogDescription>
              The agent stays at its current level. A typed reason is required and lands on the
              ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="dismiss-reason">Reason (required)</Label>
            <Textarea
              id="dismiss-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Hold until the next quality review - streak window too short."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDismissFor(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button disabled={reason.trim().length < 4} onClick={confirmDismiss}>
              Dismiss - record reason
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
