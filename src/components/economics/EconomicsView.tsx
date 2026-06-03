import { useMemo, useState, Fragment } from "react";
import {
  DollarSign, TrendingDown, GitMerge, Layers, Cpu, Moon, Users2,
  ChevronRight, ChevronDown, RefreshCcw, Trophy, Flame, Filter,
} from "lucide-react";
import {
  ticketEconomics, aggregates, trend, COST_STAGES, stageLabel,
  stageTokenUsd, ticketTokenUsd, ticketReviewMin, ticketReviewUsd,
  ticketTotalUsd, ticketRerunCount, ticketRerunPenalty, HUMAN_RATE_PER_HOUR,
  type TicketEconomics, type CostStage,
} from "@/mock/economics";
import { agents as allAgents } from "@/mock/agents";
import { cn } from "@/lib/utils";

const stageColor = (s: CostStage) => {
  const a = allAgents.find((x) => x.id === s)!;
  return `var(--${a.color})`;
};

const fmtUsd = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(2)}k` : `$${n.toFixed(2)}`;
const fmtMin = (n: number) => (n >= 60 ? `${(n / 60).toFixed(1)}h` : `${n}m`);

type SortKey = "total" | "tokens" | "review" | "reruns" | "sp";

export function EconomicsView() {
  const [sort, setSort] = useState<SortKey>("total");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mergedOnly, setMergedOnly] = useState(false);

  const rows = useMemo(() => {
    const list = mergedOnly ? ticketEconomics.filter((t) => t.merged) : ticketEconomics;
    const scored = list.map((t) => ({
      t,
      total: ticketTotalUsd(t),
      tokens: ticketTokenUsd(t),
      review: ticketReviewMin(t),
      reruns: ticketRerunCount(t),
    }));
    scored.sort((a, b) => {
      if (sort === "sp") return b.t.storyPoints - a.t.storyPoints;
      const key = sort as "total" | "tokens" | "review" | "reruns";
      return b[key] - a[key];
    });
    return scored;
  }, [sort, mergedOnly]);

  const top = [...ticketEconomics].sort((a, b) => ticketTotalUsd(b) - ticketTotalUsd(a)).slice(0, 5);
  const bottom = [...ticketEconomics].sort((a, b) => ticketTotalUsd(a) - ticketTotalUsd(b)).slice(0, 5);

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            per-ticket cost & ROI
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Unit Economics</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            What it actually costs to ship one ticket — token spend by stage, human gate-minutes, reruns and the ROI vs a human-only team.
          </div>
        </div>
        <RoiHeadline />
      </div>

      {/* Derived metrics */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <KpiTile icon={GitMerge}    label="Cost / merged PR"       value={fmtUsd(aggregates.costPerMerged)} sub={`${aggregates.mergedCount} merged`} />
        <KpiTile icon={Layers}      label="Cost / story point"     value={fmtUsd(aggregates.costPerStoryPoint)} sub="blended" />
        <KpiTile icon={Users2}      label="Human-hours displaced"  value={`${aggregates.humanHoursDisplaced}h`} sub={fmtUsd(aggregates.humanHoursDisplacedUsd) + " @ $" + HUMAN_RATE_PER_HOUR + "/h"} />
        <KpiTile icon={Cpu}         label="Local-vLLM offload"     value={fmtUsd(aggregates.offloadSavings)} sub={`vs cloud-only on ${fmtUsd(aggregates.totalLocal)} local`} tone="positive" />
        <KpiTile icon={Moon}        label="Overnight batch save"   value={fmtUsd(aggregates.batchSavings)} sub="~50% discount" tone="positive" />
        <KpiTile icon={DollarSign}  label="Total agent spend"      value={fmtUsd(aggregates.totalCost)} sub={`${fmtUsd(aggregates.totalCloud)} cloud + ${fmtUsd(aggregates.totalLocal)} local`} />
      </section>

      {/* Trend */}
      <section className="space-y-2">
        <SectionHead icon={TrendingDown} title="Cost-per-ticket trend" sub="The number should fall as local offload + autonomy grow" />
        <CostTrend />
      </section>

      {/* Per-ticket table */}
      <section className="space-y-2">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <SectionHead icon={DollarSign} title="Per-ticket cost breakdown" sub="Click a row to expand stage-by-stage attribution" />
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <button
              onClick={() => setMergedOnly((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 border rounded cursor-pointer transition-colors",
                mergedOnly ? "bg-primary/20 text-foreground border-primary/40" : "text-muted-foreground border-border hover:bg-white/5",
              )}
            >
              <Filter className="size-3" /> merged only
            </button>
            <SortChips value={sort} onChange={setSort} />
          </div>
        </div>

        <div className="glass-panel overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <Th></Th>
                <Th>ticket</Th>
                <Th>cb</Th>
                <Th className="text-right">sp</Th>
                <Th className="text-right">tokens</Th>
                <Th className="text-right">cloud/local</Th>
                <Th className="text-right">review</Th>
                <Th className="text-right">reruns</Th>
                <Th className="text-right">total</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ t, total, tokens, review, reruns }) => {
                const isOpen = !!expanded[t.ticketId];
                const cloud = t.stages.reduce((a, s) => a + s.cloudUsd, 0);
                const local = t.stages.reduce((a, s) => a + s.localUsd, 0);
                const penalty = ticketRerunPenalty(t);
                return (
                  <Fragment key={t.ticketId}>
                    <tr
                      className="border-b border-border/60 hover:bg-white/[0.03] cursor-pointer"
                      onClick={() => setExpanded((e) => ({ ...e, [t.ticketId]: !isOpen }))}
                    >
                      <td className="px-2 py-2 w-6 text-muted-foreground">
                        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-[11px] text-muted-foreground">{t.ticketId}</div>
                        <div className="text-foreground truncate max-w-[28ch]">{t.title}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground uppercase">{t.cb}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{t.storyPoints}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtUsd(tokens)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-[10px]">
                        <span className="text-muted-foreground">{fmtUsd(cloud)}</span>
                        <span className="text-muted-foreground/50"> / </span>
                        <span className="text-status-done">{fmtUsd(local)}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtMin(review)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {reruns > 0 ? (
                          <span className="inline-flex items-center gap-1 text-status-error">
                            <RefreshCcw className="size-3" /> {reruns}
                            <span className="text-[10px] text-status-error/70">+{fmtUsd(penalty)}</span>
                          </span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">{fmtUsd(total)}</td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border bg-black/20 dark:bg-black/20 [.light_&]:bg-white/40">
                        <td></td>
                        <td colSpan={8} className="px-3 py-3">
                          <StageBreakdown t={t} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Leaderboards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Leaderboard title="Most expensive tickets" icon={Flame} tone="error" tickets={top} />
        <Leaderboard title="Cheapest to ship" icon={Trophy} tone="positive" tickets={bottom} />
      </section>
    </div>
  );
}

/* ----------------------------- pieces -------------------------------- */

function RoiHeadline() {
  const totalSavedUsd = aggregates.humanHoursDisplacedUsd - aggregates.totalCost;
  return (
    <div className="glass-panel px-4 py-2.5 flex items-center gap-4" suppressHydrationWarning>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">ROI · this period</div>
        <div className="text-2xl font-semibold tabular-nums" suppressHydrationWarning>
          {aggregates.roiMultiple}<span className="text-base text-muted-foreground">×</span>
        </div>
      </div>
      <div className="h-10 w-px bg-border" />
      <div className="text-[11px] font-mono leading-tight" suppressHydrationWarning>
        <div className="text-foreground tabular-nums">{fmtUsd(aggregates.humanHoursDisplacedUsd)} <span className="text-muted-foreground">human work</span></div>
        <div className="text-muted-foreground tabular-nums">− {fmtUsd(aggregates.totalCost)} agent spend</div>
        <div className="text-status-done tabular-nums">= {fmtUsd(totalSavedUsd)} net</div>
      </div>
    </div>
  );
}

function KpiTile({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string; value: string; sub?: string; tone?: "positive";
}) {
  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <Icon className="size-3" /> {label}
      </div>
      <div className={cn(
        "mt-1.5 text-xl font-semibold tabular-nums",
        tone === "positive" && "text-status-done",
      )} suppressHydrationWarning>{value}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate" suppressHydrationWarning>{sub}</div>}
    </div>
  );
}

function CostTrend() {
  const W = 800, H = 180, P = { l: 36, r: 24, t: 16, b: 28 };
  const xs = trend.map((_, i) => P.l + (i * (W - P.l - P.r)) / (trend.length - 1));
  const maxCost = Math.max(...trend.map((t) => t.costPerTicket)) * 1.1;
  const yCost = (v: number) => P.t + (1 - v / maxCost) * (H - P.t - P.b);
  const yShare = (v: number) => P.t + (1 - v / 100) * (H - P.t - P.b);
  const costPath = trend.map((t, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${yCost(t.costPerTicket).toFixed(1)}`).join(" ");
  const sharePath = trend.map((t, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${yShare(t.localSharePct).toFixed(1)}`).join(" ");

  return (
    <div className="glass-panel p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]">
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => {
          const y = P.t + g * (H - P.t - P.b);
          return <line key={g} x1={P.l} x2={W - P.r} y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 3" />;
        })}
        {/* local share area */}
        <path d={`${sharePath} L${xs[xs.length - 1]},${H - P.b} L${xs[0]},${H - P.b} Z`} fill="var(--status-done)" opacity="0.08" />
        <path d={sharePath} fill="none" stroke="var(--status-done)" strokeWidth="1.5" strokeDasharray="3 3" />
        {/* cost line */}
        <path d={costPath} fill="none" stroke="var(--primary)" strokeWidth="2" />
        {trend.map((t, i) =>
          t.annotation ? (
            <g key={i}>
              <line x1={xs[i]} x2={xs[i]} y1={P.t} y2={H - P.b} stroke="var(--status-waiting)" strokeDasharray="2 2" opacity="0.5" />
              <circle cx={xs[i]} cy={yCost(t.costPerTicket)} r="3" fill="var(--status-waiting)" stroke="var(--background)" strokeWidth="1.5" />
              <text x={xs[i] + 4} y={P.t + 10} fontSize="9" fill="var(--status-waiting)" fontFamily="var(--font-mono)">
                {t.annotation}
              </text>
            </g>
          ) : null,
        )}
        {/* labels */}
        <text x={P.l} y={P.t - 4} fontSize="9" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">$ / ticket</text>
        <text x={W - P.r} y={P.t - 4} fontSize="9" fill="var(--status-done)" fontFamily="var(--font-mono)" textAnchor="end">local share %</text>
        {trend.map((t, i) =>
          i % 3 === 0 ? (
            <text key={i} x={xs[i]} y={H - 10} fontSize="9" fill="var(--muted-foreground)" fontFamily="var(--font-mono)" textAnchor="middle">
              {t.day}
            </text>
          ) : null,
        )}
      </svg>
      <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground mt-1">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> cost / ticket (USD)</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-status-done" /> local-model share</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-status-waiting" /> offload milestone</span>
      </div>
    </div>
  );
}

function StageBreakdown({ t }: { t: TicketEconomics }) {
  const total = ticketTokenUsd(t);
  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded overflow-hidden border border-border">
        {t.stages.map((s) => {
          const v = stageTokenUsd(s);
          const pct = total ? (v / total) * 100 : 0;
          return (
            <div
              key={s.stage}
              title={`${stageLabel[s.stage]} · ${fmtUsd(v)}`}
              style={{ width: `${pct}%`, background: stageColor(s.stage) }}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {COST_STAGES.map((sk) => {
          const s = t.stages.find((x) => x.stage === sk)!;
          const v = stageTokenUsd(s);
          return (
            <div key={sk} className="rounded border border-border bg-white/[0.02] dark:bg-white/[0.02] [.light_&]:bg-white/60 p-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <span className="size-1.5 rounded-full" style={{ background: stageColor(sk) }} />
                {stageLabel[sk]}
              </div>
              <div className="mt-1 text-sm font-semibold tabular-nums">{fmtUsd(v)}</div>
              <div className="text-[10px] font-mono text-muted-foreground tabular-nums">
                cloud {fmtUsd(s.cloudUsd)} · local {fmtUsd(s.localUsd)}
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>review {s.reviewMin}m</span>
                {s.reruns > 0 ? (
                  <span className="text-status-error inline-flex items-center gap-0.5">
                    <RefreshCcw className="size-2.5" />×{s.reruns}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border">
        <span>tokens <span className="text-foreground">{fmtUsd(ticketTokenUsd(t))}</span> · human review <span className="text-foreground">{fmtMin(ticketReviewMin(t))}</span> ({fmtUsd(ticketReviewUsd(t))} @ ${HUMAN_RATE_PER_HOUR}/h)</span>
        <span>total to ship <span className="text-foreground font-semibold">{fmtUsd(ticketTotalUsd(t))}</span></span>
      </div>
    </div>
  );
}

function Leaderboard({
  title, icon: Icon, tone, tickets,
}: {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone: "error" | "positive";
  tickets: TicketEconomics[];
}) {
  const max = Math.max(...tickets.map((t) => ticketTotalUsd(t)));
  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <Icon className={cn("size-3.5", tone === "error" ? "text-status-error" : "text-status-done")} />
        {title}
      </div>
      <ol className="mt-2 space-y-1.5">
        {tickets.map((t, i) => {
          const total = ticketTotalUsd(t);
          const driver = [...t.stages].sort((a, b) => stageTokenUsd(b) - stageTokenUsd(a))[0];
          const reruns = ticketRerunCount(t);
          return (
            <li key={t.ticketId} className="flex items-center gap-2 text-xs">
              <span className="w-4 text-right font-mono text-[10px] text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{t.ticketId}</span>
                  <span className="truncate text-foreground">{t.title}</span>
                </div>
                <div className="h-1 mt-1 rounded bg-white/5 overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${(total / max) * 100}%`,
                      background: tone === "error" ? "var(--status-error)" : "var(--status-done)",
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  driver: <span style={{ color: stageColor(driver.stage) }}>{stageLabel[driver.stage]}</span>
                  {reruns > 0 && <> · <span className="text-status-error">{reruns} rerun{reruns > 1 ? "s" : ""}</span></>}
                </div>
              </div>
              <span className="font-mono tabular-nums font-semibold">{fmtUsd(total)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground", className)}>{children}</th>;
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

function SortChips({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const opts: [SortKey, string][] = [
    ["total", "total $"],
    ["tokens", "tokens"],
    ["review", "review"],
    ["reruns", "reruns"],
    ["sp", "story pts"],
  ];
  return (
    <div className="inline-flex rounded border border-border overflow-hidden">
      {opts.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            "px-2 py-1 text-[10px] cursor-pointer transition-colors",
            value === k ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-white/5",
          )}
        >sort: {label}</button>
      ))}
    </div>
  );
}
