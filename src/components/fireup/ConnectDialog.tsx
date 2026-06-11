/**
 * ConnectDialog — OAuth-style mock consent for a connector (LAUNCH step 3
 * + the standalone /connections hub).
 *
 * Connect mode: "{name} is asking to:" scope checklist (write scopes get an
 * amber dot), direction line, mock-consent alert, "Authorize & connect" →
 * 600ms "Redirecting…" spinner → granted → connection written to the draft
 * + sonner toast. Ticketing connectors (teamwork/jira) get a second
 * "Status write-back" section: the 5-row pod-stage → client-status mapping
 * editor seeded from STATUS_MAP_DEFAULT.
 *
 * Manage mode (already connected): scopes shown granted, Disconnect with an
 * inline two-step confirm.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
import { usePods } from "@/lib/pods/pod-store";
import {
  CLIENT_STATUS_OPTIONS,
  STATUS_MAP_DEFAULT,
  connectorById,
  type Connector,
  type ConnectorId,
  type StatusMapRow,
} from "@/mock/connectors";

export interface ConnectDialogProps {
  connectorId: ConnectorId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after the mock OAuth flow lands the connection (connect mode only). */
  onConnected?: (id: ConnectorId) => void;
}

type Phase = "idle" | "authorizing" | "granted";

const CATEGORY_NOUN: Record<Connector["category"], string> = {
  ticketing: "tickets",
  comms: "channels",
  scm: "code",
  storage: "files",
  pm: "plans",
  design: "designs",
  testing: "test runs",
};

function directionLine(c: Connector): string {
  const hasRead = c.scopes.some((s) => s.access === "read");
  const hasWrite = c.scopes.some((s) => s.access === "write");
  const parts: string[] = [];
  if (hasRead) parts.push(`read ${CATEGORY_NOUN[c.category]} ← ${c.name}`);
  if (hasWrite) parts.push(`post updates → ${c.name}`);
  return `Agency OS will: ${parts.join(" · ")}`;
}

export function ConnectDialog({
  connectorId,
  open,
  onOpenChange,
  onConnected,
}: ConnectDialogProps) {
  const { draft, updateDraft } = usePods();
  const connector = connectorId ? connectorById(connectorId) : null;

  const isConnected = Boolean(
    connectorId &&
    draft?.connections.some((c) => c.connectorId === connectorId && c.status === "connected"),
  );
  const mode: "connect" | "manage" = isConnected ? "manage" : "connect";

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [statusMap, setStatusMap] = useState<StatusMapRow[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Re-seed local consent state every time the dialog opens for a connector.
  useEffect(() => {
    if (!open || !connector) return;
    setChecked(Object.fromEntries(connector.scopes.map((s) => [s.id, true])));
    setStatusMap((STATUS_MAP_DEFAULT[connector.id] ?? []).map((r) => ({ ...r })));
    setPhase("idle");
    setConfirmDisconnect(false);
  }, [open, connector]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  if (!connector) {
    return <Dialog open={open} onOpenChange={onOpenChange} />;
  }

  const grantedCount = connector.scopes.filter((s) => checked[s.id]).length;
  const isTicketing = connector.category === "ticketing";
  const clientStatuses = CLIENT_STATUS_OPTIONS[connector.id] ?? [];

  const handleAuthorize = () => {
    setPhase("authorizing");
    timersRef.current.push(
      setTimeout(() => {
        setPhase("granted");
        const others = (draft?.connections ?? []).filter((c) => c.connectorId !== connector.id);
        updateDraft({
          connections: [...others, { connectorId: connector.id, status: "connected" as const }],
        });
        toast.success(
          `${connector.name} connected · ${grantedCount} scope${grantedCount === 1 ? "" : "s"} granted`,
        );
        onConnected?.(connector.id);
        timersRef.current.push(
          setTimeout(() => {
            onOpenChange(false);
          }, 450),
        );
      }, 600),
    );
  };

  const handleDisconnect = () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      timersRef.current.push(setTimeout(() => setConfirmDisconnect(false), 3000));
      return;
    }
    updateDraft({
      connections: (draft?.connections ?? []).filter((c) => c.connectorId !== connector.id),
    });
    toast(`${connector.name} disconnected`, {
      description: "You can reconnect it any time from this step.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "manage"
              ? `Manage ${connector.name}`
              : `Connect ${connector.name} to this pod`}
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
                connector.availability === "live"
                  ? "border-status-done/50 bg-status-done/10 text-status-done"
                  : "border-border bg-white/5 text-muted-foreground",
              )}
            >
              {connector.availability === "live" ? "Live" : "Roadmap"}
            </span>
          </DialogTitle>
          <DialogDescription>{connector.description}</DialogDescription>
        </DialogHeader>

        {/* Scope list */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            {mode === "manage" ? "Granted scopes" : `${connector.name} is asking to:`}
          </div>
          <div className="rounded-md border border-border bg-panel/40 divide-y divide-border">
            {connector.scopes.map((scope) => (
              <label
                key={scope.id}
                className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
              >
                <Checkbox
                  checked={checked[scope.id] ?? false}
                  onCheckedChange={(v) => setChecked((m) => ({ ...m, [scope.id]: v === true }))}
                  disabled={phase !== "idle" || mode === "manage"}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm">
                    {scope.label}
                    {scope.access === "write" && (
                      <span
                        title="Write access"
                        className="size-1.5 rounded-full bg-status-waiting shrink-0"
                      />
                    )}
                  </span>
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
              </label>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowLeftRight className="size-3.5 shrink-0" />
            {directionLine(connector)}
          </div>
        </div>

        {/* Status write-back mapping — ticketing connectors only */}
        {isTicketing && statusMap.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Status write-back
              </div>
              <div className="rounded-md border border-border bg-panel/40 divide-y divide-border">
                {statusMap.map((row, i) => (
                  <div key={row.podStage} className="flex items-center gap-3 px-3 py-2">
                    <span className="text-xs flex-1 min-w-0 truncate">{row.podStage}</span>
                    <span className="text-muted-foreground text-xs shrink-0">→</span>
                    <Select
                      value={row.clientStatus}
                      onValueChange={(v) =>
                        setStatusMap((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, clientStatus: v } : r)),
                        )
                      }
                      disabled={phase !== "idle"}
                    >
                      <SelectTrigger className="h-7 w-[180px] text-xs bg-white/5 border-border shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {clientStatuses.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                The pod writes status back into <em>your</em> workflow — your board stays the source
                of truth for your team.
              </p>
            </div>
          </>
        )}

        <Alert className="bg-panel/40 border-border">
          <ShieldCheck className="size-4" />
          <AlertDescription className="text-xs text-muted-foreground">
            Mock connect — no real credentials are stored (vault deferred).
          </AlertDescription>
        </Alert>

        <DialogFooter className="gap-2">
          {mode === "manage" ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                {confirmDisconnect ? "Confirm disconnect?" : "Disconnect"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={phase !== "idle"}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={phase !== "idle"} onClick={handleAuthorize}>
                {phase === "authorizing" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Redirecting to {connector.name}…
                  </>
                ) : phase === "granted" ? (
                  <>
                    <Check className="size-4" />
                    Granted
                  </>
                ) : (
                  <>Authorize &amp; connect</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
