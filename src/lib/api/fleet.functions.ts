import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import type { AgentEvent, AgentHealth, HITLGate, Run } from "@/contract";
import { getSystem, getSystems } from "../gateway/systems.server";
import * as ba from "../gateway/ba-adapter.server";
import type {
  AgentLogLine,
  CompletenessMap,
  SpecBase,
  SpecQuality,
  SpecReport,
} from "../gateway/ba-adapter.server";
import { COMPLETENESS_DIMS } from "../gateway/ba-adapter.server";
import { auditEnabled, auditStatus, listAuditLog, type AuditEntry } from "../db/audit.server";
import { ingestAuditOnce } from "../db/audit-sync.server";

// Re-export so client components can type the getSpecReportFn result without importing
// the `.server` module directly.
export type { SpecReport } from "../gateway/ba-adapter.server";

// The gateway seam: server functions the dashboard's "real" mode calls to get
// normalized, contract-shaped fleet data. Secrets + fetches stay server-side
// (the gateway/adapter modules are `.server.ts`).
//
// There's one adapter today (BA). When more agents exist, route by the system's
// kind to the right adapter here — that routing IS the gateway.
function adapterFor(_systemId: string) {
  return ba; // TODO: registry of adapters keyed by system kind
}

/** The selected project scope (`aiops_project` cookie). Keyed by project NAME — the one
 *  field present on runs, gates AND events (gates/events carry only a name, not an id), so
 *  the whole Command Center scopes consistently. undefined = all projects. */
function selectedProject(): string | undefined {
  try {
    return getCookie("aiops_project") || undefined;
  } catch {
    return undefined; // no request context (e.g. tests)
  }
}

/** Health of every registered agent → the fleet/agent-status surface. */
export const getFleetHealthFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AgentHealth[]> => {
    const systems = getSystems();
    const results = await Promise.allSettled(systems.map((s) => adapterFor(s.id).getHealth(s)));
    return results
      .filter((r): r is PromiseFulfilledResult<AgentHealth> => r.status === "fulfilled")
      .map((r) => r.value);
  },
);

/** Runs for one agent → the agent deep-dive / activity surfaces. */
export const getRunsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ systemId: z.string() }))
  .handler(async ({ data }): Promise<Run[]> => {
    const system = getSystem(data.systemId);
    if (!system) return [];
    const runs = await adapterFor(system.id).getRuns(system);
    const project = selectedProject();
    // Match by name (the cross-surface key); also accept a legacy id-keyed cookie.
    return project
      ? runs.filter((r) => r.project?.name === project || r.project?.id === project)
      : runs;
  });

/** Distinct projects across the fleet's runs → powers the project switcher. */
export const getProjectsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ id: string; name: string; count: number }[]> => {
    const systems = getSystems();
    const settled = await Promise.allSettled(systems.map((s) => adapterFor(s.id).getRuns(s)));
    const byName = new Map<string, { id: string; name: string; count: number }>();
    for (const res of settled) {
      if (res.status !== "fulfilled") continue;
      for (const r of res.value) {
        const name = r.project?.name?.trim();
        if (!name) continue;
        // Key by NAME so the switcher value matches runs/gates/events and same-named
        // projects merge (fixes the duplicate "Project Test" rows). `id` mirrors the key.
        const e = byName.get(name) ?? { id: name, name, count: 0 };
        e.count += 1;
        byName.set(name, e);
      }
    }
    return [...byName.values()].sort((a, b) => b.count - a.count);
  },
);

/** Open human gates across the fleet → the approvals queue. */
export const getApprovalsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<HITLGate[]> => {
    const systems = getSystems();
    const settled = await Promise.allSettled(systems.map((s) => adapterFor(s.id).getApprovals(s)));
    return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  },
);

export type CommandCenterData = {
  fleet: AgentHealth[];
  runs: Run[];
  approvals: HITLGate[];
  events: AgentEvent[];
  /** agent_id → per-run deep-observability URL template (e.g. a Flow Observer),
   *  advertised on each agent's card. Absent agents ship no deep tool → no link. */
  observability: Record<string, string>;
};

