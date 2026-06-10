/**
 * IncidentDetail — right pane of /incidents (C5): header (type, severity,
 * affected entity, SLA-to-resolve countdown), Suggested-action callout,
 * type-aware Recovery controls, the per-incident timeline (newest-last) and
 * the linked comms / escalation footer cross-linking back to /comms.
 */

import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Bot,
  CheckCircle2,
  Link2,
  Loader2,
  Radar,
  RefreshCcw,
  User2,
  Wrench,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { agents } from "@/mock/agents";
import { COMMS, ESCALATIONS } from "@/mock/comms";
import { connectorById } from "@/mock/connectors";
import { humans } from "@/mock/humans";
import {
  INCIDENT_TYPE_LABELS,
  RECOVERY_ACTION_LABELS,
  type Incident,
  type IncidentEvent,
  type IncidentStatus,
  type RecoveryActionKind,
} from "@/mock/incidents";
import { agoLabel, fmtAgo, SeverityChip, TypeChip } from "./incident-ui";

export interface IncidentDetailProps {
  incident: Incident | null;
  /** Derived status — "recovering" while the parent's mock delay is in flight. */
  status: IncidentStatus;
  onAction: (action: RecoveryActionKind) => void;
}

const EVENT_ICON: Record<IncidentEvent["kind"], LucideIcon> = {
  detected: Radar,
  notified: BellRing,
  "auto-attempt": RefreshCcw,
  "human-action": User2,
  "recovery-failed": XCircle,
  resolved: CheckCircle2,
};

const EVENT_TONE: Record<IncidentEvent["kind"], string> = {
  detected: "text-status-waiting border-status-waiting/40",
  notified: "text-muted-foreground border-border",
  "auto-attempt": "text-primary border-primary/40",
  "human-action": "text-foreground border-border",
  "recovery-failed": "text-status-error border-status-error/40",
  resolved: "text-status-done border-status-done/40",
};

function humanName(id: string | undefined): string {
  return humans.find((h) => h.id === id)?.name ?? "—";
}

function firstSentence(s: string): string {
  const i = s.indexOf(". ");
  return i === -1 ? s.replace(/\.$/, "") : s.slice(0, i);
}

