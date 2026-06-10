/**
 * ProvenanceBadge — where a constitution rule came from (P1-A2).
 * "Blueprint default" / "Client-provided" / "Ratified {date} — from
 * rejection cluster": the third tone is the compounding-moat proof that
 * the rule was earned through a gate, on the record.
 */

import { Boxes, Building2, Stamp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVENANCE_LABELS, type RuleProvenance } from "@/mock/memory";
import { fmtShortDate } from "./memory-ui";

const TONE: Record<RuleProvenance, string> = {
  blueprint: "border-border bg-white/5 text-muted-foreground",
  client: "border-primary/40 bg-primary/10 text-primary",
  "ratified-amendment": "border-status-done/40 bg-status-done/10 text-status-done",
};

const ICON: Record<RuleProvenance, React.ComponentType<{ className?: string }>> = {
  blueprint: Boxes,
  client: Building2,
  "ratified-amendment": Stamp,
};

export function ProvenanceBadge({
  provenance,
  ratifiedAt,
  className,
}: {
  provenance: RuleProvenance;
  ratifiedAt?: number;
  className?: string;
}) {
  const Icon = ICON[provenance];
  const label =
    provenance === "ratified-amendment"
      ? `Ratified ${fmtShortDate(ratifiedAt)} — from rejection cluster`
      : PROVENANCE_LABELS[provenance];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0",
        TONE[provenance],
        className,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
