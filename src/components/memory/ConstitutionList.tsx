/**
 * ConstitutionList - section 1 of /memory (P1-A2): the pod's per-client
 * rules, accordion-grouped by category. Each row carries its provenance
 * badge and expands into the gate decisions that cited it (real seed ids,
 * deep-linked to /approvals/$gateId and the /compliance audit ledger).
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RULE_CATEGORIES, type ConstitutionRule } from "@/mock/memory";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { citingDecisionFor, fmtShortDate, VERB_TONE } from "./memory-ui";

function CitingDecisionRow({ gateId }: { gateId: string }) {
  const d = citingDecisionFor(gateId);
  return (
    <div className="flex items-start gap-2 py-1.5 text-[11px]">
      <span
        className={cn(
          "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border shrink-0",
          VERB_TONE[d.verb],
        )}
      >
        {d.verb}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-foreground">{d.actorName ?? "when-only"}</span>
        <span className="text-muted-foreground"> - “{d.detail}”</span>
      </div>
      <span className="font-mono text-muted-foreground shrink-0 hidden sm:block">
        {fmtShortDate(d.ts)}
      </span>
      <Link
        to="/approvals/$gateId"
        params={{ gateId }}
        className="font-mono text-primary hover:underline shrink-0"
      >
        {gateId}
      </Link>
      <Link
        to="/compliance"
        hash="audit"
        className="text-primary hover:underline shrink-0 inline-flex items-center gap-0.5"
      >
        audit ledger <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}

function RuleRow({ rule, highlight }: { rule: ConstitutionRule; highlight: boolean }) {
  const [open, setOpen] = useState(false);
  const n = rule.citedByGateIds.length;
  return (
    <div
      className={cn(
        "px-3 py-2.5 transition-colors",
        highlight && "rounded-md ring-1 ring-primary/50 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <code className="text-[10px] font-mono text-muted-foreground mt-0.5 shrink-0">
          {rule.id}
        </code>
        <p className="text-sm flex-1 min-w-48">{rule.text}</p>
        <ProvenanceBadge provenance={rule.provenance} ratifiedAt={rule.ratifiedAt} />
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={n === 0}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-mono shrink-0 cursor-pointer transition-colors",
            n === 0
              ? "text-muted-foreground/50 cursor-default"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {n} citing decision{n === 1 ? "" : "s"}
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && n > 0 && (
        <div className="mt-2 ml-1 pl-3 border-l border-border divide-y divide-border/40">
          {rule.citedByGateIds.map((gateId) => (
            <CitingDecisionRow key={gateId} gateId={gateId} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ConstitutionList({
  rules,
  justRatifiedId,
}: {
  rules: ConstitutionRule[];
  /** Flash-highlight the rule that just landed from a ratified amendment. */
  justRatifiedId?: string | null;
}) {
  if (rules.length === 0) {
    return (
      <div className="glass-panel p-6 text-center">
        <Scale className="size-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Your pod starts with the blueprint's defaults - rules accrue as you reject with
          reasons.
        </p>
      </div>
    );
  }

  const groups = RULE_CATEGORIES.map((category) => ({
    category,
    rules: rules.filter((r) => r.category === category),
  })).filter((g) => g.rules.length > 0);

  return (
    <div className="glass-panel px-4 py-1">
      <Accordion type="multiple" defaultValue={[...RULE_CATEGORIES]}>
        {groups.map((g) => (
          <AccordionItem key={g.category} value={g.category} className="last:border-b-0">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2.5">
                <span className="text-sm font-semibold tracking-wide">{g.category}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
                  {g.rules.length} rule{g.rules.length === 1 ? "" : "s"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="divide-y divide-border/40 rounded-md border border-border/60 bg-white/[0.02]">
                {g.rules.map((r) => (
                  <RuleRow key={r.id} rule={r} highlight={r.id === justRatifiedId} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
