/**
 * RoleRibbon - the thin context ribbon on every non-PM "/" landing.
 * Names the active persona ("Your landing · {RoleLabel}") and, since the
 * view-as switch is a PM demo affordance, always offers the way home:
 * "Previewing as {role} - Back to my cockpit". Nobody gets stranded.
 */

import { Eye, Undo2 } from "lucide-react";
import { roleById, type RoleId } from "@/mock/roles";

export function RoleRibbon({ role, onBack }: { role: RoleId; onBack: () => void }) {
  const r = roleById(role);
  return (
    <div className="glass-panel px-3 py-2 flex items-center gap-2 flex-wrap">
      <Eye className="size-3.5 text-primary shrink-0" />
      <span className="text-xs font-medium">
        Your landing · <span className="text-primary">{r.label}</span>
      </span>
      {r.readOnly && (
        <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
          read-only
        </span>
      )}
      <span className="ml-auto text-[11px] text-muted-foreground hidden sm:inline">
        Previewing as {r.label} -
      </span>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
      >
        <Undo2 className="size-3" />
        Back to my cockpit
      </button>
    </div>
  );
}
