/**
 * Agent profile (mock experience) — the PM-operable deep-dive behind
 * /agents/$agentId. Revamped 2026-06-12 (owner ask): the old screen was
 * telemetry-only; this one leads with the OPERATE band — switch the model
 * (model plane made switchable, cross-vendor), scope its tools, reassign
 * the accountable owner, move it on the autonomy ladder (downgrade free,
 * upgrade only on a system proposal) — plus the Quality & versions
 * AgentOps panel (eval history + instant rollback). Every knob writes
 * policy.changed / human.reassigned / agent.rolled_back to the session
 * ledger via mock/agent-config.ts.
 *
 * The langfuse-style telemetry (charts, runs table, trace drawer, dev
 * overnight loop) is KEPT below the operating surface — it moved here
 * verbatim from the old inline route view. Real mode renders
 * RealAgentDeepDive instead; this file is mock-only.
 */

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  GitPullRequest,
  Gauge,
  History,
  Lock,
  Moon,
  PlugZap,
  RotateCcw,
  Server,
  ShieldCheck,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Agent } from "@/mock/types";
import {
  buildRuns,
  invocationsSeries,
  acceptanceSeries,
  latencyHistogram,
  tokenCostSeries,
  overnightHistory,
  type AgentRun,
  type RunStep,
} from "@/mock/runs";
import {
  agentAutonomy,
  agentOwner,
  agentTier,
  agentTools,
  agentVersions,
  llmTierDef,
  requiredToolsFor,
  rollbackAgentVersion,
  setAgentAutonomy,
  setAgentOwner,
  setAgentTier,
  tierComposition,
  tierCostPerRun,
  tierModelCount,
  tierP50,
  toggleAgentTool,
  useAgentConfigTick,
  type AutonomyLevel,
  type LlmTier,
} from "@/mock/agent-config";
import { LlmTierMenu } from "@/components/agents/LlmTierMenu";
import { AUTONOMY_LEVELS, autonomyPreviewStat, autonomyStatusFor } from "@/mock/gate-policies";
import { CONNECTORS } from "@/mock/connectors";
import { humans } from "@/mock/humans";
import { CHAIN_ROLES, isChainRoleId } from "@/mock/chain";
import {
  BA_VALIDATOR_FAMILY,
  DESIGN_VALIDATOR_FAMILY,
  QA_VALIDATOR_FAMILY,
} from "@/mock/validators";
import { cn } from "@/lib/utils";

const VALIDATOR_FAMILY: Record<string, string> = {
  ba: BA_VALIDATOR_FAMILY,
  sa: DESIGN_VALIDATOR_FAMILY,
  qa: QA_VALIDATOR_FAMILY,
};

/** agents.ts ids → chain.ts ids where they differ (contract chips). */
const CHAIN_ALIAS: Record<string, string> = { curator: "knowledge" };

