/**
 * Pipeline Preview - the live produces→consumes rail (right panel of the
 * Agent Catalog). Derived entirely from THE CHAIN (src/mock/chain.ts):
 * nodes follow PIPELINE_ORDER, an inbound edge is wired iff every consumed
 * artifact has a selected producer, gaps render dashed-amber with the
 * one-click "+ Add Tasklist" / "+ Add Review" auto-suggest (D4).
 */

import type { ReactNode } from "react";
import { Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CHAIN_ROLES,
  PIPELINE_ORDER,
  estCost,
  estLatency,
  formatLatency,
  missingInputsFor,
  artifactKindLabel,
  type ArtifactKind,
  type ChainGap,
  type ChainRoleId,
} from "@/mock/chain";
import { catalogEntry } from "@/mock/catalog";
import { ROLE_SHORT, mix } from "./role-meta";

export interface PipelinePreviewProps {
  selectedIds: ChainRoleId[];
  /** One-click add (gap auto-suggest chips + ghost slots). */
  onAdd: (id: ChainRoleId) => void;
  /** Node click → AgentDetailDialog. */
  onOpenDetail: (id: ChainRoleId) => void;
  className?: string;
}

function ArtifactChip({ kind, tone }: { kind: ArtifactKind; tone: "neon" | "muted" }) {
  return (
    <span
      className={cn(
        "text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border whitespace-nowrap",
        tone === "neon"
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-white/5 text-muted-foreground",
      )}
    >
      {artifactKindLabel(kind)}
    </span>
  );
}

/** Tooltip copy for a satisfied inbound edge: "BA produces spec → SA consumes spec". */
function edgeTooltip(to: ChainRoleId, selected: ChainRoleId[]): string {
  return CHAIN_ROLES[to].consumes
    .map((artifact) => {
      const from = selected.find((id) => CHAIN_ROLES[id].produces === artifact);
      return from
        ? `${ROLE_SHORT[from]} produces ${artifactKindLabel(artifact)} → ${ROLE_SHORT[to]} consumes ${artifactKindLabel(artifact)}`
        : null;
    })
    .filter(Boolean)
    .join(" · ");
}

