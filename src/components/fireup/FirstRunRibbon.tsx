/**
 * FirstRunRibbon — the dismissible "your pod is live" banner shown on the
 * Command Center right after launch (closes the FIRE UP → RUN loop).
 * Shows while the active pod launched < 10 minutes ago; dismissal persists
 * per pod id (localStorage, SSR-safe: read in useEffect, render null until).
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { podSummaryLine, usePods } from "@/lib/pods/pod-store";

const DISMISS_KEY = "aiops_firstrun_dismissed_v1";
const RECENT_MS = 10 * 60 * 1000;

function readDismissed(): string[] {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function FirstRunRibbon() {
  const { activePod, hydrated } = usePods();
  // null until localStorage has been read on the client (SSR renders nothing).
  const [dismissedIds, setDismissedIds] = useState<string[] | null>(null);

  useEffect(() => {
    setDismissedIds(readDismissed());
  }, []);

  if (!hydrated || dismissedIds === null || !activePod || !activePod.launchedAt) return null;
  if (Date.now() - activePod.launchedAt >= RECENT_MS) return null;
  if (dismissedIds.includes(activePod.id)) return null;

  const dismiss = () => {
    const next = [...dismissedIds, activePod.id];
    setDismissedIds(next);
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — dismiss for this session only */
    }
  };

  return (
    <div className="rounded-md border border-status-done/40 bg-status-done/10 backdrop-blur-md px-4 py-3 flex items-center gap-3 flex-wrap">
      <CheckCircle2 className="size-4 text-status-done shrink-0" />
      <div className="min-w-0 flex-1 basis-64">
        <div className="leading-snug">
          <span className="text-sm font-semibold">{activePod.name} is live</span>{" "}
          <span className="text-xs text-muted-foreground">
            · {podSummaryLine(activePod)} — first ticket will appear here.
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-px rounded border border-border bg-white/5 text-muted-foreground">
            {activePod.tenancyLine}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Sample data fills the dashboard until your pod&apos;s first tickets arrive.
          </span>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="h-7 text-xs shrink-0">
        <Link to="/pipeline">
          View pipeline
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        title="Dismiss"
        onClick={dismiss}
        className="size-7 rounded-md border border-border bg-white/5 hover:text-foreground text-muted-foreground grid place-items-center cursor-pointer shrink-0"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
