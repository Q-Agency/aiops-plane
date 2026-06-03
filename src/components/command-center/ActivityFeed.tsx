import { useEffect, useMemo, useState } from "react";
import { Clock, Zap, Megaphone, AlertTriangle } from "lucide-react";
import { useLive } from "@/hooks/useLiveTicker";
import { agents as seedAgents } from "@/mock/agents";
import { COMMS, ESCALATIONS } from "@/mock/comms";
import type { ActivityEvent, AgentId, EventKind } from "@/mock/types";
import { cn } from "@/lib/utils";

const colorOf = (id: AgentId | "human") => {
  if (id === "human") return "var(--status-waiting)";
  const a = seedAgents.find((x) => x.id === id);
  return a ? `var(--${a.color})` : "var(--muted-foreground)";
};

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}:${String(d.getUTCSeconds()).padStart(2,"0")}`;
}

const kindLabel: Record<EventKind, string> = {
  handoff: "HANDOFF",
  approval: "APPROVE",
  reject: "REJECT",
  error: "ERROR",
  overnight: "NIGHT",
  qa: "QA",
  comm: "COMM",
  escalation: "ESC",
};

interface CommExtra {
  trigger: "scheduled" | "threshold";
  channel: string;
  isEscalation?: boolean;
}

/** Merge mock comms + escalations into the live activity stream as virtual events. */
function useMergedFeed(activity: ActivityEvent[]) {
  return useMemo(() => {
    const now = Date.now();
    const commEvents: (ActivityEvent & { extra?: CommExtra })[] = COMMS.slice(0, 12).map((c) => ({
      id: `comm-${c.id}`,
      ts: now - c.tsOffsetMin * 60_000,
      agentId: c.agentId,
      ticketId: c.ticketId,
      kind: "comm",
      message: `posted to ${c.channelLabel}: ${c.preview}`,
      extra: { trigger: c.trigger, channel: c.channelLabel },
    }));
    const escEvents: (ActivityEvent & { extra?: CommExtra })[] = ESCALATIONS.map((e) => ({
      id: `esc-${e.id}`,
      ts: now - e.openedMinAgo * 60_000,
      agentId: e.raisedBy,
      ticketId: e.ticketId,
      kind: "escalation",
      message: `escalated: ${e.trigger} → ${e.routedTo}`,
      extra: { trigger: "threshold", channel: "escalation", isEscalation: true },
    }));
    const enriched: (ActivityEvent & { extra?: CommExtra })[] = [...activity, ...commEvents, ...escEvents];
    return enriched.sort((a, b) => b.ts - a.ts).slice(0, 80);
  }, [activity]);
}

export function ActivityFeed() {
  const { activity } = useLive();
  const merged = useMergedFeed(activity);
  const [mounted, setMounted] = useState(false);
  const [commsOnly, setCommsOnly] = useState(false);
  useEffect(() => setMounted(true), []);

  const filtered = commsOnly ? merged.filter((e) => e.kind === "comm" || e.kind === "escalation") : merged;

  return (
    <div className="glass-panel p-4 flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Stream</div>
          <div className="text-sm font-semibold">Live activity</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCommsOnly((v) => !v)}
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer",
              commsOnly
                ? "border-primary/50 text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
            title="Show only comms & escalations"
          >
            COMMS ONLY
          </button>
          <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-status-done dot-pulse" />
            LIVE
          </div>
        </div>
      </div>

      <div className="overflow-y-auto scrollbar-thin pr-1 space-y-1.5 max-h-[420px]">
        {filtered.map((e) => {
          const isComm = e.kind === "comm";
          const isEsc = e.kind === "escalation";
          const extra = (e as ActivityEvent & { extra?: CommExtra }).extra;
          return (
            <div key={e.id} className="flex items-start gap-2 text-xs anim-in">
              <span
                className="mt-1.5 size-1.5 rounded-full shrink-0"
                style={{ background: colorOf(e.agentId), boxShadow: `0 0 6px ${colorOf(e.agentId)}` }}
              />
              <span className="font-mono text-[10px] text-muted-foreground w-14 shrink-0 mt-0.5">
                {mounted ? fmtTime(e.ts) : "--:--:--"}
              </span>
              <span
                className="font-mono text-[9px] px-1 rounded shrink-0 mt-0.5 inline-flex items-center gap-0.5"
                style={{ color: colorOf(e.agentId), border: `1px solid ${colorOf(e.agentId)}44` }}
              >
                {isEsc && <AlertTriangle className="size-2.5" />}
                {isComm && <Megaphone className="size-2.5" />}
                {kindLabel[e.kind]}
              </span>
              {(isComm || isEsc) && extra && (
                <span
                  title={extra.trigger}
                  className={cn(
                    "font-mono text-[9px] px-1 rounded shrink-0 mt-0.5 inline-flex items-center gap-0.5 border",
                    extra.trigger === "scheduled"
                      ? "border-status-waiting/40 text-status-waiting"
                      : "border-primary/40 text-primary",
                  )}
                >
                  {extra.trigger === "scheduled" ? <Clock className="size-2.5" /> : <Zap className="size-2.5" />}
                </span>
              )}
              <span className="text-foreground/90 leading-snug">
                {e.ticketId && <span className="font-mono text-foreground mr-1">{e.ticketId}</span>}
                <span className="text-muted-foreground">{e.message}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

