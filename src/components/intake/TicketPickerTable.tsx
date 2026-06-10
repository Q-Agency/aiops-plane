/**
 * TicketPickerTable — the "From your tracker" tab of Work Intake (C10).
 *
 * Connector chip + the pod's scope-rule sentence over a checkbox table of
 * in-scope tickets (already-pulled rows grey out with an "In pod" badge —
 * no double-pull). Sticky footer: "{n} selected" + per-ticket routing rails
 * + "Pull {n} tickets into the pod" → rows animate out, pullTickets() lands
 * them at the top of the Pipeline Backlog and fires a bell notification.
 *
 * States: not-connected gate (paste tab stays usable), skeleton loading,
 * populated, scope-matches-nothing, simulated tracker error (?sim=error).
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
import { connectorById } from "@/mock/connectors";
import {
  INTAKE_CONNECTOR_ID,
  INTAKE_SCOPE_SENTENCE,
  inScopeCount,
  intakeBacklog,
  outOfScopeCount,
  pullTickets,
  type IntakeTicket,
} from "@/mock/intake";

const PRIORITY_CHIP: Record<IntakeTicket["priority"], string> = {
  P0: "text-status-error border-status-error/40 bg-status-error/10",
  P1: "text-status-waiting border-status-waiting/40 bg-status-waiting/10",
  P2: "text-status-running border-status-running/40 bg-status-running/10",
  P3: "text-muted-foreground border-border bg-white/5",
};

export interface TicketPickerTableProps {
  /** ?sim=error demo affordance — renders the tracker-unreachable state. */
  simError?: boolean;
}

export function TicketPickerTable({ simError }: TicketPickerTableProps) {
  const navigate = useNavigate();
  const { activePod } = usePods();
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

  // Call per render — `pulled` reflects live tickets.ts state.
  const rows = useMemo(() => intakeBacklog().filter((t) => t.inScope), [loading, leaving]);
  const pickable = rows.filter((t) => !t.pulled);
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
            ? `${created[0].id} pulled into ${podName} — routing to BA Agent`
            : `${created.length} tickets pulled into ${podName} — routing to BA Agent`,
          {
            description: "Landing at the top of the Pipeline Backlog — Ready for Spec next.",
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

  /* ---------- not-connected gate ---------- */
  if (!trackerConnected) {
    return (
      <Alert className="bg-panel/40 border-status-waiting/40">
        <AlertTriangle className="size-4 text-status-waiting" />
        <AlertTitle className="text-sm">
          Connect Teamwork or Jira to pull tickets — or paste one by hand.
        </AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          <span>
            Your pod has no ticketing connector yet. The “Paste a ticket” tab works without one —
            a pod is never dead-ended.
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
        <AlertTitle className="text-sm">Couldn't reach Teamwork — retry</AlertTitle>
        <AlertDescription className="text-xs">
          <span>The backlog fetch failed. The “Paste a ticket” tab is unaffected.</span>
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
          {inScopeCount()} in scope · {outOfScopeCount()} stay with your team
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
          Your scope matches no open tickets — widen it or paste one.{" "}
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
                  aria-label="Select all in-scope tickets"
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
              return (
                <tr
                  key={t.id}
                  onClick={() => !t.pulled && !isLeaving && toggle(t.id)}
                  className={cn(
                    "transition-all duration-300",
                    t.pulled
                      ? "opacity-45"
                      : "cursor-pointer hover:bg-white/[0.03]",
                    selected.has(t.id) && !isLeaving && "bg-primary/5",
                    isLeaving && "opacity-0 translate-x-4",
                  )}
                >
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(t.id)}
                      onCheckedChange={() => toggle(t.id)}
                      disabled={t.pulled || isLeaving}
                      aria-label={`Select ${t.id}`}
                    />
                  </td>
                  <td className="px-2 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                    {t.id}
                  </td>
                  <td className="px-2 py-2.5 text-foreground/95">
                    <span className="line-clamp-1">{t.title}</span>
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
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
                        scope match
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* sticky footer: count + per-ticket routing rails + pull CTA */}
      <div className="sticky bottom-0 border-t border-border bg-panel/80 backdrop-blur-md px-4 py-3 space-y-2.5">
        {selected.size > 0 && (
          <div className="space-y-1.5 anim-in">
            {[...selected].slice(0, 3).map((id) => (
              <RoutingPreview key={id} ticketId={id} />
            ))}
            {selected.size > 3 && (
              <div className="text-[11px] font-mono text-muted-foreground">
                + {selected.size - 3} more — all route to BA Agent first
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Inbox className="size-3.5" />
            {selected.size} selected
          </span>
          <div className="flex-1" />
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
            Pull {selected.size || ""} ticket{selected.size === 1 ? "" : "s"} into the pod
          </button>
        </div>
      </div>
    </section>
  );
}
