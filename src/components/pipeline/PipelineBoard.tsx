import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun, RotateCcw, Bot, User2, Repeat2, Inbox, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useLive } from "@/hooks/useLiveTicker";
import type { Stage, Ticket, AgentId } from "@/mock/types";
import { cn } from "@/lib/utils";
import { accountableFor } from "@/mock/humans";
import { appendAuditMock } from "@/mock/audit-bridge";
import { bumpDemo, useDemoTick } from "@/mock/demo-bus";
import { TRIGGER_RULE, WRITE_BACK_MAPPING } from "@/mock/trigger";

/** Reject canon (same floor as the gate surfaces): a typed reason is required. */
const REJECT_REASON_MIN = 10;

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

/* ------------------------------------------------------------------ */
/* Tracker boundary (vision §2) - this board is the EXECUTION view.     */
/* Tickets LIVE in Teamwork (we never create/edit/close them); we       */
/* mirror them here and write plain status + artifact links back via    */
/* WRITE_BACK_MAPPING (trigger.ts) so nobody is ever asked twice.       */
/* ------------------------------------------------------------------ */

const wbStatus = (needle: string, fallback: string) =>
  WRITE_BACK_MAPPING.find((m) => m.podStage.toLowerCase().includes(needle))?.trackerStatus ?? fallback;
const WB_PICKUP = wbStatus("pickup", "In Progress");
const WB_GATE = wbStatus("gate", "In Review");
const WB_DONE = wbStatus("released", "Done + artifact links");

/** Tooltip body - the full moment→status mapping, built from the canon module. */
const WB_DETAIL =
  `Write-back to Teamwork · board "${TRIGGER_RULE.board}" - ` +
  WRITE_BACK_MAPPING.map((m) => `${m.podStage} → "${m.trackerStatus}"`).join(" · ") +
  ". Plain status + artifact links are posted on the ticket automatically, [PodOps]-tagged so the listener ignores our own moves. Tickets live in your tracker - we never create, edit or close them.";

/** Stage-derived write-back state for a card (column kind ⇄ mapping moment). */
function writeBackFor(kind: ColKind): { label: string; pending?: boolean } {
  switch (kind) {
    case "agent":  return { label: `↩ wrote back: ${WB_PICKUP}` };
    case "review": return { label: `↩ ${WB_GATE}` };
    case "done":   return { label: `↩ ${WB_DONE}` };
    default:       return { label: "↩ no write-back yet", pending: true };
  }
}