/** One round-trip for the real Command Center: a **per-project, whole-fleet rollup** —
 *  fleet health + every agent's runs + open gates + recent lifecycle events, all scoped
 *  to the selected project (`aiops_project`). Used by the SSR loader for first paint and
 *  the client poll. Best-effort: one slow/unreachable endpoint won't blank the others. */
export const getCommandCenterFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CommandCenterData> => {
    const systems = getSystems();
    const project = selectedProject();
    const inProject = (name?: string) => !project || name === project;

    const fleet = await getFleetHealthFn().catch(() => [] as AgentHealth[]);
    const [runsSettled, approvalsAll, eventsSettled, obsSettled] = await Promise.all([
      // ALL agents' runs (each already project-scoped inside getRunsFn) — the Command
      // Center sums the whole fleet for the selected project, not just the lead agent.
      Promise.allSettled(systems.map((s) => getRunsFn({ data: { systemId: s.id } }))),
      getApprovalsFn().catch(() => []),
      Promise.allSettled(systems.map((s) => adapterFor(s.id).getEvents(s))),
      Promise.allSettled(
        systems.map(
          async (s) => [s.id, await adapterFor(s.id).getObservabilityTemplate(s)] as const,
        ),
      ),
    ]);
    // (`r.value` is typed `unknown` by the server-fn return-serialization inference; it's
    //  Run[] at runtime.)
    const runs: Run[] = runsSettled
      .flatMap((r) => (r.status === "fulfilled" ? (r.value as Run[]) : []))
      .sort((a, b) => (a.started_at < b.started_at ? 1 : -1)); // newest-first across agents
    // Gates + events carry only a project NAME → scope them to the selected project too,
    // so the whole surface (KPIs, lifecycle flow, approvals) reflects one project.
    const approvals = approvalsAll.filter((g) =>
      inProject(g.metadata?.project_name as string | undefined),
    );
    const events = eventsSettled
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter((e) => inProject(e.data?.project_name as string | undefined));
    const observability: Record<string, string> = {};
    for (const r of obsSettled) {
      if (r.status === "fulfilled" && r.value[1]) observability[r.value[0]] = r.value[1];
    }
    return { fleet, runs, approvals, events, observability };
  },
);

// Re-export so client components can type the audit list/status without importing .server.
export type { AuditEntry, AuditStatus } from "../db/audit.server";

/** Live status of the dashboard's audit database (for the Settings page). Returns the
 *  non-secret URL + reachability/stats; the service-role key is never returned. */
export const getAuditStatusFn = createServerFn({ method: "GET" }).handler(() => auditStatus());

export type AuditData = { enabled: boolean; entries: AuditEntry[] };

/** The control-plane audit ledger. Ingests each agent's durable lifecycle events
 *  (reset / approve) into the dashboard's own Supabase (idempotently), then returns the
 *  ledger newest-first. No-op + empty when the audit DB isn't configured (env unset). */
export const getAuditFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuditData> => {
    if (!auditEnabled()) return { enabled: false, entries: [] };
    // Refresh on view (the server-side background loop also ingests independently). Failures
    // must not blank the view, so they're swallowed.
    await ingestAuditOnce().catch(() => 0);
    const entries = await listAuditLog(200).catch(() => [] as AuditEntry[]);
    return { enabled: true, entries };
  },
);

export type AgentDetailData = {
  agent: AgentHealth | null;
  runs: Run[];
  approvals: HITLGate[];
  /** this agent's per-run deep-observability URL template, if it advertises one */
  observability?: string;
};

/** Everything the agent deep-dive needs for one agent: its health, its
 *  (project-scoped) runs, and its open gates. `agent` is null when the id isn't
 *  in the connected fleet. */