export function IncidentDetail({ incident, status, onAction }: IncidentDetailProps) {
  if (!incident) {
    return (
      <section className="glass-panel grid place-items-center min-h-[420px]">
        <div className="text-center space-y-1.5">
          <Radar className="size-6 text-muted-foreground/50 mx-auto" />
          <p className="text-sm text-muted-foreground">Select an incident</p>
          <p className="text-xs text-muted-foreground/70">
            Pick a row on the left to triage and recover.
          </p>
        </div>
      </section>
    );
  }

  const accountable = incident.accountableHumanId
    ? humans.find((h) => h.id === incident.accountableHumanId)
    : undefined;
  const agent = incident.agentId ? agents.find((a) => a.id === incident.agentId) : undefined;
  const tool = incident.toolId ? connectorById(incident.toolId) : undefined;
  const resolved = status === "resolved";
  const recovering = status === "recovering";

  // Failure edge: the last event is a recovery-failed and the incident is back open.
  const lastEvent = incident.timeline[incident.timeline.length - 1];
  const retryFailed = !resolved && !recovering && lastEvent?.kind === "recovery-failed";

  // Resolved stamp: "Resolved by Resume run · 1h ago"
  const resolvedEvent = [...incident.timeline].reverse().find((e) => e.kind === "resolved");
  const humanActionEvent = [...incident.timeline].reverse().find((e) => e.kind === "human-action");
  const resolvedVia = humanActionEvent
    ? humanActionEvent.label.split(" — ")[0].replace(" confirmed", "")
    : "auto-recovery";

  return (
    <section className="glass-panel flex flex-col min-h-0 overflow-hidden">
      {/* header */}
      <div className="p-4 border-b border-border space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeChip t={incident.type} />
          <SeverityChip s={incident.severity} />
          <span className="text-[10px] font-mono text-muted-foreground">
            detected by {incident.detectedBy} · {agoLabel(incident.openedMinAgo)}
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{incident.id}</span>
        </div>
        <h2 className="text-sm font-semibold leading-snug">{incident.title}</h2>
        <p className="text-xs text-muted-foreground">{incident.summary}</p>
        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
          {agent && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border"
              style={{
                color: `var(--${agent.color})`,
                borderColor: `color-mix(in oklab, var(--${agent.color}) 40%, transparent)`,
                background: `color-mix(in oklab, var(--${agent.color}) 10%, transparent)`,
              }}
            >
              <Bot className="size-3" /> {agent.name}
            </span>
          )}
          {incident.ticketId && (
            <span className="px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
              {incident.ticketId}
            </span>
          )}
          {tool && (
            <span className="px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
              {tool.name}
            </span>
          )}
          {accountable && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span
                className="size-4 rounded-full grid place-items-center text-[8px] font-semibold border"
                style={{
                  color: `var(--agent-${accountable.primaryAgentId})`,
                  borderColor: `color-mix(in oklab, var(--agent-${accountable.primaryAgentId}) 55%, transparent)`,
                  background: `color-mix(in oklab, var(--agent-${accountable.primaryAgentId}) 14%, transparent)`,
                }}
              >
                {accountable.initials}
              </span>
              {accountable.name} accountable
            </span>
          )}
        </div>
        {!resolved && <SlaCountdown openedMinAgo={incident.openedMinAgo} targetMin={incident.slaToResolveMin} />}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {/* failure edge (forced-fail demo path) */}
        {retryFailed && (
          <div className="rounded-md border border-status-error/40 bg-status-error/10 px-3 py-2.5 flex items-start gap-2 anim-in">
            <AlertTriangle className="size-4 text-status-error shrink-0 mt-0.5" />
            <div className="text-xs text-status-error">
              Retry failed — escalated to {humanName(incident.accountableHumanId)}. See timeline.
            </div>
          </div>
        )}

        {/* suggested action / resolved stamp / recovery controls */}
        {resolved ? (
          <div className="rounded-md border border-status-done/40 bg-status-done/10 px-3 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-status-done shrink-0" />
            <div className="text-xs text-status-done">
              Resolved by {resolvedVia} · {resolvedEvent ? agoLabel(resolvedEvent.tsOffsetMin) : "just now"}
            </div>
          </div>
        ) : recovering ? (
          <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2.5 flex items-center gap-2">
            <Loader2 className="size-4 text-primary animate-spin shrink-0" />
            <div className="text-xs text-primary">Recovery in progress…</div>
          </div>
        ) : (
          <>
            {incident.suggestedAction ? (
              <div className="rounded-md border border-primary/40 bg-primary/10 p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-mono text-primary">
                  Suggested action
                </div>
                <div className="text-xs text-foreground">
                  Suggested: <span className="font-semibold">{RECOVERY_ACTION_LABELS[incident.suggestedAction]}</span>
                  {" — "}
                  {firstSentence(incident.summary)}.
                </div>
                <button
                  type="button"
                  onClick={() => onAction(incident.suggestedAction!)}
                  className="h-8 px-3 rounded-md border border-primary/50 bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider hover:bg-primary/25 transition-colors cursor-pointer"
                >
                  {RECOVERY_ACTION_LABELS[incident.suggestedAction]}
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-white/[0.03] p-3 flex items-center gap-2">
                <Wrench className="size-4 text-muted-foreground shrink-0" />
                <div className="text-xs text-muted-foreground">
                  Manual triage — choose a recovery control below.
                </div>
              </div>
            )}

            {/* recovery controls */}
            {incident.availableActions.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                  Recovery controls
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {incident.availableActions.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => onAction(a)}
                      className={cn(
                        "h-8 px-2.5 rounded-md border text-xs transition-colors cursor-pointer",
                        a === incident.suggestedAction
                          ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                          : "border-border bg-white/5 text-foreground/90 hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {RECOVERY_ACTION_LABELS[a]}
                    </button>
                  ))}
                </div>
                {incident.type === "gate-overdue" && (
                  <p className="text-[11px] text-muted-foreground">
                    {accountable?.name ?? "Nobody"} owns this gate — an uncovered gate is an
                    unbounded risk. Reassign if they're unavailable.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* timeline — vertical, newest-last */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Timeline
          </div>
          <ol className="space-y-0">
            {incident.timeline.map((e, idx) => {
              const Icon = EVENT_ICON[e.kind];
              const last = idx === incident.timeline.length - 1;
              return (
                <li key={e.id} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "size-6 rounded-full border grid place-items-center bg-panel/60 shrink-0",
                        EVENT_TONE[e.kind],
                      )}
                    >
                      <Icon className="size-3" />
                    </span>
                    {!last && <span className="w-px flex-1 bg-border min-h-3" />}
                  </div>
                  <div className={cn("pb-3 min-w-0", last && "pb-0")}>
                    <div className="text-xs text-foreground/95 leading-snug">{e.label}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {agoLabel(e.tsOffsetMin)}
                      {" · "}
                      {e.actor ?? "when-only"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* linked comms / escalation footer */}
        <LinkedComms incident={incident} />
      </div>
    </section>
  );
}

/** Progress bar: elapsed vs the resolve-SLA window. Static mock minutes — SSR-safe. */
function SlaCountdown({ openedMinAgo, targetMin }: { openedMinAgo: number; targetMin: number }) {
  const remaining = targetMin - openedMinAgo;
  const overdue = remaining < 0;
  const pct = Math.min(100, Math.round((openedMinAgo / targetMin) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="uppercase tracking-wider text-muted-foreground">SLA to resolve</span>
        <span className={cn(overdue ? "text-status-error" : pct > 75 ? "text-status-waiting" : "text-muted-foreground")}>
          {overdue
            ? `${fmtAgo(-remaining)} over the ${fmtAgo(targetMin)} window`
            : `${fmtAgo(remaining)} left of ${fmtAgo(targetMin)} window`}
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: overdue
              ? "var(--status-error)"
              : pct > 75
                ? "var(--status-waiting)"
                : "var(--status-done)",
          }}
        />
      </div>
    </div>
  );
}

function LinkedComms({ incident }: { incident: Incident }) {
  const esc = incident.linkedEscalationId
    ? ESCALATIONS.find((e) => e.id === incident.linkedEscalationId)
    : undefined;
  const comm = incident.linkedCommId
    ? COMMS.find((c) => c.id === incident.linkedCommId)
    : undefined;
  if (!esc && !comm) return null;
  return (
    <div className="rounded-md border border-border bg-white/[0.02] p-3 space-y-2">
      <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1.5">
        <Link2 className="size-3" /> Linked comms / escalation
      </div>
      {esc && (
        <div className="text-xs text-foreground/90">
          <span className="font-mono text-muted-foreground">{esc.id}</span> · {esc.trigger} →{" "}
          {humanName(esc.routedTo)}
        </div>
      )}
      {comm && (
        <div className="text-xs text-muted-foreground truncate">
          <span className="font-mono">{comm.channelLabel}</span> · “{comm.preview}”
        </div>
      )}
      <Link
        to="/comms"
        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
      >
        Open in Comms & Escalations <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
