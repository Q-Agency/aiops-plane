import { useMemo, useState } from "react";
import {
  Hourglass, Users2, Flame, Gauge, AlertTriangle, Clock, Activity,
} from "lucide-react";
import {
  GATES, gateStats, ticketFlow, reviewerLoad, heatmap, bottlenecks,
  flowAggregates, GATE_AGENT, fmtDur,
  type ReviewGate,
} from "@/mock/flow";
import { agents as allAgents } from "@/mock/agents";
import { cn } from "@/lib/utils";

const gateColor = (g: ReviewGate) => {
  const a = allAgents.find((x) => x.id === GATE_AGENT[g])!;
  return `var(--${a.color})`;
};

export function FlowView() {
  const [selectedGate, setSelectedGate] = useState<ReviewGate>(
    [...gateStats].sort((a, b) => b.avgWaitMin - a.avgWaitMin)[0].gate,
  );

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      {/* header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            human bottleneck analytics
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Flow Analytics</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            Where the human-in-the-loop is the constraint — gate wait time, reviewer load and the cycle-time impact of fixing the slowest gate.
          </div>
        </div>
        <WaitVsWorkHeadline />
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2">
        <Kpi icon={Hourglass}      label="Avg cycle time"        value={fmtDur(flowAggregates.avgTotalMin)} sub="ticket creation → done" />
        <Kpi icon={Clock}          label="Avg human wait"        value={fmtDur(flowAggregates.avgWaitMin)} sub={`${flowAggregates.waitPct}% of cycle`} tone="warn" />
        <Kpi icon={Activity}       label="Avg agent compute"     value={fmtDur(flowAggregates.avgAgentMin)} sub={`${flowAggregates.agentPct}% of cycle`} />
        <Kpi icon={AlertTriangle}  label="SLA breaches"          value={`${flowAggregates.breachesTotal}`} sub="across all gates" tone={flowAggregates.breachesTotal ? "error" : undefined} />
        <Kpi icon={Flame}          label="Slowest gate"          value={[...gateStats].sort((a,b)=>b.avgWaitMin-a.avgWaitMin)[0].gate} sub={fmtDur([...gateStats].sort((a,b)=>b.avgWaitMin-a.avgWaitMin)[0].avgWaitMin) + " avg"} tone="error" />
      </section>

      {/* Gate cycle-time analysis */}
      <section className="space-y-2">
        <SectionHead icon={Hourglass} title="Gate cycle-time" sub="Avg & p95 wait per review column — bar fills against SLA target" />
        <div className="glass-panel p-3 space-y-2">
          {[...gateStats].sort((a, b) => b.avgWaitMin - a.avgWaitMin).map((g) => {
            const max = Math.max(...gateStats.map((x) => x.p95WaitMin));
            const pct = (g.avgWaitMin / max) * 100;
            const p95Pct = (g.p95WaitMin / max) * 100;
            const slaPct = (g.slaMin / max) * 100;
            const overSla = g.avgWaitMin > g.slaMin;
            return (
              <button
                key={g.gate}
                onClick={() => setSelectedGate(g.gate)}
                className={cn(
                  "w-full text-left rounded p-2 cursor-pointer transition-colors",
                  selectedGate === g.gate ? "bg-white/5" : "hover:bg-white/[0.03]",
                )}
              >
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: gateColor(g.gate) }} />
                    <span className="text-foreground">{g.gate} Review</span>
                    <span className="text-muted-foreground/60">· {g.open} open</span>
                    {g.breaches > 0 && (
                      <span className="text-status-error">· {g.breaches} breach{g.breaches > 1 ? "es" : ""}</span>
                    )}
                  </div>
                  <div className="font-mono tabular-nums">
                    <span className={cn(overSla ? "text-status-error font-semibold" : "text-foreground")}>{fmtDur(g.avgWaitMin)}</span>
                    <span className="text-muted-foreground/60"> avg · </span>
                    <span className="text-muted-foreground">{fmtDur(g.p95WaitMin)} p95</span>
                    <span className="text-muted-foreground/60"> · SLA </span>
                    <span className="text-muted-foreground">{fmtDur(g.slaMin)}</span>
                  </div>
                </div>
                <div className="relative h-2 rounded bg-white/5 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${p95Pct}%`,
                      background: gateColor(g.gate),
                      opacity: 0.2,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${pct}%`,
                      background: gateColor(g.gate),
                      opacity: 0.85,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 w-px bg-status-error/80"
                    style={{ left: `${slaPct}%` }}
                    title={`SLA ${fmtDur(g.slaMin)}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Wait vs Work split */}
      <section className="space-y-2">
        <SectionHead icon={Gauge} title="Wait vs work split" sub="Per ticket — human-waiting (blue) vs agent-compute (green). The diagnostic." />
        <WaitWorkChart />
      </section>

      {/* Reviewer load + Bottleneck impact side by side */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-2">
          <SectionHead icon={Users2} title="Reviewer load" sub="Per accountable human — queue, throughput, SLA" />
          <div className="glass-panel overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-white/[0.02]">
                  <Th>reviewer</Th>
                  <Th>owns</Th>
                  <Th className="text-right">queue</Th>
                  <Th className="text-right">avg approval</Th>
                  <Th className="text-right">throughput</Th>
                  <Th className="text-right">SLA</Th>
                  <Th>utilization</Th>
                </tr>
              </thead>
              <tbody>
                {reviewerLoad.map((r) => (
                  <tr key={r.humanId} className="border-b border-border/60">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="size-6 grid place-items-center rounded-full bg-white/5 border border-border text-[10px] font-mono">{r.initials}</span>
                        <span>{r.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5">
                        {r.agents.map((a) => {
                          const ag = allAgents.find((x) => x.id === a)!;
                          return (
                            <span
                              key={a}
                              title={ag.name}
                              className="text-[9px] font-mono px-1 py-0.5 rounded border"
                              style={{
                                color: `var(--${ag.color})`,
                                borderColor: `color-mix(in oklab, var(--${ag.color}) 50%, transparent)`,
                              }}
                            >{ag.name.replace(" Agent", "").replace("Supervisor", "Sup")}</span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      <span className={cn(r.queueDepth >= 4 && "text-status-waiting")}>{r.queueDepth}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{r.avgApprovalMin}m</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{r.throughput}<span className="text-muted-foreground/60">/d</span></td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {r.slaBreaches > 0 ? (
                        <span className="text-status-error">{r.slaBreaches}</span>
                      ) : <span className="text-status-done">0</span>}
                    </td>
                    <td className="px-3 py-2 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded bg-white/5 overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              r.utilization >= 90 ? "bg-status-error" :
                              r.utilization >= 70 ? "bg-status-waiting" : "bg-status-done",
                            )}
                            style={{ width: `${r.utilization}%` }}
                          />
                        </div>
                        <span className="font-mono tabular-nums text-[10px] text-muted-foreground w-7 text-right">{r.utilization}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <SectionHead icon={Flame} title="Bottleneck impact" sub="If we fix gate X → cycle drops Y" />
          <div className="glass-panel p-3 space-y-2">
            {bottlenecks.map((b, i) => (
              <div key={b.gate} className="rounded border border-border/70 bg-white/[0.02] p-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/60">#{i + 1}</span>
                    <span className="size-2 rounded-full" style={{ background: gateColor(b.gate) }} />
                    <span className="text-foreground">{b.gate} Review</span>
                  </div>
                  <span className="text-status-done font-semibold tabular-nums">−{b.cycleTimeDropPct}%</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Cut <span className="text-foreground tabular-nums">{fmtDur(b.currentAvgMin)}</span> → <span className="text-foreground tabular-nums">{fmtDur(b.targetAvgMin)}</span> and average cycle time drops <span className="text-status-done tabular-nums">{b.cycleTimeDropPct}%</span> across <span className="text-foreground">{b.ticketsAffected}</span> tickets.
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Backup heatmap */}
      <section className="space-y-2">
        <SectionHead icon={Activity} title="Backup heatmap" sub="Queue depth by gate × hour of day (UTC) — overnight pile-ups visible" />
        <Heatmap selectedGate={selectedGate} />
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- */

function WaitVsWorkHeadline() {
  return (
    <div className="glass-panel px-4 py-2.5 flex items-center gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">where time goes</div>
        <div className="mt-1 flex h-2 w-44 rounded overflow-hidden border border-border">
          <div className="bg-status-done" style={{ width: `${flowAggregates.agentPct}%` }} title={`agent ${flowAggregates.agentPct}%`} />
          <div className="bg-status-waiting" style={{ width: `${flowAggregates.waitPct}%` }} title={`wait ${flowAggregates.waitPct}%`} />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
          <span className="text-status-done">agent {flowAggregates.agentPct}%</span>
          <span className="text-status-waiting">wait {flowAggregates.waitPct}%</span>
        </div>
      </div>
      <div className="h-10 w-px bg-border" />
      <div className="text-[11px] font-mono leading-tight">
        <div className="text-muted-foreground">bottleneck</div>
        <div className="text-status-error font-semibold">humans</div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string; value: string; sub?: string; tone?: "warn" | "error";
}) {
  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <Icon className="size-3" /> {label}
      </div>
      <div className={cn(
        "mt-1.5 text-xl font-semibold tabular-nums",
        tone === "warn" && "text-status-waiting",
        tone === "error" && "text-status-error",
      )}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function WaitWorkChart() {
  const sorted = useMemo(
    () => [...ticketFlow].sort((a, b) => b.totalMin - a.totalMin).slice(0, 12),
    [],
  );
  const max = Math.max(...sorted.map((t) => t.totalMin));
  return (
    <div className="glass-panel p-3">
      <div className="space-y-1.5">
        {sorted.map((t) => {
          const agentPct = (t.agentMin / max) * 100;
          const waitPct = (t.waitMin / max) * 100;
          const waitDom = t.waitMin > t.agentMin;
          return (
            <div key={t.ticketId} className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-2">
              <div className="text-[11px] font-mono">
                <div className="text-muted-foreground">{t.ticketId}</div>
                <div className="text-foreground truncate">{t.title}</div>
              </div>
              <div className="relative h-3 rounded bg-white/5 overflow-hidden flex">
                <div
                  title={`agent ${fmtDur(t.agentMin)}`}
                  className="h-full bg-status-done/80"
                  style={{ width: `${agentPct}%` }}
                />
                <div
                  title={`wait ${fmtDur(t.waitMin)}`}
                  className="h-full bg-status-waiting/80"
                  style={{ width: `${waitPct}%` }}
                />
              </div>
              <div className="text-right text-[11px] font-mono tabular-nums">
                <span className="text-foreground">{fmtDur(t.totalMin)}</span>
                <div className={cn("text-[10px]", waitDom ? "text-status-waiting" : "text-status-done")}>
                  {waitDom ? "human-bound" : "agent-bound"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground mt-3 pt-2 border-t border-border">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-status-done" /> agent compute</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-status-waiting" /> human wait</span>
      </div>
    </div>
  );
}

function Heatmap({ selectedGate }: { selectedGate: ReviewGate }) {
  const max = Math.max(...heatmap.map((c) => c.depth));
  return (
    <div className="glass-panel p-3 overflow-x-auto">
      <div className="grid gap-1 min-w-[640px]" style={{ gridTemplateColumns: "5rem repeat(24, 1fr)" }}>
        <div></div>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="text-[9px] font-mono text-muted-foreground text-center">
            {h % 3 === 0 ? `${String(h).padStart(2, "0")}` : ""}
          </div>
        ))}
        {GATES.map((g) => (
          <Row key={g} gate={g} max={max} highlighted={g === selectedGate} />
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground mt-3 pt-2 border-t border-border">
        <span>queue depth</span>
        <div className="flex items-center gap-0.5">
          {[0.1, 0.3, 0.55, 0.8, 1].map((o) => (
            <div key={o} className="size-3 rounded-sm" style={{ background: `color-mix(in oklab, var(--status-waiting) ${o * 100}%, transparent)` }} />
          ))}
        </div>
        <span>low → high</span>
      </div>
    </div>
  );
}

function Row({ gate, max, highlighted }: { gate: ReviewGate; max: number; highlighted: boolean }) {
  const cells = heatmap.filter((c) => c.gate === gate);
  return (
    <>
      <div className={cn(
        "text-[11px] font-mono pr-2 self-center flex items-center gap-1.5",
        highlighted ? "text-foreground" : "text-muted-foreground",
      )}>
        <span className="size-1.5 rounded-full" style={{ background: gateColor(gate) }} />
        {gate}
      </div>
      {cells.map((c) => {
        const intensity = c.depth / max;
        return (
          <div
            key={c.hour}
            title={`${gate} · ${String(c.hour).padStart(2, "0")}:00 · queue ${c.depth}`}
            className={cn(
              "h-6 rounded-sm border",
              highlighted ? "border-border" : "border-transparent",
            )}
            style={{
              background: intensity === 0
                ? "color-mix(in oklab, var(--muted) 30%, transparent)"
                : `color-mix(in oklab, var(--status-waiting) ${Math.max(8, intensity * 90)}%, transparent)`,
            }}
          />
        );
      })}
    </>
  );
}

function SectionHead({ icon: Icon, title, sub }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{title}</span>
      {sub && <span className="text-[10px] text-muted-foreground/70 font-mono">· {sub}</span>}
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground", className)}>{children}</th>;
}