export const getAgentDetailFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ systemId: z.string() }))
  .handler(async ({ data }): Promise<AgentDetailData> => {
    const system = getSystem(data.systemId);
    const [fleet, runs, approvals, observability] = await Promise.all([
      getFleetHealthFn().catch(() => [] as AgentHealth[]),
      getRunsFn({ data: { systemId: data.systemId } }).catch(() => []),
      getApprovalsFn().catch(() => []),
      system
        ? adapterFor(data.systemId)
            .getObservabilityTemplate(system)
            .catch(() => undefined)
        : Promise.resolve(undefined),
    ]);
    const agent = fleet.find((a) => a.agent_id === data.systemId) ?? null;
    const mine = approvals.filter(
      (g) => (g.metadata?.agent_id as string | undefined) === data.systemId,
    );
    return { agent, runs, approvals: mine, observability };
  });

/** Live, READ-ONLY structural report for a spec's CURRENT state (AC/EARS detail + lint
 *  warnings, from the agent's own read endpoints). Null if the agent has no such session
 *  / endpoints — the run drawer just hides the section then. */
export const getSpecReportFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ systemId: z.string(), sessionId: z.string() }))
  .handler(async ({ data }): Promise<SpecReport | null> => {
    const system = getSystem(data.systemId);
    if (!system) return null;
    return adapterFor(data.systemId)
      .getSpecReport(system, data.sessionId)
      .catch(() => null);
  });

// --- Unit economics -----------------------------------------------------------

export type EconomicsBucket = { key: string; runs: number; cost: number; tokens: number };
export type EconomicsData = {
  totals: { runs: number; succeeded: number; cost: number; tokensIn: number; tokensOut: number };
  byModel: EconomicsBucket[];
  byProject: EconomicsBucket[];
  byDay: { day: string; cost: number; runs: number }[];
};

const DAY_MS = 86_400_000;

function aggregateEconomics(runs: Run[]): EconomicsData {
  const totals = { runs: runs.length, succeeded: 0, cost: 0, tokensIn: 0, tokensOut: 0 };
  const model = new Map<string, EconomicsBucket>();
  const project = new Map<string, EconomicsBucket>();
  const bump = (m: Map<string, EconomicsBucket>, key: string, r: Run) => {
    const b = m.get(key) ?? { key, runs: 0, cost: 0, tokens: 0 };
    b.runs += 1;
    b.cost += r.cost_usd ?? 0;
    b.tokens += (r.tokens_in ?? 0) + (r.tokens_out ?? 0);
    m.set(key, b);
  };
  for (const r of runs) {
    if (r.status === "succeeded") totals.succeeded += 1;
    totals.cost += r.cost_usd ?? 0;
    totals.tokensIn += r.tokens_in ?? 0;
    totals.tokensOut += r.tokens_out ?? 0;
    bump(model, r.model ?? "unknown", r);
    if (r.project?.name) bump(project, r.project.name, r);
  }

  // 14-day window anchored to the latest run (deterministic — no Date.now()).
  const times = runs.map((r) => Date.parse(r.started_at)).filter((n) => !Number.isNaN(n));
  let byDay: EconomicsData["byDay"] = [];
  if (times.length) {
    const end = Math.floor(Math.max(...times) / DAY_MS);
    const days = new Map<number, { cost: number; runs: number }>();
    for (let i = 0; i < 14; i++) days.set(end - i, { cost: 0, runs: 0 });
    for (const r of runs) {
      const t = Date.parse(r.started_at);
      if (Number.isNaN(t)) continue;
      const d = days.get(Math.floor(t / DAY_MS));
      if (d) {
        d.runs += 1;
        d.cost += r.cost_usd ?? 0;
      }
    }
    byDay = [...days.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([d, v]) => ({
        day: new Date(d * DAY_MS).toISOString().slice(5, 10),
        cost: +v.cost.toFixed(4),
        runs: v.runs,
      }));
  }

  const round = (b: EconomicsBucket): EconomicsBucket => ({ ...b, cost: +b.cost.toFixed(4) });
  return {
    totals: { ...totals, cost: +totals.cost.toFixed(4) },
    byModel: [...model.values()].map(round).sort((a, b) => b.cost - a.cost),
    byProject: [...project.values()].map(round).sort((a, b) => b.cost - a.cost),
    byDay,
  };
}

/** Cross-project unit economics across the whole fleet (NOT project-scoped — the
 *  point is to compare projects/models). Aggregated server-side from runs. */
