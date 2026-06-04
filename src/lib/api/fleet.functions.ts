import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AgentHealth, Run } from "@/contract";
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
    const results = await Promise.allSettled(
      systems.map((s) => adapterFor(s.id).getHealth(s)),
    );
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
    return adapterFor(system.id).getRuns(system);
  });
