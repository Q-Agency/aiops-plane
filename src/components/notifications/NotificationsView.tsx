/**
 * NotificationsView (C6) — the /notifications full notification center:
 * Inbox (filter chips All/Gates/Incidents/SLA/Digest + search + read/unread
 * + channel + bulk mark-read) · Preferences (channel matrix, Email/Push
 * roadmap) · Alert rules · Digests. Canonical URL /notifications — TopBar
 * bell + deep links only, NO rail item (C1).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { BellRing, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import { PreferenceMatrix } from "@/components/notifications/PreferenceMatrix";
import { AlertRulesPanel } from "@/components/notifications/AlertRules";
import { DigestsPanel } from "@/components/notifications/DigestCards";
import {
  CURRENT_USER_ID,
  isRead,
  notificationsFor,
  persistRead,
  readOverlay,
  type AppNotification,
  type NotificationChannel,
  type NotificationKind,
} from "@/mock/notifications";

export type NotificationsTab = "inbox" | "preferences" | "rules" | "digests";

/* ------------------------------------------------------------------ */
/* Inbox filters                                                        */
/* ------------------------------------------------------------------ */

type FilterChip = "All" | "Gates" | "Incidents" | "SLA" | "Digest";

const FILTER_CHIPS: FilterChip[] = ["All", "Gates", "Incidents", "SLA", "Digest"];

const CHIP_KINDS: Record<Exclude<FilterChip, "All">, NotificationKind[]> = {
  Gates: ["clarification_gate", "approval_gate"],
  Incidents: ["incident_opened", "run_failed", "tool_disconnected"],
  SLA: ["sla_at_risk", "sla_breach"],
  Digest: ["digest"],
};

const CHANNEL_OPTIONS: { value: "any" | NotificationChannel; label: string }[] = [
  { value: "any", label: "Any channel" },
  { value: "in_app", label: "In-app" },
  { value: "slack", label: "Slack" },
  { value: "email", label: "Email" },
  { value: "push", label: "Push" },
];

function InboxTab() {
  const router = useRouter();
  const [overlay, setOverlay] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [chip, setChip] = useState<FilterChip>("All");
  const [query, setQuery] = useState("");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [channel, setChannel] = useState<"any" | NotificationChannel>("any");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOverlay(readOverlay());
    setMounted(true);
  }, []);

  const all = notificationsFor(CURRENT_USER_ID);

  const rowRead = (n: AppNotification) => (mounted ? isRead(n, overlay) : n.read);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((n) => {
      if (chip !== "All" && !CHIP_KINDS[chip].includes(n.kind)) return false;
      if (readFilter === "unread" && rowRead(n)) return false;
      if (readFilter === "read" && !rowRead(n)) return false;
      if (channel !== "any" && !n.channels.includes(channel)) return false;
      if (
        q &&
        !n.title.toLowerCase().includes(q) &&
        !n.body.toLowerCase().includes(q) &&
        !(n.ticketId ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, chip, query, readFilter, channel, overlay, mounted]);

  const filtersActive =
    chip !== "All" || query.trim() !== "" || readFilter !== "all" || channel !== "any";

  function clearFilters() {
    setChip("All");
    setQuery("");
    setReadFilter("all");
    setChannel("any");
  }

  function openItem(n: AppNotification) {
    setOverlay(persistRead([n.id]));
    router.history.push(n.deepLink);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function markSelectedRead() {
    setOverlay(persistRead([...selected]));
    setSelected(new Set());
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {FILTER_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChip(c)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                chip === c
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-white/5 text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter notifications…"
          className="h-8 w-56 text-xs"
        />
        <ToggleGroup
          type="single"
          value={readFilter}
          onValueChange={(v) => v && setReadFilter(v as typeof readFilter)}
          className="h-8"
        >
          <ToggleGroupItem value="all" className="h-8 px-2.5 text-[11px]">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="unread" className="h-8 px-2.5 text-[11px]">
            Unread
          </ToggleGroupItem>
          <ToggleGroupItem value="read" className="h-8 px-2.5 text-[11px]">
            Read
          </ToggleGroupItem>
        </ToggleGroup>
        <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNEL_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <span className="text-[11px] font-mono text-muted-foreground">
          {filtersActive ? `${filtered.length} of ${all.length}` : `${all.length} total`}
        </span>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <X className="size-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
          <span className="text-xs font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={markSelectedRead}>
            Mark read
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* List */}
      <section className="rounded-md border border-border bg-panel/40 backdrop-blur-md overflow-hidden">
        {all.length === 0 ? (
          <div className="p-12 text-center">
            <BellRing className="size-6 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium mt-3">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              New gates, escalations and SLA alerts will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No notifications match these filters</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          filtered.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              dense
              read={rowRead(n)}
              onOpen={openItem}
              selected={selected.has(n.id)}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                 */
/* ------------------------------------------------------------------ */

export function NotificationsView({ initialTab = "inbox" }: { initialTab?: NotificationsTab }) {
  const [tab, setTab] = useState<NotificationsTab>(initialTab);

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl">
      <header className="flex items-center gap-3">
        <div className="size-9 rounded-md bg-primary/10 border border-primary/30 grid place-items-center text-primary">
          <BellRing className="size-4" />
        </div>
        <div>
          <h1 className="text-base font-semibold">Notifications & Alerts</h1>
          <p className="text-xs text-muted-foreground">
            Everything that reached you — gates, escalations, SLA alerts, digests.
          </p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as NotificationsTab)}>
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="rules">Alert rules</TabsTrigger>
          <TabsTrigger value="digests">Digests</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-4">
          <InboxTab />
        </TabsContent>
        <TabsContent value="preferences" className="mt-4">
          <PreferenceMatrix />
        </TabsContent>
        <TabsContent value="rules" className="mt-4">
          <AlertRulesPanel />
        </TabsContent>
        <TabsContent value="digests" className="mt-4">
          <DigestsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
