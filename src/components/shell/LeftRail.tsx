import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, ChevronLeft, Presentation } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { isMock } from "@/lib/experience";
import { isReadOnlyViewRole, useViewRole } from "@/mock/view-role";
import type { AppUser } from "@/lib/auth/types";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BrandMark } from "./BrandMark";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV, SETTINGS_ITEM, navBadgeCount, type NavGroup, type NavItem } from "./nav";

function RailLink({
  item,
  collapsed,
  pathname,
  hideBadge,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  /** Real-mode: badge counts are fed by mock data - never render them. */
  hideBadge?: boolean;
}) {
  const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(`${item.to}/`));
  const count = !hideBadge && item.badgeKey ? navBadgeCount(item.badgeKey) : 0;
  const Icon = item.icon;

  const link = (
    <Link
      to={item.to}
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
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.tag && (
        <span className="ml-auto text-[9px] font-mono px-1 py-px rounded border border-primary/40 bg-primary/10 text-primary leading-none tracking-wider">
          {item.tag}
        </span>
      )}
      {!collapsed && count > 0 && (
        <Badge
          variant="outline"
          className="ml-auto h-4 min-w-4 px-1 py-0 justify-center rounded border-primary/40 bg-primary/10 text-primary text-[10px] font-mono leading-none shadow-[0_0_8px_var(--primary)]"
        >
          {count}
        </Badge>
      )}
      {collapsed && count > 0 && (
        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
      )}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.label}
        {count > 0 ? ` · ${count}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

function PitchLink({ collapsed }: { collapsed: boolean }) {
  const link = (
    <a
      href="/pitch"
      target="_blank"
      rel="noopener"
      data-test="nav-pitch"
      className="group flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-white/5"
    >
      <Presentation className="size-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate">Product brief</span>
          <ArrowUpRight className="ml-auto size-3 shrink-0 opacity-50 group-hover:opacity-100" />
        </>
      )}
    </a>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">Product brief - opens in a new tab</TooltipContent>
    </Tooltip>
  );
}

export function LeftRail({ user }: { user: AppUser }) {
  const [collapsed, setCollapsed] = useState(false);
  // Open by default so the ADVANCED · technical surfaces are never missed.
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // EXPERIENCE GATE: real-mode accounts see ONLY live-connected destinations -
  // mock-fed items (and any group left empty) disappear; badges are mock-fed
  // so they are suppressed wholesale.
  const isReal = !isMock(user);
  // ROLES (additive, mock-only, AFTER the experience gate): when the PM is
  // viewing as a read-only persona (sponsor/viewer), trim the rail to the
  // MONITOR read surfaces (+ Settings below) and hide actionable badges.
  // Real-mode logic is untouched.
  const { role: viewRole } = useViewRole();
  const readOnlyView = !isReal && isReadOnlyViewRole(viewRole);
  const hideBadges = isReal || readOnlyView;
  const groups = useMemo<NavGroup[]>(() => {
    if (isReal) {
      return NAV.map((g) => ({ ...g, items: g.items.filter((it) => it.live === true) })).filter(
        (g) => g.items.length > 0,
      );
    }
    if (readOnlyView) return NAV.filter((g) => g.pillar === "MONITOR");
    // Demo: drop live-only-by-design destinations (e.g. the Connections hub -
    // the wizard owns tool-connecting in the demo story).
    return NAV.map((g) => ({ ...g, items: g.items.filter((it) => !it.mockHidden) })).filter(
      (g) => g.items.length > 0,
    );
  }, [isReal, readOnlyView]);

  // ⌘B / Ctrl+B toggles the rail (client-only listener - SSR-safe).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "shrink-0 border-r border-border bg-panel/40 backdrop-blur-md flex flex-col transition-[width] duration-200",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <div className="h-14 flex items-center px-3 border-b border-border shrink-0">
          <BrandMark className="size-7" />
          {!collapsed && (
            <div className="ml-2 leading-tight">
              <div className="text-sm font-semibold">AI PodOps</div>
              <div className="text-[10px] text-muted-foreground font-mono">v0.4.2</div>
            </div>
          )}
        </div>

        {/* read-only persona chip - under the brand (view-as sponsor/viewer) */}
        {readOnlyView && (
          <div className={cn("pt-2 shrink-0", collapsed ? "grid place-items-center" : "px-3")}>
            <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
              {collapsed ? "RO" : "VIEW-ONLY"}
            </span>
          </div>
        )}

        <nav className="p-2 flex-1 overflow-y-auto scrollbar-thin">
          {groups.map((group, i) =>
            group.pillar === "ADVANCED" ? (
              <Collapsible key={group.pillar} open={advancedOpen} onOpenChange={setAdvancedOpen}>
                {collapsed ? (
                  <>
                    <Separator className="my-2" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CollapsibleTrigger
                          className="w-full flex items-center justify-center py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
                          aria-label="Toggle advanced section"
                        >
                          <ChevronDown
                            className={cn(
                              "size-3.5 transition-transform",
                              advancedOpen && "rotate-180",
                            )}
                          />
                        </CollapsibleTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right">ADVANCED · technical</TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <CollapsibleTrigger className="w-full flex items-center justify-between text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground px-2.5 pt-3 pb-1 cursor-pointer transition-colors">
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn("size-3 transition-transform", advancedOpen && "rotate-180")}
                    />
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent className="space-y-0.5">
                  {group.items.map((item) => (
                    <RailLink
                      key={`${group.pillar}-${item.to}`}
                      item={item}
                      collapsed={collapsed}
                      pathname={pathname}
                      hideBadge={hideBadges}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div key={group.pillar}>
                {collapsed ? (
                  i > 0 && <Separator className="my-2" />
                ) : (
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground px-2.5 pt-3 pb-1">
                    {group.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <RailLink
                      key={`${group.pillar}-${item.to}`}
                      item={item}
                      collapsed={collapsed}
                      pathname={pathname}
                      hideBadge={hideBadges}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </nav>

        <div className="p-2 pt-0 shrink-0">
          <Separator className="mb-2" />
          {/* Product brief (/pitch) - the management buy-in pack that ships
              WITH the demo. Demo experience only; a plain anchor in a new
              tab (the brief is chrome-less/no-auth, and the presenter keeps
              the demo running). */}
          {!isReal && <PitchLink collapsed={collapsed} />}
          <RailLink
            item={SETTINGS_ITEM}
            collapsed={collapsed}
            pathname={pathname}
            hideBadge={hideBadges}
          />
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-2 w-full h-8 rounded-md border border-border bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 flex items-center justify-center cursor-pointer"
            aria-label="Toggle nav"
            title="Toggle nav (⌘B)"
          >
            <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
