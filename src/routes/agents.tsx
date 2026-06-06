import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { coreAgents, agents as allAgents } from "@/mock/agents";
import { getFleetHealthFn } from "@/lib/api/fleet.functions";
import type { AgentHealth, AgentState } from "@/contract";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agents")({
  beforeLoad: async ({ location, context }) => {
    if (location.pathname === "/agents" || location.pathname === "/agents/") {
      // Land on the first *connected* agent in real mode (BA by default).
      let agentId = "ba";
      if (context.user?.dataMode === "real") {
        const fleet = await getFleetHealthFn().catch(() => [] as AgentHealth[]);
        agentId = fleet[0]?.agent_id ?? "ba";
      }
      throw redirect({ to: "/agents/$agentId", params: { agentId } });
    }
  },
  loader: async ({ context }) => {
    if (context.user?.dataMode === "real") {
      const fleet = await getFleetHealthFn().catch(() => [] as AgentHealth[]);
      return { mode: "real" as const, fleet };
    }
    return { mode: "mock" as const };
  },
  component: AgentsLayout,
});

function AgentsLayout() {
  const data = Route.useLoaderData();
  return (
    <div className="h-full grid grid-cols-[220px_1fr] min-h-0">
      <aside className="border-r border-border p-3 overflow-y-auto scrollbar-thin">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2 px-2">
          agents
        </div>
        <div className="space-y-0.5">
          {data.mode === "real" ? (
            data.fleet.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-muted-foreground">
                No agents connected.
              </div>
            ) : (
              data.fleet.map((a) => <RealAgentLink key={a.agent_id} agent={a} />)
            )
          ) : (
            allAgents.map((a) => (
              <AgentLink
                key={a.id}
                agentId={a.id}
                name={a.name}
                color={`var(--${a.color})`}
                role={a.role}
                isCore={coreAgents.some((c) => c.id === a.id)}
              />
            ))
          )}
        </div>
      </aside>
      <main className="min-h-0 overflow-y-auto scrollbar-thin">
        <Outlet />
      </main>
    </div>
  );
}

const STATE_DOT: Record<AgentState, string> = {
  running: "bg-status-running dot-pulse",
  waiting: "bg-status-waiting",
  error: "bg-status-error",
  idle: "bg-status-idle",
};

function RealAgentLink({ agent }: { agent: AgentHealth }) {
  return (
    <Link
      to="/agents/$agentId"
      params={{ agentId: agent.agent_id }}
      className="block px-2 py-2 rounded text-sm hover:bg-white/5 transition-colors"
      activeProps={{
        className: "block px-2 py-2 rounded text-sm bg-primary/10 ring-1 ring-primary/30",
      }}
    >
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", STATE_DOT[agent.state])} />
        <span className="font-medium truncate">{agent.name}</span>
        <span className="ml-auto text-[9px] font-mono text-muted-foreground uppercase">
          {agent.state}
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 pl-4">
        {agent.role ?? agent.agent_id}
      </div>
    </Link>
  );
}

function AgentLink({
  agentId,
  name,
  color,
  role,
  isCore,
}: {
  agentId: string;
  name: string;
  color: string;
  role: string;
  isCore: boolean;
}) {
  return (
    <Link
      to="/agents/$agentId"
      params={{ agentId }}
      className="block px-2 py-2 rounded text-sm hover:bg-white/5 transition-colors"
      activeProps={{
        className: "block px-2 py-2 rounded text-sm bg-primary/10 ring-1 ring-primary/30",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
        <span className="font-medium truncate">{name}</span>
        {!isCore && (
          <span className="ml-auto text-[9px] font-mono text-muted-foreground uppercase">sys</span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 pl-4">{role}</div>
    </Link>
  );
}
