/**
 * NotificationRow — the shared notification row (C6), reused by the TopBar
 * bell popover (compact) and the /notifications inbox (dense, selectable).
 *
 * kind icon · title · body preview · relative time · unread accent ·
 * optional inline action button · optional checkbox (bulk select).
 */

import type { MouseEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageCircleQuestion,
  MessageSquareText,
  Newspaper,
  PackageCheck,
  Siren,
  TimerOff,
  Unplug,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { AppNotification, NotificationKind } from "@/mock/notifications";

/* ------------------------------------------------------------------ */
/* Shared maps + helpers                                                */
/* ------------------------------------------------------------------ */

export const KIND_ICONS: Record<NotificationKind, LucideIcon> = {
  clarification_gate: MessageCircleQuestion,
  approval_gate: CheckCircle2,
  escalation: AlertTriangle,
  sla_at_risk: Clock,
  sla_breach: TimerOff,
  incident_opened: Siren,
  run_failed: XCircle,
  tool_disconnected: Unplug,
  digest: Newspaper,
  comment: MessageSquareText,
  delivered: PackageCheck,
};

export const SEVERITY_TEXT: Record<AppNotification["severity"], string> = {
  info: "text-muted-foreground",
  warning: "text-status-waiting",
  critical: "text-status-error",
};

export const SEVERITY_DOT: Record<AppNotification["severity"], string> = {
  info: "bg-status-idle",
  warning: "bg-status-waiting",
  critical: "bg-status-error",
};

export function fmtAgo(ts: number): string {
  const min = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

export type RecencyBucket = "Now" | "Earlier today" | "This week";

export function recencyBucket(ts: number): RecencyBucket {
  const ageMin = (Date.now() - ts) / 60_000;
  if (ageMin < 15) return "Now";
  if (ageMin < 24 * 60) return "Earlier today";
  return "This week";
}

/** Stable bucket order for grouped rendering. */
export const RECENCY_ORDER: RecencyBucket[] = ["Now", "Earlier today", "This week"];

export function groupByRecency(
  items: AppNotification[],
): { bucket: RecencyBucket; items: AppNotification[] }[] {
  const map = new Map<RecencyBucket, AppNotification[]>();
  for (const n of items) {
    const b = recencyBucket(n.ts);
    const arr = map.get(b);
    if (arr) arr.push(n);
    else map.set(b, [n]);
  }
  return RECENCY_ORDER.filter((b) => map.has(b)).map((bucket) => ({
    bucket,
    items: map.get(bucket)!,
  }));
}

/* ------------------------------------------------------------------ */
/* Row                                                                  */
/* ------------------------------------------------------------------ */

export interface NotificationRowProps {
  n: AppNotification;
  read: boolean;
  onOpen: (n: AppNotification) => void;
  /** Inbox layout: denser, full-width, optional checkbox. */
  dense?: boolean;
  selected?: boolean;
  /** When provided, renders a leading checkbox (bulk select). */
  onToggleSelect?: (id: string) => void;
  className?: string;
}

export function NotificationRow({
  n,
  read,
  onOpen,
  dense = false,
  selected = false,
  onToggleSelect,
  className,
}: NotificationRowProps) {
  const Icon = KIND_ICONS[n.kind];

  function handleSelect(e: MouseEvent) {
    e.stopPropagation();
    onToggleSelect?.(n.id);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(n)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(n);
        }
      }}
      className={cn(
        "w-full text-left cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-white/5 transition-colors flex items-start gap-2.5",
        dense ? "px-4 py-2.5" : "px-3 py-2.5",
        !read && "border-l-2 border-l-primary",
        selected && "bg-primary/5",
        className,
      )}
    >
      {onToggleSelect && (
        <span onClick={handleSelect} className="mt-1 shrink-0">
          <Checkbox checked={selected} aria-label={`Select ${n.title}`} />
        </span>
      )}

      <Icon className={cn("size-4 mt-0.5 shrink-0", SEVERITY_TEXT[n.severity])} />

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-xs truncate",
            read ? "text-muted-foreground" : "font-semibold text-foreground",
          )}
        >
          {n.title}
        </span>
        <span className="block text-[11px] text-muted-foreground truncate mt-0.5">{n.body}</span>
      </span>

      {n.slaState && n.slaState !== "on_track" && (
        <span
          className={cn(
            "text-[9px] uppercase tracking-wider font-mono px-1 py-0.5 rounded border shrink-0 mt-0.5",
            n.slaState === "overdue"
              ? "border-status-error/40 bg-status-error/10 text-status-error"
              : "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
          )}
        >
          {n.slaState === "overdue" ? "overdue" : "at risk"}
        </span>
      )}

      {n.actionable && n.actionLabel && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(n);
          }}
          className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors mt-0.5"
        >
          {n.actionLabel}
        </button>
      )}

      <span
        className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5"
        suppressHydrationWarning
      >
        {fmtAgo(n.ts)}
      </span>
    </div>
  );
}