export const getEconomicsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<EconomicsData> => {
    const systems = getSystems();
    const settled = await Promise.allSettled(systems.map((s) => adapterFor(s.id).getRuns(s)));
    const runs = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    return aggregateEconomics(runs);
  },
);

// --- Flow analytics: SDLC flow efficiency (compute vs rework, churn) -----------

export type FlowBucket = { key: string; count: number; ms: number };
export type FlowSession = {
  title: string;
  turns: number;
  firstTryMs: number;
  reworkMs: number;
  totalMs: number;
  reworkBound: boolean;
};
export type FlowTrailRow = { ts: string; stage: string; title: string; project: string };
export type FlowTrendPoint = { bucket: string; completeness: number; runs: number };
export type FlowTotals = {
  runs: number;
  succeeded: number;
  sessions: number;
  /** compute split: first-attempt compute vs compute burned on retries+failures */
  firstTryPct: number;
  reworkPct: number;
  avgTurns: number;
  maxTurns: number;
  avgSessionMs: number;
  /** finalize_method-based: how often the agent nails it on attempt #1 */
  firstTryRate: number | null;
  firstTryCount: number;
  finalizeDenom: number;
  successRate: number;
  p50Ms: number | null;
  p95Ms: number | null;
  /** human churn at the one real (Spec) gate, from the recent lifecycle-event window */
  resets: number;
  approvals: number;
  openGate: number;
  eventsWindowed: boolean;
  /** the one quality field with real history (metadata.completeness_after) */
  avgCompleteness: number | null;
  completenessN: number;
};
export type FlowAnalyticsData = {
  totals: FlowTotals;
  durationHist: { bucket: string; count: number }[];
  byFinalize: FlowBucket[];
  sessions: FlowSession[];
  trail: FlowTrailRow[];
  completenessTrend: FlowTrendPoint[];
};

const WEEK_MS = 7 * DAY_MS;
const flowNum = (v: unknown): number | undefined =>
  typeof v === "number" && !Number.isNaN(v) ? v : undefined;
const flowStr = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
function percentile(sortedAsc: number[], p: number): number | null {
  if (!sortedAsc.length) return null;
  return sortedAsc[Math.floor(p * (sortedAsc.length - 1))];
}

/** Pure, server-side flow aggregation. Honest by construction: every output rides on a
 *  populated field (duration_ms, run_number, finalize_method, completeness_after) or the
 *  recent reset/approve event window — no per-stage clocks or approver identity (absent). */
