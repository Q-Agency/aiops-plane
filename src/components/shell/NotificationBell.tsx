/**
 * NotificationBell (C6) — the TopBar bell: unread dot + the inbox popover.
 *
 * Spec ("Notification Bell + Inbox Popover"): rows grouped by recency
 * (Now / Earlier today / This week), unread left-accent, inline action
 * buttons, 20-row cap with "+N more — open inbox", "Mark all read",
 * a gear deep-linking to /notifications Preferences, and an "Open inbox"
 * footer. Read-state is the localStorage overlay from notifications.ts
 * ("aiops_notif_read"), hydrated in a mounted useEffect (SSR-safe: the
 * server render shows seed state only — no window access during render).
 */

import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Bell, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  NotificationRow,
  groupByRecency,
} from "@/components/notifications/NotificationRow";
import { useDemoTick } from "@/mock/demo-bus";
import {
  CURRENT_USER_ID,
  isRead,
  notificationsFor,
  persistRead,
  readOverlay,
  type AppNotification,
} from "@/mock/notifications";

/** High-volume cap (spec edge state): at most 20 rows in the popover. */
const POPOVER_CAP = 20;

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [overlay, setOverlay] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setOverlay(readOverlay());
    setMounted(true);
  }, []);

  // Demo Director staged events append via pushNotification — repaint on tick
  // so the bell pulses the moment a staged beat lands.
  useDemoTick();

  const all = notificationsFor(CURRENT_USER_ID);
  const unread = mounted ? all.filter((n) => !isRead(n, overlay)).length : 0;
  const capped = all.slice(0, POPOVER_CAP);
  const overflow = all.length - capped.length;
  const groups = groupByRecency(capped);

  function markAllRead() {
    setOverlay(persistRead(all.map((n) => n.id)));
  }

  function openItem(n: AppNotification) {
    setOverlay(persistRead([n.id]));
    setOpen(false);
    router.history.push(n.deepLink);
  }

  function goTo(href: string) {
    setOpen(false);
    router.history.push(href);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative size-8 rounded-md border border-border bg-white/5 hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center text-muted-foreground"
        >
          <Bell className="size-3.5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-status-error text-[9px] font-mono font-semibold text-white grid place-items-center animate-pulse">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-96 p-0 overflow-hidden">
        <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-status-error/40 bg-status-error/10 text-status-error">
              {unread} unread
            </span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={markAllRead}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Mark all read
          </button>
          <button
            type="button"
            aria-label="Notification preferences"
            title="Notification preferences"
            onClick={() => goTo("/notifications?tab=preferences")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="size-3.5" />
          </button>
        </header>

        <div className="max-h-[32rem] overflow-auto scrollbar-thin">
          {capped.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <div className="text-sm font-medium">You're all caught up</div>
              <p className="text-xs text-muted-foreground mt-1">
                New gates, escalations and SLA alerts will appear here.
              </p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.bucket}>
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-mono text-muted-foreground bg-panel/40 sticky top-0 backdrop-blur-md">
                  {g.bucket}
                </div>
                {g.items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    read={mounted ? isRead(n, overlay) : n.read}
                    onOpen={openItem}
                  />
                ))}
              </div>
            ))
          )}
          {overflow > 0 && (
            <button
              type="button"
              onClick={() => goTo("/notifications")}
              className="w-full px-3 py-2 text-center text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              +{overflow} more — open inbox
            </button>
          )}
        </div>

        <footer className="border-t border-border">
          <button
            type="button"
            onClick={() => goTo("/notifications")}
            className="block w-full px-3 py-2 text-center text-xs text-primary hover:bg-primary/10 transition-colors"
          >
            Open inbox
          </button>
        </footer>
      </PopoverContent>
    </Popover>
  );
}
