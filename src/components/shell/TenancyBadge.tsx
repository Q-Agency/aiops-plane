/**
 * Tenancy badge - the always-on enterprise-trust signal in the top bar:
 * "Dedicated · EU-West · isolated DB" (D5), with the data-handling statement
 * on hover. Standard mode only.
 */

import { ShieldCheck } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TENANCY_LINE } from "@/lib/pods/pod-store";

export function TenancyBadge() {
  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <button
          className="hidden md:flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-border bg-white/5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors cursor-default"
          aria-label="Tenancy and data residency"
        >
          <ShieldCheck className="size-3.5 text-primary" />
          {TENANCY_LINE}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80">
        <div className="text-sm font-semibold">Your data stays yours</div>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          Storage, memory, and the audit ledger live in your isolated EU-West tenant. Inference:
          pinned models - see Settings.
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
