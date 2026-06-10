/**
 * Shared incident UI atoms — severity/type/status chips and the relative-time
 * formatter, reused by the inbox, the detail pane and the recovery dialog.
 * Style language mirrors CommsView (TriggerBadge/StatusDot chips).
 */

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  CheckCircle2,
  Hourglass,
  Loader2,
  RefreshCcw,
  Unplug,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EscSeverity } from "@/mock/comms";
import type { IncidentStatus, IncidentType } from "@/mock/incidents";
import { INCIDENT_TYPE_LABELS } from "@/mock/incidents";

/** "just now" / "6m" / "2h" / "3d" */
export function fmtAgo(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${Math.round(min)}m`;
  if (min < 60 * 24) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / (60 * 24))}d`;
}

/** "just now" / "6m ago" — never "just now ago". */
export function agoLabel(min: number): string {
  return min < 1 ? "just now" : `${fmtAgo(min)} ago`;
}

export const TYPE_ICON: Record<IncidentType, LucideIcon> = {
  "agent-down": Bot,
  "run-failed": XCircle,
  "gate-overdue": Hourglass,
  "tool-disconnected": Unplug,
  "sync-stale": RefreshCcw,
};

export const SEV_DOT: Record<EscSeverity, string> = {
  critical: "bg-status-error",
  high: "bg-agent-qa",
  med: "bg-status-waiting",
  low: "bg-muted-foreground",
};

export const SEV_CHIP: Record<EscSeverity, string> = {
  critical: "border-status-error/40 bg-status-error/10 text-status-error",
  high: "border-agent-qa/40 bg-agent-qa/10 text-agent-qa",
  med: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
  low: "border-border bg-white/5 text-muted-foreground",
};

export function SeverityChip({ s, className }: { s: EscSeverity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider font-mono",
        SEV_CHIP[s],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", SEV_DOT[s])} />
      {s}
    </span>
  );
}

export function TypeChip({ t, className }: { t: IncidentType; className?: string }) {
  const Icon = TYPE_ICON[t];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground text-[10px] uppercase tracking-wider font-mono",
        className,
      )}
    >
      <Icon className="size-3" />
      {INCIDENT_TYPE_LABELS[t]}
    </span>
  );
}

export function StatusChip({ s }: { s: IncidentStatus }) {
  if (s === "resolved") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-status-done">
        <CheckCircle2 className="size-3" /> resolved
      </span>
    );
  }
  if (s === "recovering") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-primary">
        <Loader2 className="size-3 animate-spin" /> recovering
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-status-error">
      <span className="size-1.5 rounded-full bg-status-error dot-pulse" /> open
    </span>
  );
}
