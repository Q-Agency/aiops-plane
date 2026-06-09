/**
 * FIRE UP step 2 — Agent Catalog (body only; chrome from WizardShell).
 *
 * Exports:
 *   StepAgents       — draft-backed wizard step (selection = draft.agentIds).
 *   AgentCatalogBody — the shared grid + summary bar + PipelinePreview +
 *                      AgentDetailDialog composition, reused by /catalog.
 *
 * Chain facts (gaps, edges, cost/latency) come from src/mock/chain.ts;
 * display joins from src/mock/catalog.ts. Auto-suggest (D4): a selection
 * gap renders an inline one-click "+ Add Tasklist" / "+ Add Review" chip
 * on both the consumer's card and the preview rail.
 */

import { useMemo, useState } from "react";
import { Plus, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { agents } from "@/mock/agents";
import {
  PIPELINE_ORDER,
  estCost,
  estLatency,
  formatLatency,
  missingInputsFor,
  type ChainGap,
  type ChainRoleId,
} from "@/mock/chain";
import { ALWAYS_ON, CATALOG, catalogEntry, type CatalogEntry } from "@/mock/catalog";
import { blueprintById } from "@/mock/blueprints";
import { usePods } from "@/lib/pods/pod-store";
import { AgentDetailDialog } from "./AgentDetailDialog";
import { PipelinePreview } from "./PipelinePreview";
import { ROLE_SHORT, mix } from "./role-meta";

/* ------------------------------------------------------------------ */
/* Catalog card                                                         */
/* ------------------------------------------------------------------ */

function CatalogCard({
  entry,
  selected,
  gaps,
  onToggle,
  onOpen,
}: {
  entry: CatalogEntry;
  selected: boolean;
  gaps: ChainGap[];
  onToggle: (id: ChainRoleId, next: boolean) => void;
  onOpen: (id: ChainRoleId) => void;
}) {
  const color = `var(--${entry.color})`;
  const agent = entry.agentId ? agents.find((a) => a.id === entry.agentId) : undefined;
  const certified = entry.conformance === "certified";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${entry.name} details`}
      onClick={() => onOpen(entry.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(entry.id);
        }
      }}
      className="glass-panel hover-lift relative overflow-hidden p-3 text-left cursor-pointer flex flex-col gap-2.5"
      style={
        selected
          ? {
              borderColor: mix(color, 55),
              boxShadow: `inset 0 0 0 1px ${mix(color, 20)}, 0 0 14px ${mix(color, 20)}`,
            }
          : undefined
      }
    >
      {selected && (
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />
      )}

      {/* Header: name/role + Add switch */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color }}>
            {entry.name}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
            {entry.engine}
          </div>
        </div>
        {/* Switch zone — never opens the dialog */}
        <span
          className="flex items-center gap-1.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              "text-[9px] uppercase tracking-wider font-mono",
              selected ? "text-status-done" : "text-muted-foreground",
            )}
          >
            {selected ? "Added" : "Add"}
          </span>
          <Switch
            checked={selected}
            onCheckedChange={(next) => onToggle(entry.id, next)}
            aria-label={selected ? `Remove ${entry.name}` : `Add ${entry.name}`}
          />
        </span>
      </div>

      {/* Badges: availability + contract + conformance */}
      <div className="flex flex-wrap items-center gap-1">
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
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground cursor-default">
              {entry.contractVersion}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-56 text-[11px]">
            Curated for quality, swappable by contract.
          </TooltipContent>
        </Tooltip>
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
          <TooltipContent side="top" className="max-w-56 text-[11px]">
            Curated for quality, swappable by contract.
          </TooltipContent>
        </Tooltip>
        {entry.podWide && (
          <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-2.5" />
            pod-wide
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{entry.summary}</p>

      {entry.podWide && (
        <div className="text-[9px] font-mono text-muted-foreground">
          runs pod-wide, not in the pipeline rail
        </div>
      )}

      {/* Gap badge + one-click fix (auto-suggest, D4) */}
      {selected && gaps.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {gaps.map((gap) => (
            <span key={gap.missing} className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting">
                Needs: {gap.missing}
                {gap.fixRoleId ? ` from ${ROLE_SHORT[gap.fixRoleId]}` : ""}
              </span>
              {gap.fixRoleId && (
                <button
                  type="button"
                  onClick={() => onToggle(gap.fixRoleId as ChainRoleId, true)}
                  className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting bg-status-waiting/20 text-status-waiting hover:bg-status-waiting/30 hover:shadow-[0_0_8px_var(--status-waiting)] transition-all flex items-center gap-0.5"
                >
                  <Plus className="size-2.5" />
                  Add {ROLE_SHORT[gap.fixRoleId]}
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Indicative stats */}
      <div className="mt-auto pt-2 border-t border-border flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
        <span>~${entry.costPerTicketUsd.toFixed(2)}/ticket</span>
        <span className="text-border">·</span>
        <span>p50 {formatLatency(entry.latencyP50Min)}</span>
        {agent && (
          <>
            <span className="text-border">·</span>
            <span style={{ color }}>{agent.successRate}%</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Always-on strip (PM Supervisor — never togglable)                    */
/* ------------------------------------------------------------------ */

function AlwaysOnStrip() {
  const color = `var(--${ALWAYS_ON.color})`;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1.5">
        Always-on
      </div>
      <div
        className="rounded-md border bg-panel/40 backdrop-blur-md px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5"
        style={{ borderColor: mix(color, 35) }}
      >
        <ShieldCheck className="size-4 shrink-0" style={{ color }} />
        <div className="min-w-0">
          <span className="text-xs font-semibold" style={{ color }}>
            {ALWAYS_ON.name}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono ml-2">
            {ALWAYS_ON.engine}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground flex-1 min-w-48 leading-snug">
          {ALWAYS_ON.summary}
        </p>
        <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground shrink-0">
          Included in every pod
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared body — summary bar + grid + preview + detail dialog           */
/* ------------------------------------------------------------------ */

export interface AgentCatalogBodyProps {
  selectedIds: ChainRoleId[];
  /** Pure state mutation — toasts are handled here in the body. */
  onToggle: (id: ChainRoleId, next: boolean) => void;
  /** Optional "Reset to blueprint" ghost link in the summary bar. */
  reset?: { label: string; onReset: () => void } | null;
  /** Render skeletons (pre-hydration fidelity state). */
  loading?: boolean;
  /** Wider grid for the standalone /catalog page. */
  wide?: boolean;
}

export function AgentCatalogBody({
  selectedIds,
  onToggle,
  reset = null,
  loading = false,
  wide = false,
}: AgentCatalogBodyProps) {
  const [detailId, setDetailId] = useState<ChainRoleId | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const gaps = useMemo(() => missingInputsFor(selectedIds), [selectedIds]);
  const gapsByRole = useMemo(() => {
    const map = new Map<ChainRoleId, ChainGap[]>();
    for (const gap of gaps) map.set(gap.roleId, [...(map.get(gap.roleId) ?? []), gap]);
    return map;
  }, [gaps]);

  const pipelineSelected = PIPELINE_ORDER.filter((id) => selectedIds.includes(id));
  const wiredCount = pipelineSelected.filter((id) => !gapsByRole.has(id)).length;
  const cost = estCost(selectedIds);
  const latency = estLatency(selectedIds);

  const handleToggle = (id: ChainRoleId, next: boolean) => {
    if (next === selectedIds.includes(id)) return;
    onToggle(id, next);
    const name = catalogEntry(id).name;
    if (next) toast.success(`${name} added to pod`);
    else toast(`${name} removed from pod`);
  };

  const openDetail = (id: ChainRoleId) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-full" />
          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", wide && "xl:grid-cols-3")}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        </div>
        <Skeleton className="lg:w-80 shrink-0 h-96" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* LEFT — summary bar + card grid */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          <div className="rounded-md border border-border bg-panel/40 backdrop-blur-md px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-muted-foreground">
            <span className="text-foreground">{selectedIds.length} agents</span>
            <span className="text-border">·</span>
            <span>
              {wiredCount} of {PIPELINE_ORDER.length} pipeline stages wired
            </span>
            <span className="text-border">·</span>
            <span>est. ~${cost.toFixed(2)}/ticket</span>
            <span className="text-border">·</span>
            <span>~{formatLatency(latency)} latency</span>
            <span className="text-border">·</span>
            <span className="text-primary">included in plan</span>
            {gaps.length > 0 && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting">
                {gaps.length} input gap{gaps.length === 1 ? "" : "s"}
              </span>
            )}
            <span className="flex-1" />
            {reset && (
              <button
                type="button"
                onClick={reset.onReset}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="size-3" />
                {reset.label}
              </button>
            )}
          </div>

          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", wide && "xl:grid-cols-3")}>
            {CATALOG.map((entry) => (
              <CatalogCard
                key={entry.id}
                entry={entry}
                selected={selectedIds.includes(entry.id)}
                gaps={gapsByRole.get(entry.id) ?? []}
                onToggle={handleToggle}
                onOpen={openDetail}
              />
            ))}
          </div>

          <AlwaysOnStrip />
        </div>

        {/* RIGHT — sticky pipeline preview */}
        <PipelinePreview
          selectedIds={selectedIds}
          onAdd={(id) => handleToggle(id, true)}
          onOpenDetail={openDetail}
          className="w-full lg:w-80 shrink-0 lg:sticky lg:top-2 max-h-[calc(100vh-220px)]"
        />
      </div>

      <AgentDetailDialog
        roleId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        selectedIds={selectedIds}
        onToggle={handleToggle}
      />
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Wizard step — selection lives on the draft                           */
/* ------------------------------------------------------------------ */

export function StepAgents() {
  const { draft, hydrated, updateDraft } = usePods();
  const selectedIds = draft?.agentIds ?? [];

  const toggle = (id: ChainRoleId, next: boolean) => {
    if (!draft) return;
    const has = draft.agentIds.includes(id);
    if (next && !has) updateDraft({ agentIds: [...draft.agentIds, id] });
    else if (!next && has) updateDraft({ agentIds: draft.agentIds.filter((x) => x !== id) });
  };

  const blueprint = blueprintById(draft?.blueprintId ?? null);
  const reset =
    blueprint && blueprint.id !== "scratch"
      ? {
          label: "Reset to blueprint",
          onReset: () => {
            updateDraft({ agentIds: [...blueprint.agentIds] });
            toast(`Selection reset to ${blueprint.name}`);
          },
        }
      : null;

  return (
    <AgentCatalogBody
      selectedIds={selectedIds}
      onToggle={toggle}
      reset={reset}
      loading={!hydrated}
    />
  );
}