function aggregateFlow(runs: Run[], events: AgentEvent[], openGate: number): FlowAnalyticsData {
  const total = runs.length;
  let succeeded = 0;
  let firstTryComputeMs = 0;
  let totalComputeMs = 0;
  let firstTryCount = 0;
  let finalizeDenom = 0;
  const durations: number[] = [];
  const finalize = new Map<string, FlowBucket>();
  const sessions = new Map<
    string,
    { title: string; totalMs: number; firstTryMs: number; maxRunNo: number; count: number }
  >();

  for (const r of runs) {
    if (r.status === "succeeded") succeeded += 1;
    // Compute / rework / session metrics use SUCCEEDED runs only — a failed run's duration
    // is wall-time-to-failure (can be a multi-hour hang), not representative agent compute,
    // and a handful would dominate the totals. Failures are surfaced via the success rate.
    if (r.status !== "succeeded") continue;
    const dur = flowNum(r.duration_ms) ?? 0;
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    const runNo = flowNum(meta.run_number) ?? 1;
    totalComputeMs += dur;
    // First-attempt compute = every run_number==1 (a reset restarts the chain at #1, so a
    // title has many run #1s); rework = everything spent on turns 2+. Same definition feeds
    // the headline split and the per-session bars.
    if (runNo === 1) firstTryComputeMs += dur;
    if (dur > 0) durations.push(dur);

    // finalize_method rides in metadata; the v0.5 spec facet also carries it.
    const facet = r.artifact?.facet;
    const fm =
      flowStr(meta.finalize_method) ??
      (facet && facet.kind === "spec" ? flowStr(facet.finalize_method) : undefined);
    if (fm) {
      finalizeDenom += 1;
      if (fm === "first_try") firstTryCount += 1;
      const b = finalize.get(fm) ?? { key: fm, count: 0, ms: 0 };
      b.count += 1;
      b.ms += dur;
      finalize.set(fm, b);
    }

    // Session identity is work_item_title (the bulk-history key; work_item.id is rare).
    const title = r.work_item_title || r.work_item?.title || "(untitled)";
    const s = sessions.get(title) ?? { title, totalMs: 0, firstTryMs: 0, maxRunNo: 0, count: 0 };
    s.totalMs += dur;
    s.count += 1;
    s.maxRunNo = Math.max(s.maxRunNo, runNo);
    if (runNo === 1) s.firstTryMs += dur; // sum first-attempt compute (consistent w/ headline)
    sessions.set(title, s);
  }

  const sortedDur = [...durations].sort((a, b) => a - b);
  const reworkComputeMs = Math.max(0, totalComputeMs - firstTryComputeMs);
  const reworkPct = totalComputeMs ? Math.round((reworkComputeMs / totalComputeMs) * 100) : 0;

  const sessionList = [...sessions.values()].map((s) => {
    const reworkMs = Math.max(0, s.totalMs - s.firstTryMs);
    return {
      title: s.title,
      turns: s.maxRunNo > 0 ? s.maxRunNo : s.count,
      firstTryMs: Math.round(s.firstTryMs),
      reworkMs: Math.round(reworkMs),
      totalMs: Math.round(s.totalMs),
      reworkBound: reworkMs > s.firstTryMs,
    };
  });
  const sCount = sessionList.length;
  const avgSessionMs = sCount
    ? Math.round(sessionList.reduce((a, s) => a + s.totalMs, 0) / sCount)
    : 0;
  const avgTurns = sCount ? +(sessionList.reduce((a, s) => a + s.turns, 0) / sCount).toFixed(1) : 0;
  const maxTurns = sessionList.reduce((a, s) => Math.max(a, s.turns), 0);

  // Reset / approve churn at the one real gate (recent lifecycle-event window).
  const lc = events.filter((e) => e.type === "lifecycle.changed");
  const resets = lc.filter((e) => e.data?.stage === "reset").length;
  const approvals = lc.filter((e) => e.data?.stage === "approved").length;
  const trail: FlowTrailRow[] = lc
    .slice()
    .sort((a, b) => (String(a.ts) < String(b.ts) ? 1 : -1))
    .slice(0, 12)
    .map((e) => ({
      ts: e.ts,
      stage: flowStr(e.data?.stage) ?? "",
      title: flowStr(e.data?.work_item_title) ?? "",
      project: flowStr(e.data?.project_name) ?? "",
    }));

  // Per-run compute distribution (median/p95, not mean — failed-run outliers).
  const histDefs = [
    { label: "<30s", lo: 0, hi: 30 },
    { label: "30–60s", lo: 30, hi: 60 },
    { label: "1–2m", lo: 60, hi: 120 },
    { label: "2–5m", lo: 120, hi: 300 },
    { label: "5m+", lo: 300, hi: Infinity },
  ];
  const durationHist = histDefs.map((d) => ({ bucket: d.label, count: 0 }));
  for (const ms of durations) {
    const s = ms / 1000;
    const idx = histDefs.findIndex((d) => s >= d.lo && s < d.hi);
    if (idx >= 0) durationHist[idx].count += 1;
  }

  // The one quality series with real history: metadata.completeness_after (6-dim avg).
  const compRuns = runs
    .map((r) => {
      const c = (r.metadata as Record<string, unknown> | undefined)?.completeness_after;
      if (!c || typeof c !== "object") return null;
      const map = c as Record<string, unknown>;
      const vals = COMPLETENESS_DIMS.map((d) => flowNum(map[d]) ?? 0);
      const t = Date.parse(r.started_at);
      return Number.isNaN(t) ? null : { t, avg: vals.reduce((a, v) => a + v, 0) / vals.length };
    })
    .filter((x): x is { t: number; avg: number } => x !== null);

  let completenessTrend: FlowTrendPoint[] = [];
  if (compRuns.length) {
    const weeks = new Map<number, { sum: number; n: number }>();
    for (const r of compRuns) {
      const w = Math.floor(r.t / WEEK_MS); // bucket key from run times only (SSR-deterministic)
      const b = weeks.get(w) ?? { sum: 0, n: 0 };
      b.sum += r.avg;
      b.n += 1;
      weeks.set(w, b);
    }
    const pts = [...weeks.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([w, v]) => ({
        bucket: new Date(w * WEEK_MS).toISOString().slice(0, 10),
        completeness: Math.round(v.sum / v.n),
        runs: v.n,
      }));
    // Only a TREND if there's real signal; otherwise the view shows a single KPI instead.
    if (compRuns.length >= 8 && pts.length >= 3) completenessTrend = pts;
  }
  const avgCompleteness = compRuns.length
    ? Math.round(compRuns.reduce((a, r) => a + r.avg, 0) / compRuns.length)
    : null;

  return {
    totals: {
      runs: total,
      succeeded,
      sessions: sCount,
      firstTryPct: 100 - reworkPct,
      reworkPct,
      avgTurns,
      maxTurns,
      avgSessionMs,
      firstTryRate: finalizeDenom ? Math.round((firstTryCount / finalizeDenom) * 100) : null,
      firstTryCount,
      finalizeDenom,
      successRate: total ? Math.round((succeeded / total) * 100) : 0,
      p50Ms: percentile(sortedDur, 0.5),
      p95Ms: percentile(sortedDur, 0.95),
      resets,
      approvals,
      openGate,
      eventsWindowed: true,
      avgCompleteness,
      completenessN: compRuns.length,
    },
    durationHist,
    byFinalize: [...finalize.values()]
      .map((b) => ({ ...b, ms: Math.round(b.ms) }))
      .sort((a, b) => b.count - a.count),
    sessions: sessionList.sort((a, b) => b.totalMs - a.totalMs).slice(0, 12),
    trail,
    completenessTrend,
  };
}

