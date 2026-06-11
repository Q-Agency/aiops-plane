/**
 * CommandPalette (⌘K, C7) — the global jump-anywhere overlay.
 * Mounted ONCE in AppShell (inside PodProvider); opened by Cmd/Ctrl-K,
 * the TopBar search chip (openCommandPalette()), or any caller dispatching
 * the OPEN_EVENT.
 *
 * Groups (xcut spec priority + locked C7 set): Quick actions · Recent
 * (empty query only) · Navigate · Gates · Tickets · Artifacts · Incidents ·
 * People · Connections · Pods. Footer carries the pod-scope hint
 * ("searching {pod.name}"). Fuzzy matching is cmdk's default.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Boxes,
  CheckCircle2,
  FileText,
  History,
  LayoutDashboard,
  MessageCircleQuestion,
  PauseCircle,
  PlugZap,
  Presentation,
  Rocket,
  Siren,
  Ticket as TicketIcon,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV, SETTINGS_ITEM } from "@/components/shell/nav";
import { usePods } from "@/lib/pods/pod-store";
import { agents } from "@/mock/agents";
import { approvals, clarificationGates } from "@/mock/approvals";
import { CONNECTORS } from "@/mock/connectors";
import { humans } from "@/mock/humans";
import { INCIDENTS } from "@/mock/incidents";
import { recentEntities } from "@/mock/notifications";
import { tickets } from "@/mock/tickets";

/** Custom event the TopBar search chip (or anything else) fires to open. */
export const OPEN_EVENT = "aiops:cmdk";

export function openCommandPalette() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

