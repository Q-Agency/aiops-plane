/**
 * CatalogStandalone — the /catalog left-rail page. The same catalog grid +
 * pipeline preview as wizard step 2 (AgentCatalogBody), composed browse-only
 * outside the wizard chrome: selections here are a local sandbox, and the
 * "Open in New Pod wizard" CTA carries them into a fresh draft when no
 * draft is in flight.
 */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Rocket, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChainRoleId } from "@/mock/chain";
import { usePods } from "@/lib/pods/pod-store";
import { AgentCatalogBody } from "./StepAgents";

export function CatalogStandalone() {
  const navigate = useNavigate();
  const { draft, hydrated, createDraft, updateDraft } = usePods();
  const [selectedIds, setSelectedIds] = useState<ChainRoleId[]>([]);

  const toggle = (id: ChainRoleId, next: boolean) => {
    setSelectedIds((ids) =>
      next ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((x) => x !== id),
    );
  };

  const openWizard = () => {
    const seeding = !draft && selectedIds.length > 0;
    if (seeding) {
      // Functional updates apply in order — the draft exists by the time
      // updateDraft's updater runs.
      createDraft(null);
      updateDraft({ agentIds: selectedIds });
    }
    void navigate({ to: "/pods/new", search: { step: seeding ? "agents" : "blueprint" } });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div className="size-9 rounded-md bg-primary/10 border border-primary/30 grid place-items-center text-primary shrink-0">
          <Store className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">Your curated Q delivery team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse the catalog — what each role produces and consumes, indicative cost and latency,
            all swappable by contract. Toggles here are a sandbox; launch a pod to make it real.
          </p>
        </div>
        <Button onClick={openWizard} className="shrink-0">
          <Rocket className="size-4" />
          Open in New Pod wizard
        </Button>
      </div>

      <AgentCatalogBody selectedIds={selectedIds} onToggle={toggle} loading={!hydrated} wide />
    </div>
  );
}
