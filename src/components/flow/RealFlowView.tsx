import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  type TooltipProps,
} from "recharts";
import {
  Hourglass,
  CheckCircle2,
  Repeat,
  RotateCcw,
  Activity,
  Flame,
  GitBranch,
} from "lucide-react";

import { getFlowAnalyticsFn, type FlowAnalyticsData } from "@/lib/api/fleet.functions";
import { STAGE_META } from "@/lib/lifecycle";
import { fmtDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const POLL_MS = 15000;

const fmtDur = (ms?: number | null) => {
  if (ms == null) return "—";
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${Math.round(s % 60)}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const pctText = (n?: number | null) => (n == null ? "—" : `${n}%`);
const scoreTone = (n?: number | null): Tone =>
  n == null ? undefined : n >= 80 ? "done" : n >= 50 ? "warn" : "error";

// finalize_method is an internal term — surface human labels.
const FINALIZE_LABEL: Record<string, string> = {
  first_try: "first try",
  langgraph: "fixer path",
  fallback: "fallback",
};
const finalizeFill = (key: string) =>
  key === "first_try"
    ? "var(--status-done)"
    : key === "fallback"
      ? "var(--status-error)"
      : "var(--status-waiting)";

type Props = { initial: FlowAnalyticsData };

export function RealFlowView({ initial }: Props) {
  const { data } = useQuery({
    queryKey: ["flow-analytics"],
    queryFn: () => getFlowAnalyticsFn(),
    initialData: initial,
    refetchInterval: POLL_MS,
  });
  // `data` is typed `unknown` from the server-fn return-serialization inference; at runtime
  // it is FlowAnalyticsData (initialData + queryFn both supply it).
  const d = data as FlowAnalyticsData;
  const t = d.totals;

  if (t.runs === 0) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Header reworkPct={0} firstTryPct={0} />
        <div className="glass-panel p-8 text-center text-sm text-muted-foreground">
          No runs to analyze yet. Once agents execute runs, flow efficiency shows up here.
        </div>
      </div>
    );
  }

  const finalizeData = d.byFinalize.map((b) => ({ ...b, label: FINALIZE_LABEL[b.key] ?? b.key }));
  const sessionMax = d.sessions[0]?.totalMs || 1;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Header reworkPct={t.reworkPct} firstTryPct={t.firstTryPct} />

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Compute / session"
          value={fmtDur(t.avgSessionMs)}
          sub={`avg · ${t.sessions} sessions`}
          icon={<Hourglass className="size-3.5" />}
        />
        <Kpi
          label="First-try rate"
          value={pctText(t.firstTryRate)}
          sub={`${t.firstTryCount}/${t.finalizeDenom}`}
          tone={scoreTone(t.firstTryRate)}
          icon={<CheckCircle2 className="size-3.5" />}
        />
        <Kpi
          label="Avg rework"
          value={`${t.avgTurns}×`}
          sub={`max ${t.maxTurns} turns`}
          tone={t.avgTurns >= 2 ? "warn" : undefined}
          icon={<Repeat className="size-3.5" />}
        />
        <Kpi
          label="Reset : approve"
          value={`${t.resets}:${t.approvals}`}
          sub="recent window"
          tone={t.resets > t.approvals ? "error" : undefined}
          icon={<RotateCcw className="size-3.5" />}
        />
        <Kpi
          label="Success rate"
          value={pctText(t.successRate)}
          sub={`${t.succeeded}/${t.runs}`}
          icon={<Activity className="size-3.5" />}
        />
        <Kpi
          label="Run compute"
          value={fmtDur(t.p50Ms)}
          sub={`p95 ${fmtDur(t.p95Ms)}`}
          icon={<Flame className="size-3.5" />}
        />
      </section>

      {/* Distributions */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Successful run compute"
          sub={`p50 ${fmtDur(t.p50Ms)} · p95 ${fmtDur(t.p95Ms)}`}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.durationHist} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="bucket"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                width={28}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="count" name="runs" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="First-try vs fixer path" sub="where the rework comes from">
          {finalizeData.length === 0 ? (
            <EmptyChart>No finalize data yet.</EmptyChart>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={finalizeData}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 28, bottom: 0 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  width={64}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" name="runs" radius={[0, 3, 3, 0]}>
                  {finalizeData.map((b) => (
                    <Cell key={b.key} fill={finalizeFill(b.key)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </section>

      {/* Rework per session */}
      <section className="glass-panel p-4">
        <SectionHead>Rework per session · top {d.sessions.length}</SectionHead>
        <div className="mt-1 mb-3 flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
          <Legend cls="bg-status-done/70" label="first pass" />
          <Legend cls="bg-status-waiting/70" label="rework (retries)" />
        </div>
        <div className="space-y-2.5">
          {d.sessions.map((s) => (
            <div key={s.title}>
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="truncate text-foreground" title={s.title}>
                  {s.title}
                </span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  {s.turns}× · {fmtDur(s.totalMs)}
                  {s.reworkBound && (
                    <span className="ml-1.5 rounded border border-status-waiting/40 bg-status-waiting/10 px-1 py-0.5 text-[9px] uppercase tracking-wider text-status-waiting">
                      rework-bound
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="bg-status-done/70"
                  style={{ width: `${(s.firstTryMs / sessionMax) * 100}%` }}
                />
                <div
                  className="bg-status-waiting/70"
                  style={{ width: `${(s.reworkMs / sessionMax) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spec gate state + reset/approve trail */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel flex flex-col p-4 lg:col-span-1">
          <SectionHead>Spec gate</SectionHead>
          <div className="mt-3 flex items-end gap-2">
            <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
              BA
            </span>
            <span className="font-mono text-3xl leading-none tabular-nums">{t.openGate}</span>
            <span className="pb-0.5 text-xs text-muted-foreground">awaiting review</span>
          </div>
          <div className="mt-auto pt-3 font-mono text-[11px] text-muted-foreground">
            <span className="text-status-error">{t.resets} reset</span> ·{" "}
            <span className="text-status-done">{t.approvals} approved</span>
            <span className="block text-[10px]">recent window</span>
          </div>
        </div>

        <div className="glass-panel p-4 lg:col-span-2">
          <SectionHead>Reset / approve trail · recent window</SectionHead>
          {d.trail.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No reset/approve events in the recent window.
            </div>
          ) : (
            <ul className="mt-2 space-y-1">
              {d.trail.map((row, i) => (
                <li
                  key={`${row.ts}-${i}`}
                  className="flex items-center gap-2 border-b border-border/60 py-1 text-[11px] last:border-0"
                >
                  <span className="w-28 shrink-0 font-mono text-muted-foreground">
                    {fmtDateTime(row.ts)}
                  </span>
                  <StageBadge stage={row.stage} />
                  <span className="truncate text-foreground" title={row.title}>
                    {row.title || "—"}
                  </span>
                  {row.project && (
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                      {row.project}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* The one quality series with real history */}
      {d.completenessTrend.length > 0 ? (
        <ChartPanel title="Spec completeness trend" sub={`${t.completenessN} scored runs · weekly`}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={d.completenessTrend}
              margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
            >
              <defs>
                <linearGradient id="g-completeness" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--status-done)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--status-done)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="bucket"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                width={28}
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<DarkTooltip />} />
              <Area
                type="monotone"
                dataKey="completeness"
                name="completeness"
                stroke="var(--status-done)"
                strokeWidth={2}
                fill="url(#g-completeness)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      ) : t.avgCompleteness != null ? (
        <section className="glass-panel p-4">
          <SectionHead>Spec completeness</SectionHead>
          <div className="mt-2 font-mono text-2xl tabular-nums">{t.avgCompleteness}%</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            avg over {t.completenessN} scored runs (too few for a weekly trend)
          </div>
        </section>
      ) : null}
    </div>
  );
}

type Tone = "done" | "warn" | "error" | undefined;

function Header({ reworkPct, firstTryPct }: { reworkPct: number; firstTryPct: number }) {
  const reworkBound = reworkPct > 40;
  return (
    <div className="glass-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
          flow efficiency analytics
        </div>
        <h1 className="mt-0.5 text-lg font-semibold">Flow Analytics</h1>
        <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
          How fast the agent works, what rework costs, and the human reset/approve churn at the spec
          gate.
        </p>
      </div>
      <div className="w-full shrink-0 lg:w-80">
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>compute vs rework</span>
          <span
            className={cn(
              "font-semibold",
              reworkBound ? "text-status-waiting" : "text-status-done",
            )}
          >
            {reworkBound ? "rework-bound" : "compute-bound"}
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
          <div className="bg-status-done/70" style={{ width: `${firstTryPct}%` }} />
          <div className="bg-status-waiting/70" style={{ width: `${reworkPct}%` }} />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px]">
          <span className="text-status-done">{firstTryPct}% first-try</span>
          <span className="text-status-waiting">{reworkPct}% rework</span>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: Tone;
}) {
  const valCls =
    tone === "done"
      ? "text-status-done"
      : tone === "warn"
        ? "text-status-waiting"
        : tone === "error"
          ? "text-status-error"
          : "text-foreground";
  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-xl tabular-nums", valCls)}>{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ChartPanel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-panel p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <SectionHead>{title}</SectionHead>
        {sub && <span className="font-mono text-[10px] text-muted-foreground">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function EmptyChart({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-[180px] place-items-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-sm", cls)} />
      {label}
    </span>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const m = STAGE_META[stage] ?? STAGE_META.done;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
        m.cls,
      )}
    >
      {stage === "reset" ? <RotateCcw className="size-3" /> : <GitBranch className="size-3" />}
      {m.label}
    </span>
  );
}

function DarkTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel p-2 font-mono text-[11px]">
      {label != null && label !== "" && <div className="mb-1 text-muted-foreground">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{ background: (p.color as string) ?? "var(--primary)" }}
          />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}
