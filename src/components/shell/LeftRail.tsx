import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  KanbanSquare,
  GitBranch,
  Bot,
  Activity,
  CheckCircle2,
  Users,
  Scale,
  Database,
  DollarSign,
  Hourglass,
  Network,
  Megaphone,
  ShieldCheck,
  PlugZap,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/pipeline", label: "Pipeline Board", icon: KanbanSquare },
  { to: "/traceability", label: "Traceability", icon: GitBranch },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/pod", label: "Accountability", icon: Users },
  { to: "/governance", label: "Governance", icon: Scale },
  { to: "/knowledge", label: "Knowledge", icon: Database },
  { to: "/economics", label: "Unit Economics", icon: DollarSign },
  { to: "/flow", label: "Flow Analytics", icon: Hourglass },
  { to: "/orchestration", label: "Orchestration", icon: Network },
  { to: "/comms", label: "Comms & Escal.", icon: Megaphone },
  { to: "/compliance", label: "Compliance & Audit", icon: ShieldCheck },
  { to: "/observability", label: "Observability", icon: Activity },
  { to: "/approvals", label: "Approvals", icon: CheckCircle2 },
  { to: "/connections", label: "Connections", icon: PlugZap },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function LeftRail() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-border bg-panel/40 backdrop-blur-md flex flex-col transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="h-14 flex items-center px-3 border-b border-border">
        <div className="size-7 rounded-md bg-primary/20 border border-primary/40 grid place-items-center text-primary font-bold text-xs font-mono">
          AI
        </div>
        {!collapsed && (
          <div className="ml-2 leading-tight">
            <div className="text-sm font-semibold">Agency OS</div>
            <div className="text-[10px] text-muted-foreground font-mono">v0.4.2</div>
          </div>
        )}
      </div>

      <nav className="p-2 flex-1 space-y-0.5">
        {items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "group flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors relative",
                active
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-primary shadow-[0_0_8px_var(--primary)]" />
              )}
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{it.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="m-2 h-8 rounded-md border border-border bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 flex items-center justify-center cursor-pointer"
        aria-label="Toggle nav"
      >
        <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
