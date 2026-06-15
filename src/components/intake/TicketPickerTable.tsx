/**
 * TicketPickerTable - the confirmation table of Work Intake (C10), under
 * the SINGLE DOORBELL (vision §2): the board sends work; the operator
 * confirms or declines each start. Three row states, one truth:
 *   on the board (visible, NOT selectable - the board hasn't sent it)
 *   → in Ready (arrived - confirm/decline)
 *   → In pod (started; entry provenance chip shows HOW it entered).
 * "Confirm start" calls pullTickets() (lands at the top of the Pipeline
 * Backlog); "Decline - return to board" requires a typed reason and writes
 * the ledger row. Nothing on this table originates work.
 *
 * States: not-connected gate, skeleton loading, populated, no-arrivals
 * hint, scope-matches-nothing, simulated tracker error (?sim=error).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Inbox, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { usePods } from "@/lib/pods/pod-store";
import { RoutingPreview } from "./RoutingPreview";
import { WriteBackStrip } from "./TriggerModeControl";
import { appendAuditMock } from "@/mock/audit-bridge";
import { connectorById } from "@/mock/connectors";
import { useDemoTick } from "@/mock/demo-bus";
import {
  INTAKE_CONNECTOR_ID,
  INTAKE_SCOPE_SENTENCE,
  inScopeCount,
  intakeBacklog,
  outOfScopeCount,
  pullTickets,
  type IntakeTicket,
} from "@/mock/intake";
import { TRIGGER_RULE, recordDecline, useTriggerMode, type TicketProvenance } from "@/mock/trigger";

/** Decline canon - same typed-reason floor as every reject surface. */
const DECLINE_REASON_MIN = 10;

const PRIORITY_CHIP: Record<IntakeTicket["priority"], string> = {
  P0: "text-status-error border-status-error/40 bg-status-error/10",
  P1: "text-status-waiting border-status-waiting/40 bg-status-waiting/10",
  P2: "text-status-running border-status-running/40 bg-status-running/10",
  P3: "text-muted-foreground border-border bg-white/5",
};

/**
 * Entry provenance - rendered ONLY on rows already in the pod (`pulled`):
 * how the start happened. Rows still on the board carry no provenance -
 * nothing has been confirmed about them yet.
 */
function EntryChip({ provenance }: { provenance?: TicketProvenance }) {
  const drag = provenance === "drag-to-ready";
  return (
    <span
      className={cn(
        "shrink-0 text-[9px] font-mono px-1 py-px rounded border whitespace-nowrap",
        drag
          ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-300"
          : "border-border bg-white/5 text-muted-foreground",
      )}
      title={
        drag
          ? "Started by the board's drag into 'Ready' (auto-start)"
          : "Sent by the board; the operator confirmed the start (confirm-first)"
      }
    >
      {drag ? "started · drag-to-Ready" : "started · operator-confirmed"}
    </span>
  );
}

export interface TicketPickerTableProps {
  /** ?sim=error demo affordance - renders the tracker-unreachable state. */
  simError?: boolean;
}

