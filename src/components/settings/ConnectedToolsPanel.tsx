/**
 * ConnectedToolsPanel — Settings "Connected tools & scopes": one row per
 * connector from connectors.ts with granted scopes, Live/Roadmap honesty
 * badge, last health check (static mock), and an inert "Review scopes"
 * popover listing every scope + the plain-language reason it was granted.
 * Standard (mock) experience only.
 */

import { Eye, Plug2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CONNECTORS, type Connector, type ConnectorId } from "@/mock/connectors";
import { cn } from "@/lib/utils";

/** Static, deterministic health seed (live connectors only) — no Date.now(). */
const HEALTH: Partial<Record<ConnectorId, { checked: string; state: "ok" | "degraded" }>> = {
  teamwork: { checked: "2m ago", state: "ok" },
  slack: { checked: "4m ago", state: "ok" },
  github: { checked: "1m ago", state: "ok" },
};

function LiveRoadmapBadge({ availability }: { availability: Connector["availability"] }) {
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border shrink-0",
        availability === "live"
          ? "border-status-done/50 bg-status-done/10 text-status-done"
          : "border-dashed border-border bg-white/5 text-muted-foreground",
      )}
    >
      {availability === "live" ? "Live" : "Roadmap"}
    </span>
  );
}

function ScopeChips({ connector }: { connector: Connector }) {
  if (connector.availability !== "live") {
    return (
      <span className="text-[11px] text-muted-foreground italic">
        requested at connect-time — not connected
      </span>
    );
  }
  const shown = connector.scopes.slice(0, 2);
  const rest = connector.scopes.length - shown.length;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 flex-wrap cursor-default">
            {shown.map((s) => (
              <span
                key={s.id}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground"
              >
                {s.label}
              </span>
            ))}
            {rest > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground">+{rest}</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs">
          Granted at connect-time · minimum required.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ReviewScopesButton({ connector }: { connector: Connector }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white/5 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <Eye className="size-3" />
          Review scopes
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="text-xs font-semibold mb-0.5">{connector.name} — scopes</div>
        <p className="text-[11px] text-muted-foreground mb-2">
          {connector.availability === "live"
            ? "Granted at connect-time · minimum required."
            : "Roadmap — these scopes would be requested at connect-time."}
        </p>
        <ul className="space-y-2">
          {connector.scopes.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 text-[9px] uppercase tracking-wider font-mono px-1 py-0.5 rounded border shrink-0",
                  s.access === "read"
                    ? "border-border text-muted-foreground"
                    : "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
                )}
              >
                {s.access}
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-foreground">{s.label}</span>
                <span className="block text-[11px] text-muted-foreground">{s.reason}</span>
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function ConnectedToolsPanel() {
  return (
    <section id="tools" className="glass-panel p-5 space-y-3 scroll-mt-24">
      <div className="flex items-center gap-2">
        <Plug2 className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Connected tools &amp; scopes</h2>
      </div>
      <p className="text-xs text-muted-foreground max-w-3xl">
        Connected-tool access is scoped to the minimum required and shown at connect-time.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              <th className="text-left px-2 py-2 font-medium">Tool</th>
              <th className="text-left px-2 py-2 font-medium">Status</th>
              <th className="text-left px-2 py-2 font-medium">Granted scopes</th>
              <th className="text-left px-2 py-2 font-medium">Last health check</th>
              <th className="text-right px-2 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {CONNECTORS.map((c) => {
              const health = HEALTH[c.id];
              return (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="px-2 py-2.5">
                    <span className="text-foreground font-medium">{c.name}</span>
                    <span className="ml-2 text-[10px] font-mono text-muted-foreground uppercase">
                      {c.category}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <LiveRoadmapBadge availability={c.availability} />
                  </td>
                  <td className="px-2 py-2.5">
                    <ScopeChips connector={c} />
                  </td>
                  <td className="px-2 py-2.5">
                    {health ? (
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            health.state === "ok" ? "bg-status-done" : "bg-status-waiting",
                          )}
                        />
                        <span className="text-foreground">{health.checked}</span>
                        <span className="text-muted-foreground">· {health.state}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <ReviewScopesButton connector={c} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
