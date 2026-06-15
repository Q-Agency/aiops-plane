/**
 * Agent Detail Card - the decision surface before committing an agent
 * to the pod. Contract row (produces → consumes), contract-version +
 * conformance badges (the anti-lock-in signal), stat mini-tiles with the
 * live Agent sparkline where one exists, capabilities checklist, and a
 * primary Add/Remove footer. Gap context renders the inline one-click fix.
 */

import { ArrowRight, Bot, Check, Cpu, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { agents } from "@/mock/agents";
import { CHAIN_ROLES, formatLatency, missingInputsFor, artifactKindLabel, type ChainRoleId } from "@/mock/chain";
import { CATALOG } from "@/mock/catalog";
import { LlmTierMenu } from "@/components/agents/LlmTierMenu";
import type { LlmTier } from "@/mock/agent-config";
import { ROLE_SHORT, mix } from "./role-meta";

export interface AgentDetailDialogProps {
  roleId: ChainRoleId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current pod selection - drives Added state + gap context. */
  selectedIds: ChainRoleId[];
  /** Add/remove (parent owns state + toasts). */
  onToggle: (id: ChainRoleId, next: boolean) => void;
  /** Chosen LLM tier for this agent (wizard). */
  tier?: LlmTier;
  /** Setter - when provided, the mandatory LLM-tier menu renders (wizard). */
  onSetTier?: (id: ChainRoleId, tier: LlmTier) => void;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map(
      (v, i) =>
        `${((i / (data.length - 1)) * 100).toFixed(2)},${(26 - ((v - min) / range) * 22).toFixed(2)}`,
    )
    .join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-7" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        opacity={0.9}
      />
    </svg>
  );
}

function StatTile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-white/[0.03] px-2.5 py-2 min-w-0">
      <div className="text-[9px] uppercase tracking-wider font-mono text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-base mt-0.5 truncate">{value}</div>
      {children}
    </div>
  );
}

