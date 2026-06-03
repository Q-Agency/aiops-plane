import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiTileProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta: number; // % change vs last week
  sparkline: number[];
  accent?: string; // css var name e.g. "primary" or "agent-dev"
}

export function KpiTile({ label, value, format, delta, sparkline, accent = "primary" }: KpiTileProps) {
  const animated = useCountUp(value);
  const display = format ? format(animated) : Math.round(animated).toLocaleString();
  const up = delta >= 0;
  const data = sparkline.map((v) => ({ v }));
  const color = `var(--${accent})`;

  return (
    <div className="glass-panel p-3 hover-lift relative overflow-hidden">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <div className="font-mono text-2xl font-semibold">{display}</div>
        <div
          className={cn(
            "flex items-center text-[11px] font-mono px-1.5 py-0.5 rounded",
            up ? "text-status-done bg-status-done/10" : "text-status-error bg-status-error/10",
          )}
        >
          {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(delta).toFixed(1)}%
        </div>
      </div>
      <div className="h-9 -mx-1 -mb-1 mt-1.5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`g-${label}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g-${label})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
