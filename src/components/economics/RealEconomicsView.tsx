import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { DollarSign, Activity, Coins, Cpu } from "lucide-react";

import {
  getEconomicsFn,
  type EconomicsBucket,
  type EconomicsData,
} from "@/lib/api/fleet.functions";
import { cn } from "@/lib/utils";

const POLL_MS = 15000;

const usd = (v: number) => (v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`);
const compactUsd = (v: number) => `$${v.toFixed(2)}`;
const kTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

type Props = { initial: EconomicsData };

export function RealEconomicsView({ initial }: Props) {
  const { data } = useQuery({
    queryKey: ["economics"],
    queryFn: () => getEconomicsFn(),
    initialData: initial,
    refetchInterval: POLL_MS,
  });

  const { totals, byModel, byProject, byDay } = data;
  const avgPerRun = totals.runs ? totals.cost / totals.runs : 0;
  const costPerSuccess = totals.succeeded ? totals.cost / totals.succeeded : 0;
  const totalTokens = totals.tokensIn + totals.tokensOut;

  if (totals.runs === 0) {
    return (
      <div className="p-4 lg:p-6">
        <Header />
        <div className="glass-panel mt-4 p-8 text-center text-sm text-muted-foreground">
          No runs to cost yet. Once agents execute runs, spend and token economics show up here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Header />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Total spend"
          value={compactUsd(totals.cost)}
          icon={<DollarSign className="size-3.5" />}
          accent
        />
        <Kpi
          label="Runs"
          value={String(totals.runs)}
          sub={`${totals.succeeded} ok`}
          icon={<Activity className="size-3.5" />}
        />
        <Kpi
          label="Tokens"
          value={kTokens(totalTokens)}
          sub={`${kTokens(totals.tokensIn)} in · ${kTokens(totals.tokensOut)} out`}
          icon={<Coins className="size-3.5" />}
        />
        <Kpi label="Avg / run" value={usd(avgPerRun)} icon={<Activity className="size-3.5" />} />
        <Kpi
          label="Cost / success"
          value={usd(costPerSuccess)}
          icon={<DollarSign className="size-3.5" />}
        />
        <Kpi
          label="Models"
          value={String(byModel.length)}
          sub={`${byProject.length} projects`}
          icon={<Cpu className="size-3.5" />}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Spend · by day" sub={compactUsd(totals.cost)}>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={byDay} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="g-spend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip content={<DarkTooltip kind="cost" />} />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#g-spend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Spend · by model" sub={`${byModel.length} models`}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart
              data={byModel}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis
                type="number"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="key"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                content={<DarkTooltip kind="cost" />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="cost" fill="var(--primary)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <BreakdownTable title="By model" rows={byModel} firstCol="Model" />
      {byProject.length > 0 && (
        <BreakdownTable title="By project" rows={byProject} firstCol="Project" />
      )}
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  firstCol,
}: {
  title: string;
  rows: EconomicsBucket[];
  firstCol: string;
}) {
  const maxCost = Math.max(...rows.map((r) => r.cost), 0.0001);
  return (
    <section className="glass-panel p-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-2 py-2 text-left font-medium">{firstCol}</th>
              <th className="px-2 py-2 text-right font-medium">Runs</th>
              <th className="px-2 py-2 text-right font-medium">Tokens</th>
              <th className="px-2 py-2 text-right font-medium">Cost</th>
              <th className="px-2 py-2 text-right font-medium">Avg/run</th>
              <th className="w-[28%] px-2 py-2 text-left font-medium">Share</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border/60 last:border-0">
                <td className="max-w-[14rem] truncate px-2 py-2 text-foreground">{r.key}</td>
                <td className="px-2 py-2 text-right tabular-nums">{r.runs}</td>
                <td className="px-2 py-2 text-right tabular-nums">{kTokens(r.tokens)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-foreground">{usd(r.cost)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                  {usd(r.runs ? r.cost / r.runs : 0)}
                </td>
                <td className="px-2 py-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((r.cost / maxCost) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Header() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        unit economics
      </div>
      <h1 className="text-lg font-semibold">Spend &amp; token economics</h1>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Across all connected agents and projects · live from runs.
      </p>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="glass-panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        {sub && <div className="font-mono text-[10px] text-muted-foreground">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label, kind }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel p-2 font-mono text-[11px]">
      <div className="mb-1 text-muted-foreground">{label ?? payload[0]?.payload?.key}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-foreground/90">{p.dataKey}</span>
          <span className="ml-auto">{kind === "cost" ? compactUsd(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-xl tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
