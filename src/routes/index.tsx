import { createFileRoute } from "@tanstack/react-router";

import { FlowRiver } from "@/components/command-center/FlowRiver";
import { KpiStrip } from "@/components/command-center/KpiStrip";
import { AgentStatusGrid } from "@/components/command-center/AgentStatusGrid";
import { ApprovalsQueue } from "@/components/command-center/ApprovalsQueue";
import { ActivityFeed } from "@/components/command-center/ActivityFeed";
import { RealCommandCenter } from "@/components/command-center/RealCommandCenter";
import { getCommandCenterFn } from "@/lib/api/fleet.functions";
import type { AgentEvent, AgentHealth, HITLGate, Run } from "@/contract";

type CommandData =
  | { mode: "mock" }
  | {
      mode: "real";
      fleet: AgentHealth[];
      runs: Run[];
      approvals: HITLGate[];
      events: AgentEvent[];
      observability: Record<string, string>;
    };

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
      const data = await getCommandCenterFn();
      return { mode: "real", ...data };
    } catch {
      return { mode: "real", fleet: [], runs: [], approvals: [], events: [], observability: {} };
    }
  },
  component: CommandCenter,
});

function CommandCenter() {
  const data = Route.useLoaderData();
  if (data.mode === "real") {
    return (
      <RealCommandCenter
        fleet={data.fleet}
        runs={data.runs}
        approvals={data.approvals}
        events={data.events}
        observability={data.observability}
      />
    );
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
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                Roster
              </div>
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