function ContractChip({ children, tone }: { children: React.ReactNode; tone: "neon" | "muted" }) {
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded border whitespace-nowrap",
        tone === "neon"
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-white/5 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function AgentDetailDialog({
  roleId,
  open,
  onOpenChange,
  selectedIds,
  onToggle,
  tier,
  onSetTier,
}: AgentDetailDialogProps) {
  const entry = roleId ? (CATALOG.find((c) => c.id === roleId) ?? null) : null;

  if (!entry) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Agent detail</DialogTitle>
            <DialogDescription className="sr-only">Unknown agent id.</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>Agent not found.</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const color = `var(--${entry.color})`;
  const added = selectedIds.includes(entry.id);
  const agent = entry.agentId ? agents.find((a) => a.id === entry.agentId) : undefined;
  const gaps = added ? missingInputsFor(selectedIds).filter((g) => g.roleId === entry.id) : [];
  const certified = entry.conformance === "certified";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto scrollbar-thin">
        <TooltipProvider delayDuration={150}>
          <DialogHeader>
            <div className="flex items-start gap-3 pr-6">
              <div
                className="size-10 rounded-md grid place-items-center shrink-0 border"
                style={{
                  color,
                  borderColor: mix(color, 45),
                  background: mix(color, 12),
                  boxShadow: `0 0 12px ${mix(color, 25)}`,
                }}
              >
                <Bot className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                  <span style={{ color }}>{entry.name}</span>
                  <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground font-normal">
                    {entry.engine}
                  </span>
                  {added && (
                    <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-done/50 bg-status-done/10 text-status-done font-normal">
                      Added
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">{entry.roleLine}</DialogDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[10px] uppercase tracking-wider font-mono font-normal",
                  entry.availability === "live"
                    ? "border-status-done/50 bg-status-done/10 text-status-done"
                    : "border-border bg-white/5 text-muted-foreground",
                )}
              >
                {entry.availability === "live" ? "Live" : "Roadmap"}
              </Badge>
            </div>
          </DialogHeader>

          {entry.availability === "roadmap" && (
            <div className="rounded-md border border-border bg-white/[0.03] px-3 py-2 text-[11px] text-muted-foreground">
              Planned - in the catalog now, runs when this agent ships.
            </div>
          )}

          {/* Contract row */}
          <div className="rounded-md border border-border bg-panel/40 p-3">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Contract
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
                  {entry.contractVersion}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border cursor-default",
                        certified
                          ? "border-status-done/50 bg-status-done/10 text-status-done"
                          : "border-status-waiting/50 bg-status-waiting/10 text-status-waiting",
                      )}
                    >
                      {certified ? "Certified" : "Partial"}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64 text-[11px]">
                    Validated deterministically against {entry.contractVersion} - no LLM in the
                    loop.
                  </TooltipContent>
                </Tooltip>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Produces
              </span>
              <ContractChip tone="neon">{artifactKindLabel(entry.produces)}</ContractChip>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Consumes
              </span>
              {entry.consumes.length === 0 ? (
                <span className="text-[11px] text-muted-foreground italic">
                  {entry.podWide ? "pod-wide peer - feeds every agent" : "nothing - entry point"}
                </span>
              ) : (
                entry.consumes.map((c) => (
                  <ContractChip key={c} tone="muted">
                    {artifactKindLabel(c)}
                  </ContractChip>
                ))
              )}
            </div>
            {gaps.length > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-border flex flex-wrap items-center gap-2">
                {gaps.map((gap) => (
                  <span
                    key={gap.missing}
                    className="flex flex-wrap items-center gap-1.5 text-[11px] text-status-waiting"
                  >
                    Consumes {artifactKindLabel(gap.missing)} -{" "}
                    {gap.fixRoleId
                      ? `add ${ROLE_SHORT[gap.fixRoleId]} to feed it.`
                      : "no producer in the catalog."}
                    {gap.fixRoleId && (
                      <button
                        type="button"
                        onClick={() => onToggle(gap.fixRoleId as ChainRoleId, true)}
                        className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting bg-status-waiting/20 text-status-waiting hover:bg-status-waiting/30 transition-colors flex items-center gap-0.5"
                      >
                        <Plus className="size-2.5" />
                        Add {ROLE_SHORT[gap.fixRoleId]}
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="~$/ticket" value={`$${entry.costPerTicketUsd.toFixed(2)}`} />
            <StatTile label="~latency p50" value={formatLatency(entry.latencyP50Min)} />
            <StatTile label="success rate" value={agent ? `${agent.successRate}%` : "-"}>
              {agent ? (
                <Sparkline data={agent.sparkline} color={color} />
              ) : (
                <div className="text-[9px] text-muted-foreground mt-1">
                  telemetry after first live run
                </div>
              )}
            </StatTile>
          </div>

          {/* Capabilities + summary */}
          <div>
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1.5">
              Capabilities
            </div>
            <ul className="space-y-1">
              {entry.capabilities.map((cap) => (
                <li key={cap} className="flex items-start gap-2 text-xs">
                  <Check className="size-3.5 mt-px shrink-0" style={{ color }} />
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />
          <p className="text-xs text-muted-foreground leading-relaxed">{entry.summary}</p>

          {/* Mandatory LLM tier - appears once the agent is in the pod (wizard) */}
          {onSetTier && added && (
            <div className="rounded-md border border-border bg-panel/40 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="size-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                  LLM tier
                </span>
                {tier ? (
                  <span className="ml-auto text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-done/50 bg-status-done/10 text-status-done">
                    Set
                  </span>
                ) : (
                  <span className="ml-auto text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting">
                    Required - choose one
                  </span>
                )}
              </div>
              <LlmTierMenu
                value={tier ?? null}
                onChange={(t) => onSetTier(entry.id, t)}
                size="sm"
              />
              <p className="mt-2 text-[10px] text-muted-foreground/80">
                Cost vs capability vs data-residency - set per agent. Change it any time on the
                agent's profile; the exact model is overridable there.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {added ? (
              <Button
                variant="outline"
                onClick={() => onToggle(entry.id, false)}
                className="border-status-error/40 text-status-error hover:bg-status-error/10 hover:text-status-error"
              >
                <Minus className="size-4" />
                Remove from pod
              </Button>
            ) : (
              <Button
                onClick={() => onToggle(entry.id, true)}
                style={{ boxShadow: `0 0 14px ${mix(color, 35)}` }}
              >
                <Plus className="size-4" />
                Add to pod
              </Button>
            )}
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
