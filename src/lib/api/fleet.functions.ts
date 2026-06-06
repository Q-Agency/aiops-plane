import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import type { AgentHealth, HITLGate, Run } from "@/contract";
import { getSystem, getSystems } from "../gateway/systems.server";
import * as ba from "../gateway/ba-adapter.server";

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

export type CommandCenterData = { fleet: AgentHealth[]; runs: Run[]; approvals: HITLGate[] };

/** One round-trip for the real Command Center: fleet health + the lead agent's
 *  runs (project-scoped) + open gates. Used by the SSR loader for first paint and
 *  by the client's poll to keep the surface near-live. Best-effort: one slow or
 *  unreachable endpoint won't blank the others. */
export const getCommandCenterFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CommandCenterData> => {
    const fleet = await getFleetHealthFn().catch(() => [] as AgentHealth[]);
    const first = fleet[0]?.agent_id;
    const [runs, approvals] = await Promise.all([
      first ? getRunsFn({ data: { systemId: first } }).catch(() => []) : Promise.resolve([]),
      getApprovalsFn().catch(() => []),
    ]);
    return { fleet, runs, approvals };
  },
);
