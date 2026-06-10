/**
 * MemoryView — /memory, Pod Memory & Constitution (wave 2, P1-A2).
 * The compounding-moat surface: (1) the per-client Constitution with
 * provenance, (2) amendment proposals mined from rejection-reason
 * clusters (Ratify → `constitution.amended` in the ledger; Dismiss →
 * typed reason), (3) "What it knows" — the folded-in /knowledge sources
 * with an audited Forget. All mutations are optimistic in-memory + toast.
 */

import { useState } from "react";
import { Database, Pickaxe, Scale, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { appendAuditMock } from "@/mock/audit-bridge";
import {
  AMENDMENT_PROPOSALS,
  CONSTITUTION_RULES,
  RULE_CATEGORIES,
  type AmendmentProposal,
  type ConstitutionRule,
} from "@/mock/memory";
import { AmendmentCard } from "./AmendmentCard";
import { ConstitutionList } from "./ConstitutionList";
import { KnowledgeSourcesPanel } from "./KnowledgeSourcesPanel";

/** Which Constitution category a ratified amendment files under. */
const AMENDMENT_CATEGORY: Record<string, (typeof RULE_CATEGORIES)[number]> = {
  "amend-1": "Specs & acceptance criteria",
  "amend-2": "Architecture & integrations",
};

function SectionHead({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
      </div>
      {sub && <span className="text-[11px] text-muted-foreground font-mono">· {sub}</span>}
    </div>
  );
}

export function MemoryView() {
  // Optimistic in-memory state — seeds copied so ratify/dismiss never
  // mutate the module datasets.
  const [rules, setRules] = useState<ConstitutionRule[]>(CONSTITUTION_RULES);
  const [proposals, setProposals] = useState<AmendmentProposal[]>(AMENDMENT_PROPOSALS);
  const [justRatifiedId, setJustRatifiedId] = useState<string | null>(null);

  const open = proposals.filter((p) => p.state === "proposed");
  const ratifiedCount = rules.filter((r) => r.provenance === "ratified-amendment").length;

  function ratify(a: AmendmentProposal) {
    const at = Date.now();
    const newRuleId = `cr-${a.id}`;
    appendAuditMock({
      action: "constitution.amended",
      target: a.id,
      detail: `Ratified: “${a.draftText}” — mined from ${a.minedFrom.clusterLabel} (${a.minedFrom.rejectionGateIds.join(", ")})`,
    });
    setRules((rs) => [
      ...rs,
      {
        id: newRuleId,
        text: a.draftText,
        category: AMENDMENT_CATEGORY[a.id] ?? RULE_CATEGORIES[0],
        provenance: "ratified-amendment",
        ratifiedAt: at,
        citedByGateIds: a.minedFrom.rejectionGateIds,
      },
    ]);
    setProposals((ps) => ps.map((p) => (p.id === a.id ? { ...p, state: "ratified" } : p)));
    setJustRatifiedId(newRuleId);
    toast.success("Amendment ratified · written to audit ledger ✓", {
      description: `constitution.amended · ${a.id} · actor when-only`,
    });
  }

  function dismiss(a: AmendmentProposal, reason: string) {
    setProposals((ps) => ps.map((p) => (p.id === a.id ? { ...p, state: "dismissed" } : p)));
    toast(`Proposal ${a.id} dismissed`, {
      description: `“${reason}” — kept with the proposal`,
    });
  }

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-5 overflow-y-auto scrollbar-thin">
      {/* header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-md bg-primary/10 border border-primary/30 grid place-items-center text-primary shrink-0">
            <ScrollText className="size-4" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Memory &amp; Constitution</h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Your standards become the pod's standards — through a gate, on the record.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="glass-panel px-2.5 py-1.5">
            <span className="text-foreground">{rules.length}</span>
            <span className="text-muted-foreground"> rules</span>
          </span>
          <span
            className={cn("glass-panel px-2.5 py-1.5", ratifiedCount > 0 && "text-status-done")}
          >
            {ratifiedCount} ratified
          </span>
          <span
            className={cn("glass-panel px-2.5 py-1.5", open.length > 0 && "text-status-waiting")}
          >
            {open.length} proposed
          </span>
        </div>
      </div>

      {/* 1 · Constitution */}
      <section className="space-y-2">
        <SectionHead
          icon={Scale}
          title="Constitution"
          sub="rules with provenance · cited by the gate decisions that enforce them"
        />
        <ConstitutionList rules={rules} justRatifiedId={justRatifiedId} />
      </section>

      {/* 2 · Proposed amendments */}
      <section className="space-y-2">
        <SectionHead
          icon={Pickaxe}
          title="Proposed amendments"
          sub="mined weekly from rejection-reason clusters · ratified through a gate"
        />
        {open.length === 0 ? (
          <div className="glass-panel p-6 text-center">
            <Pickaxe className="size-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No amendment proposals yet — rejection reasons are mined into draft rules weekly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {open.map((a) => (
              <AmendmentCard
                key={a.id}
                amendment={a}
                onRatify={() => ratify(a)}
                onDismiss={(reason) => dismiss(a, reason)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3 · What it knows */}
      <section className="space-y-2">
        <SectionHead
          icon={Database}
          title="What it knows"
          sub="connected sources · read scopes · audited forget"
        />
        <KnowledgeSourcesPanel />
      </section>
    </div>
  );
}