export function AgentProfile({ agent }: { agent: Agent }) {
  useAgentConfigTick(); // re-render on any config mutation
  const a = agent;
  const color = `var(--${a.color})`;
  const [variant, setVariant] = useState<"All" | "Backend" | "Frontend" | "Mobile">("All");
  const [openRun, setOpenRun] = useState<AgentRun | null>(null);

  const runs = useMemo(() => {
    const r = buildRuns(a.id);
    return a.id === "dev" && variant !== "All" ? r.filter((x) => x.variant === variant) : r;
  }, [a.id, variant]);

  const invSeries = useMemo(() => invocationsSeries(a.id), [a.id]);
  const accSeries = useMemo(() => acceptanceSeries(a.id), [a.id]);
  const latData = useMemo(() => latencyHistogram(a.id), [a.id]);
  const costData = useMemo(() => tokenCostSeries(a.id), [a.id]);

  const tier = agentTier(a.id);
  const owner = agentOwner(a.id);
  const autonomy = agentAutonomy(a.id);
  const versions = agentVersions(a.id);
  const current = versions.find((v) => v.current) ?? versions[0];

  const chainId = CHAIN_ALIAS[a.id] ?? a.id;
  const contract = isChainRoleId(chainId) ? CHAIN_ROLES[chainId] : null;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div
        className="glass-panel p-5 flex items-center gap-4 flex-wrap"
        style={{ borderColor: `color-mix(in oklab, ${color} 40%, transparent)` }}
      >
        <div
          className="size-12 rounded-xl grid place-items-center text-lg font-semibold"
          style={{
            background: `color-mix(in oklab, ${color} 20%, transparent)`,
            color,
            boxShadow: `inset 0 0 0 1px ${color}`,
          }}
        >
          {a.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            agent · v{current.version}
          </div>
          <div className="text-xl font-semibold truncate">{a.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{a.role}</div>
          {contract && (
            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <span>
                consumes{" "}
                <span className="text-foreground/80">
                  {contract.consumes.length ? contract.consumes.join(", ") : "—"}
                </span>
              </span>
              <ArrowRight className="size-2.5" />
              <span>
                produces <span className="text-foreground/80">{contract.produces}</span>
              </span>
            </div>
          )}
        </div>
        <div className="ml-auto grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
          <Meta
            icon={Cpu}
            label="llm tier"
            value={`${llmTierDef(tier).label} · ${tierModelCount(tier)} models`}
          />
          <Meta icon={UserCheck} label="answers for it" value={owner.name} />
          <Meta icon={Gauge} label="autonomy" value={autonomy} />
          <Meta
            icon={Activity}
            label="state"
            value={a.state}
            tone={
              a.state === "running"
                ? "text-status-running"
                : a.state === "waiting"
                  ? "text-status-waiting"
                  : a.state === "error"
                    ? "text-status-error"
                    : "text-muted-foreground"
            }
          />
        </div>
      </div>

      {/* Operate band — the PM controls */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ModelPanel agent={a} />
        <ToolsPanel agent={a} />
        <AccountabilityPanel agent={a} />
      </section>

      {/* Quality & versions (AgentOps) */}
      <QualityPanel agent={a} />

      {/* Dev variant tabs */}
      {a.id === "dev" && (
        <div className="flex items-center gap-1 text-xs">
          {(["All", "Backend", "Frontend", "Mobile"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={cn(
                "px-3 py-1.5 rounded-full border font-mono",
                variant === v
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {/* Metric panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartPanel
          title="Invocations · last 24h"
          sub={`${invSeries.reduce((s, x) => s + x.runs, 0)} runs`}
        >
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={invSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${a.id}-inv`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="h"
                interval={3}
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<DarkTooltip />} />
              <Area
                type="monotone"
                dataKey="runs"
                stroke={color}
                strokeWidth={2}
                fill={`url(#g-${a.id}-inv)`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Acceptance vs rejection" sub={`${a.successRate}% success · last 14d`}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={accSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<DarkTooltip />} />
              <Line
                type="monotone"
                dataKey="accepted"
                stroke="var(--status-done)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="rejected"
                stroke="var(--status-error)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Latency distribution" sub={`p95 ≈ ${Math.round(a.latencyMs / 1000)}s`}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={latData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Token cost · cloud vs local"
          sub={`$${a.tokenCostToday.toFixed(2)} today`}
        >
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={costData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<DarkTooltip />} />
              <Area
                type="monotone"
                dataKey="cloud"
                stackId="1"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.35}
              />
              <Area
                type="monotone"
                dataKey="local"
                stackId="1"
                stroke="var(--agent-curator)"
                fill="var(--agent-curator)"
                fillOpacity={0.35}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {/* Dev-only Overnight panel */}
      {a.id === "dev" && <OvernightPanel />}

      {/* Recent runs table */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              trace · langfuse-style
            </div>
            <div className="text-sm font-semibold">Recent runs</div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">{runs.length} runs</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 pl-1">run</th>
                <th className="text-left">ticket</th>
                <th className="text-left">started</th>
                <th className="text-left">duration</th>
                <th className="text-left">tokens</th>
                <th className="text-left">model</th>
                {a.id === "dev" && <th className="text-left">variant</th>}
                <th className="text-left">outcome</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpenRun(r)}
                  className="border-b border-border/60 hover:bg-white/[0.03] cursor-pointer"
                >
                  <td className="py-2 pl-1 text-muted-foreground">{r.id}</td>
                  <td className="text-foreground">{r.ticketId}</td>
                  <td className="text-muted-foreground">{r.startedOffsetMin}m ago</td>
                  <td className="text-muted-foreground">{fmtDur(r.durationMs)}</td>
                  <td className="text-muted-foreground">{r.tokens.toLocaleString()}</td>
                  <td className="text-muted-foreground">{r.model}</td>
                  {a.id === "dev" && (
                    <td>
                      <span className="text-[10px] px-1.5 py-0.5 border border-border rounded text-muted-foreground">
                        {r.variant}
                      </span>
                    </td>
                  )}
                  <td>
                    <OutcomePill outcome={r.outcome} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openRun && <TraceDrawer run={openRun} agentColor={color} onClose={() => setOpenRun(null)} />}
    </div>
  );
}

/* ================== Operate band ================== */

function PanelShell({
  icon: I,
  title,
  sub,
  children,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <I className="size-3.5 text-muted-foreground" />
        <div>
          <div className="text-sm font-semibold leading-tight">{title}</div>
          <div className="text-[10px] font-mono text-muted-foreground">{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function ModelPanel({ agent }: { agent: Agent }) {
  const tier = agentTier(agent.id);
  const def = llmTierDef(tier);
  const composition = tierComposition(tier);

  function pickTier(t: LlmTier) {
    if (t !== tier) {
      setAgentTier(agent.id, agent.name, t);
      toast.success(`${agent.name} → ${llmTierDef(t).label} blend`, {
        description: `${tierModelCount(t)} models across generation, supervisor and judge — policy.changed on the ledger.`,
      });
    }
  }

  return (
    <PanelShell icon={Cpu} title="Model & routing" sub="pick a tier — each is a blend of models">
      {/* Current blend — the models behind each sub-role */}
      <div className="rounded-md border border-border bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold" style={{ color: `var(${def.accent})` }}>
            {def.label}
          </div>
          {def.inTenant ? (
            <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-status-done/40 text-status-done bg-status-done/10">
              in-tenant
            </span>
          ) : (
            <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border text-muted-foreground">
              {tierModelCount(tier)}-model blend
            </span>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-border space-y-1.5">
          {composition.map((c) => (
            <div key={c.role} className="flex items-center gap-2 text-[11px]">
              <span className="w-[72px] shrink-0 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                {c.label}
              </span>
              <span className="font-medium truncate">{c.model.label}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                {c.model.hosting === "in-tenant" ? "in-tenant" : c.model.provider}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>
            ~<span className="text-foreground">${tierCostPerRun(tier).toFixed(2)}</span> / run
            <span className="text-muted-foreground/70"> (blended)</span>
          </span>
          <span>
            p50 <span className="text-foreground">{tierP50(tier)}s</span>
          </span>
        </div>
      </div>

      {/* Tier menu — the mandatory, primary control */}
      <div data-test="llm-tier-menu">
        <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1.5">
          Change tier
        </div>
        <LlmTierMenu value={tier} onChange={pickTier} size="md" />
      </div>

      <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-auto">
        Each tier is a blend — generation, supervisor and judge can run different models. Today the
        tier sets all three; per-role overrides land here later. Disclosed per agent in Settings →
        Models.
      </p>
    </PanelShell>
  );
}

function ToolsPanel({ agent }: { agent: Agent }) {
  const tools = new Set(agentTools(agent.id));
  const required = requiredToolsFor(agent.id);

  function onToggle(id: (typeof CONNECTORS)[number]["id"], name: string) {
    const enabling = !tools.has(id);
    toggleAgentTool(agent.id, agent.name, id);
    toast.success(`${name} ${enabling ? "granted to" : "removed from"} ${agent.name}`, {
      description: "Connector-vault scope updated — policy.changed on the ledger.",
    });
  }

  return (
    <PanelShell icon={Wrench} title="Tools & access" sub="what it may touch — nothing else">
      <div className="flex flex-wrap gap-1.5">
        {CONNECTORS.map((c) => {
          const isRequired = required.has(c.id);
          const enabled = tools.has(c.id) || isRequired;
          const roadmap = c.availability === "roadmap";
          return (
            <button
              key={c.id}
              disabled={roadmap}
              onClick={() => !isRequired && !roadmap && onToggle(c.id, c.name)}
              title={
                isRequired
                  ? `Required — ${agent.name}'s core loop breaks without it`
                  : roadmap
                    ? "Roadmap — not connectable yet"
                    : enabled
                      ? "Click to remove access"
                      : "Click to grant access"
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] transition-colors",
                roadmap && "opacity-50 cursor-not-allowed border-border text-muted-foreground",
                !roadmap && isRequired && "border-primary/40 bg-primary/[0.07] text-foreground cursor-default",
                !roadmap && !isRequired && enabled &&
                  "border-status-done/40 bg-status-done/10 text-foreground hover:border-status-error/40",
                !roadmap && !isRequired && !enabled &&
                  "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
              )}
              data-test={`tool-${c.id}`}
            >
              {isRequired ? (
                <Lock className="size-3 text-primary" />
              ) : enabled ? (
                <Check className="size-3 text-status-done" />
              ) : (
                <PlugZap className="size-3" />
              )}
              {c.name}
              {isRequired && <span className="text-[9px] font-mono text-primary">required</span>}
              {roadmap && <span className="text-[9px] font-mono">roadmap</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-auto">
        Grants scope the agent's connector vault — it cannot reach a tool that isn't on this
        list. Every change lands on the ledger.
      </p>
    </PanelShell>
  );
}

function AccountabilityPanel({ agent }: { agent: Agent }) {
  const owner = agentOwner(agent.id);
  const autonomy = agentAutonomy(agent.id);
  const status = autonomyStatusFor(agent.id);
  const proposal =
    status.eligibleFor && status.eligibleFor > autonomy ? status.eligibleFor : undefined;

  function onOwner(e: React.ChangeEvent<HTMLSelectElement>) {
    const h = humans.find((x) => x.id === e.target.value);
    if (!h) return;
    setAgentOwner(agent.id, agent.name, h.id);
    toast.success(`${h.name} now answers for ${agent.name}`, {
      description: "human.reassigned written to the ledger.",
    });
  }

  function onRung(level: AutonomyLevel) {
    if (level === autonomy) return;
    if (level < autonomy) {
      setAgentAutonomy(agent.id, agent.name, level);
      toast.success(`${agent.name} stepped down to ${level}`, {
        description: "Effective immediately — gates re-engage on the next run.",
      });
      return;
    }
    if (proposal && level <= proposal) {
      setAgentAutonomy(agent.id, agent.name, level, { granted: true });
      toast.success(`${level} granted to ${agent.name}`, {
        description: "Granted on a system proposal — policy.changed on the ledger.",
      });
      return;
    }
    toast.info(`${level} isn't earned yet`, {
      description:
        "Promotions are proposed by the system on validator streaks, then granted by you — never self-served.",
    });
  }

  return (
    <PanelShell icon={ShieldCheck} title="Accountability & autonomy" sub="who answers · how far it runs alone">
      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          accountable owner
        </span>
        <select
          value={owner.id}
          onChange={onOwner}
          data-test="owner-select"
          className="mt-1 w-full rounded-md border border-border bg-white/[0.02] px-2.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
        >
          {humans.map((h) => (
            <option key={h.id} value={h.id} className="bg-panel text-foreground">
              {h.name} — {h.role}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[10px] text-muted-foreground/80">
          Signs this agent's gates; deputies may cover, accountability stays here.
        </span>
      </label>

      <div className="space-y-1" data-test="autonomy-ladder">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          autonomy ladder
        </span>
        {AUTONOMY_LEVELS.map((l) => {
          const active = l.id === autonomy;
          return (
            <button
              key={l.id}
              onClick={() => onRung(l.id)}
              className={cn(
                "w-full text-left rounded border px-2.5 py-1.5 transition-colors",
                active
                  ? "border-primary/50 bg-primary/[0.07]"
                  : "border-border bg-white/[0.02] hover:border-primary/30",
              )}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className={cn("font-mono font-semibold", active ? "text-primary" : "text-muted-foreground")}>
                  {l.id}
                </span>
                <span className={cn("truncate", active ? "text-foreground" : "text-muted-foreground")}>
                  {l.label.replace(`${l.id} — `, "")}
                </span>
                {active && <Check className="size-3 text-primary ml-auto shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {proposal && (
        <div className="rounded-md border border-status-waiting/40 bg-status-waiting/[0.07] p-2.5">
          <div className="text-[11px] font-medium text-status-waiting">
            System proposes {proposal}
          </div>
          {status.evidence && (
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
              {status.evidence.line}
            </div>
          )}
          <div className="text-[10px] font-mono text-muted-foreground/80 mt-0.5">
            {autonomyPreviewStat(agent.id).line}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

/* ================== Quality & versions ================== */

function QualityPanel({ agent }: { agent: Agent }) {
  const versions = agentVersions(agent.id);
  const family = VALIDATOR_FAMILY[agent.id];

  function onRollback(version: string) {
    rollbackAgentVersion(agent.id, agent.name, version);
    toast.success(`${agent.name} rolled back to v${version}`, {
      description: "agent.rolled_back on the ledger — instant; evals re-run before any re-promotion.",
    });
  }

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <History className="size-3.5 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold leading-tight">Quality & versions</div>
            <div className="text-[10px] font-mono text-muted-foreground">
              no version ships without passing its eval suite · rollback is one click
            </div>
          </div>
        </div>
        {family && (
          <span className="text-[10px] font-mono px-2 py-1 rounded border border-border text-muted-foreground">
            quality bar: <span className="text-foreground">{family}</span>
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {versions.map((v) => (
          <div
            key={v.version}
            className={cn(
              "rounded border px-3 py-2 grid grid-cols-1 sm:grid-cols-[90px_minmax(150px,1fr)_2fr_90px_110px] items-center gap-x-3 gap-y-1",
              v.current ? "border-primary/40 bg-primary/[0.05]" : "border-border bg-white/[0.02]",
            )}
          >
            <span className="font-mono text-xs text-foreground">v{v.version}</span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    v.evalPct >= 93 ? "bg-status-done" : "bg-status-waiting",
                  )}
                  style={{ width: `${v.evalPct}%` }}
                />
              </span>
              <span className="font-mono text-[11px] tabular-nums">{v.evalPct}%</span>
            </span>
            <span className="text-[10px] font-mono text-muted-foreground truncate">
              {v.evalLine}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">{v.promotedAgo}</span>
            {v.current ? (
              <span className="inline-flex items-center gap-1 justify-self-start sm:justify-self-end text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-primary/40 text-primary bg-primary/10">
                <Check className="size-2.5" /> current
              </span>
            ) : (
              <button
                onClick={() => onRollback(v.version)}
                data-test={`rollback-${v.version}`}
                className="inline-flex items-center gap-1 justify-self-start sm:justify-self-end text-[10px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-status-waiting/50 transition-colors"
              >
                <RotateCcw className="size-2.5" /> Roll back
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================== shared bits (moved from the old route view) ================== */

function Meta({
  icon: I,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="border border-border rounded px-2 py-1.5 min-w-[120px]">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <I className="size-2.5" /> {label}
      </div>
      <div className={cn("truncate text-foreground/90", tone)}>{value}</div>
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
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{title}</div>
        {sub && <div className="text-[10px] text-muted-foreground font-mono">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel p-2 text-[11px] font-mono">
      <div className="text-muted-foreground mb-1">{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-foreground/90">{p.dataKey}</span>
          <span className="ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function OutcomePill({ outcome }: { outcome: AgentRun["outcome"] }) {
  const map = {
    approved: {
      i: Check,
      t: "text-status-done border-status-done/40 bg-status-done/10",
      l: "approved",
    },
    rejected: {
      i: X,
      t: "text-status-waiting border-status-waiting/40 bg-status-waiting/10",
      l: "rejected",
    },
    error: {
      i: AlertOctagon,
      t: "text-status-error border-status-error/40 bg-status-error/10",
      l: "error",
    },
  } as const;
  const m = map[outcome];
  const I = m.i;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border", m.t)}
    >
      <I className="size-3" /> {m.l}
    </span>
  );
}

function fmtDur(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

/* ----- trace drawer ----- */

function TraceDrawer({
  run,
  agentColor,
  onClose,
}: {
  run: AgentRun;
  agentColor: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] h-full glass-panel rounded-none border-l border-primary/30 overflow-y-auto scrollbar-thin anim-in"
        style={{ animation: "slide-in-down 0.25s ease-out both" }}
      >
        <div className="p-5 border-b border-border sticky top-0 bg-panel/90 backdrop-blur z-10">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                run trace
              </div>
              <div className="font-mono text-sm truncate">{run.id}</div>
            </div>
            <button
              onClick={onClose}
              className="size-8 rounded grid place-items-center hover:bg-white/5 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-mono">
            <span className="border border-border rounded px-1.5 py-0.5">
              ticket · <span className="text-foreground">{run.ticketId}</span>
            </span>
            <span className="border border-border rounded px-1.5 py-0.5">
              duration · {fmtDur(run.durationMs)}
            </span>
            <span className="border border-border rounded px-1.5 py-0.5">
              {run.tokens.toLocaleString()} tokens
            </span>
            <span className="border border-border rounded px-1.5 py-0.5">{run.model}</span>
            <OutcomePill outcome={run.outcome} />
          </div>
        </div>

        <div className="p-5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">
            step tree
          </div>
          <div className="space-y-1.5">
            {run.trace.map((s) => (
              <Step key={s.id} step={s} color={agentColor} depth={0} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ step, color, depth }: { step: RunStep; color: string; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasKids = !!step.children?.length;
  const Toggle = open ? ChevronDown : ChevronRight;
  return (
    <div
      className="border-l-2"
      style={{ borderColor: `color-mix(in oklab, ${color} 35%, transparent)`, paddingLeft: 10 }}
    >
      <button
        onClick={() => (hasKids || step.input || step.output) && setOpen(!open)}
        className="w-full text-left flex items-center gap-1.5 py-1.5 rounded hover:bg-white/[0.03] cursor-pointer"
      >
        <Toggle className="size-3 text-muted-foreground shrink-0" />
        <span className="text-[13px] text-foreground/90 truncate">{step.name}</span>
        {step.tool && (
          <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1">
            {step.tool}
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono text-muted-foreground shrink-0">
          {fmtDur(step.durationMs)}
          {step.tokens ? ` · ${step.tokens.toLocaleString()}t` : ""}
        </span>
      </button>
      {open && (
        <div className="ml-2 mb-1.5 space-y-1">
          {step.input && (
            <div className="text-[11px] font-mono bg-white/[0.02] border border-border rounded p-2">
              <div className="text-muted-foreground mb-0.5">input</div>
              <div className="text-foreground/80 whitespace-pre-wrap">{step.input}</div>
            </div>
          )}
          {step.output && (
            <div className="text-[11px] font-mono bg-white/[0.02] border border-border rounded p-2">
              <div className="text-muted-foreground mb-0.5">output</div>
              <div className="text-foreground/80 whitespace-pre-wrap">{step.output}</div>
            </div>
          )}
          {hasKids && (
            <div className="space-y-1.5 mt-1.5">
              {step.children!.map((c) => (
                <Step key={c.id} step={c} color={color} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ----- overnight (dev only) ----- */

function OvernightPanel() {
  const rows = overnightHistory();
  const totalTickets = rows.reduce((s, r) => s + r.tickets, 0);
  const totalPRs = rows.reduce((s, r) => s + r.prs, 0);
  const totalGpu = rows.reduce((s, r) => s + r.gpuHours, 0).toFixed(1);
  const totalHeal = rows.reduce((s, r) => s + r.healerFixes, 0);

  return (
    <div className="glass-panel p-4 border-primary/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Moon className="size-4 text-primary" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              overnight
            </div>
            <div className="text-sm font-semibold">Ralph Wiggum loop · last 10 nights</div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">2×H200 · 22:00–06:00 UTC</div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <Summary
          icon={GitPullRequest}
          label="PRs opened"
          value={String(totalPRs)}
          tone="text-status-done"
        />
        <Summary
          icon={Activity}
          label="Tickets processed"
          value={String(totalTickets)}
          tone="text-foreground"
        />
        <Summary
          icon={Wrench}
          label="Healer fixes"
          value={String(totalHeal)}
          tone="text-status-waiting"
        />
        <Summary icon={Server} label="GPU hours" value={`${totalGpu}h`} tone="text-primary" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left py-1.5">night</th>
              <th className="text-left">tickets</th>
              <th className="text-left">PRs</th>
              <th className="text-left">tests passing</th>
              <th className="text-left">healer fixes</th>
              <th className="text-left">GPU hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.night} className="border-b border-border/40">
                <td className="py-1.5 text-muted-foreground">{r.night}</td>
                <td>{r.tickets}</td>
                <td className="text-status-done">{r.prs}</td>
                <td>{r.testsPass}</td>
                <td className="text-status-waiting">{r.healerFixes}</td>
                <td className="text-primary">{r.gpuHours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({
  icon: I,
  label,
  value,
  tone,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="border border-border rounded p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <I className="size-3" /> {label}
      </div>
      <div className={cn("text-lg font-semibold font-mono mt-0.5", tone)}>{value}</div>
    </div>
  );
}
