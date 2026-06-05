import { createFileRoute } from "@tanstack/react-router";

import { FlowRiver } from "@/components/command-center/FlowRiver";
import { KpiStrip } from "@/components/command-center/KpiStrip";
import { AgentStatusGrid } from "@/components/command-center/AgentStatusGrid";
import { ApprovalsQueue } from "@/components/command-center/ApprovalsQueue";
import { ActivityFeed } from "@/components/command-center/ActivityFeed";
import { RealCommandCenter } from "@/components/command-center/RealCommandCenter";
import { getApprovalsFn, getFleetHealthFn, getRunsFn } from "@/lib/api/fleet.functions";
import type { AgentHealth, HITLGate, Run } from "@/contract";

type CommandData =
  | { mode: "mock" }
  | { mode: "real"; fleet: AgentHealth[]; runs: Run[]; approvals: HITLGate[] };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center · Agency OS" },
      { name: "description", content: "Bird's-eye view of the AI agency pipeline." },
    ],
  }),
  // In "real" mode, fetch live fleet data through the gateway (SSR'd here, so the
  // empty/connected state renders server-side). "standard"/mock mode is untouched.
  loader: async ({ context }): Promise<CommandData> => {
    if (context.user?.dataMode !== "real") return { mode: "mock" };
    try {
      const fleet = await getFleetHealthFn();
      const first = fleet[0]?.agent_id;
      // best-effort: one unreachable agent/endpoint shouldn't blank the fleet
      const [runs, approvals] = await Promise.all([
        first ? getRunsFn({ data: { systemId: first } }).catch(() => []) : Promise.resolve([]),
        getApprovalsFn().catch(() => []),
      ]);
      return { mode: "real", fleet, runs, approvals };
    } catch {
      return { mode: "real", fleet: [], runs: [], approvals: [] };
    }
  },
  component: CommandCenter,
});

function CommandCenter() {
  const data = Route.useLoaderData();
  if (data.mode === "real") {
    return <RealCommandCenter fleet={data.fleet} runs={data.runs} approvals={data.approvals} />;
  }
  return <MockCommandCenter />;
}

function MockCommandCenter() {
  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4 lg:space-y-5 min-w-0">
        <FlowRiver />
        <KpiStrip />
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Roster</div>
              <div className="text-sm font-semibold">Agent status · last 7d acceptance</div>
            </div>
          </div>
          <AgentStatusGrid />
        </section>
      </div>
      <aside className="space-y-4 lg:space-y-5 xl:sticky xl:top-4 self-start min-w-0 flex flex-col">
        <ApprovalsQueue />
        <ActivityFeed />
      </aside>
    </div>
  );
}