/** SDLC flow-efficiency analytics across the whole fleet (NOT project-scoped — mirrors
 *  unit economics). Aggregated server-side from runs + recent lifecycle events + open
 *  gates: compute-vs-rework, first-try rate, reset/approve churn, completeness trend. */
export const getFlowAnalyticsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<FlowAnalyticsData> => {
    const systems = getSystems();
    const [runsSettled, eventsSettled, gatesSettled] = await Promise.all([
      Promise.allSettled(systems.map((s) => adapterFor(s.id).getRuns(s))),
      Promise.allSettled(systems.map((s) => adapterFor(s.id).getEvents(s, 200))),
      Promise.allSettled(systems.map((s) => adapterFor(s.id).getApprovals(s))),
    ]);
    const runs = runsSettled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const events = eventsSettled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const gates = gatesSettled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const openGate = gates.filter((g) => g.kind === "approval" && g.state === "open").length;
    return aggregateFlow(runs, events, openGate);
  },
);

// --- Observability: health checks + recent logs -------------------------------

export type AgentDiagnostics = {
  agent: AgentHealth;
  checks: Record<string, string>;
  logs: AgentLogLine[];
};

/** Per-agent diagnostics for the Observability surface: contract health, the
 *  readiness sub-checks, and a snapshot of recent logs. */
export const getObservabilityFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AgentDiagnostics[]> => {
    const systems = getSystems();
    const results = await Promise.all(
      systems.map(async (s) => {
        const adapter = adapterFor(s.id);
        const [agent, checks, logs] = await Promise.all([
          adapter.getHealth(s).catch(() => null),
          adapter.getHealthChecks(s).catch(() => ({ healthy: false, checks: {} })),
          adapter.getLogs(s).catch(() => [] as AgentLogLine[]),
        ]);
        return agent ? { agent, checks: checks.checks, logs } : null;
      }),
    );
    return results.filter((r): r is AgentDiagnostics => r !== null);
  },
);

// --- Governance: spec quality -------------------------------------------------

