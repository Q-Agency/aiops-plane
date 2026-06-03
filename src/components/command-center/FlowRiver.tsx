import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useLive } from "@/hooks/useLiveTicker";
import { cn } from "@/lib/utils";
import { accountableFor } from "@/mock/humans";
import type { AgentId, Stage } from "@/mock/types";

interface StageDef {
  id: AgentId;
  label: string;
  color: string;
}

const STAGES: StageDef[] = [
  { id: "ba",       label: "BA",     color: "agent-ba" },
  { id: "sa",       label: "SA",     color: "agent-sa" },
  { id: "tasklist", label: "Tasks",  color: "agent-tasklist" },
  { id: "dev",      label: "Dev",    color: "agent-dev" },
  { id: "review",   label: "Review", color: "agent-review" },
  { id: "qa",       label: "QA",     color: "agent-qa" },
];

const stageToAgent: Record<string, AgentId> = {
  "ready-spec": "ba", "spec-review": "ba",
  "ready-design": "sa", "design-review": "sa",
  "ready-tasks": "tasklist", "tasks-review": "tasklist",
  "ready-dev": "dev", "dev-review": "review",
  "ready-qa": "qa", "qa-review": "qa",
};

const stateLabel: Record<string, string> = {
  running: "running",
  waiting: "waiting · human",
  idle: "idle",
  error: "error",
};

export function FlowRiver() {
  const { tickets, agents } = useLive();
  const [showAcct, setShowAcct] = useState(true);

  const rows = useMemo(() => {
    const wip: Record<string, number> = {};
    const waiting: Record<string, number> = {};
    for (const t of tickets) {
      const owner = stageToAgent[t.stage as Stage];
      if (!owner) continue;
      wip[owner] = (wip[owner] ?? 0) + 1;
      if (t.state === "waiting") waiting[owner] = (waiting[owner] ?? 0) + 1;
    }
    return STAGES.map((s) => {
      const agent = agents.find((a) => a.id === s.id);
      return {
        ...s,
        state: agent?.state ?? "idle",
        currentTicketId: agent?.currentTicketId,
        wip: wip[s.id] ?? 0,
        waiting: waiting[s.id] ?? 0,
        human: accountableFor(s.id),
      };
    });
  }, [tickets, agents]);

  return (
    <div className="glass-panel p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Mission · Agent Pipeline
          </div>
          <div className="text-base font-semibold mt-0.5">Current state · BA → SA → Tasks → Dev → Review → QA</div>
        </div>
        <button
          onClick={() => setShowAcct((s) => !s)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded border font-mono text-[10px] uppercase tracking-wider transition-colors",
            showAcct ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="size-3" /> Accountability
        </button>
      </div>

      {/* Stage row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {rows.map((r) => {
          const color = `var(--${r.color})`;
          const dotColor =
            r.state === "running" ? "var(--status-running)" :
            r.state === "waiting" ? "var(--status-waiting)" :
            r.state === "error"   ? "var(--status-error)" :
                                    "var(--status-idle)";
          return (
            <Link
              key={r.id}
              to="/flow"
              className="rounded-lg border border-border bg-panel/40 hover:bg-panel/60 transition-colors p-3 flex flex-col gap-2.5"
            >
              {/* Top: label + state dot */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold" style={{ color }}>{r.label}</span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <span className="size-1.5 rounded-full" style={{ background: dotColor }} />
                  {stateLabel[r.state]}
                </span>
              </div>

              {/* WIP */}
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-2xl leading-none">{r.wip}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">tickets</span>
                {r.waiting > 0 && (
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                    {r.waiting} waiting
                  </span>
                )}
              </div>

              {/* Current work */}
              <div className="text-[10px] font-mono text-muted-foreground truncate">
                {r.currentTicketId ? (
                  <>working on <span className="text-foreground">{r.currentTicketId}</span></>
                ) : (
                  <span className="opacity-60">no active ticket</span>
                )}
              </div>

              {/* Accountable */}
              {showAcct && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-border text-[10px] font-mono text-muted-foreground">
                  <span
                    className="size-5 rounded-full grid place-items-center text-[8px] font-semibold border shrink-0"
                    style={{
                      color,
                      borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
                      background: `color-mix(in oklab, ${color} 10%, transparent)`,
                    }}
                  >{r.human.initials}</span>
                  <span className="truncate text-foreground/80">{r.human.name.split(" ")[0]}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
