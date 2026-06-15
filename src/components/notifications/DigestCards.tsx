/**
 * DigestCard (C6) - the /notifications Digests tab. Reuses the existing
 * SCHEDULED digest model from src/mock/comms.ts: name, cadence, audience,
 * channel, next-run countdown (minutesUntilUtc, SSR-safe via mounted state),
 * on/off switch, "Edit recipients" (mock toast), and an inline expandable
 * preview rendered from ScheduledComm.preview.
 */

import { useEffect, useState } from "react";
import { ChevronDown, Clock, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SCHEDULED, minutesUntilUtc, type ScheduledComm } from "@/mock/comms";

function countdownLabel(s: ScheduledComm, mounted: boolean): string {
  if (!mounted) return s.nextRunIso;
  const min = minutesUntilUtc(s.nextRunIso);
  if (min === null) return s.nextRunIso; // non-HH:MM cadence ("Fri 16:00")
  if (min < 60) return `in ${min}m`;
  return `in ${Math.floor(min / 60)}h ${min % 60}m`;
}

function DigestCard({ digest }: { digest: ScheduledComm }) {
  const [enabled, setEnabled] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-panel/40 backdrop-blur-md",
        !enabled && "opacity-60",
      )}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <Switch
          checked={enabled}
          onCheckedChange={(v) => {
            setEnabled(v);
            toast.success(`${digest.name} ${v ? "enabled" : "paused"}`);
          }}
          aria-label={`Enable ${digest.name}`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{digest.name}</div>
          <p className="text-[11px] text-muted-foreground truncate">
            {digest.cadence} · {digest.channelLabel}
          </p>
        </div>
        <span
          className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-muted-foreground"
          suppressHydrationWarning
        >
          <Clock className="size-3" />
          {countdownLabel(digest, mounted)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() =>
            toast.success(`Recipient editor - mock. ${digest.name} stays with ${digest.audience.join(", ")}.`)
          }
        >
          <UsersRound className="size-3.5 mr-1" />
          Edit recipients
        </Button>
        <button
          type="button"
          aria-label={expanded ? "Collapse preview" : "Expand preview"}
          onClick={() => setExpanded((e) => !e)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <div className="text-xs font-semibold">{digest.preview.title}</div>
          {digest.preview.sections.map((sec) => (
            <div key={sec.heading}>
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                {sec.heading}
              </div>
              <ul className="mt-1 space-y-0.5">
                {sec.lines.map((line) => (
                  <li key={line} className="text-xs text-foreground/90">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DigestsPanel() {
  return (
    <section className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Scheduled stakeholder digests - what goes out, to whom, and when. Expand a card to see
        the live preview.
      </p>
      <div className="space-y-2">
        {SCHEDULED.map((d) => (
          <DigestCard key={d.id} digest={d} />
        ))}
      </div>
    </section>
  );
}
