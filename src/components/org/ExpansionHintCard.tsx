/**
 * ExpansionHintCard (/org, P1-C2) - the expansion engine's home: a backlog
 * shape matched against the blueprint catalog, one click from LAUNCH.
 * CTA lands on /pods/new?step=blueprint (the wizard's blueprint step).
 */

import { Link } from "@tanstack/react-router";
import { Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExpansionHintCard() {
  return (
    <section className="glass-panel p-4 border-primary/30 flex items-center gap-4 flex-wrap">
      <div className="size-9 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
        <Sparkles className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-56">
        <div className="text-sm text-foreground">
          Backlog <span className="font-mono">{"'Listr'"}</span> fits the{" "}
          <span className="font-medium">Web App Delivery</span> blueprint - launch a second pod →
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          Expansion engine · backlog shape matched against the blueprint catalog.
        </div>
      </div>
      <Button asChild size="sm">
        <Link to="/pods/new" search={{ step: "blueprint" }}>
          <Rocket className="size-3.5 mr-1.5" />
          Launch a second pod
        </Link>
      </Button>
    </section>
  );
}
