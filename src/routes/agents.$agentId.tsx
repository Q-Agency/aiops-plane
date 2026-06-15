import { createFileRoute, notFound } from "@tanstack/react-router";
import { agents as allAgents } from "@/mock/agents";
import { AgentProfile } from "@/components/agents/AgentProfile";
import { RealAgentDeepDive } from "@/components/agents/RealAgentDeepDive";
import { getAgentDetailFn, type AgentDetailData } from "@/lib/api/fleet.functions";

export const Route = createFileRoute("/agents/$agentId")({
  loader: async ({ params, context }) => {
    // Real mode: federate this agent's live detail (health + runs + gates).
    if (context.user?.dataMode === "real") {
      const detail = await getAgentDetailFn({ data: { systemId: params.agentId } }).catch(
        (): AgentDetailData => ({ agent: null, runs: [], approvals: [] }),
      );
      return { mode: "real" as const, systemId: params.agentId, detail };
    }
    const agent = allAgents.find((a) => a.id === params.agentId);
    if (!agent) throw notFound();
    return { mode: "mock" as const, agent };
  },
  component: AgentDeepDive,
});

// The mock profile (PM-operable: model/tools/owner/autonomy + telemetry)
// lives in components/agents/AgentProfile.tsx - extracted 2026-06-12 so the
// real branch below stays untouched by mock work.
function AgentDeepDive() {
  const data = Route.useLoaderData();
  if (data.mode === "real") {
    return <RealAgentDeepDive systemId={data.systemId} initial={data.detail} />;
  }
  return <AgentProfile agent={data.agent} />;
}
