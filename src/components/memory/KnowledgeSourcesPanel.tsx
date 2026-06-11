/**
 * KnowledgeSourcesPanel — section 3 of /memory ("What it knows", P1-A2).
 * Folds the orphaned /knowledge surface in here: the source rows are
 * lifted from KnowledgeView (same mock `sources`, same freshness/status
 * visual language), restyled as a list section with expandable read
 * scopes, last-sync, and an audited "Forget this" — the removal lands as
 * `policy.changed { knowledge.sources }` and the row tombstones
 * "Forgotten · {date} · on the record."
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity, Brain, Briefcase, ChevronDown, FileSignature, FolderKanban, Ghost,
  Mail, MessageSquare, ShieldCheck, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { appendAuditMock } from "@/mock/audit-bridge";
import { sources, type Freshness, type KnowledgeSource, type SourceId } from "@/mock/knowledge";
import { fmtShortDate } from "./memory-ui";

/* -- visual language lifted from KnowledgeView ----------------------- */

const sourceIcon: Record<SourceId, React.ComponentType<{ className?: string }>> = {
  slack: MessageSquare,
  gdrive: FolderKanban,
  jira: Briefcase,
  gmail: Mail,
  hubspot: Activity,
  sows: FileSignature,
};

const freshTone: Record<Freshness, { dot: string; label: string }> = {
  fresh: { dot: "bg-status-done dot-pulse", label: "fresh" },
  stale: { dot: "bg-status-waiting", label: "stale" },
  failed: { dot: "bg-status-error glow-pulse", label: "failed" },
};

/** Read-only ingestion scopes per source (LAUNCH Connect-tile language). */
const SOURCE_SCOPES: Record<SourceId, { label: string; reason: string }[]> = {
  slack: [
    { label: "Read #automarket-* channels & threads", reason: "Decision context behind every spec" },
    { label: "Read pinned files & canvases", reason: "Working agreements the team already keeps" },
  ],
  gdrive: [
    { label: "Read Docs, Sheets & Slides in the shared drive", reason: "PRDs and revisions feed spec lineage" },
  ],
  jira: [
    { label: "Read tickets, epics & comments", reason: "Scope, history and acceptance discussions" },
  ],
  gmail: [
    { label: "Read client threads & attachments", reason: "Exec decisions that supersede older docs" },
  ],
  hubspot: [
    { label: "Read deals, call notes & contacts", reason: "Client commitments referenced in specs" },
  ],
  sows: [
    { label: "Read contracts vault (PDF / DOCX)", reason: "Contract terms win source conflicts" },
  ],
};

/* -- rows ------------------------------------------------------------ */

function TombstoneRow({ source, at }: { source: KnowledgeSource; at: number }) {
  return (
    <div className="p-3 flex items-center gap-3 flex-wrap opacity-75">
      <div className="size-8 rounded-md grid place-items-center bg-white/[0.02] border border-border/60 shrink-0">
        <Ghost className="size-4 text-muted-foreground" />
      </div>
      <span className="text-sm text-muted-foreground line-through">{source.name}</span>
      <span className="text-[11px] font-mono text-muted-foreground">
        Forgotten · {fmtShortDate(at)} ·{" "}
        <Link to="/compliance" hash="audit" className="text-primary hover:underline">
          on the record
        </Link>
        .
      </span>
    </div>
  );
}

function SourceRow({
  source,
  onForget,
}: {
  source: KnowledgeSource;
  onForget: () => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = sourceIcon[source.id];
  const fresh = freshTone[source.freshness];
  const scopes = SOURCE_SCOPES[source.id];

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="size-8 rounded-md grid place-items-center bg-white/5 border border-border shrink-0">
          <Icon className="size-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{source.name}</span>
            <span className={cn("size-1.5 rounded-full shrink-0", fresh.dot)} title={fresh.label} />
            <span className="text-[10px] font-mono text-muted-foreground">{fresh.label}</span>
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{source.kind}</div>
        </div>
        <div className="hidden md:block text-right shrink-0">
          <div className="text-[10px] uppercase font-mono text-muted-foreground">docs</div>
          <div className="text-xs font-mono tabular-nums">{source.docsIngested.toLocaleString()}</div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground shrink-0">
          <Activity className="size-3" />
          last sync {source.lastSyncMin}m ago
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"
        >
          scopes
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="text-status-error hover:text-status-error shrink-0"
          onClick={onForget}
        >
          <Trash2 className="size-3.5" />
          Forget this
        </Button>
      </div>

      {open && (
        <div className="mt-3 ml-11 space-y-2">
          <div className="rounded-md border border-border bg-panel/40 divide-y divide-border">
            {scopes.map((scope) => (
              <div key={scope.label} className="flex items-start gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-xs">{scope.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{scope.reason}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground shrink-0">
                  read
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <Brain className="size-3" />
            <code>{source.subAgent}</code>
            <span>· {source.subAgentState}</span>
            {source.note && <span className="text-status-waiting truncate">· {source.note}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* -- panel ------------------------------------------------------------ */

export function KnowledgeSourcesPanel() {
  const [forgotten, setForgotten] = useState<Partial<Record<SourceId, number>>>({});
  const [confirmId, setConfirmId] = useState<SourceId | null>(null);

  const activeCount = sources.filter((s) => !forgotten[s.id]).length;
  const confirmSource = confirmId ? sources.find((s) => s.id === confirmId) : undefined;

  function commitForget(s: KnowledgeSource) {
    const at = Date.now();
    setForgotten((f) => ({ ...f, [s.id]: at }));
    setConfirmId(null);
    appendAuditMock({
      action: "policy.changed",
      target: `source:${s.id}`,
      detail: `knowledge.sources — “${s.name}” forgotten (before: ${activeCount} sources, after: ${activeCount - 1})`,
    });
    toast.success("Source forgotten · written to audit ledger ✓", {
      description: `policy.changed · knowledge.sources · ${s.name} · actor when-only`,
    });
  }

  if (sources.length === 0) {
    return (
      <div className="glass-panel p-6 text-center text-sm text-muted-foreground">
        No sources connected yet — connect tools in LAUNCH and the pod starts learning from
        them here.
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel divide-y divide-border">
        {sources.map((s) => {
          const at = forgotten[s.id];
          return at ? (
            <TombstoneRow key={s.id} source={s} at={at} />
          ) : (
            <SourceRow key={s.id} source={s} onForget={() => setConfirmId(s.id)} />
          );
        })}
      </div>

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forget this source?</AlertDialogTitle>
            <AlertDialogDescription>
              The pod stops drawing on it; the removal is recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmSource && (
            <div className="text-xs text-muted-foreground font-mono border border-border rounded-md bg-white/[0.02] px-3 py-2">
              {confirmSource.name} · {confirmSource.kind} ·{" "}
              {confirmSource.docsIngested.toLocaleString()} docs
            </div>
          )}
          <Alert className="bg-panel/40 border-border">
            <ShieldCheck className="size-4" />
            <AlertDescription className="text-xs text-muted-foreground">
              Recorded as <code className="font-mono">policy.changed · knowledge.sources</code>{" "}
              with timestamp · actor “when-only” until real auth.
            </AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmSource && commitForget(confirmSource)}>
              Forget & log
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
