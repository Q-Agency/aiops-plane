/**
 * Scope of Work — Connect sub-screen 3b (rendered inside StepConnect once a
 * ticketing connector is connected; the canonical six step labels are
 * unchanged).
 *
 * LEFT: slice picker (Project select + Label/Component chips, AND semantics)
 * with a plain-language sentence of the rule. RIGHT: live preview of matching
 * backlog tickets ("{matching} of {total} tickets in scope"). Persists
 * scopeRule + scopeNote to the draft via usePods().updateDraft.
 *
 * Edges: zero-match ("the pod will sit idle") and whole-backlog
 * (anti-swallow guard) render amber inline notes.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Crosshair,
  ListFilter,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePods, type ScopeRule } from "@/lib/pods/pod-store";
import { appendAuditMock } from "@/mock/audit-bridge";
import {
  START_POLICY_NAME,
  TRIGGER_HONESTY,
  TRIGGER_RULE,
  WRITE_BACK_MAPPING,
  setTriggerMode,
  useTriggerMode,
  type TriggerMode,
} from "@/mock/trigger";
import {
  BACKLOG,
  BACKLOG_TOTAL,
  COMPONENT_OPTIONS,
  LABEL_OPTIONS,
  PROJECT_OPTIONS,
  hasScope,
  isWholeProject,
  matchingTickets,
  scopeSentence,
  scopedCount,
  untouchedCount,
  type BacklogTicket,
} from "@/mock/backlog";
import type { ConnectorId } from "@/mock/connectors";

const STATUS_TONE: Record<string, string> = {
  Done: "border-status-done/50 bg-status-done/10 text-status-done",
  QA: "border-agent-qa/50 bg-agent-qa/10 text-agent-qa",
  "In Progress": "border-primary/40 bg-primary/10 text-primary",
  Blocked: "border-status-error/50 bg-status-error/10 text-status-error",
};

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded-md border transition-colors",
        active
          ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
          : "border-border bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
      )}
    >
      {label}
    </button>
  );
}

function TicketRow({ ticket, inScope }: { ticket: BacklogTicket; inScope: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 border-b border-border last:border-b-0 transition-opacity",
        !inScope && "opacity-40",
      )}
    >
      <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-14">{ticket.id}</span>
      <span className="text-xs flex-1 min-w-0 truncate">{ticket.title}</span>
      <span
        className={cn(
          "text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border shrink-0",
          STATUS_TONE[ticket.status] ?? "border-border bg-white/5 text-muted-foreground",
        )}
      >
        {ticket.status}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-7 text-right">
        {ticket.ageLabel}
      </span>
    </div>
  );
}

export function StepScope({ connectorId = "teamwork" }: { connectorId?: ConnectorId }) {
  const { draft, updateDraft } = usePods();
  const rule = draft?.scopeRule;
  const triggerMode = useTriggerMode();

  // Mocked ticket fetch — skeleton rows on first render.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(t);
  }, []);

  const setRule = (patch: Partial<ScopeRule>) => {
    const next: ScopeRule = {
      connectorId: rule?.connectorId ?? connectorId,
      projectKey: rule?.projectKey,
      labels: rule?.labels ?? [],
      components: rule?.components ?? [],
      ...patch,
    };
    updateDraft({ scopeRule: next, scopeNote: scopeSentence(next) });
  };

  const toggle = (field: "labels" | "components", value: string) => {
    const current = rule?.[field] ?? [];
    setRule({
      [field]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    });
  };

  const matching = useMemo(() => matchingTickets(rule), [rule]);
  const matchingIds = useMemo(() => new Set(matching.map((t) => t.id)), [matching]);
  const scoped = hasScope(rule);
  const count = scopedCount(rule);
  const wholeBacklog = isWholeProject(rule);
  const zeroMatch = scoped && !wholeBacklog && matching.length === 0;
  const rows = scoped ? (wholeBacklog ? BACKLOG : matching) : BACKLOG;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[2fr_3fr]">
        {/* Slice picker */}
        <div className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-4 space-y-4">
          <div className="flex items-center gap-2">
            <ListFilter className="size-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Slice picker · filters combine with AND
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Project
            </div>
            <Select
              value={rule?.projectKey ?? ""}
              onValueChange={(v) => setRule({ projectKey: v })}
            >
              <SelectTrigger className="h-8 bg-white/5 border-border text-sm">
                <SelectValue placeholder="Pick a project" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p} className="text-sm">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Labels
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_OPTIONS.map((l) => (
                <FilterChip
                  key={l}
                  label={l}
                  active={rule?.labels?.includes(l) ?? false}
                  onClick={() => toggle("labels", l)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Components
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMPONENT_OPTIONS.map((c) => (
                <FilterChip
                  key={c}
                  label={c}
                  active={rule?.components?.includes(c) ?? false}
                  onClick={() => toggle("components", c)}
                />
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              setRule({
                projectKey: rule?.projectKey ?? PROJECT_OPTIONS[0],
                labels: [],
                components: [],
              })
            }
          >
            <Crosshair className="size-3.5" />
            Use whole project
          </Button>

          <div className="rounded-md border border-border bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
            {scopeSentence(rule)}
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-md border border-border bg-panel/40 backdrop-blur-md flex flex-col min-h-0">
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground flex-1">
              {scoped
                ? `${count} of ${BACKLOG_TOTAL} tickets in scope`
                : "No scope set — the pod will take nothing until you scope it"}
            </span>
            {scoped && !zeroMatch && (
              <span className="text-[10px] font-mono text-status-done">
                {untouchedCount(rule)} tickets stay with your team
              </span>
            )}
          </div>

          {zeroMatch && (
            <div className="px-3 py-2 border-b border-border flex items-center gap-2 text-[11px] text-status-waiting bg-status-waiting/5">
              <AlertTriangle className="size-3.5 shrink-0" />
              This slice matches nothing — the pod will sit idle. Widen the filter?
            </div>
          )}
          {wholeBacklog && (
            <div className="px-3 py-2 border-b border-border flex items-center gap-2 text-[11px] text-status-waiting bg-status-waiting/5">
              <AlertTriangle className="size-3.5 shrink-0" />
              This scope takes the whole backlog — confirm that&apos;s intended.
            </div>
          )}

          <ScrollArea className="h-72">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : zeroMatch ? (
              <div className="h-full grid place-items-center p-8 text-center text-xs text-muted-foreground">
                Nothing matches this slice yet.
              </div>
            ) : (
              rows.map((t) => (
                <TicketRow key={t.id} ticket={t} inScope={!scoped || matchingIds.has(t.id)} />
              ))
            )}
          </ScrollArea>

          <div className="px-3 py-1.5 border-t border-border text-[10px] font-mono text-muted-foreground">
            Showing a sample of the {rule?.connectorId === "jira" ? "Jira" : "Teamwork"} board ·{" "}
            {BACKLOG.length} of {BACKLOG_TOTAL} rows
          </div>
        </div>
      </div>

      {/* Trigger rule — what starts the pod (vision §2, the tracker boundary) */}
      <div className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-4 space-y-4">
        <div className="flex items-center gap-2">
          <BellRing className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Trigger rule · what starts the pod
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1.5">
              Start column — the doorbell
              <span className="px-1.5 py-0.5 rounded border border-dashed border-border bg-white/5 text-muted-foreground">
                Roadmap
              </span>
            </div>
            <Select value={TRIGGER_RULE.column}>
              <SelectTrigger disabled className="h-8 bg-white/5 border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TRIGGER_RULE.column} className="text-sm">
                  {TRIGGER_RULE.column}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              A scoped ticket entering &lsquo;{TRIGGER_RULE.column}&rsquo; on &lsquo;
              {TRIGGER_RULE.board}&rsquo; is the start signal — the ticket itself stays in your
              tracker.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Start policy default · the board is the only start signal
            </div>
            <RadioGroup
              value={triggerMode}
              onValueChange={(v) => {
                const next = v as TriggerMode;
                if (next === triggerMode) return;
                // Same mutation as /intake's control → same audit guarantee
                // (vision §2: every start-policy change lands on the ledger).
                setTriggerMode(next);
                appendAuditMock({
                  action: "policy.changed",
                  detail: `intake.startPolicy: ${START_POLICY_NAME[triggerMode]} → ${START_POLICY_NAME[next]} (set in LAUNCH · Scope of work)`,
                });
              }}
              className="gap-2"
            >
              <label className="flex items-start gap-2 cursor-pointer">
                <RadioGroupItem value="operator" className="mt-0.5" />
                <span className="text-xs leading-snug">
                  <span className="text-foreground">Confirm-first — you approve each arrival</span>{" "}
                  <span className="text-[10px] font-mono text-status-done">
                    recommended for new pods
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    The board starts everything; each arrival waits for the operator&rsquo;s
                    confirmation in Work Intake — until trust is earned.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <RadioGroupItem value="tracker" className="mt-0.5" />
                <span className="text-xs leading-snug">
                  <span className="text-foreground">
                    Auto-start — the drag starts the chain
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    Entering the start column starts the chain immediately — no confirmation step.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>
        </div>

        <div className="rounded-md border border-border bg-white/[0.03] px-3 py-2 space-y-1">
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Write-back mapping · read-only
          </div>
          {WRITE_BACK_MAPPING.map((r) => (
            <div key={r.podStage} className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-muted-foreground w-36 shrink-0">{r.podStage}</span>
              <ArrowRight className="size-3 text-muted-foreground/60 shrink-0" />
              <span className="text-foreground">{r.trackerStatus}</span>
            </div>
          ))}
          <p className="text-[10px] font-mono text-muted-foreground pt-0.5">{TRIGGER_HONESTY}</p>
        </div>
      </div>

      <Alert className="bg-panel/40 border-border">
        <ShieldCheck className="size-4" />
        <AlertDescription className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">
            Everything else stays with your team, untouched.
          </span>{" "}
          You can widen the slice any time — re-editable post-launch from Connections.
        </AlertDescription>
      </Alert>
    </div>
  );
}