function WiredConnector({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="ml-[11px] h-5 w-4 flex justify-center cursor-default">
          <span className="w-[2px] h-full rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" className="font-mono text-[11px] max-w-64">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function GapConnector({ gaps, onAdd }: { gaps: ChainGap[]; onAdd: (id: ChainRoleId) => void }) {
  return (
    <div className="ml-[18px] border-l-2 border-dashed border-status-waiting/70 pl-2.5 py-1.5 flex flex-col items-start gap-1">
      {gaps.map((gap) => (
        <div key={`${gap.roleId}-${gap.missing}`} className="flex flex-wrap items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting cursor-default">
                no {artifactKindLabel(gap.missing)} input
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-[11px] max-w-56">
              {ROLE_SHORT[gap.roleId]} consumes {artifactKindLabel(gap.missing)} - nothing selected produces it.
            </TooltipContent>
          </Tooltip>
          {gap.fixRoleId && (
            <button
              type="button"
              onClick={() => onAdd(gap.fixRoleId as ChainRoleId)}
              className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting bg-status-waiting/20 text-status-waiting hover:bg-status-waiting/30 hover:shadow-[0_0_8px_var(--status-waiting)] transition-all flex items-center gap-0.5"
            >
              <Plus className="size-2.5" />
              Add {ROLE_SHORT[gap.fixRoleId]}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function GhostConnector() {
  return (
    <div className="ml-[11px] h-4 w-4 flex justify-center">
      <span className="w-px h-full border-l border-dashed border-border/70" />
    </div>
  );
}

export function PipelinePreview({
  selectedIds,
  onAdd,
  onOpenDetail,
  className,
}: PipelinePreviewProps) {
  const pipelineSelected = PIPELINE_ORDER.filter((id) => selectedIds.includes(id));
  const empty = pipelineSelected.length === 0;
  const gaps = missingInputsFor(selectedIds);
  const gapsByRole = new Map<ChainRoleId, ChainGap[]>();
  for (const gap of gaps) {
    gapsByRole.set(gap.roleId, [...(gapsByRole.get(gap.roleId) ?? []), gap]);
  }
  const knowledgeOn = selectedIds.includes("knowledge");
  const cost = estCost(selectedIds);
  const latency = estLatency(selectedIds);

  return (
    <aside
      className={cn(
        "rounded-md border border-border bg-panel/40 backdrop-blur-md flex flex-col overflow-hidden",
        className,
      )}
    >
      {/* Header + legend */}
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          Pipeline preview
        </span>
        <span className="flex items-center gap-2.5 text-[9px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-[2px] rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
            wired
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 border-t-2 border-dashed border-status-waiting/80" />
            input gap
          </span>
        </span>
      </div>

      {/* Rail */}
      <div className="flex-1 p-3 overflow-y-auto scrollbar-thin">
        {empty && (
          <p className="text-xs text-muted-foreground mb-3 px-0.5">
            Add an agent to start building the pipeline.
          </p>
        )}

        {PIPELINE_ORDER.map((id, i) => {
          const entry = catalogEntry(id);
          const isSelected = pipelineSelected.includes(id);
          const color = `var(--${entry.color})`;
          const roleGaps = gapsByRole.get(id) ?? [];
          const hasConsumes = CHAIN_ROLES[id].consumes.length > 0;

          let connector: ReactNode = null;
          if (i > 0) {
            if (isSelected && roleGaps.length > 0) {
              connector = <GapConnector gaps={roleGaps} onAdd={onAdd} />;
            } else if (isSelected && hasConsumes) {
              connector = <WiredConnector tooltip={edgeTooltip(id, pipelineSelected)} />;
            } else {
              connector = <GhostConnector />;
            }
          }

          const recommendedStart = empty && id === "ba";

          return (
            <div key={id}>
              {connector}
              {isSelected ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(id)}
                      className="w-full flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-shadow anim-in"
                      style={{
                        borderColor: mix(color, 50),
                        background: mix(color, 10),
                      }}
                    >
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                      />
                      <span className="text-xs font-medium truncate" style={{ color }}>
                        {entry.name}
                      </span>
                      <span className="ml-auto shrink-0">
                        <ArtifactChip kind={entry.produces} tone="neon" />
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="font-mono text-[11px] max-w-64">
                    produces {artifactKindLabel(entry.produces)}
                    {hasConsumes
                      ? ` · consumes ${CHAIN_ROLES[id].consumes.map(artifactKindLabel).join(", ")}`
                      : " · entry point"}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenDetail(id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-left transition-all",
                    recommendedStart
                      ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                      : "border-border/70 opacity-55 hover:opacity-100 hover:border-border",
                  )}
                >
                  <Plus
                    className={cn(
                      "size-3 shrink-0",
                      recommendedStart ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs truncate",
                      recommendedStart ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {entry.name}
                  </span>
                  {recommendedStart && (
                    <span className="ml-auto text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary shrink-0">
                      Recommended start
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}

        {/* Pod-wide peer - never a pipeline node */}
        {knowledgeOn && (
          <>
            <Separator className="my-3" />
            <div className="px-0.5 mb-1.5 text-[9px] uppercase tracking-wider font-mono text-muted-foreground">
              Pod-wide
            </div>
            {(() => {
              const k = catalogEntry("knowledge");
              const color = `var(--${k.color})`;
              return (
                <button
                  type="button"
                  onClick={() => onOpenDetail("knowledge")}
                  className="w-full flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left anim-in"
                  style={{ borderColor: mix(color, 45), background: mix(color, 8) }}
                >
                  <Sparkles className="size-3 shrink-0" style={{ color }} />
                  <span className="text-xs font-medium truncate" style={{ color }}>
                    {k.name}
                  </span>
                  <span className="ml-auto text-[9px] font-mono text-muted-foreground shrink-0">
                    runs pod-wide · not in the rail
                  </span>
                </button>
              );
            })()}
          </>
        )}
      </div>

      {/* Footer summary */}
      <div className="px-3 py-2.5 border-t border-border flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono text-muted-foreground">
        {selectedIds.length === 0 ? (
          <span>- no agents selected</span>
        ) : (
          <>
            <span>est. ~${cost.toFixed(2)}/ticket</span>
            <span className="text-border">·</span>
            <span>~{formatLatency(latency)} end-to-end</span>
            <span className="text-border">·</span>
            <span className="text-primary">included in plan</span>
          </>
        )}
      </div>
    </aside>
  );
}
