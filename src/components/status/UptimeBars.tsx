/**
 * UptimeBars - 90 tiny day-cells for one platform component (oldest →
 * newest, from the deterministic uptimeDays seed). Green = 100%, amber =
 * minor dip, red = the degraded stretch; hover carries the day + pct.
 * Empty history (new tenant) accrues from launch.
 */

import { uptimeDaysFor } from "@/mock/status";
import { cn } from "@/lib/utils";

function barTone(pct: number): string {
  if (pct >= 100) return "bg-status-done/40";
  if (pct >= 97) return "bg-status-waiting/80";
  return "bg-status-error";
}

export function UptimeBars({ componentId }: { componentId: string }) {
  const days = uptimeDaysFor(componentId);

  if (days.length === 0) {
    return (
      <div className="text-[11px] italic text-muted-foreground">
        Your 90-day history accrues from launch.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-stretch gap-px h-5">
        {days.map((d) => (
          <div
            key={d.day}
            title={`${d.day} · ${d.pct}% uptime`}
            className={cn("flex-1 min-w-0 rounded-[1px]", barTone(d.pct))}
          />
        ))}
      </div>
      <div className="flex justify-between text-[9px] font-mono text-muted-foreground/70">
        <span>90 days ago</span>
        <span>today</span>
      </div>
    </div>
  );
}