interface RecentItem {
  id: string;
  label: string;
  sublabel: string;
  icon: typeof History;
  href?: string; //         navigation target
  podId?: string; //        pod switch instead of navigation
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pauseConfirm, setPauseConfirm] = useState(false);
  const router = useRouter();
  const { pods, activePodId, setActivePod } = usePods();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
    };
  }, []);

  // Reset the query each open so "Recent" greets every fresh ⌘K.
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      // untyped push — palette deep-links span param/search routes
      router.history.push(href);
    },
    [router],
  );

  const activePod = pods.find((p) => p.id === activePodId);

  /* ----- Recent (resolved from mock ids; shown on empty query only) ----- */
  const recentItems: RecentItem[] = recentEntities.flatMap((id): RecentItem[] => {
    const t = tickets.find((x) => x.id === id);
    if (t)
      return [
        {
          id,
          label: `${t.id} · ${t.title}`,
          sublabel: t.stage,
          icon: TicketIcon,
          href: `/pipeline?ticket=${t.id}`,
        },
      ];
    const a = approvals.find((x) => x.id === id);
    if (a)
      return [
        {
          id,
          label: `${a.ticketId} · ${a.gate}`,
          sublabel: a.approver,
          icon: CheckCircle2,
          href: `/approvals/${a.id}`,
        },
      ];
    const c = clarificationGates.find((x) => x.id === id);
    if (c)
      return [
        {
          id,
          label: `${c.ticketId} · Clarification`,
          sublabel: c.agentId,
          icon: MessageCircleQuestion,
          href: `/approvals/${c.id}`,
        },
      ];
    const i = INCIDENTS.find((x) => x.id === id);
    if (i)
      return [
        { id, label: i.title, sublabel: i.severity, icon: Siren, href: `/incidents?incident=${i.id}` },
      ];
    const h = humans.find((x) => x.id === id);
    if (h) return [{ id, label: h.name, sublabel: h.role, icon: User, href: `/pod?human=${h.id}` }];
    const p = pods.find((x) => x.id === id);
    if (p)
      return [
        {
          id,
          label: p.name,
          sublabel: p.id === activePodId ? "active pod" : "pod",
          icon: Boxes,
          podId: p.id,
        },
      ];
    return [];
  });

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search runs, gates, people, incidents…  (⌘K)"
        />
        <CommandList>
          <CommandEmpty>
            No results for “{query}”. Try a ticket id (AM-142), a name, or “gates”.
          </CommandEmpty>

          <CommandGroup heading="Quick actions">
            <CommandItem value="action new pod fire up" onSelect={() => go("/pods/new")}>
              <Rocket className="mr-2 size-4 text-muted-foreground" />
              <span>New pod</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">/pods/new</span>
            </CommandItem>
            <CommandItem value="action go to command center home" onSelect={() => go("/")}>
              <LayoutDashboard className="mr-2 size-4 text-muted-foreground" />
              <span>Go to Command Center</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">/</span>
            </CommandItem>
            <CommandItem value="action review gates approvals" onSelect={() => go("/approvals")}>
              <CheckCircle2 className="mr-2 size-4 text-muted-foreground" />
              <span>Review gates</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">/approvals</span>
            </CommandItem>
            <CommandItem
              value="action pause pod"
              onSelect={() => {
                setOpen(false);
                setPauseConfirm(true);
              }}
            >
              <PauseCircle className="mr-2 size-4 text-muted-foreground" />
              <span>Pause pod</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                {activePod?.name ?? ""}
              </span>
            </CommandItem>
            <CommandItem
              value="action open product brief pitch presentation"
              onSelect={() => {
                setOpen(false);
                window.open("/pitch", "_blank", "noopener");
              }}
            >
              <Presentation className="mr-2 size-4 text-muted-foreground" />
              <span>Open product brief</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                /pitch ↗
              </span>
            </CommandItem>
          </CommandGroup>

          {query.trim() === "" && recentItems.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Recent">
                {recentItems.map((r) => (
                  <CommandItem
                    key={`recent-${r.id}`}
                    value={`recent ${r.id} ${r.label}`}
                    onSelect={() => {
                      if (r.podId) {
                        setOpen(false);
                        setActivePod(r.podId);
                        toast.success(`Switched to ${r.label}`);
                      } else if (r.href) {
                        go(r.href);
                      }
                    }}
                  >
                    <History className="mr-2 size-4 text-muted-foreground" />
                    <span className="truncate">{r.label}</span>
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                      {r.sublabel}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />

          <CommandGroup heading="Navigate">
            {NAV.flatMap((g) => g.items).map((item) => (
              <CommandItem
                key={`nav-${item.to}-${item.label}`}
                value={`nav ${item.label} ${item.to}`}
                onSelect={() => go(item.to)}
              >
                <item.icon className="mr-2 size-4 text-muted-foreground" />
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">{item.to}</span>
              </CommandItem>
            ))}
            <CommandItem value="nav Settings /settings" onSelect={() => go(SETTINGS_ITEM.to)}>
              <SETTINGS_ITEM.icon className="mr-2 size-4 text-muted-foreground" />
              <span>{SETTINGS_ITEM.label}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">/settings</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Gates">
            {approvals.map((a) => (
              <CommandItem
                key={`gate-${a.id}`}
                value={`gate ${a.ticketId} ${a.gate} ${a.artifact} ${a.approver}`}
                onSelect={() => go(`/approvals/${a.id}`)}
              >
                <CheckCircle2 className="mr-2 size-4 text-muted-foreground" />
                <span>
                  {a.ticketId} · {a.gate}
                </span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {a.approver}
                </span>
              </CommandItem>
            ))}
            {clarificationGates.map((c) => (
              <CommandItem
                key={`gate-${c.id}`}
                value={`gate clarification ${c.ticketId} ${c.question}`}
                onSelect={() => go(`/approvals/${c.id}`)}
              >
                <MessageCircleQuestion className="mr-2 size-4 text-muted-foreground" />
                <span>{c.ticketId} · Clarification</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {c.agentId}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Tickets">
            {tickets.map((t) => (
              <CommandItem
                key={`tkt-${t.id}`}
                value={`ticket ${t.id} ${t.title} ${t.stage}`}
                onSelect={() => go(`/pipeline?ticket=${t.id}`)}
              >
                <TicketIcon className="mr-2 size-4 text-muted-foreground" />
                <span>
                  {t.id} · {t.title}
                </span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">{t.stage}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Artifacts">
            {approvals.map((a) => (
              <CommandItem
                key={`art-${a.id}`}
                value={`artifact ${a.artifact} ${a.ticketId}`}
                onSelect={() => go(`/approvals/${a.id}`)}
              >
                <FileText className="mr-2 size-4 text-muted-foreground" />
                <span>{a.artifact}</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">at gate</span>
              </CommandItem>
            ))}
            {agents.map((a) => (
              <CommandItem
                key={`art-agent-${a.id}`}
                value={`artifact ${a.lastArtifact} ${a.name}`}
                onSelect={() => go(`/agents/${a.id}`)}
              >
                <FileText className="mr-2 size-4 text-muted-foreground" />
                <span>{a.lastArtifact}</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">{a.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Incidents">
            {INCIDENTS.filter((i) => i.status !== "resolved").map((i) => (
              <CommandItem
                key={`inc-${i.id}`}
                value={`incident ${i.id} ${i.title} ${i.type} ${i.ticketId ?? ""}`}
                onSelect={() => go(`/incidents?incident=${i.id}`)}
              >
                <Siren className="mr-2 size-4 text-muted-foreground" />
                <span className="truncate">{i.title}</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground uppercase">
                  {i.severity}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="People">
            {humans.map((h) => (
              <CommandItem
                key={`person-${h.id}`}
                value={`person ${h.name} ${h.role}`}
                onSelect={() => go(`/pod?human=${h.id}`)}
              >
                <User className="mr-2 size-4 text-muted-foreground" />
                <span>{h.name}</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">{h.role}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Connections">
            {CONNECTORS.map((c) => (
              <CommandItem
                key={`conn-${c.id}`}
                value={`connection ${c.name} ${c.category}`}
                onSelect={() => go(`/connections?tool=${c.id}`)}
              >
                <PlugZap className="mr-2 size-4 text-muted-foreground" />
                <span>{c.name}</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {c.availability === "live" ? c.category : "roadmap"}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Pods">
            {pods.map((p) => (
              <CommandItem
                key={`pod-${p.id}`}
                value={`pod ${p.name} ${p.id}`}
                onSelect={() => {
                  setOpen(false);
                  setActivePod(p.id);
                  toast.success(`Switched to ${p.name}`);
                }}
              >
                <Boxes className="mr-2 size-4 text-muted-foreground" />
                <span>{p.name}</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {p.id === activePodId ? "active" : p.sample ? "sample" : p.status}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>

        <div className="border-t border-border px-3 py-2 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span>↵ open</span>
          <span>·</span>
          <span>esc close</span>
          <div className="flex-1" />
          <span>searching {activePod?.name ?? "all pods"}</span>
        </div>
      </CommandDialog>

      <AlertDialog open={pauseConfirm} onOpenChange={setPauseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause {activePod?.name ?? "this pod"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Agents finish their in-flight runs, then stop picking up work. Open gates stay
              open and humans keep full access. You can resume any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                toast.success(
                  `${activePod?.name ?? "Pod"} paused — agents wind down after in-flight runs`,
                )
              }
            >
              Pause pod
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
