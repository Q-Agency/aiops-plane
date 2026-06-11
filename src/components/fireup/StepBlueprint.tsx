/**
 * LAUNCH step 1 — Pod Blueprints (body only; chrome from WizardShell).
 * Four radio-style selectable cards (3 blueprints + Start from scratch,
 * D7) with a "what's included" stack — agent chips, connector chips
 * (live-first, Roadmap trailing as "Optional · Roadmap"), SLA + roles
 * lines — plus the tabbed pre-fill preview for the selected blueprint.
 * Selecting pre-fills the draft via usePods().updateDraft; switching a
 * customized draft asks before replacing downstream selections.
 */

import { useState } from "react";
import {
  Bot,
  Check,
  Clock,
  Globe,
  Layers,
  PencilRuler,
  Smartphone,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PIPELINE_ORDER, formatLatency, type ChainRoleId } from "@/mock/chain";
import { catalogEntry } from "@/mock/catalog";
import { connectorById, type ConnectorId } from "@/mock/connectors";
import { BLUEPRINTS, blueprintById, type PodBlueprint } from "@/mock/blueprints";
import { usePods } from "@/lib/pods/pod-store";
import { ROLE_SHORT, mix } from "./role-meta";

const BLUEPRINT_ICONS: Record<string, LucideIcon> = {
  Globe,
  Smartphone,
  Layers,
  Bot,
  Wrench,
  PencilRuler,
};

/** Catalog-ordered agent ids (knowledge last) for stable chip rows. */
function orderedAgentIds(ids: ChainRoleId[]): ChainRoleId[] {
  const order: ChainRoleId[] = [...PIPELINE_ORDER, "knowledge"];
  return order.filter((id) => ids.includes(id));
}

function AgentChip({ id }: { id: ChainRoleId }) {
  const color = `var(--${catalogEntry(id).color})`;
  return (
    <span
      className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border whitespace-nowrap"
      style={{ color, borderColor: mix(color, 45), background: mix(color, 10) }}
    >
      {ROLE_SHORT[id]}
    </span>
  );
}

function ConnectorChip({ id, optional }: { id: ConnectorId; optional?: boolean }) {
  const connector = connectorById(id);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border whitespace-nowrap flex items-center gap-1 cursor-default",
            optional
              ? "border-dashed border-border bg-white/[0.02] text-muted-foreground"
              : "border-status-done/40 bg-status-done/5 text-foreground/80",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              optional ? "bg-muted-foreground/50" : "bg-status-done",
            )}
          />
          {connector.name}
          {optional && <span className="text-muted-foreground/70">· Optional</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 text-[11px]">
        {optional
          ? `${connector.name} — Roadmap. Request access; the pod runs without it.`
          : `${connector.name} — Live. Connect it during launch.`}
      </TooltipContent>
    </Tooltip>
  );
}

