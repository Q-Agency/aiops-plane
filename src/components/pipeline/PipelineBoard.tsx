import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun, RotateCcw, Bot, User2, Repeat2, Plus } from "lucide-react";
import { useLive } from "@/hooks/useLiveTicker";
import type { Stage, Ticket, AgentId } from "@/mock/types";
import { cn } from "@/lib/utils";
import { accountableFor } from "@/mock/humans";

type ColKind = "queue" | "agent" | "review" | "done";
interface Col {
  id: Stage;
  label: string;
  kind: ColKind;
  agent?: AgentId;
  agentName?: string;
  prev?: Stage; // for rejection back-arrow
}

const COLS: Col[] = [
  { id: "backlog",       label: "Backlog",          kind: "queue" },
  { id: "ready-spec",    label: "Ready for Spec",   kind: "agent",  agent: "ba",       agentName: "BA" },
  { id: "spec-review",   label: "Spec Review",      kind: "review", prev: "ready-spec" },
  { id: "ready-design",  label: "Ready for Design", kind: "agent",  agent: "sa",       agentName: "SA" },
  { id: "design-review", label: "Design Review",    kind: "review", prev: "ready-design" },
  { id: "ready-tasks",   label: "Ready for Tasks",  kind: "agent",  agent: "tasklist", agentName: "Tasklist" },
  { id: "tasks-review",  label: "Tasks Review",     kind: "review", prev: "ready-tasks" },
  { id: "ready-dev",     label: "Ready for Dev",    kind: "agent",  agent: "dev",      agentName: "Dev" },
  { id: "dev-review",    label: "Dev Review",       kind: "review", prev: "ready-dev" },
  { id: "ready-qa",      label: "Ready for QA",     kind: "agent",  agent: "qa",       agentName: "QA" },
  { id: "qa-review",     label: "QA Review",        kind: "review", prev: "ready-qa" },
  { id: "done",          label: "Done",             kind: "done" },
];

const codebaseChip: Record<string, string> = {
  backend: "bg-agent-sa/15 text-agent-sa border-agent-sa/30",
  web:     "bg-agent-ba/15 text-agent-ba border-agent-ba/30",
  mobile:  "bg-agent-qa/15 text-agent-qa border-agent-qa/30",
};
const priorityChip: Record<string, string> = {
  P0: "text-status-error border-status-error/40 bg-status-error/10",
  P1: "text-status-waiting border-status-waiting/40 bg-status-waiting/10",
  P2: "text-status-running border-status-running/40 bg-status-running/10",
  P3: "text-muted-foreground border-border bg-white/5",
};

// extra seed tickets so every column is populated
const extraTickets: Ticket[] = [
  { id: "AM-152", title: "Listing reports moderation",  stage: "backlog",       state: "idle",    approver: "Luka",   codebase: "backend", priority: "P2", overnightEligible: false, createdAt: 0, updatedAt: 0 },
  { id: "AM-151", title: "Seller dashboard analytics",  stage: "ready-spec",    state: "running", approver: "Marin",  codebase: "web",     priority: "P1", overnightEligible: false, createdAt: 0, updatedAt: 0 },
  { id: "AM-148", title: "Saved-search digest email",   stage: "ready-design",  state: "running", approver: "Ana",    codebase: "backend", priority: "P2", overnightEligible: true,  createdAt: 0, updatedAt: 0 },
  { id: "AM-146", title: "Inbox unread badges",         stage: "ready-tasks",   state: "running", approver: "Iva",    codebase: "mobile",  priority: "P3", overnightEligible: true,  createdAt: 0, updatedAt: 0 },
  { id: "AM-143", title: "Stripe Connect onboarding",   stage: "ready-dev",     state: "running", approver: "Petar",  codebase: "backend", priority: "P0", overnightEligible: false, createdAt: 0, updatedAt: 0 },
  { id: "AM-137", title: "Push notification settings",  stage: "ready-qa",      state: "running", approver: "Luka",   codebase: "mobile",  priority: "P2", overnightEligible: true,  createdAt: 0, updatedAt: 0, rerunCount: 1 },
  { id: "AM-134", title: "Search results pagination",   stage: "qa-review",     state: "waiting", approver: "Iva",    codebase: "web",     priority: "P2", overnightEligible: false, createdAt: 0, updatedAt: 0 },
  { id: "AM-132", title: "Saved cards management",      stage: "done",          state: "approved",approver: "Zlatko", codebase: "web",     priority: "P1", overnightEligible: false, createdAt: 0, updatedAt: 0 },
  { id: "AM-129", title: "Geo radius filter",           stage: "done",          state: "approved",approver: "Ana",    codebase: "web",     priority: "P2", overnightEligible: false, createdAt: 0, updatedAt: 0 },
];

