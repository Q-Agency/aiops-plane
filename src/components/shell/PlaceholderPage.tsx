/**
 * PlaceholderPage - styled empty-state for routes that exist in the IA
 * before their cluster lands (D9: /incidents, /reports, /billing).
 * Not a bare stub: icon, one-line purpose from the vision, build-order chip.
 */

import type { LucideIcon } from "lucide-react";

export interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  /** One-line purpose, lifted from the product vision. */
  purpose: string;
  /** Mock-first build-order item number (product-vision §7). */
  buildOrder: number;
}

export function PlaceholderPage({ icon: Icon, title, purpose, buildOrder }: PlaceholderPageProps) {
  return (
    <div className="h-full grid place-items-center p-6">
      <div className="max-w-md w-full rounded-md border border-border bg-panel/40 backdrop-blur-md p-10 flex flex-col items-center gap-4 text-center">
        <div className="size-12 rounded-md bg-primary/10 border border-primary/30 grid place-items-center text-primary shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_25%,transparent)]">
          <Icon className="size-6" />
        </div>
        <div>
          <h1 className="text-base font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{purpose}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-mono text-primary border border-primary/30 bg-primary/10 rounded px-2.5 py-1">
          Arrives in build order #{buildOrder}
        </span>
      </div>
    </div>
  );
}
