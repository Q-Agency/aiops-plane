/**
 * ViewerStatus - the Viewer "/" landing: a read-only operational status board.
 *
 * Deliberately NON-FINANCIAL (the $ / ROI story is the Sponsor's ExecDigest) -
 * a stakeholder peeking in sees pod health, pipeline movement, SLA on-track and
 * recent activity, with ZERO actions, exports, or dollar figures. This is what
 * keeps Viewer distinct from Sponsor: outcomes-without-money.
 */

import { useMemo } from "react";
import { CircleDot } from "lucide-react";
import { useLive } from "@/hooks/useLiveTicker";
import { usePods } from "@/lib/pods/pod-store";
import { slaTargets } from "@/mock/sla";
import { seedActivity } from "@/mock/activity";
import { OWNERSHIP } from "@/mock/humans";
import { SlaTargetBar } from "./SlaTargetBar";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-panel p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono truncate">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function ViewerStatus() {
  const { activePod } = usePods();
  const { tickets } = useLive();

  const targets = useMemo(() => slaTargets().slice(0, 3), []);
  const onTrack = targets.filter((t) => !t.breached).length;
  const agentTotal = Object.keys(OWNERSHIP).length;

  const inFlight = useMemo(
    () => tickets.filter((t) => t.stage !== "done" && t.stage !== "backlog").length,
    [tickets],
  );
  const atGate = useMemo(
    () => tickets.filter((t) => t.stage.includes("review")).length,
    [tickets],
  );
  const shipped = useMemo(() => tickets.filter((t) => t.stage === "done").length, [tickets]);

  const recent = seedActivity.slice(0, 9);

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* header */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          pod status · read-only
        </div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
          <span>{activePod?.name ?? "AutoMarket Web Pod"}</span>
          {activePod?.sample && (
            <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
              Sample
            </span>
          )}
        </h1>
        <div className="text-xs text-muted-foreground mt-0.5">
          Live operational status · observer view
        </div>
      </div>

      {/* health banner */}
      <div className="glass-panel px-4 py-3 flex items-center gap-3 flex-wrap">
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-status-done/60 animate-ping" />
          <span className="relative inline-flex rounded-full size-2.5 bg-status-done" />
        </span>
        <span className="text-sm font-semibold">System healthy</span>
        <span className="text-xs text-muted-foreground">
          {agentTotal}/{agentTotal} agents operating · {inFlight} tickets in flight · {atGate}{" "}
          awaiting a human gate
        </span>
      </div>

      {/* pipeline snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="In flight" value={inFlight} />
        <Stat label="At a human gate" value={atGate} />
        <Stat label="Shipped" value={shipped} />
        <Stat label="Agents operating" value={`${agentTotal}/${agentTotal}`} />
      </div>

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[1fr_340px] items-start">
        {/* SLA on track - derived from /reports definitions, no $ */}
        <section className="glass-panel p-4 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            SLA · {onTrack}/{targets.length} on track
          </div>
          <div className="mt-3 space-y-3">
            {targets.map((t) => (
              <SlaTargetBar key={t.id} target={t} />
            ))}
          </div>
        </section>

        {/* recent activity - read-only feed snippet */}
        <aside className="glass-panel p-4 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Recent activity
          </div>
          <div className="mt-3 space-y-2.5">
            {recent.map((e, i) => {
              const isHuman = e.agentId === "human";
              const color = isHuman ? "var(--muted-foreground)" : `var(--agent-${e.agentId})`;
              return (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="mt-1 size-1.5 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <div className="min-w-0">
                    <span className="text-xs text-foreground/90">{e.message}</span>
                    {e.ticketId && (
                      <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                        {e.ticketId}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <div className="text-[11px] text-muted-foreground font-mono border-t border-border/60 pt-3 flex items-center gap-1.5">
        <CircleDot className="size-3" />
        Read-only observer · no actions, exports, or financials. The cost &amp; ROI view belongs to
        the sponsor.
      </div>
    </div>
  );
}
