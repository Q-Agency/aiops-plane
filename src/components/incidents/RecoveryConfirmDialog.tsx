/**
 * RecoveryConfirmDialog — the confirm step before any recovery action (C5).
 *
 * Ownership-changing / destructive actions (reassign-human, restart-agent,
 * pause-agent, escalate-to-q) REQUIRE a typed reason for the audit ledger;
 * retry/resume confirm with one click. reauth-tool renders the connector's
 * scope list (LAUNCH Connect-tile language) and a mock OAuth "Reconnect"
 * step. Reassign picks a new accountable human from humans.ts.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { agents } from "@/mock/agents";
import { connectorById } from "@/mock/connectors";
import { humans } from "@/mock/humans";
import {
  RECOVERY_ACTION_LABELS,
  type Incident,
  type RecoveryActionKind,
} from "@/mock/incidents";

export interface RecoveryCommit {
  reason?: string;
  humanId?: string;
}

export interface RecoveryConfirmDialogProps {
  incident: Incident | null;
  action: RecoveryActionKind | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired on confirm — the parent runs the recovering → resolved simulation. */
  onCommit: (action: RecoveryActionKind, commit: RecoveryCommit) => void;
}

/** Actions whose confirm REQUIRES a typed reason (recorded in the ledger). */
const REASON_REQUIRED: ReadonlySet<RecoveryActionKind> = new Set([
  "reassign-human",
  "restart-agent",
  "pause-agent",
  "escalate-to-q",
]);

interface DialogCopy {
  title: string;
  body: string;
  cta: string;
  reasonPlaceholder: string;
}

function agentName(id: string | undefined): string {
  return agents.find((a) => a.id === id)?.name ?? "the agent";
}

function copyFor(incident: Incident, action: RecoveryActionKind): DialogCopy {
  const agent = agentName(incident.agentId);
  const onTicket = incident.ticketId ? ` on ${incident.ticketId}` : "";
  switch (action) {
    case "restart-agent":
      return {
        title: `Restart ${agent}?`,
        body: "This interrupts any in-flight step. Add a reason for the audit ledger.",
        cta: "Restart & log",
        reasonPlaceholder: "Why are you restarting? (recorded with timestamp)",
      };
    case "pause-agent":
      return {
        title: `Pause ${agent}?`,
        body: "Queued work holds until you resume the agent. Add a reason for the audit ledger.",
        cta: "Pause & log",
        reasonPlaceholder: "Why are you pausing? (recorded with timestamp)",
      };
    case "reassign-human":
      return {
        title: "Reassign accountable human",
        body: "Ownership changes are recorded. Pick the new owner and add a reason.",
        cta: "Reassign & log",
        reasonPlaceholder: "Why are you reassigning? (recorded with timestamp)",
      };
    case "escalate-to-q":
      return {
        title: "Escalate to Q?",
        body: "A Q engineer is paged with the full incident context and timeline.",
        cta: "Escalate & log",
        reasonPlaceholder: "What should Q look at? (recorded with timestamp)",
      };
    case "retry-run":
      return {
        title: `Retry the failed run${onTicket}?`,
        body: "One-click recovery — the retry and its outcome are written to the audit ledger.",
        cta: "Retry & log",
        reasonPlaceholder: "Optional note for the ledger",
      };
    case "resume-run":
      return {
        title: `Resume the run${onTicket}?`,
        body: "Resumes from the last checkpoint — recorded with timestamp.",
        cta: "Resume & log",
        reasonPlaceholder: "Optional note for the ledger",
      };
    case "reauth-tool":
      return {
        title: "Re-authenticate tool",
        body: "Reconnect the tool to restore agent access.",
        cta: "Reconnect",
        reasonPlaceholder: "Optional note for the ledger",
      };
  }
}

export function RecoveryConfirmDialog({
  incident,
  action,
  open,
  onOpenChange,
  onCommit,
}: RecoveryConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [humanId, setHumanId] = useState<string>("");
  const [authorizing, setAuthorizing] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Re-seed local state every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setReason("");
    setHumanId("");
    setAuthorizing(false);
  }, [open, incident?.id, action]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  if (!incident || !action) {
    return <Dialog open={open} onOpenChange={onOpenChange} />;
  }

  const copy = copyFor(incident, action);
  const needsReason = REASON_REQUIRED.has(action);
  const isReassign = action === "reassign-human";
  const isReauth = action === "reauth-tool";
  const connector = isReauth && incident.toolId ? connectorById(incident.toolId) : null;

  const reassignPool = humans.filter((h) => h.id !== incident.accountableHumanId);

  const confirmDisabled =
    authorizing ||
    (needsReason && reason.trim().length === 0) ||
    (isReassign && humanId === "");

  function confirm() {
    if (!incident || !action) return;
    const commit: RecoveryCommit = {
      reason: reason.trim() || undefined,
      humanId: isReassign ? humanId : undefined,
    };
    if (isReauth) {
      // Mock OAuth hop before the commit lands.
      setAuthorizing(true);
      timersRef.current.push(
        setTimeout(() => {
          setAuthorizing(false);
          onCommit(action, commit);
        }, 650),
      );
      return;
    }
    onCommit(action, commit);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !authorizing && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {connector ? `Reconnect ${connector.name}` : copy.title}
            <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
              {RECOVERY_ACTION_LABELS[action]}
            </span>
          </DialogTitle>
          <DialogDescription>{connector ? connector.description : copy.body}</DialogDescription>
        </DialogHeader>

        <div className="text-xs text-muted-foreground font-mono">
          {incident.id} · {incident.title}
        </div>

        {/* reauth: the connector's scopes, LAUNCH Connect-tile language */}
        {connector && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              {connector.name} will be re-granted:
            </div>
            <div className="rounded-md border border-border bg-panel/40 divide-y divide-border">
              {connector.scopes.map((scope) => (
                <div key={scope.id} className="flex items-start gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{scope.label}</span>
                    <span className="block text-xs text-muted-foreground">{scope.reason}</span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border shrink-0",
                      scope.access === "write"
                        ? "border-status-waiting/50 bg-status-waiting/10 text-status-waiting"
                        : "border-border bg-white/5 text-muted-foreground",
                    )}
                  >
                    {scope.access}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* reassign: new-owner picker */}
        {isReassign && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              New accountable human
            </div>
            <Select value={humanId} onValueChange={setHumanId}>
              <SelectTrigger className="w-full bg-white/5 border-border text-sm">
                <SelectValue placeholder="Pick the new owner…" />
              </SelectTrigger>
              <SelectContent>
                {reassignPool.map((h) => (
                  <SelectItem key={h.id} value={h.id} className="text-sm">
                    {h.name} · {h.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* reason — required for destructive / ownership-changing actions */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Reason {needsReason ? "(required)" : "(optional)"}
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder={copy.reasonPlaceholder}
            className="bg-white/5 border-border text-xs resize-none"
          />
        </div>

        <Alert className="bg-panel/40 border-border">
          <ShieldCheck className="size-4" />
          <AlertDescription className="text-xs text-muted-foreground">
            Written to the audit ledger with timestamp · actor “when-only” until real auth.
          </AlertDescription>
        </Alert>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" disabled={authorizing} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={confirmDisabled} onClick={confirm}>
            {authorizing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Redirecting to {connector?.name}…
              </>
            ) : (
              copy.cta
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