export function TicketPickerTable({ simError }: TicketPickerTableProps) {
  const navigate = useNavigate();
  const { activePod } = usePods();
  const demoTick = useDemoTick(); // repaint when a staged drag arrival lands
  const triggerMode = useTriggerMode();
  const [, setSeq] = useState(0); // re-render after the pull mutation
  const [loading, setLoading] = useState(true);
  const [errorCleared, setErrorCleared] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const trackerConnected = (activePod?.connections ?? []).some(
    (c) => (c.connectorId === "teamwork" || c.connectorId === "jira") && c.status === "connected",
  );
  const connector = connectorById(INTAKE_CONNECTOR_ID);
  const showError = Boolean(simError) && !errorCleared;

  // Mocked backlog fetch.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  // Decline-the-start (vision §2): a not-actionable arrival is RETURNED to
  // the board (To-Do, via tagged write-back + comment) on a typed-reason
  // decision. The mock state lives in trigger.ts (recordDecline) so the row
  // drops back to the "on the board" state - it does NOT vanish.
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [, setDeclineSeq] = useState(0); // re-render after the decline mutation

  // Call per render - `pulled`/`arrived` reflect live mock state; demoTick
  // repaints staged arrivals (simulateDragArrival / Demo Director beats).
  const rows = useMemo(
    () => intakeBacklog().filter((t) => t.inScope),
    [loading, leaving, demoTick],
  );
  // Confirmable = the board SENT it (arrived, not declined) and it isn't in
  // the pod yet. Rows the board hasn't sent are visible but never
  // selectable - the single doorbell means this screen cannot originate work.
  const pickable = rows.filter((t) => t.arrived && !t.pulled);
  const awaiting = pickable.length;
  const allPicked = pickable.length > 0 && pickable.every((t) => selected.has(t.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allPicked ? new Set() : new Set(pickable.map((t) => t.id)));
  }

  function retry() {
    setErrorCleared(true);
    setLoading(true);
    navigate({ to: "/intake", search: {}, replace: true });
    timersRef.current.push(setTimeout(() => setLoading(false), 600));
  }

  function pull() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setLeaving(new Set(ids)); // rows animate out…
    timersRef.current.push(
      setTimeout(() => {
        const created = pullTickets(ids);
        setSelected(new Set());
        setLeaving(new Set());
        setSeq((n) => n + 1);
        if (created.length === 0) return;
        const podName = activePod?.name ?? "the pod";
        toast.success(
          created.length === 1
            ? `${created[0].id} confirmed - routing to BA Agent`
            : `${created.length} starts confirmed - routing to BA Agent`,
          {
            description: `Start confirmed in ${podName} - landing at the top of the Pipeline Backlog.`,
            action: {
              label: "View in Pipeline",
              onClick: () =>
                navigate({ to: "/pipeline", search: { ticket: created[0].id } }),
            },
          },
        );
      }, 280),
    );
  }

  function decline() {
    const ids = [...selected];
    if (ids.length === 0 || declineReason.trim().length < DECLINE_REASON_MIN) return;
    setLeaving(new Set(ids)); // brief transition while the state flips…
    timersRef.current.push(
      setTimeout(() => {
        ids.forEach(recordDecline); // → back to "on the board" (trigger.ts)
        setSelected(new Set());
        setLeaving(new Set());
        setDeclineSeq((n) => n + 1);
        appendAuditMock({
          action: "gate.rejected",
          target: ids.join(", "),
          detail: `intake declined → returned to To-Do: ${declineReason.trim()}`,
        });
        toast.success(
          ids.length === 1
            ? `${ids[0]} returned to To-Do on '${TRIGGER_RULE.board}'`
            : `${ids.length} tickets returned to To-Do on '${TRIGGER_RULE.board}'`,
          {
            description:
              "Comment posted to the ticket ([PodOps] tagged) - the row is back 'on the board'; add detail and drag to Ready again. Recorded on the ledger.",
          },
        );
        setDeclining(false);
        setDeclineReason("");
      }, 280),
    );
  }

  /* ---------- not-connected gate ---------- */
  if (!trackerConnected) {
    return (
      <Alert className="bg-panel/40 border-status-waiting/40">
        <AlertTriangle className="size-4 text-status-waiting" />
        <AlertTitle className="text-sm">
          Connect Teamwork or Jira - work arrives from your board.
        </AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          <span>
            Tickets are created where they live - on the board. The pod starts when a scoped
            ticket is dragged into the agreed column; without a tracker there is nothing to
            listen to (the LAUNCH readiness check flags this before launch).
          </span>
          <Button asChild size="sm" variant="outline" className="mt-2 w-fit">
            <Link to="/connections">Connect a tracker</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  /* ---------- simulated tracker error ---------- */
  if (showError) {
    return (
      <Alert variant="destructive" className="bg-status-error/5 border-status-error/40">
        <AlertTriangle className="size-4" />
        <AlertTitle className="text-sm">Couldn't reach Teamwork - retry</AlertTitle>
        <AlertDescription className="text-xs">
          <span>The board fetch failed - arrivals resume when the connector recovers.</span>
          <Button size="sm" variant="outline" className="mt-2 w-fit" onClick={retry}>
            <RefreshCcw className="size-3.5" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="rounded-md border border-border bg-panel/40 backdrop-blur-md overflow-hidden">
      {/* header row: connector chip + scope sentence */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-done/40 bg-status-done/10 text-status-done">
          <span className="size-1.5 rounded-full bg-status-done" />
          {connector.name} · Connected
        </span>
        <span className="text-xs text-muted-foreground">
          {INTAKE_SCOPE_SENTENCE}{" "}
          <Link
            to="/connections"
            className="text-primary hover:underline"
            title="Scope editing lives in the Connect step"
          >
            Edit scope
          </Link>
        </span>
        <div className="flex-1" />
        <span className="text-xs font-mono text-muted-foreground">
          <span className={cn(awaiting > 0 && "text-indigo-300")}>
            {awaiting} in Ready awaiting you
          </span>{" "}
          · {inScopeCount()} in scope · {outOfScopeCount()} stay with your team
        </span>
      </div>

      {/* table */}
      {loading ? (
        <div className="p-4 space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          Your scope matches no open tickets - widen it in the Connect step.{" "}
          <Link to="/connections" className="text-primary hover:underline">
            Edit scope
          </Link>
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              <th className="w-10 px-4 py-2">
                <Checkbox
                  checked={allPicked}
                  onCheckedChange={toggleAll}
                  disabled={pickable.length === 0}
                  aria-label="Select all arrivals awaiting confirmation"
                />
              </th>
              <th className="text-left px-2 py-2 font-normal">Ticket</th>
              <th className="text-left px-2 py-2 font-normal">Title</th>
              <th className="text-left px-2 py-2 font-normal hidden md:table-cell">Labels</th>
              <th className="text-left px-2 py-2 font-normal">Priority</th>
              <th className="text-right px-2 py-2 font-normal">Age</th>
              <th className="text-right px-4 py-2 font-normal">Scope</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((t) => {
              const isLeaving = leaving.has(t.id);
              const confirmable = t.arrived && !t.pulled;
              return (
                <tr
                  key={t.id}
                  onClick={() => confirmable && !isLeaving && toggle(t.id)}
                  title={
                    !t.arrived && !t.pulled
                      ? "On the board - starts when the client drags it into 'Ready'"
                      : undefined
                  }
                  className={cn(
                    "transition-all duration-300",
                    t.pulled && "opacity-45",
                    !t.arrived && !t.pulled && "opacity-60",
                    confirmable && "cursor-pointer hover:bg-white/[0.03]",
                    selected.has(t.id) && !isLeaving && "bg-primary/5",
                    isLeaving && "opacity-0 translate-x-4",
                  )}
                >
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(t.id)}
                      onCheckedChange={() => toggle(t.id)}
                      disabled={!confirmable || isLeaving}
                      aria-label={`Select ${t.id}`}
                    />
                  </td>
                  <td className="px-2 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                    {t.id}
                  </td>
                  <td className="px-2 py-2.5 text-foreground/95">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{t.title}</span>
                      {t.pulled && <EntryChip provenance={t.provenance} />}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 hidden md:table-cell">
                    <span className="flex items-center gap-1 flex-wrap">
                      {t.labels.slice(0, 2).map((l) => (
                        <span
                          key={l}
                          className="text-[9px] font-mono px-1 py-px rounded border border-border bg-white/5 text-muted-foreground"
                        >
                          {l}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <span
                      className={cn(
                        "text-[9px] font-mono border rounded px-1",
                        PRIORITY_CHIP[t.priority],
                      )}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-muted-foreground tabular-nums whitespace-nowrap">
                    {t.ageDays}d
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {t.pulled ? (
                      <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
                        In pod
                      </span>
                    ) : t.arrived ? (
                      <span
                        title="Sent by the board - sits in 'Ready', awaiting your decision"
                        className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-indigo-400/40 bg-indigo-500/10 text-indigo-300"
                      >
                        in Ready
                      </span>
                    ) : (
                      <span
                        title="In scope, but the board hasn't sent it - starts when dragged to 'Ready'"
                        className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground"
                      >
                        on the board
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* write-back mapping - what the pod posts back to the ticket */}
      <WriteBackStrip />

      {/* sticky footer: arrivals count + routing rails + confirm/decline CTAs */}
      <div className="sticky bottom-0 border-t border-border bg-panel/80 backdrop-blur-md px-4 py-3 space-y-2.5">
        {!loading && awaiting === 0 && (
          <div className="text-[11px] font-mono text-muted-foreground">
            {triggerMode === "operator"
              ? `Nothing awaiting confirmation - tickets arrive here when the board sends them (drag to '${TRIGGER_RULE.column}').`
              : `No pending arrivals - under auto-start, tickets start the moment the board sends them (drag to '${TRIGGER_RULE.column}').`}
          </div>
        )}
        {!loading && awaiting > 0 && triggerMode === "tracker" && (
          <div className="text-[11px] font-mono text-status-waiting">
            {awaiting} arrival{awaiting === 1 ? "" : "s"} from the confirm-first era still need
            your decision - new drags start automatically.
          </div>
        )}
        {selected.size > 0 && (
          <div className="space-y-1.5 anim-in">
            {[...selected].slice(0, 3).map((id) => (
              <RoutingPreview key={id} ticketId={id} />
            ))}
            {selected.size > 3 && (
              <div className="text-[11px] font-mono text-muted-foreground">
                + {selected.size - 3} more - all route to BA Agent first
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Inbox className="size-3.5" />
            {selected.size} selected
          </span>
          {triggerMode === "operator" ? (
            <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
              confirm-first · you approve each start
            </span>
          ) : (
            <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
              auto-start · arrivals start on the drag
            </span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            disabled={selected.size === 0 || leaving.size > 0}
            onClick={() => {
              setDeclineReason("");
              setDeclining(true);
            }}
            className={cn(
              "h-9 px-3 rounded-md border text-xs font-semibold uppercase tracking-wider transition-colors",
              selected.size > 0 && leaving.size === 0
                ? "border-status-error/50 bg-status-error/10 text-status-error hover:bg-status-error/20 cursor-pointer"
                : "border-border bg-white/5 text-muted-foreground opacity-50",
            )}
          >
            Decline - return to board
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || leaving.size > 0}
            onClick={pull}
            className={cn(
              "h-9 px-4 rounded-md border text-xs font-semibold uppercase tracking-wider transition-colors",
              selected.size > 0 && leaving.size === 0
                ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer shadow-[0_0_12px_-4px_var(--primary)]"
                : "border-border bg-white/5 text-muted-foreground opacity-50",
            )}
          >
            Confirm start{selected.size ? ` - ${selected.size} ticket${selected.size === 1 ? "" : "s"}` : ""}
          </button>
        </div>
      </div>

      {/* decline dialog - a decision with a typed reason; the card goes back to To-Do */}
      {declining && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm anim-in"
          onClick={() => setDeclining(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel p-6 max-w-sm w-full mx-4 border-status-error/40"
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              intake decision
            </div>
            <div className="text-lg font-semibold mt-1">Decline - return to the board?</div>
            <div className="text-sm text-muted-foreground mt-2">
              {selected.size === 1 ? [...selected][0] : `${selected.size} tickets`} go back to{" "}
              <span className="font-semibold text-foreground">To-Do</span> on &lsquo;
              {TRIGGER_RULE.board}&rsquo; with your note as a ticket comment. Decline is for{" "}
              <em>not actionable / out of scope</em> - if it&rsquo;s real but unclear, confirm it
              and let the BA ask.
            </div>
            <textarea
              autoFocus
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Why? Posted to the ticket so the author can fix and re-drag…"
              className="mt-3 w-full h-20 rounded-md border border-border bg-white/5 p-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-status-error/60 resize-none"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              A reason is required on decline and is written to the audit log.
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setDeclining(false)}
                className="h-9 px-3 rounded-md text-sm border border-border hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={declineReason.trim().length < DECLINE_REASON_MIN}
                onClick={decline}
                className="h-9 px-4 rounded-md text-sm bg-status-error/90 text-white hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Decline - record reason
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
