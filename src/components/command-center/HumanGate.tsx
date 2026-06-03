import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface HumanLike { initials: string; name: string; }

export function HumanGate({
  active, human,
}: { active: boolean; human?: HumanLike }) {
  if (human) {
    return (
      <div
        title={`${active ? "Pending approval · " : ""}Accountable: ${human.name}`}
        className={cn(
          "shrink-0 mx-1 size-7 rounded-full grid place-items-center border text-[10px] font-mono font-semibold transition-all",
          active
            ? "border-status-waiting bg-status-waiting/15 text-status-waiting glow-pulse"
            : "border-border bg-white/3 text-foreground/80",
        )}
      >
        {human.initials}
      </div>
    );
  }
  return (
    <div
      title={active ? "Human approval pending" : "Human gate"}
      className={cn(
        "shrink-0 size-7 rounded-full grid place-items-center border mx-1 transition-all",
        active
          ? "border-status-waiting bg-status-waiting/15 text-status-waiting glow-pulse"
          : "border-border bg-white/3 text-muted-foreground",
      )}
      style={active ? { color: "var(--status-waiting)" } : undefined}
    >
      <User className="size-3.5" />
    </div>
  );
}