export type GovernanceData = {
  specs: SpecQuality[];
  summary: {
    count: number;
    completeness: CompletenessMap;
    completeness_avg: number;
    judge_avg?: number;
    persona_avg?: number;
    ambiguities_total: number;
    ears_avg?: number;
    gwt_avg?: number;
  };
};

const ZERO_COMPLETENESS: CompletenessMap = {
  user_roles: 0,
  business_rules: 0,
  acceptance_criteria: 0,
  scope_boundaries: 0,
  error_handling: 0,
  data_model: 0,
};

function summarizeGovernance(specs: SpecQuality[]): GovernanceData["summary"] {
  const sum: CompletenessMap = { ...ZERO_COMPLETENESS };
  let compN = 0;
  let judgeSum = 0,
    judgeN = 0,
    personaSum = 0,
    personaN = 0,
    amb = 0,
    earsSum = 0,
    earsN = 0,
    gwtSum = 0,
    gwtN = 0;
  for (const s of specs) {
    if (s.completeness) {
      for (const d of COMPLETENESS_DIMS) sum[d] += Number(s.completeness[d] ?? 0);
      compN += 1;
    }
    if (s.judge_agreement != null) {
      judgeSum += s.judge_agreement;
      judgeN += 1;
    }
    if (s.persona_approval != null) {
      personaSum += s.persona_approval;
      personaN += 1;
    }
    amb += s.ambiguities;
    if (s.ears_coverage != null) {
      earsSum += s.ears_coverage;
      earsN += 1;
    }
    if (s.gwt_coverage != null) {
      gwtSum += s.gwt_coverage;
      gwtN += 1;
    }
  }
  const completeness: CompletenessMap = { ...ZERO_COMPLETENESS };
  for (const d of COMPLETENESS_DIMS) completeness[d] = compN ? Math.round(sum[d] / compN) : 0;
  const completeness_avg = compN
    ? Math.round(
        COMPLETENESS_DIMS.reduce((s, d) => s + completeness[d], 0) / COMPLETENESS_DIMS.length,
      )
    : 0;
  return {
    count: specs.length,
    completeness,
    completeness_avg,
    judge_avg: judgeN ? judgeSum / judgeN : undefined,
    persona_avg: personaN ? personaSum / personaN : undefined,
    ambiguities_total: amb,
    ears_avg: earsN ? earsSum / earsN : undefined,
    gwt_avg: gwtN ? gwtSum / gwtN : undefined,
  };
}

const GOVERNANCE_MAX_SPECS = 12;

/** Spec-quality governance across the fleet. Derives the most recent distinct
 *  sessions from runs (completeness rides on the runs already), then enriches
 *  each with lint + EARS/GWT coverage + judge/persona scores. Capped fan-out;
 *  loader-only (no polling) since each spec costs a few cheap reads. */
export const getGovernanceFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<GovernanceData> => {
    const systems = getSystems();
    const settled = await Promise.allSettled(
      systems.map((s) =>
        adapterFor(s.id)
          .getRuns(s)
          .then((runs) => ({ s, runs })),
      ),
    );
    const bases: { systemId: string; base: SpecBase }[] = [];
    const seen = new Set<string>();
    for (const res of settled) {
      if (res.status !== "fulfilled") continue;
      const { s, runs } = res.value; // /runs/all is newest-first
      for (const r of runs) {
        const sessionId = r.work_item_id;
        if (!sessionId) continue;
        const key = `${s.id}:${sessionId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        bases.push({
          systemId: s.id,
          base: {
            session_id: sessionId,
            title: r.work_item_title,
            project: r.project?.name,
            completeness: r.metadata?.completeness_after as CompletenessMap | undefined,
          },
        });
      }
    }
    const picked = bases.slice(0, GOVERNANCE_MAX_SPECS);
    const settledSpecs = await Promise.allSettled(
      picked.map(({ systemId, base }) => {
        const system = getSystem(systemId)!;
        return adapterFor(systemId).getSpecQuality(system, base);
      }),
    );
    const specs = settledSpecs
      .filter((r): r is PromiseFulfilledResult<SpecQuality> => r.status === "fulfilled")
      .map((r) => r.value);
    return { specs, summary: summarizeGovernance(specs) };
  },
);
