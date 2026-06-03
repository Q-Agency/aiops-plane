import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { coreAgents, agents as allAgents } from "@/mock/agents";

export const Route = createFileRoute("/agents")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/agents" || location.pathname === "/agents/") {
      throw redirect({ to: "/agents/$agentId", params: { agentId: "ba" } });
    }
  },
  component: AgentsLayout,
});

function AgentsLayout() {
  return (
    <div className="h-full grid grid-cols-[220px_1fr] min-h-0">
      <aside className="border-r border-border p-3 overflow-y-auto scrollbar-thin">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2 px-2">agents</div>
        <div className="space-y-0.5">
          {allAgents.map((a) => (
            <AgentLink key={a.id} agentId={a.id} name={a.name} color={`var(--${a.color})`} role={a.role} isCore={coreAgents.some((c) => c.id === a.id)} />
          ))}
        </div>
      </aside>
      <main className="min-h-0 overflow-y-auto scrollbar-thin">
        <Outlet />
      </main>
    </div>
  );
}

function AgentLink({ agentId, name, color, role, isCore }: { agentId: string; name: string; color: string; role: string; isCore: boolean }) {
  // We need active state — use Link's activeProps
  return (
    <Link
      to="/agents/$agentId"
      params={{ agentId }}
      className="block px-2 py-2 rounded text-sm hover:bg-white/5 transition-colors"
      activeProps={{ className: "block px-2 py-2 rounded text-sm bg-primary/10 ring-1 ring-primary/30" }}
    >
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="font-medium truncate">{name}</span>
        {!isCore && <span className="ml-auto text-[9px] font-mono text-muted-foreground uppercase">sys</span>}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 pl-4">{role}</div>
    </Link>
  );
}
