/**
 * Work Intake (/intake) — the confirmation surface of the single doorbell
 * (vision §2, the tracker boundary): the board sends work (a scoped ticket
 * dragged into the agreed column); the operator CONFIRMS or DECLINES each
 * start here. Nothing on this screen originates work — ticket creation
 * happens on the board, full stop (the old "paste/draft a ticket" composer
 * was removed 2026-06-11 for exactly that reason).
 *
 * Header carries the start-policy control (confirm-first / auto-start) and
 * the always-on listening banner (TriggerModeControl.tsx).
 */

import { Inbox } from "lucide-react";
import { TicketPickerTable } from "./TicketPickerTable";
import { TriggerListeningBanner, TriggerModeControl } from "./TriggerModeControl";

interface WorkIntakeViewProps {
  /** ?sim=error — render the simulated tracker-error state (demo affordance). */
  simError?: boolean;
}

export function WorkIntakeView({ simError }: WorkIntakeViewProps) {
  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl">
      <header className="flex items-start gap-3 flex-wrap">
        <div className="size-9 rounded-md bg-primary/10 border border-primary/30 grid place-items-center text-primary">
          <Inbox className="size-4" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">Work intake</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            What the board sent — confirm or decline each start. Tickets are created on the board,
            never here.
          </p>
        </div>
        <div className="flex-1" />
        <TriggerModeControl />
      </header>

      <TriggerListeningBanner />

      <TicketPickerTable simError={simError} />
    </div>
  );
}
