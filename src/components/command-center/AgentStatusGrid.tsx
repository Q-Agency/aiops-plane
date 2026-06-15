import { RadialBar, RadialBarChart, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { Link } from "@tanstack/react-router";
import { coreAgents } from "@/mock/agents";
import { useLive } from "@/hooks/useLiveTicker";
import { cn } from "@/lib/utils";
import { Cpu, Zap, DollarSign } from "lucide-react";
import { accountableFor } from "@/mock/humans";

const stateLabel = {
  running: "RUNNING",
  waiting: "WAITING · HUMAN",
  idle: "IDLE",
  error: "ERROR",
} as const;

export function AgentStatusGrid() {
  const { agents } = useLive();
  const map = new Map(agents.map((a) => [a.id, a]));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {coreAgents.map((seed) => {
        const a = map.get(seed.id) ?? seed;
        const color = `var(--${a.color})`;
        const human = accountableFor(a.id);
        const dotClass =
          a.state === "running" ? "bg-status-running dot-pulse" :
          a.state === "waiting" ? "bg-status-waiting" :
          a.state === "error"   ? "bg-status-error" : "bg-status-idle";
        return (
          <Link
            key={a.id}
            to="/agents/$agentId"
            params={{ agentId: a.id }}
            className="glass-panel p-3 hover-lift block group relative overflow-hidden"
            style={{ borderColor: "transparent" }}
          >
            <div
              className="absolute inset-x-0 top-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
            />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold" style={{ color }}>{a.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{a.engine}</div>
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1",
                )}
                style={{ borderColor: `${color}55`, color }}
              >
                <span className={cn("size-1.5 rounded-full", dotClass)} />
                {stateLabel[a.state]}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="size-14 shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={[{ name: "ok", value: a.successRate }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "rgba(255,255,255,0.06)" }} fill={color} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center text-[11px] font-mono">
                  {a.successRate}%
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Working on</div>
                <div className="font-mono text-sm truncate" style={{ color }}>
                  {a.currentTicketId ?? "-"}
                </div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {a.lastArtifact ?? "no recent artifact"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground font-mono">
              <div className="flex items-center gap-1"><Zap className="size-3" />{(a.latencyMs/1000).toFixed(1)}s</div>
              <div className="flex items-center gap-1"><DollarSign className="size-3" />{a.tokenCostToday.toFixed(1)}</div>
              <div className="flex items-center gap-1"><Cpu className="size-3" />7d</div>
            </div>

            <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <span className="uppercase tracking-wider">Accountable:</span>
              <span
                className="inline-flex items-center gap-1 hover:text-foreground"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = "/pod"; }}
              >
                <span
                  className="size-4 rounded-full grid place-items-center text-[8px] font-semibold border"
                  style={{
                    color, borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
                    background: `color-mix(in oklab, ${color} 15%, transparent)`,
                  }}
                >{human.initials}</span>
                <span className="text-foreground/80 truncate">{human.name}</span>
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
