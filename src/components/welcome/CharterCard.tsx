/**
 * CharterCard (/welcome stage 1) - the role charter for ONE covered agent:
 * what it produces, the gate-clearance SLA + policy chip (gate-policies.ts),
 * and what rejecting does ("your note becomes the agent's added context").
 * Deputy variant renders the covers-not-owns charter - accountability
 * stays with the named owner.
 */

import { Bot, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { agents as allAgents } from "@/mock/agents";
import { gatePolicyFor } from "@/mock/gate-policies";
import { GatePolicyChip } from "@/components/gates/GatePolicyChip";

/** What each chain agent produces - the charter's "it produces …" clause. */
const PRODUCES: Record<string, string> = {
  ba: "SPEC.md",
  sa: "ARCHITECTURE.md",
  uiux: "the UI/UX spec",
  tasklist: "tasks.json",
  dev: "the PR + diff",
  review: "the review report",
  qa: "qa.report",
  devops: "deploy runs",
  knowledge: "the knowledge base",
  pm: "the pipeline run-plan",
  curator: "context bundles",
};

function fmtSla(min: number): string {
  return min % 60 === 0 ? `${min / 60}h` : `${min}m`;
}

export interface CharterCardProps {
  agentId: string;
  /** Covers-not-owns: deputy coverage while the named owner is OOO. */
  deputyOf?: string;
  className?: string;
}

export function CharterCard({ agentId, deputyOf, className }: CharterCardProps) {
  const agent = allAgents.find((a) => a.id === agentId);
  const policy = gatePolicyFor(agentId);
  const name = agent?.name ?? agentId.toUpperCase();
  const color = agent ? `var(--${agent.color})` : "var(--primary)";
  const produces = PRODUCES[agentId] ?? "its artifact";
  const sla = fmtSla(policy.gateClearMin);

  return (
    <div className={cn("glass-panel p-4 space-y-3", className)}>
      {/* agent identity row */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 shrink-0 rounded-md grid place-items-center border"
          style={{
            color,
            borderColor: `color-mix(in oklab, ${color} 50%, transparent)`,
            background: `color-mix(in oklab, ${color} 12%, transparent)`,
          }}
        >
          <Bot className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color }}>
              {name}
            </span>
            <GatePolicyChip policy={policy} />
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{agent?.role}</div>
        </div>
      </div>

      {/* the charter sentence */}
      <p className="text-sm text-foreground leading-relaxed">
        {deputyOf ? (
          <>
            You <strong>cover</strong> the <strong style={{ color }}>{name}</strong> - it produces{" "}
            <span className="font-mono text-[13px]">{produces}</span>; while covering, you clear its
            gates within <span className="font-mono text-[13px]">{sla}</span>; rejecting returns
            work with your note as the agent&apos;s added context.
          </>
        ) : (
          <>
            You&apos;re accountable for the <strong style={{ color }}>{name}</strong> - it produces{" "}
            <span className="font-mono text-[13px]">{produces}</span>; you clear its gates within{" "}
            <span className="font-mono text-[13px]">{sla}</span>; rejecting returns work with your
            note as the agent&apos;s added context.
          </>
        )}
      </p>

      {/* deputy wall - covers, not owns */}
      {deputyOf && (
        <div className="rounded-md border border-status-waiting/40 bg-status-waiting/10 px-3 py-2 text-xs text-status-waiting">
          Deputy coverage - you cover when {deputyOf} is OOO; accountability stays with {deputyOf}.
        </div>
      )}

      {/* what rejecting does */}
      <div className="flex items-start gap-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
        <CornerDownLeft className="size-3.5 shrink-0 mt-px text-muted-foreground/70" />
        <span>
          Rejecting is not a dead end - the artifact returns to the agent and{" "}
          <span className="text-foreground">your note becomes the agent&apos;s added context</span>{" "}
          on the rerun. A typed reason is required on every reject.
        </span>
      </div>
    </div>
  );
}