export function PipelineBoard({ highlightTicketId }: { highlightTicketId?: string } = {}) {
  const { tickets: liveTickets } = useLive();
  // Demo-bus tick: Demo Director beats (e.g. "AM-142 arrives · BA picks it up")
  // mutate the live mock arrays in place - subscribe so the beat repaints here.
  const demoTick = useDemoTick();
  const [tickets, setTickets] = useState<Ticket[]>(() => [...liveTickets, ...extraTickets]);
  const [overnight, setOvernight] = useState(false);
  // Reject = a DECISION, not a drag (vision §2: no freeform stage moves) -
  // the typed reason is required and lands on the session ledger. `target`
  // is the root-cause stage: rework follows the artifact chain, so the
  // reject can aim at ANY upstream agent stage (QA finds a design flaw →
  // send back to Design); everything downstream is invalidated by the
  // consumes-graph and re-runs forward.
  const [rejecting, setRejecting] = useState<{ ticket: Ticket; prev: Stage; target: Stage } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Adopt tickets that entered the pod AFTER mount (intake pulls / staged
  // arrivals unshift into the live seed array - same reference the provider
  // holds). Same-reference return bails out of the state update when quiet.
  useEffect(() => {
    setTickets((ts) => {
      const known = new Set(ts.map((t) => t.id));
      const arrivals = liveTickets.filter((t) => !known.has(t.id));
      return arrivals.length ? [...arrivals, ...ts] : ts;
    });
  }, [demoTick, liveTickets]);

  const grouped = useMemo(() => {
    const map: Record<Stage, Ticket[]> = Object.fromEntries(
      COLS.map((c) => [c.id, [] as Ticket[]]),
    ) as Record<Stage, Ticket[]>;
    tickets.forEach((t) => map[t.stage]?.push(t));
    return map;
    // demoTick: restage beats mutate ticket objects in place - regroup on tick
  }, [tickets, demoTick]);

  // Stage changes happen ONLY as consequences of decisions/events (vision §2
  // "no freeform stage moves"): the demo director + live ticker move cards as
  // agents finish; the reject dialog below moves them back with a typed
  // reason. There is deliberately NO drag-and-drop on this board.
  // Reject = the target agent re-runs (state "running") and the rerun is
  // counted - the rerun chip on the card is the visible rework cost.
  // Mutates IN PLACE (the state array holds the live seed objects - same
  // idiom as the Demo Director's restage beats) so the decision survives
  // navigating away and back; the demo-bus tick triggers the regroup.
  const applyReject = (id: string, to: Stage) => {
    const src = tickets.find((t) => t.id === id);
    if (!src) return;
    src.stage = to;
    src.state = "running";
    src.rerunCount = (src.rerunCount ?? 0) + 1;
    src.updatedAt = Date.now();
    bumpDemo();
  };

  const overnightCount = grouped["ready-dev"].filter((t) => t.overnightEligible).length;

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">project · automarket</div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline Board</h1>
          {/* tracker-boundary subline (vision §2) - execution view, never a second kanban */}
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-1">
            <span>
              Execution view - your tracker stays the system of record. Plain status + artifact links write back automatically.
              Cards move as agents finish and gates clear - no dragging; decisions happen on the gate surfaces.
            </span>
            <span
              title={WB_DETAIL}
              className="font-mono text-[10px] text-foreground/80 border border-border/60 bg-white/[0.03] rounded px-1.5 py-px whitespace-nowrap cursor-default"
            >
              tracker: Teamwork · write-back on
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground/70 mt-1">
            Tickets flow left → right. Agent columns mean the board event was dispatched to that agent's API and the agent activated. Review columns are human gates.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Work Intake CTA (C10) - where board arrivals are confirmed; never "add" */}
          <Link
            to="/intake"
            className="h-9 px-3 rounded-md border border-primary/50 bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-primary/25 transition-colors"
          >
            <Inbox className="size-3.5" /> Work intake
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
            const agentVar = col.agent ? `var(--agent-${col.agent})` : undefined;
            return (
              <div
                key={col.id}
                className={cn(
                  "w-[260px] shrink-0 flex flex-col rounded-xl border transition-colors",
                  "bg-white/[0.015] border-border",
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
                      No work yet - tickets arrive when your board sends them.
                      <span className="mt-1.5 inline-flex items-center gap-1 text-primary font-semibold">
                        Open Work intake →
                      </span>
                    </Link>
                  )}
                  {items.map((t) => (
                    <TicketCard
                      key={t.id}
                      t={t}
                      col={col}
                      overnight={overnight}
                      isRunning={t.state === "running"}
                      flagged={t.id === highlightTicketId}
                      onReject={() => {
                        if (!col.prev) return;
                        setRejectReason("");
                        setRejecting({ ticket: t, prev: col.prev, target: col.prev });
                      }}
                      mounted={mounted}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* reject dialog - a decision with a typed reason, never a freeform move.
          Rework follows the artifact chain: the reject targets the ROOT-CAUSE
          stage (default: the gate's own agent); picking an earlier stage
          invalidates everything downstream (consumes-graph) - it re-runs
          forward. Repeated bounces escalate to the accountable human. */}
      {rejecting && (() => {
        const gateIdx = COLS.findIndex((c) => c.id === rejecting.ticket.stage);
        const upstream = COLS.filter((c, i) => c.kind === "agent" && i < gateIdx);
        const targetIdx = COLS.findIndex((c) => c.id === rejecting.target);
        const stale = upstream.filter((c) => COLS.findIndex((x) => x.id === c.id) > targetIdx);
        const targetCol = COLS.find((c) => c.id === rejecting.target);
        const nextRerun = (rejecting.ticket.rerunCount ?? 0) + 1;
        return (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm anim-in"
          onClick={() => setRejecting(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel p-6 max-w-md w-full mx-4 border-status-error/40"
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">human gate</div>
            <div className="text-lg font-semibold mt-1">Reject - send back to the root cause</div>
            <div className="text-sm text-muted-foreground mt-2">
              <span className="font-mono text-foreground">{rejecting.ticket.id}</span> · "
              {rejecting.ticket.title}" - which stage caused it? Rework follows the artifact
              chain.
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Send back to">
              {upstream.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={rejecting.target === c.id}
                  onClick={() => setRejecting({ ...rejecting, target: c.id })}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer",
                    rejecting.target === c.id
                      ? "border-status-error/60 bg-status-error/15 text-status-error"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  {c.agentName} · {c.label}
                  {c.id === rejecting.prev && <span className="opacity-60"> (this gate)</span>}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-mono text-muted-foreground">
              {stale.length === 0
                ? `${targetCol?.agentName} re-runs with your note as added context.`
                : `${targetCol?.agentName} re-runs first - downstream ${stale
                    .map((c) => c.agentName)
                    .join(", ")} ${stale.length === 1 ? "is" : "are"} stale (the chain consumes upstream artifacts) and re-run${stale.length === 1 ? "s" : ""} forward.`}
            </p>
            <textarea
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why? Your note becomes the agent's added context on the rerun…"
              className="mt-3 w-full h-20 rounded-md border border-border bg-white/5 p-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-status-error/60 resize-none"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              A reason is required on reject and is written to the audit log.
              {nextRerun >= 2 && " Rerun #" + nextRerun + " - the accountable human is notified (escalation)."}
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setRejecting(null)}
                className="h-9 px-3 rounded-md text-sm border border-border hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={rejectReason.trim().length < REJECT_REASON_MIN}
                onClick={() => {
                  const fromLabel = COLS.find((c) => c.id === rejecting.ticket.stage)?.label ?? rejecting.ticket.stage;
                  const toLabel = targetCol?.label ?? rejecting.target;
                  applyReject(rejecting.ticket.id, rejecting.target);
                  appendAuditMock({
                    action: "gate.rejected",
                    target: rejecting.ticket.id,
                    detail:
                      `${fromLabel} → ${toLabel}: ${rejectReason.trim()}` +
                      (stale.length
                        ? ` · downstream re-runs forward (${stale.map((c) => c.agentName).join(", ")})`
                        : ""),
                  });
                  toast.success(
                    stale.length
                      ? `${rejecting.ticket.id} sent back to ${targetCol?.agentName} - downstream re-runs forward`
                      : `${rejecting.ticket.id} sent back - reason recorded`,
                    {
                      description:
                        (stale.length
                          ? `Root-cause rework: ${stale.map((c) => c.agentName).join(", ")} re-run on the corrected artifact. `
                          : "Your note becomes the agent's added context on the rerun.") +
                        (nextRerun >= 2 ? ` Rerun #${nextRerun} - accountable human notified.` : ""),
                    },
                  );
                  setRejecting(null);
                }}
                className="h-9 px-4 rounded-md text-sm bg-status-error/90 text-white hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reject - record reason
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function TicketCard({
  t, col, overnight, isRunning, flagged, onReject, mounted,
}: {
  t: Ticket;
  col: Col;
  overnight: boolean;
  isRunning: boolean;
  /** ?ticket=<id> deep link from Work Intake - draws the highlight ring. */
  flagged?: boolean;
  onReject: () => void;
  mounted: boolean;
}) {
  const highlight = overnight && col.id === "ready-dev" && t.overnightEligible;
  const wb = writeBackFor(col.kind); // stage-derived write-back state (trigger.ts)
  const ageMin = mounted && t.updatedAt ? Math.max(0, Math.floor((Date.now() - t.updatedAt) / 60_000)) : null;
  const ageLabel = ageMin === null ? "-" : ageMin < 60 ? `${ageMin}m` : `${Math.floor(ageMin / 60)}h ${ageMin % 60}m`;
  const ageTone =
    ageMin === null ? "text-muted-foreground border-border" :
    ageMin < 60 ? "text-status-done border-status-done/40 bg-status-done/10" :
    ageMin < 360 ? "text-status-waiting border-status-waiting/40 bg-status-waiting/10" :
    "text-status-error border-status-error/40 bg-status-error/10";

  return (
    <div
      className={cn(
        "group relative rounded-md border bg-panel/60 p-2.5 hover-lift",
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
              {/* decisions happen on the canonical gate surface, not by dragging */}
              <Link
                to="/approvals"
                className="ml-1 text-primary/90 hover:text-primary underline-offset-2 hover:underline whitespace-nowrap"
              >
                gate →
              </Link>
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

      {/* tracker line - the ticket lives in Teamwork; this card is its execution mirror */}
      <div
        title={WB_DETAIL}
        className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between gap-2 text-[9px] font-mono text-muted-foreground"
      >
        <span className="inline-flex items-center gap-1 min-w-0">
          <Link2 className="size-2.5 shrink-0 opacity-60" />
          <span className="truncate">{t.id} · teamwork</span>
        </span>
        <span
          className={cn(
            "shrink-0 border rounded px-1 whitespace-nowrap",
            wb.pending
              ? "border-dashed border-border/60 text-muted-foreground/60"
              : "border-border/60 bg-white/[0.03] text-muted-foreground",
          )}
        >
          {wb.label}
        </span>
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
