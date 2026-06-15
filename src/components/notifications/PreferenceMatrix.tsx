/**
 * PreferenceMatrix (C6) - the /notifications Preferences tab.
 *
 * Table matrix: rows = event kinds, columns = channels (In-app / Slack /
 * Email / Push), each cell a Switch. Column headers carry the Live/Roadmap
 * honesty badge (In-app + Slack live; Email + Push roadmap). Toggling a
 * roadmap channel is allowed but tagged - "Email delivery is on the
 * roadmap - in-app only for now". Mock-local state only (no persistence).
 */

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CHANNEL_AVAILABILITY,
  KIND_LABELS,
  notificationPrefs,
  type NotificationChannel,
  type NotificationKind,
} from "@/mock/notifications";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "In-app",
  slack: "Slack",
  email: "Email",
  push: "Push",
};

const CHANNEL_ORDER: NotificationChannel[] = ["in_app", "slack", "email", "push"];

type PrefState = Record<NotificationKind, Record<NotificationChannel, boolean>>;

function seedPrefState(): PrefState {
  const state = {} as PrefState;
  for (const p of notificationPrefs) {
    state[p.kind] = { ...p.channels };
  }
  return state;
}

export function PreferenceMatrix() {
  const [prefs, setPrefs] = useState<PrefState>(seedPrefState);
  const [quietHours, setQuietHours] = useState(true);

  function toggle(kind: NotificationKind, channel: NotificationChannel) {
    const next = !prefs[kind][channel];
    setPrefs((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], [channel]: next },
    }));
    if (CHANNEL_AVAILABILITY[channel] === "roadmap") {
      toast.info(
        `${CHANNEL_LABELS[channel]} delivery is on the roadmap - in-app only for now`,
      );
      return;
    }
    toast.success(
      `${CHANNEL_LABELS[channel]} delivery ${next ? "enabled" : "disabled"} for ${KIND_LABELS[kind]}s`,
    );
  }

  return (
    <section className="rounded-md border border-border bg-panel/40 backdrop-blur-md overflow-hidden">
      <header className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Delivery preferences</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose what reaches you, and where.
        </p>
      </header>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs">Event</TableHead>
            {CHANNEL_ORDER.map((ch) => (
              <TableHead key={ch} className="text-center w-28">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-xs">{CHANNEL_LABELS[ch]}</span>
                  <span
                    className={cn(
                      "text-[9px] uppercase tracking-wider font-mono px-1 py-0.5 rounded border",
                      CHANNEL_AVAILABILITY[ch] === "live"
                        ? "border-status-done/40 bg-status-done/10 text-status-done"
                        : "border-border bg-white/5 text-muted-foreground",
                    )}
                  >
                    {CHANNEL_AVAILABILITY[ch] === "live" ? "Live" : "Roadmap"}
                  </span>
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(Object.keys(prefs) as NotificationKind[]).map((kind) => (
            <TableRow key={kind} className="hover:bg-white/5">
              <TableCell className="text-xs font-medium">{KIND_LABELS[kind]}</TableCell>
              {CHANNEL_ORDER.map((ch) => {
                const roadmap = CHANNEL_AVAILABILITY[ch] === "roadmap";
                return (
                  <TableCell key={ch} className="text-center">
                    <span
                      className={cn("inline-flex", roadmap && "opacity-50")}
                      title={
                        roadmap
                          ? `${CHANNEL_LABELS[ch]} delivery is on the roadmap - in-app only for now`
                          : undefined
                      }
                    >
                      <Switch
                        checked={prefs[kind][ch]}
                        onCheckedChange={() => toggle(kind, ch)}
                        aria-label={`${CHANNEL_LABELS[ch]} for ${KIND_LABELS[kind]}`}
                      />
                    </span>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <footer className="px-4 py-3 border-t border-border flex items-center gap-3">
        <Switch
          checked={quietHours}
          onCheckedChange={(v) => {
            setQuietHours(v);
            toast.success(v ? "Quiet hours enabled" : "Quiet hours disabled");
          }}
          aria-label="Quiet hours"
        />
        <div>
          <div className="text-xs font-medium">Quiet hours</div>
          <p className="text-[11px] text-muted-foreground">
            Mute non-critical alerts 22:00-07:00 UTC (escalations always notify).
          </p>
        </div>
      </footer>
    </section>
  );
}