function stageProgress(stage: Stage): number {
  const idx = COLS.findIndex((c) => c.id === stage);
  return Math.round(((idx + 1) / COLS.length) * 100);
}

export function PipelineBoard({ highlightTicketId }: { highlightTicketId?: string } = {}) {
  const { tickets: liveTickets, emit } = useLive();
  const [tickets, setTickets] = useState<Ticket[]>(() => [...liveTickets, ...extraTickets]);
  const [overnight, setOvernight] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Stage | null>(null);
  const [confirm, setConfirm] = useState<{ ticket: Ticket; to: Stage } | null>(null);
  const [running, setRunning] = useState<Record<string, true>>({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const grouped = useMemo(() => {
    const map: Record<Stage, Ticket[]> = Object.fromEntries(
      COLS.map((c) => [c.id, [] as Ticket[]]),
    ) as Record<Stage, Ticket[]>;
    tickets.forEach((t) => map[t.stage]?.push(t));
    return map;
  }, [tickets]);

  const moveTicket = (id: string, to: Stage) => {
    setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, stage: to, updatedAt: Date.now() } : t)));
  };

  const onDrop = (to: Stage) => {
    if (!dragId) return;
    const ticket = tickets.find((t) => t.id === dragId);
    setOverCol(null);
    setDragId(null);
    if (!ticket || ticket.stage === to) return;

    const toCol = COLS.find((c) => c.id === to)!;
    if (toCol.kind === "review") {
      setConfirm({ ticket, to });
      return;
    }
    moveTicket(ticket.id, to);
    if (toCol.kind === "agent") {
      setRunning((r) => ({ ...r, [ticket.id]: true }));
      emit(toCol.agent!, ticket.id);
      window.setTimeout(() => {
        setRunning((r) => {
          const { [ticket.id]: _, ...rest } = r;
          return rest;
        });
        // auto-advance to next review column
        const nextIdx = COLS.findIndex((c) => c.id === to) + 1;
        const next = COLS[nextIdx];
        if (next) moveTicket(ticket.id, next.id);
      }, 4000);
    }
  };

  const overnightCount = grouped["ready-dev"].filter((t) => t.overnightEligible).length;

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">project · automarket</div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline Board</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            Tickets flow left → right. Agent columns mean the board event was dispatched to that agent's API and the agent activated. Review columns are human gates.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Work Intake CTA (C10) — how tickets actually enter the pod */}
          <Link
            to="/intake"
            className="h-9 px-3 rounded-md border border-primary/50 bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-primary/25 transition-colors"
          >
            <Plus className="size-3.5" /> Add work
          </Link>
          <div className="glass-panel px-1 py-1 inline-flex text-xs font-mono">
            <button
              onClick={() => setOvernight(false)}
              className={cn("px-3 py-1.5 rounded inline-flex items-center gap-1.5 cursor-pointer transition-colors",
                !overnight ? "bg-status-waiting/15 text-status-waiting" : "text-muted-foreground hover:text-foreground")}
            >
              <Sun className="size-3.5" /> Day
            </button>
            <button
              onClick={() => setOvernight(true)}
              className={cn("px-3 py-1.5 rounded inline-flex items-center gap-1.5 cursor-pointer transition-colors",
                overnight ? "bg-primary/20 text-primary glow-pulse" : "text-muted-foreground hover:text-foreground")}
            >
              <Moon className="size-3.5" /> Night
            </button>
          </div>
        </div>
      </div>

      {overnight && (
        <div className="glass-panel px-4 py-2.5 flex items-center gap-3 anim-in border-primary/30">
          <Moon className="size-4 text-primary" />
          <div className="text-sm">
            <span className="font-semibold text-primary">Overnight run scheduled 22:00 UTC</span>
            <span className="text-muted-foreground"> · Ralph Wiggum loop on 2×H200 · {overnightCount} ticket{overnightCount === 1 ? "" : "s"} queued in Ready for Dev</span>
          </div>
        </div>
      )}

      {/* board */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden scrollbar-thin">
        <div className="flex gap-3 h-full min-w-max pb-2">
          {COLS.map((col) => {
            const items = grouped[col.id] ?? [];
            const isOver = overCol === col.id;
            const agentVar = col.agent ? `var(--agent-${col.agent})` : undefined;
            return (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={() => onDrop(col.id)}
                className={cn(
                  "w-[260px] shrink-0 flex flex-col rounded-xl border transition-colors",
                  "bg-white/[0.015]",
                  isOver ? "border-primary/60 bg-primary/5" : "border-border",
                )}
                style={col.kind === "agent" ? {
                  background: `linear-gradient(180deg, color-mix(in oklab, ${agentVar} 10%, transparent), transparent 60%)`,
                  borderColor: `color-mix(in oklab, ${agentVar} 35%, transparent)`,
                } : col.kind === "review" ? {
                  background: "linear-gradient(180deg, rgba(245,158,11,0.10), transparent 60%)",
                  borderColor: "rgba(245,158,11,0.30)",
                } : undefined}
              >
                {/* column header */}
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider">
                      {col.kind === "agent" && <Bot className="size-3" style={{ color: agentVar }} />}
                      {col.kind === "review" && <User2 className="size-3 text-status-waiting" />}
                      <span className="text-foreground/90">{col.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5">{items.length}</span>
                  </div>
                  <div className="text-[10px] mt-1 font-mono flex items-center gap-1.5">
                    {col.kind === "agent" && (
                      <span style={{ color: agentVar }}>🤖 auto · {col.agentName}</span>
                    )}
                    {col.kind === "review" && (() => {
                      const prevCol = COLS.find((c) => c.id === col.prev);
                      const aid = (prevCol?.agent ?? "ba") as AgentId;
                      const human = accountableFor(aid);
                      const color = `var(--agent-${aid})`;
                      return (
                        <span className="inline-flex items-center gap-1.5 text-foreground/90">
                          <span
                            className="size-4 rounded-full grid place-items-center text-[8px] font-semibold border"
                            style={{
                              color,
                              borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
                              background: `color-mix(in oklab, ${color} 14%, transparent)`,
                            }}
                          >{human.initials}</span>
                          <span className="truncate" title={`Accountable: ${human.name}`}>{human.name}</span>
                        </span>
                      );
                    })()}
                    {col.kind === "queue" && <span className="text-muted-foreground">inbox</span>}
                    {col.kind === "done" && <span className="text-status-done">✓ shipped</span>}
                  </div>
                </div>

                {/* cards */}
                <div className="px-2 pb-2 flex-1 overflow-y-auto scrollbar-thin space-y-2 min-h-[80px]">
                  {/* empty Backlog → Work Intake (every add-work CTA deep-links to /intake) */}
                  {col.id === "backlog" && items.length === 0 && (
                    <Link
                      to="/intake"
                      className="block rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      No work yet — add a ticket or connect Teamwork/Jira.
                      <span className="mt-1.5 inline-flex items-center gap-1 text-primary font-semibold">
                        Add work →
                      </span>
                    </Link>
                  )}
                  {items.map((t) => (
                    <TicketCard
                      key={t.id}
                      t={t}
                      col={col}
                      overnight={overnight}
                      isRunning={!!running[t.id]}
                      flagged={t.id === highlightTicketId}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onReject={() => col.prev && moveTicket(t.id, col.prev)}
                      mounted={mounted}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* confirm dialog */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm anim-in"
          onClick={() => setConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel p-6 max-w-sm w-full mx-4 border-primary/40"
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">human gate</div>
            <div className="text-lg font-semibold mt-1">Approve gate?</div>
            <div className="text-sm text-muted-foreground mt-2">
              Move <span className="font-mono text-foreground">{confirm.ticket.id}</span> · "{confirm.ticket.title}" into{" "}
              <span className="font-semibold text-foreground">{COLS.find((c) => c.id === confirm.to)?.label}</span>?
            </div>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => setConfirm(null)}
                className="h-9 px-3 rounded-md text-sm border border-border hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { moveTicket(confirm.ticket.id, confirm.to); setConfirm(null); }}
                className="h-9 px-4 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({
  t, col, overnight, isRunning, flagged, onDragStart, onDragEnd, onReject, mounted,
}: {
  t: Ticket;
  col: Col;
  overnight: boolean;
  isRunning: boolean;
  /** ?ticket=<id> deep link from Work Intake — draws the highlight ring. */
  flagged?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onReject: () => void;
  mounted: boolean;
}) {
  const highlight = overnight && col.id === "ready-dev" && t.overnightEligible;
  const ageMin = mounted && t.updatedAt ? Math.max(0, Math.floor((Date.now() - t.updatedAt) / 60_000)) : null;
  const ageLabel = ageMin === null ? "—" : ageMin < 60 ? `${ageMin}m` : `${Math.floor(ageMin / 60)}h ${ageMin % 60}m`;
  const ageTone =
    ageMin === null ? "text-muted-foreground border-border" :
    ageMin < 60 ? "text-status-done border-status-done/40 bg-status-done/10" :
    ageMin < 360 ? "text-status-waiting border-status-waiting/40 bg-status-waiting/10" :
    "text-status-error border-status-error/40 bg-status-error/10";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative rounded-md border bg-panel/60 p-2.5 cursor-grab active:cursor-grabbing hover-lift",
        "border-border hover:border-primary/40",
        highlight && "border-primary/60 shadow-[0_0_24px_-6px_rgba(108,99,255,0.6)]",
        flagged && "border-primary/70 ring-1 ring-primary/50 shadow-[0_0_24px_-6px_var(--primary)]",
      )}
    >
      {isRunning && (
        <div className="absolute inset-0 rounded-md pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-30"
               style={{ background: "linear-gradient(110deg, transparent 30%, rgba(108,99,255,0.6) 50%, transparent 70%)",
                        backgroundSize: "200% 100%",
                        animation: "edge-flow 1.4s linear infinite" }} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[11px] text-muted-foreground">{t.id}</span>
          <span className={cn("text-[9px] font-mono uppercase border rounded px-1", codebaseChip[t.codebase])}>
            {t.codebase}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {t.overnightEligible && (
            <span title="Overnight-eligible" className="text-[10px]">🌙</span>
          )}
          <span className={cn("text-[9px] font-mono border rounded px-1", priorityChip[t.priority])}>
            {t.priority}
          </span>
        </div>
      </div>

      <div className="mt-1.5 text-[13px] leading-snug text-foreground/95 line-clamp-2">
        {t.title}
      </div>

      {/* progress */}
      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full"
             style={{ width: `${stageProgress(t.stage)}%`,
                      background: col.agent ? `var(--agent-${col.agent})` :
                                  col.kind === "review" ? "var(--status-waiting)" :
                                  col.kind === "done" ? "var(--status-done)" : "var(--primary)" }} />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {col.kind === "review" && (
            <>
              <User2 className="size-3" />
              <span className="text-foreground/80">{t.approver}</span>
              <span className={cn("border rounded px-1 ml-1", ageTone)}>{ageLabel}</span>
            </>
          )}
          {col.kind === "agent" && isRunning && (
            <span className="text-primary inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-primary dot-pulse" /> agent running…
            </span>
          )}
          {col.kind === "agent" && !isRunning && (
            <span>queued · dispatch pending</span>
          )}
          {col.kind === "queue" && <span>unassigned</span>}
          {col.kind === "done" && <span className="text-status-done">approved</span>}
        </div>

        {t.rerunCount && t.rerunCount > 0 ? (
          <span title={`Rejected ${t.rerunCount}× and rerun`}
                className="inline-flex items-center gap-1 text-status-waiting border border-status-waiting/40 bg-status-waiting/10 rounded px-1">
            <Repeat2 className="size-3" /> rerun {t.rerunCount}
          </span>
        ) : null}
      </div>

      {/* rejection back-arrow */}
      {col.kind === "review" && col.prev && (
        <button
          onClick={onReject}
          title="Reject → returns with feedback as added context"
          className="absolute -left-2 top-3 size-6 rounded-full border border-dashed border-status-error/60 bg-background text-status-error grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-status-error/10"
        >
          <RotateCcw className="size-3" />
        </button>
      )}
    </div>
  );
}
