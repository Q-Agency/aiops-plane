import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, AlertTriangle, ScrollText } from "lucide-react";

import type { AgentState } from "@/contract";
import { getObservabilityFn, type AgentDiagnostics } from "@/lib/api/fleet.functions";
import { cn } from "@/lib/utils";
import { fmtClock } from "@/lib/time";

const POLL_MS = 8000;

const AGENT_STATE_DOT: Record<AgentState, string> = {
  running: "bg-status-running dot-pulse",
  waiting: "bg-status-waiting",
  error: "bg-status-error",
  idle: "bg-status-idle",
};

const checkOk = (v: string) => /^ok\b/i.test(v) || v === "ok" || /^\d+$/.test(v);

const LEVELS = ["ALL", "INFO", "WARN", "ERROR"] as const;
type LevelFilter = (typeof LEVELS)[number];

const levelRank = (lvl: string) => {
  const u = lvl.toUpperCase();
  if (u.startsWith("ERR") || u === "CRITICAL" || u === "FATAL") return "ERROR";
  if (u.startsWith("WARN")) return "WARN";
  if (u === "DEBUG" || u === "TRACE") return "DEBUG";
  return "INFO";
};

const LEVEL_STYLE: Record<string, string> = {
  ERROR: "text-status-error",
  WARN: "text-status-waiting",
  INFO: "text-muted-foreground",
  DEBUG: "text-muted-foreground/60",
};

type Props = { initial: AgentDiagnostics[] };

export function RealObservabilityView({ initial }: Props) {
  const { data } = useQuery({
    queryKey: ["observability"],
    queryFn: () => getObservabilityFn(),
    initialData: initial,
    refetchInterval: POLL_MS,
  });
  const [level, setLevel] = useState<LevelFilter>("ALL");

  const multi = data.length > 1;
  const allLogs = data
    .flatMap((d) => d.logs.map((l) => ({ ...l, agent: d.agent.name })))
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const logs = (
    level === "ALL" ? allLogs : allLogs.filter((l) => levelRank(l.level) === level)
  ).slice(0, 400);
  const errorCount = allLogs.filter((l) => levelRank(l.level) === "ERROR").length;
  const warnCount = allLogs.filter((l) => levelRank(l.level) === "WARN").length;

  if (data.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <Header />
        <div className="glass-panel mt-4 p-8 text-center text-sm text-muted-foreground">
          No connected agents to observe.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Header errors={errorCount} warns={warnCount} />

      {/* Per-agent readiness checks */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {data.map((d) => (
          <div key={d.agent.agent_id} className="glass-panel p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{d.agent.name}</div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {d.agent.role ?? d.agent.agent_id}
                  {d.agent.version ? ` · ${d.agent.version}` : ""}
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded border border-border bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                <span className={cn("size-1.5 rounded-full", AGENT_STATE_DOT[d.agent.state])} />
                {d.agent.state}
              </span>
            </div>
            <div className="mt-3 space-y-1">
              {Object.keys(d.checks).length === 0 ? (
                <div className="text-[11px] text-muted-foreground">
                  No readiness checks reported.
                </div>
              ) : (
                Object.entries(d.checks).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        checkOk(value) ? "bg-status-done" : "bg-status-error",
                      )}
                    />
                    <span className="font-mono text-muted-foreground">{name}</span>
                    <span
                      className={cn(
                        "ml-auto truncate font-mono text-[11px]",
                        checkOk(value) ? "text-foreground/80" : "text-status-error",
                      )}
                    >
                      {value}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Logs */}
      <section className="glass-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <ScrollText className="size-3.5" />
            Recent logs
            <span className="ml-1 normal-case text-status-running">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-status-running align-middle dot-pulse" />
              live
            </span>
          </div>
          <div className="flex items-center gap-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  level === l
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">No log records.</div>
        ) : (
          <div className="scrollbar-thin max-h-[28rem] overflow-y-auto rounded-md border border-border bg-black/20">
            <div className="divide-y divide-border/40 font-mono text-[11px]">
              {logs.map((l, i) => {
                const rank = levelRank(l.level);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-2.5 py-1.5 hover:bg-white/[0.02]"
                  >
                    <span className="shrink-0 text-muted-foreground/70">{fmtClock(l.ts)}</span>
                    <span className={cn("w-12 shrink-0 uppercase", LEVEL_STYLE[rank])}>{rank}</span>
                    {multi && <span className="shrink-0 text-primary/80">{l.agent}</span>}
                    {l.logger && (
                      <span className="hidden shrink-0 text-muted-foreground/60 sm:inline">
                        {l.logger}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-foreground/90">
                      {l.message}
                      {l.exc && <span className="mt-1 block text-status-error/80">{l.exc}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Header({ errors, warns }: { errors?: number; warns?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          observability
        </div>
        <h1 className="text-lg font-semibold">Health &amp; logs</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Readiness checks and the live log tail, per agent.
        </p>
      </div>
      {(errors != null || warns != null) && (
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1 rounded border border-status-error/30 bg-status-error/10 px-2 py-1 text-status-error">
            <AlertTriangle className="size-3" /> {errors ?? 0} err
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-status-waiting/30 bg-status-waiting/10 px-2 py-1 text-status-waiting">
            <Activity className="size-3" /> {warns ?? 0} warn
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-border bg-white/5 px-2 py-1 text-muted-foreground">
            <CheckCircle2 className="size-3" /> snapshot
          </span>
        </div>
      )}
    </div>
  );
}
