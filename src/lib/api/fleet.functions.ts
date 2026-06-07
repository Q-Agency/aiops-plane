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
} from "../gateway/ba-adapter.server";
import { COMPLETENESS_DIMS } from "../gateway/ba-adapter.server";

// The gateway seam: server functions the dashboard's "real" mode calls to get
// normalized, contract-shaped fleet data. Secrets + fetches stay server-side
// (the gateway/adapter modules are `.server.ts`).
//
// There's one adapter today (BA). When more agents exist, route by the system's
// kind to the right adapter here — that routing IS the gateway.
function adapterFor(_systemId: string) {
  return ba; // TODO: registry of adapters keyed by system kind
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
    // Scope by the selected project (aiops_project cookie), if any.
    let project: string | undefined;
    try {
      project = getCookie("aiops_project") || undefined;
    } catch {
      /* no request context */
    }
    return project ? runs.filter((r) => r.project?.id === project) : runs;
  });

/** Distinct projects across the fleet's runs → powers the project switcher. */
export const getProjectsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ id: string; name: string; count: number }[]> => {
    const systems = getSystems();
    const settled = await Promise.allSettled(systems.map((s) => adapterFor(s.id).getRuns(s)));
    const byId = new Map<string, { id: string; name: string; count: number }>();
    for (const res of settled) {
      if (res.status !== "fulfilled") continue;
      for (const r of res.value) {
        const p = r.project;
        if (!p?.id) continue;
        const e = byId.get(p.id) ?? { id: p.id, name: p.name || p.id, count: 0 };
        e.count += 1;
        byId.set(p.id, e);
      }
    }
    return [...byId.values()].sort((a, b) => b.count - a.count);
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
};

/** One round-trip for the real Command Center: fleet health + the lead agent's
 *  runs (project-scoped) + open gates + recent lifecycle events (resets, approvals)
 *  across the fleet. Used by the SSR loader for first paint and by the client's
 *  poll to keep the surface near-live. Best-effort: one slow or unreachable
 *  endpoint won't blank the others. */
export const getCommandCenterFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CommandCenterData> => {
    const systems = getSystems();
    const fleet = await getFleetHealthFn().catch(() => [] as AgentHealth[]);
    const first = fleet[0]?.agent_id;
    const [runs, approvals, eventsSettled] = await Promise.all([
      first ? getRunsFn({ data: { systemId: first } }).catch(() => []) : Promise.resolve([]),
      getApprovalsFn().catch(() => []),
      Promise.allSettled(systems.map((s) => adapterFor(s.id).getEvents(s))),
    ]);
    const events = eventsSettled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    return { fleet, runs, approvals, events };
  },
);

export type AgentDetailData = { agent: AgentHealth | null; runs: Run[]; approvals: HITLGate[] };

/** Everything the agent deep-dive needs for one agent: its health, its
 *  (project-scoped) runs, and its open gates. `agent` is null when the id isn't
 *  in the connected fleet. */
export const getAgentDetailFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ systemId: z.string() }))
  .handler(async ({ data }): Promise<AgentDetailData> => {
    const [fleet, runs, approvals] = await Promise.all([
      getFleetHealthFn().catch(() => [] as AgentHealth[]),
      getRunsFn({ data: { systemId: data.systemId } }).catch(() => []),
      getApprovalsFn().catch(() => []),
    ]);
    const agent = fleet.find((a) => a.agent_id === data.systemId) ?? null;
    const mine = approvals.filter(
      (g) => (g.metadata?.agent_id as string | undefined) === data.systemId,
    );
    return { agent, runs, approvals: mine };
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