function BlueprintCard({
  bp,
  selected,
  onSelect,
}: {
  bp: PodBlueprint;
  selected: boolean;
  onSelect: (bp: PodBlueprint) => void;
}) {
  const Icon = BLUEPRINT_ICONS[bp.icon] ?? Globe;
  const scratch = bp.id === "scratch";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(bp)}
      className={cn(
        "glass-panel hover-lift relative overflow-hidden p-4 text-left flex flex-col gap-3 transition-shadow",
        selected && "shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_30%,transparent)]",
      )}
      style={
        selected
          ? { borderColor: "color-mix(in oklab, var(--primary) 60%, transparent)" }
          : undefined
      }
    >
      {selected && (
        <>
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/50 bg-primary/15 text-primary">
            <Check className="size-2.5" />
            Selected
          </span>
        </>
      )}

      <div className="flex items-center gap-2.5 pr-16">
        <div
          className={cn(
            "size-9 rounded-md grid place-items-center border shrink-0",
            selected
              ? "border-primary/50 bg-primary/15 text-primary"
              : "border-border bg-white/5 text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">{bp.name}</div>
          {bp.popular && (
            <span className="text-[9px] uppercase tracking-wider font-mono text-primary">
              Most popular
            </span>
          )}
          {scratch && (
            <span className="text-[9px] uppercase tracking-wider font-mono text-muted-foreground">
              Full control
            </span>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">{bp.outcomeLine}</p>

      {/* What's included */}
      {scratch ? (
        <p className="text-[11px] text-muted-foreground italic flex-1">
          Nothing pre-filled — the agent, tool and people steps start empty, under your full
          control.
        </p>
      ) : (
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-wrap gap-1">
            {orderedAgentIds(bp.agentIds).map((id) => (
              <AgentChip key={id} id={id} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {bp.connectorIds.map((id) => (
              <ConnectorChip key={id} id={id} />
            ))}
            {bp.optionalConnectorIds.map((id) => (
              <ConnectorChip key={id} id={id} optional />
            ))}
          </div>
          <div className="flex items-start gap-1.5 text-[10px] font-mono text-muted-foreground">
            <Clock className="size-3 mt-px shrink-0" />
            <span>{bp.defaultSlaLine}</span>
          </div>
          <div className="flex items-start gap-1.5 text-[10px] font-mono text-muted-foreground">
            <Users className="size-3 mt-px shrink-0" />
            <span>{bp.recommendedRolesLine}</span>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
        {bp.meta}
      </div>
    </button>
  );
}

/** Tabbed pre-fill preview for the selected (non-scratch) blueprint. */
function BlueprintPreview({ bp }: { bp: PodBlueprint }) {
  const totalLatency = bp.agentIds.reduce((sum, id) => sum + catalogEntry(id).latencyP50Min, 0);

  return (
    <div className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-4 anim-in">
      <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-3">
        Pre-fill preview — what &ldquo;{bp.name}&rdquo; sets up
      </div>
      <Tabs defaultValue="agents">
        <TabsList className="mb-3">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="slas">SLAs &amp; roles</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-1.5">
          {orderedAgentIds(bp.agentIds).map((id) => {
            const entry = catalogEntry(id);
            const color = `var(--${entry.color})`;
            return (
              <div
                key={id}
                className="flex items-center gap-2.5 rounded-md border border-border bg-white/[0.02] px-2.5 py-1.5"
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                />
                <span className="text-xs font-medium" style={{ color }}>
                  {entry.name}
                </span>
                <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                  {entry.roleLine}
                </span>
                <span className="ml-auto flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
                    {entry.produces}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
                      entry.availability === "live"
                        ? "border-status-done/50 bg-status-done/10 text-status-done"
                        : "border-border bg-white/5 text-muted-foreground",
                    )}
                  >
                    {entry.availability === "live" ? "Live" : "Roadmap"}
                  </span>
                </span>
              </div>
            );
          })}
          <div className="text-[10px] font-mono text-muted-foreground pt-1">
            est. ~{formatLatency(totalLatency)} end-to-end · included in plan
          </div>
        </TabsContent>

        <TabsContent value="connectors" className="space-y-1.5">
          {[...bp.connectorIds, ...bp.optionalConnectorIds].map((id) => {
            const connector = connectorById(id);
            const optional = bp.optionalConnectorIds.includes(id);
            return (
              <div
                key={id}
                className="flex items-center gap-2.5 rounded-md border border-border bg-white/[0.02] px-2.5 py-1.5"
              >
                <span
                  className={cn(
                    "size-2 rounded-full shrink-0",
                    optional ? "bg-muted-foreground/50" : "bg-status-done",
                  )}
                />
                <span className="text-xs font-medium">{connector.name}</span>
                <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                  {connector.description}
                </span>
                <span
                  className={cn(
                    "ml-auto shrink-0 text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
                    optional
                      ? "border-dashed border-border bg-white/[0.02] text-muted-foreground"
                      : "border-status-done/50 bg-status-done/10 text-status-done",
                  )}
                >
                  {optional ? "Optional · Roadmap" : "Live"}
                </span>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="slas" className="space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <Clock className="size-3.5 mt-px text-muted-foreground shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Default SLAs
              </div>
              <div className="mt-0.5">{bp.defaultSlaLine}</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <Users className="size-3.5 mt-px text-muted-foreground shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Recommended accountable roles
              </div>
              <div className="mt-0.5">{bp.recommendedRolesLine}</div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Nothing here is locked in — every default can be adjusted in the next steps.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function StepBlueprint() {
  const { draft, updateDraft } = usePods();
  const selectedId = draft?.blueprintId ?? null;
  const selected = blueprintById(selectedId);
  const [pending, setPending] = useState<PodBlueprint | null>(null);

  const apply = (bp: PodBlueprint) => {
    updateDraft({
      blueprintId: bp.id,
      agentIds: [...bp.agentIds],
      connections: [],
      accountability: {},
    });
    toast.success(
      bp.id === "scratch"
        ? "Starting from scratch — pick your agents next."
        : `${bp.name} blueprint applied — agents and connector suggestions pre-filled.`,
    );
  };

  const handleSelect = (bp: PodBlueprint) => {
    if (!draft || bp.id === selectedId) return;
    const customized = draft.agentIds.length > 0 || draft.connections.length > 0;
    if (customized) setPending(bp);
    else apply(bp);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Start from a blueprint — pick a proven pod shape and adjust, or build from scratch.
        </p>

        <div
          role="radiogroup"
          aria-label="Pod blueprint"
          className="grid md:grid-cols-2 xl:grid-cols-4 gap-3"
        >
          {BLUEPRINTS.map((bp) => (
            <BlueprintCard
              key={bp.id}
              bp={bp}
              selected={bp.id === selectedId}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {selected && selected.id !== "scratch" && <BlueprintPreview bp={selected} />}
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace current selections?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching blueprint will replace your current agent/connector selections. Keep going?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my picks</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) apply(pending);
                setPending(null);
              }}
            >
              Switch blueprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
