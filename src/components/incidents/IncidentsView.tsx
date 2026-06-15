/**
 * IncidentsView - /incidents (C5): "Detect, decide, recover - every action
 * is logged." Master-detail over the INCIDENTS mock: inbox left, detail +
 * recovery controls right. Recovery actions confirm via dialog, run a short
 * mocked "recovering" delay, then commit through recoverIncident /
 * reassignIncident (audit-ledger-shaped entries; actor "when-only") and
 * toast "written to audit ledger ✓". inc-6 + Retry run is the forced-fail
 * demo path. Deep-linkable via ?incident=<id> (bell, ⌘K, /comms).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { EscSeverity } from "@/mock/comms";
import { humans } from "@/mock/humans";
import {
  INCIDENTS,
  incidentById,
  recoverIncident,
  reassignIncident,
  type IncidentStatus,
  type RecoveryActionKind,
} from "@/mock/incidents";
import { useDemoTick } from "@/mock/demo-bus";
import { IncidentInbox } from "./IncidentInbox";
import { IncidentDetail } from "./IncidentDetail";
import { RecoveryConfirmDialog, type RecoveryCommit } from "./RecoveryConfirmDialog";
import { SEV_DOT } from "./incident-ui";

const SEVERITIES: EscSeverity[] = ["critical", "high", "med", "low"];

export interface IncidentsViewProps {
  /** ?incident=<id> deep link (bell notification, ⌘K, /comms escalation). */
  deepLinkId?: string;
}

export function IncidentsView({ deepLinkId }: IncidentsViewProps) {
  const navigate = useNavigate();
  // Mutation seam re-render: INCIDENTS is module state; bump after each commit.
  const [, setSeq] = useState(0);
  // Demo Director staged incident flips land in INCIDENTS - repaint on tick.
  useDemoTick();
  const [selectedId, setSelectedId] = useState<string | null>(deepLinkId ?? null);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ incidentId: string; action: RecoveryActionKind } | null>(
    null,
  );
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // External deep-link changes (⌘K while already on the page) re-select.
  useEffect(() => {
    if (deepLinkId) setSelectedId(deepLinkId);
  }, [deepLinkId]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  const open = INCIDENTS.filter((i) => i.status !== "resolved");
  const critical = open.filter((i) => i.severity === "critical").length;
  const sevCounts = useMemo(() => {
    const out = {} as Record<EscSeverity, number>;
    for (const s of SEVERITIES) out[s] = open.filter((i) => i.severity === s).length;
    return out;
  }, [open]);

  const selected = (selectedId ? incidentById(selectedId) : undefined) ?? open[0] ?? null;
  const selectedStatus: IncidentStatus = selected
    ? recoveringId === selected.id
      ? "recovering"
      : selected.status
    : "open";

  function select(id: string) {
    setSelectedId(id);
    navigate({ to: "/incidents", search: { incident: id }, replace: true });
  }

  function requestAction(action: RecoveryActionKind) {
    if (!selected || selectedStatus !== "open") return;
    setDialog({ incidentId: selected.id, action });
  }

  function commit(action: RecoveryActionKind, { reason, humanId }: RecoveryCommit) {
    const target = dialog ? incidentById(dialog.incidentId) : undefined;
    setDialog(null);
    if (!target || target.status === "resolved") return;

    // Recovering phase is purely local - navigating away mid-flight leaves
    // the module state untouched ("open") until the commit lands.
    setRecoveringId(target.id);
    timersRef.current.push(
      setTimeout(() => {
        const entry =
          action === "reassign-human" && humanId
            ? reassignIncident(target.id, humanId, reason)
            : recoverIncident(target.id, action, reason);
        setRecoveringId(null);
        setSeq((n) => n + 1);
        if (!entry) return;
        if (entry.action === "incident.recovery_failed") {
          const h =
            humans.find((x) => x.id === target.accountableHumanId)?.name ??
            "the accountable human";
          toast.error(`Retry failed - escalated to ${h}. See timeline.`, {
            description: `${entry.action} · ${entry.target} · actor when-only`,
          });
        } else {
          toast.success("Recovery action recorded · written to audit ledger ✓", {
            description: `${entry.action} · ${entry.target}${reason ? ` · “${reason}”` : ""} · actor when-only`,
          });
        }
      }, 1100),
    );
  }

  const dialogIncident = dialog ? (incidentById(dialog.incidentId) ?? null) : null;

  return (
    <div className="p-4 lg:p-6 space-y-5 h-full flex flex-col min-h-0">
      {/* header band */}
      <header className="flex items-center gap-3 flex-wrap shrink-0">
        <div className="size-9 rounded-md bg-primary/10 border border-primary/30 grid place-items-center text-primary">
          <Siren className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold tracking-tight">Incidents &amp; Recovery</h1>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
                open.length > 0
                  ? "border-status-error/40 bg-status-error/10 text-status-error"
                  : "border-status-done/40 bg-status-done/10 text-status-done",
              )}
            >
              {open.length > 0 ? `${open.length} open · ${critical} critical` : "0 open"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detect, decide, recover - every action is logged.
          </p>
        </div>
        <div className="flex-1" />
        {/* severity summary chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SEVERITIES.map((s) => (
            <span
              key={s}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-white/[0.03] text-[10px] font-mono",
                sevCounts[s] === 0 && "opacity-45",
              )}
            >
              <span className={cn("size-1.5 rounded-full", SEV_DOT[s])} />
              <span className="uppercase tracking-wider text-muted-foreground">{s}</span>
              <span className="text-foreground tabular-nums">{sevCounts[s]}</span>
            </span>
          ))}
        </div>
      </header>

      {/* master-detail */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-[380px_1fr] gap-5">
        <IncidentInbox
          incidents={INCIDENTS}
          selectedId={selected?.id ?? null}
          onSelect={select}
          recoveringId={recoveringId}
        />
        <IncidentDetail incident={selected} status={selectedStatus} onAction={requestAction} />
      </div>

      <RecoveryConfirmDialog
        incident={dialogIncident}
        action={dialog?.action ?? null}
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        onCommit={commit}
      />
    </div>
  );
}
