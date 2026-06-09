/**
 * FIRE UP step 4 — Accountable People (body only; chrome from WizardShell).
 *
 * LEFT (~30%): roster rail — org humans (src/mock/humans.ts) + invited
 * people as draggable cards, "Invite by email" pinned on top. Each card
 * shows a load chip ("covers N agents" — one human can cover several).
 * RIGHT (~70%): accountability matrix — one column per selected agent
 * (agent-colored header), one row of assignment slots. Assign by HTML5
 * drag or the per-column Select. An empty column renders the red
 * "⚠ uncovered" risk treatment.
 *
 * Gating per D2: warn-not-block. The WizardShell footer shows the amber
 * "{n} uncovered — you'll be blocked at launch" chip; Readiness is the
 * single hard gate. Assignments persist via usePods().updateDraft.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bot, CheckCircle2, MailPlus, ShieldCheck, Users, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePods } from "@/lib/pods/pod-store";
import { catalogEntry, TOGGLABLE_IDS } from "@/mock/catalog";
import type { ChainRoleId } from "@/mock/chain";
import { agents } from "@/mock/agents";
import { humans } from "@/mock/humans";
import { InviteDialog, type InvitedPerson } from "./InviteDialog";

const INVITE_SENTINEL = "__invite__";

interface Person {
  id: string;
  name: string;
  role: string;
  initials: string;
  /** CSS color value (var(--agent-*) for org humans, var(--primary) for invited). */
  color: string;
  invited: boolean;
}

function orgColor(primaryAgentId: string): string {
  const a = agents.find((x) => x.id === primaryAgentId);
  return a ? `var(--${a.color})` : "var(--primary)";
}

function PersonAvatar({ person, size = "size-9" }: { person: Person; size?: string }) {
  return (
    <span
      className={cn(
        size,
        "rounded-full grid place-items-center font-mono font-semibold text-xs border shrink-0",
      )}
      style={{
        color: person.color,
        borderColor: `color-mix(in oklab, ${person.color} 50%, transparent)`,
        background: `color-mix(in oklab, ${person.color} 12%, transparent)`,
      }}
    >
      {person.initials}
    </span>
  );
}

