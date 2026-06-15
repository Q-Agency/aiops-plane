/**
 * VersionTimeline - right Sheet over one deliverable: every iteration
 * v1→vN from artifactVersions(), rejected iterations struck-through with
 * the typed reject reason inline and a line-level diff against the next
 * version (toggleable per iteration), the gate that decided each one
 * (→ /approvals/$gateId, canonical URL), and the SnapshotStamp footer.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, TimerReset } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MarkdownLite } from "@/components/traceability/TraceabilityView";
import { fmtDateTime } from "@/lib/time";
import {
  artifactVersions,
  SNAPSHOT_STAMP,
  type ArtifactIteration,
  type ArtifactSnapshot,
} from "@/mock/artifacts";
import { cn } from "@/lib/utils";
import { KIND_ICON, KIND_LABEL, KIND_TONE, LineDiff } from "./artifact-ui";

export interface VersionTimelineProps {
  /** The clicked shelf row - null closes the sheet. */
  snapshot: ArtifactSnapshot | null;
  onClose: () => void;
}

export function VersionTimeline({ snapshot, onClose }: VersionTimelineProps) {
  const iterations = useMemo(
    () =>
      snapshot
        ? artifactVersions(snapshot.ticketId)
            .filter((i) => i.kind === snapshot.kind)
            .sort((a, b) => a.version - b.version)
        : [],
    [snapshot],
  );

  const Icon = snapshot ? KIND_ICON[snapshot.kind] : ShieldCheck;

  return (
    <Sheet open={!!snapshot} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto scrollbar-thin border-border bg-panel/95 backdrop-blur-md"
      >
        {snapshot && (
          <>
            <SheetHeader>
              <SheetTitle className="text-base flex items-center gap-2 pr-6">
                <Icon className={cn("size-4 shrink-0", KIND_TONE[snapshot.kind])} />
                <span className="min-w-0">{snapshot.title}</span>
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {snapshot.ticketId}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase tracking-wider border border-border rounded px-1.5 py-0.5",
                    KIND_TONE[snapshot.kind],
                  )}
                >
                  {KIND_LABEL[snapshot.kind]}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {iterations.length} iteration{iterations.length === 1 ? "" : "s"} · v1 → v
                  {snapshot.version}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-3">
              {iterations.map((it, idx) => (
                <IterationCard
                  key={`${it.ticketId}-${it.kind}-${it.version}`}
                  iteration={it}
                  next={iterations[idx + 1]}
                />
              ))}
              <SnapshotStamp snapshot={snapshot} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* One iteration                                                        */
/* ------------------------------------------------------------------ */

function IterationCard({
  iteration: it,
  next,
}: {
  iteration: ArtifactIteration;
  next?: ArtifactIteration;
}) {
  const rejected = it.state === "rejected";
  const diffable = rejected && !!next;
  // Spec: a rejected v1 renders as a struck-through DIFF against v2 by default.
  const [view, setView] = useState<"diff" | "doc">(diffable ? "diff" : "doc");

  return (
    <section
      className={cn(
        "rounded-lg border p-3 space-y-2.5",
        rejected ? "border-status-error/30 bg-status-error/[0.04]" : "border-border bg-white/[0.02]",
      )}
    >
      {/* header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[11px] border border-border rounded px-1.5 py-0.5 text-foreground">
          v{it.version}
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            rejected && "line-through decoration-status-error/60 text-muted-foreground",
          )}
        >
          {KIND_LABEL[it.kind]} · {it.ticketId}
        </span>
        <span
          className={cn(
            "text-[10px] font-mono uppercase tracking-wider rounded border px-1.5 py-0.5",
            rejected
              ? "border-status-error/40 bg-status-error/10 text-status-error"
              : "border-status-done/40 bg-status-done/10 text-status-done",
          )}
        >
          {rejected ? "rejected → revised" : "approved"}
        </span>
        <span className="flex-1" />
        <span className="text-[10px] font-mono text-muted-foreground" suppressHydrationWarning>
          {fmtDateTime(it.at)}
        </span>
      </div>

      {/* decided-by + gate link */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
        <span>
          {rejected ? "Returned by" : "Cleared by"}{" "}
          <span className="text-foreground">{it.actorName}</span>
        </span>
        <span className="opacity-50">·</span>
        <Link
          to="/approvals/$gateId"
          params={{ gateId: it.gateId }}
          className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
        >
          {it.gateId}
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* typed reject reason - required on reject (product canon) */}
      {rejected && it.rejectReason && (
        <div className="border-l-2 border-status-error/60 bg-status-error/10 rounded-r px-2.5 py-2">
          <div className="text-[9px] font-mono uppercase tracking-wider text-status-error/80">
            typed reason · required on reject
          </div>
          <div className="text-xs text-foreground mt-0.5">{it.rejectReason}</div>
        </div>
      )}

      {/* body: diff vs next version, or the document as written */}
      {diffable && (
        <div className="flex items-center gap-1.5">
          <ToggleChip active={view === "diff"} onClick={() => setView("diff")}>
            Diff vs v{next.version}
          </ToggleChip>
          <ToggleChip active={view === "doc"} onClick={() => setView("doc")}>
            v{it.version} as written
          </ToggleChip>
          <span className="flex-1" />
          <span className="text-[9px] font-mono text-muted-foreground">
            <span className="text-status-error">− removed</span>
            {" · "}
            <span className="text-status-done">+ added in v{next.version}</span>
          </span>
        </div>
      )}
      {diffable && view === "diff" ? (
        <LineDiff before={it.contentMd} after={next.contentMd} />
      ) : (
        <div className="border border-border rounded-md bg-white/[0.02] p-3 max-h-72 overflow-y-auto scrollbar-thin">
          <MarkdownLite text={it.contentMd} />
        </div>
      )}
    </section>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[10px] font-mono uppercase tracking-wider rounded border px-1.5 py-0.5 transition-colors cursor-pointer",
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* SnapshotStamp                                                        */
/* ------------------------------------------------------------------ */

/**
 * The load-bearing footer: snapshotted into the control plane at
 * gate-clearance - survives agent resets. The pending variant covers the
 * ledger-sync-gap edge (a future-dated snapshotAt = backfill pending; no
 * current seed exercises it, the state is wired for honesty).
 */
export function SnapshotStamp({ snapshot }: { snapshot: ArtifactSnapshot }) {
  const pending = snapshot.snapshotAt > Date.now();
  if (pending) {
    return (
      <div className="rounded-lg border border-status-waiting/40 bg-status-waiting/10 px-3 py-2.5 flex items-start gap-2.5">
        <TimerReset className="size-4 text-status-waiting shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-xs font-medium text-status-waiting">
            Snapshot pending · backfills on reconnect
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Approved during a ledger sync gap - the snapshot lands when the ledger reconnects,
            and the gap is marked honestly in Compliance.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-status-done/30 bg-status-done/[0.06] px-3 py-2.5 flex items-start gap-2.5">
      <ShieldCheck className="size-4 text-status-done shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-status-done">{SNAPSHOT_STAMP}</div>
        <div
          className="text-[10px] font-mono text-muted-foreground mt-0.5"
          suppressHydrationWarning
        >
          {snapshot.contentRef} · snapshotted {fmtDateTime(snapshot.snapshotAt)}
        </div>
      </div>
    </div>
  );
}
