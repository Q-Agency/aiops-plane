/**
 * WorkIntakeView — /intake (C10): how tickets actually enter the pod.
 * Two tabs — "From your tracker" (checkbox picker pre-filtered by the pod's
 * scope rule) and "Paste a ticket" (composer) — each with the per-ticket
 * routing preview showing exactly which agent takes the work first.
 * The stage for the demo's 0:30 "a ticket flows in" beat; every empty-state
 * add-work CTA in the product points here.
 */

import { ClipboardPaste, Inbox, KanbanSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketComposer } from "./TicketComposer";
import { TicketPickerTable } from "./TicketPickerTable";

export interface WorkIntakeViewProps {
  /** ?sim=error — demo affordance for the tracker-unreachable state. */
  simError?: boolean;
}

export function WorkIntakeView({ simError }: WorkIntakeViewProps) {
  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl">
      <header className="flex items-center gap-3">
        <div className="size-9 rounded-md bg-primary/10 border border-primary/30 grid place-items-center text-primary">
          <Inbox className="size-4" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">Work intake</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pull work from your tracker, or paste a ticket — the pod routes it from there.
          </p>
        </div>
      </header>

      <Tabs defaultValue="tracker">
        <TabsList className="bg-white/5 border border-border">
          <TabsTrigger value="tracker" className="text-xs gap-1.5">
            <KanbanSquare className="size-3.5" /> From your tracker
          </TabsTrigger>
          <TabsTrigger value="paste" className="text-xs gap-1.5">
            <ClipboardPaste className="size-3.5" /> Paste a ticket
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tracker" className="mt-4">
          <TicketPickerTable simError={simError} />
        </TabsContent>
        <TabsContent value="paste" className="mt-4">
          <TicketComposer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