export function StepPeople() {
  const { draft, hydrated, updateDraft } = usePods();
  const [invited, setInvited] = useState<InvitedPerson[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<ChainRoleId | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<ChainRoleId | null>(null);

  const agentIds = useMemo(
    () => TOGGLABLE_IDS.filter((id) => draft?.agentIds.includes(id)),
    [draft?.agentIds],
  );
  const accountability = draft?.accountability ?? {};

  const people: Person[] = useMemo(
    () => [
      ...humans.map((h) => ({
        id: h.id,
        name: h.name,
        role: h.role,
        initials: h.initials,
        color: orgColor(h.primaryAgentId),
        invited: false,
      })),
      ...invited.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        initials: p.initials,
        color: "var(--primary)",
        invited: true,
      })),
    ],
    [invited],
  );
  const personById = (id: string | null | undefined): Person | null =>
    people.find((p) => p.id === id) ?? null;

  const coversCount = (personId: string) =>
    agentIds.filter((a) => accountability[a] === personId).length;

  const covered = agentIds.filter((a) => Boolean(accountability[a]));
  const uncoveredCount = agentIds.length - covered.length;

  const assign = (agentId: ChainRoleId, personId: string, personName?: string) => {
    const prev = accountability[agentId] ?? null;
    if (prev === personId) return;
    updateDraft({ accountability: { ...accountability, [agentId]: personId } });
    if (prev) {
      const name = personName ?? personById(personId)?.name ?? personId;
      toast(`Reassigned ${catalogEntry(agentId).name} to ${name}`);
    }
  };

  const clear = (agentId: ChainRoleId) => {
    updateDraft({ accountability: { ...accountability, [agentId]: null } });
  };

  const handleInvite = (person: InvitedPerson) => {
    setInvited((list) => [...list, person]);
    if (inviteTarget) {
      assign(inviteTarget, person.id, person.name);
      setInviteTarget(null);
    }
  };

  /* ---------------- honest states ---------------- */

  if (!hydrated) {
    return (
      <div className="grid gap-4 lg:grid-cols-[3fr_7fr]">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-md" />
      </div>
    );
  }

  if (agentIds.length === 0) {
    return (
      <section className="rounded-md border border-dashed border-border bg-panel/40 backdrop-blur-md min-h-[320px] p-10 flex flex-col items-center justify-center gap-3 text-center">
        <div className="size-10 rounded-md bg-primary/10 border border-primary/30 grid place-items-center text-primary">
          <Bot className="size-5" />
        </div>
        <div className="text-sm font-medium">No agents selected yet</div>
        <p className="text-xs text-muted-foreground max-w-md">
          Accountability maps one human onto each agent — pick the pod&apos;s agents first, then
          come back to cover them.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to="/pods/new" search={{ step: "agents" }}>
            Back to Agents
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* Coverage banner */}
      <Alert
        className={cn(
          "backdrop-blur-md",
          covered.length === 0
            ? "border-status-error/40 bg-status-error/10"
            : uncoveredCount > 0
              ? "border-status-waiting/40 bg-status-waiting/10"
              : "border-status-done/40 bg-status-done/10",
        )}
      >
        {covered.length === 0 ? (
          <AlertTriangle className="size-4 text-status-error" />
        ) : uncoveredCount > 0 ? (
          <AlertTriangle className="size-4 text-status-waiting" />
        ) : (
          <CheckCircle2 className="size-4 text-status-done" />
        )}
        <AlertDescription
          className={cn(
            "text-xs",
            covered.length === 0
              ? "text-status-error"
              : uncoveredCount > 0
                ? "text-status-waiting"
                : "text-status-done",
          )}
        >
          {covered.length === 0
            ? "No agents covered yet — drag a person onto each agent."
            : uncoveredCount > 0
              ? `${covered.length} of ${agentIds.length} covered · ${uncoveredCount} uncovered`
              : "Every agent has an accountable human. ✓"}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[3fr_7fr] items-start">
        {/* Roster rail */}
        <div className="rounded-md border border-border bg-panel/40 backdrop-blur-md">
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground flex-1">
              People
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setInviteTarget(null);
                setInviteOpen(true);
              }}
            >
              <MailPlus className="size-3.5" />
              Invite by email
            </Button>
          </div>
          <div className="p-2 space-y-1.5">
            {people.map((p) => {
              const covers = coversCount(p.id);
              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", p.id);
                    e.dataTransfer.effectAllowed = "copy";
                    setDragId(p.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border border-border bg-white/[0.03] px-2.5 py-2 cursor-grab active:cursor-grabbing select-none transition-colors hover:bg-white/[0.06]",
                    dragId === p.id && "opacity-50 ring-1 ring-primary/50",
                  )}
                >
                  <PersonAvatar person={p} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{p.name}</span>
                      {p.invited && (
                        <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-px rounded border border-primary/40 bg-primary/10 text-primary shrink-0">
                          Invited · link active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.role}</div>
                  </div>
                  {covers > 0 && (
                    <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground shrink-0">
                      covers {covers} agent{covers === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-3 py-2 border-t border-border text-[10px] font-mono text-muted-foreground">
            Drag a card onto an agent column — or use the column select.
          </div>
        </div>

        {/* Accountability matrix */}
        <div className="rounded-md border border-border bg-panel/40 backdrop-blur-md">
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Accountability matrix · {agentIds.length} agents
            </span>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <div className="flex min-w-max">
              {agentIds.map((agentId) => {
                const entry = catalogEntry(agentId);
                const color = `var(--${entry.color})`;
                const assignee = personById(accountability[agentId]);
                const uncovered = !assignee;
                const isOver = overId === agentId;
                return (
                  <div
                    key={agentId}
                    className={cn(
                      "w-[164px] shrink-0 border-r border-border last:border-r-0 flex flex-col",
                      uncovered && "bg-status-error/[0.07]",
                    )}
                  >
                    {/* Column header */}
                    <div
                      className="px-2.5 pt-2.5 pb-2 border-b border-border border-t-2"
                      style={{ borderTopColor: color }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] uppercase tracking-wider font-mono truncate flex-1"
                          style={{ color }}
                        >
                          {entry.name}
                        </span>
                        {assignee && <PersonAvatar person={assignee} size="size-5" />}
                      </div>
                      <div className="mt-0.5 text-[9px] font-mono h-3.5">
                        {uncovered ? (
                          <span className="text-status-error">⚠ uncovered</span>
                        ) : (
                          <span className="text-status-done">covered</span>
                        )}
                      </div>
                    </div>

                    {/* Assignment slot (drop target) */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "copy";
                        setOverId(agentId);
                      }}
                      onDragLeave={() => setOverId((v) => (v === agentId ? null : v))}
                      onDrop={(e) => {
                        e.preventDefault();
                        const personId = e.dataTransfer.getData("text/plain");
                        if (personId && personById(personId)) assign(agentId, personId);
                        setOverId(null);
                        setDragId(null);
                      }}
                      className={cn(
                        "m-2 rounded-md border p-2 flex flex-col gap-2 min-h-[92px] transition-colors",
                        assignee ? "border-border bg-white/[0.03]" : "border-dashed border-border",
                        uncovered && !dragId && "border-status-error/40",
                        dragId && "border-primary/40 bg-primary/5",
                        isOver && "border-primary bg-primary/15 shadow-[0_0_8px_var(--primary)]",
                      )}
                    >
                      {assignee ? (
                        <div className="flex items-start gap-2">
                          <PersonAvatar person={assignee} size="size-7" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-medium leading-tight truncate">
                              {assignee.name}
                            </div>
                            <div className="text-[9px] text-muted-foreground truncate">
                              {assignee.role}
                            </div>
                          </div>
                          <button
                            type="button"
                            title={`Clear ${entry.name} owner`}
                            onClick={() => clear(agentId)}
                            className="text-muted-foreground hover:text-status-error transition-colors shrink-0"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 grid place-items-center text-[10px] text-muted-foreground text-center px-1">
                          {dragId ? "Drop to assign" : "No accountable human"}
                        </div>
                      )}

                      <Select
                        value={accountability[agentId] ?? ""}
                        onValueChange={(v) => {
                          if (v === INVITE_SENTINEL) {
                            setInviteTarget(agentId);
                            setInviteOpen(true);
                            return;
                          }
                          assign(agentId, v);
                        }}
                      >
                        <SelectTrigger className="h-7 w-full text-[11px] bg-white/5 border-border">
                          <SelectValue placeholder="Assign accountable →" />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.name}
                              {p.invited ? " · invited" : ""}
                            </SelectItem>
                          ))}
                          <SelectSeparator />
                          <SelectItem value={INVITE_SENTINEL} className="text-xs text-primary">
                            Invite someone new…
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-3 py-2 border-t border-border text-[10px] font-mono text-muted-foreground">
            Filled = accountable · empty column = uncovered risk. One human can cover several
            agents.
          </div>
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) setInviteTarget(null);
        }}
        onInvite={handleInvite}
      />
    </div>
  );
}
