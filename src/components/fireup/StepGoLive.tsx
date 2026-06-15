/**
 * LAUNCH step 6 - Readiness & Launch (body only; chrome from WizardShell).
 * THE single hard gate (D2): computeReadiness(draft) drives the checklist,
 * the gauge, and the Launch CTA. Required checks BLOCK; advisory checks
 * (Slack approver, Knowledge sources) warn and are overrideable via an
 * alert-dialog confirm. Launch → ~2.5s mock overlay → launchDraft() → "/".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  Rocket,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { catalogEntry } from "@/mock/catalog";
import { llmTierDef } from "@/mock/agent-config";
import { estCost, estLatency, formatLatency } from "@/mock/chain";
import { blueprintById } from "@/mock/blueprints";
import { connectorById } from "@/mock/connectors";
import { humans } from "@/mock/humans";
import {
  computeReadiness,
  podSummaryLine,
  TENANCY_LINE,
  usePods,
  type PodDraft,
  type WizardStepId,
} from "@/lib/pods/pod-store";
import { LAUNCH_REQUEST_EVENT } from "./launch-event";

/* ------------------------------------------------------------------ */
/* Checklist model                                                      */
/* ------------------------------------------------------------------ */

type RowStatus = "pass" | "blocked" | "warn" | "pending";

interface GoLiveRow {
  id: string;
  label: string;
  severity: "required" | "advisory";
  status: RowStatus;
  detail: string;
  fixStep: WizardStepId;
  fixLabel: string;
  items?: { label: string; ok: boolean; meta: string }[];
}

const FIX_LABELS: Record<string, string> = {
  agents: "Fix in Catalog",
  accountability: "Assign owner",
  llm: "Set LLM tier",
  tools: "Connect tool",
  slack: "Wire Slack",
  knowledge: "Add Knowledge",
};

function humanName(id: string | null | undefined): string {
  return humans.find((h) => h.id === id)?.name ?? "Unassigned";
}

function buildRows(draft: PodDraft): GoLiveRow[] {
  const readiness = computeReadiness(draft);
  const zeroAgents = draft.agentIds.length === 0;

  const rows: GoLiveRow[] = readiness.checks.map((c) => {
    const row: GoLiveRow = {
      id: c.id,
      label: c.label,
      severity: c.severity,
      status: zeroAgents && c.id !== "agents" ? "pending" : c.status,
      detail: zeroAgents && c.id !== "agents" ? "Waiting on agents - add a team first." : c.detail,
      fixStep: c.fixStep,
      fixLabel: FIX_LABELS[c.id] ?? "Fix",
    };

    if (c.id === "accountability" && !zeroAgents) {
      row.items = draft.agentIds.map((id) => ({
        label: catalogEntry(id).name,
        ok: Boolean(draft.accountability[id]),
        meta: humanName(draft.accountability[id]),
      }));
    }
    if (c.id === "llm" && !zeroAgents) {
      const tiers = draft.agentTiers ?? {};
      row.items = draft.agentIds.map((id) => ({
        label: catalogEntry(id).name,
        ok: Boolean(tiers[id]),
        meta: tiers[id] ? llmTierDef(tiers[id]!).label : "No tier",
      }));
    }
    if (c.id === "tools") {
      const required = blueprintById(draft.blueprintId)?.connectorIds ?? [];
      const connected = new Set(
        draft.connections.filter((x) => x.status === "connected").map((x) => x.connectorId),
      );
      if (required.length > 0) {
        row.items = required.map((id) => ({
          label: connectorById(id).name,
          ok: connected.has(id),
          meta: connected.has(id) ? "Connected" : "Not connected",
        }));
      }
    }
    return row;
  });

  // Advisory: Knowledge sources (optional) - never blocks (D2).
  const knowledgeOn = draft.agentIds.includes("knowledge");
  rows.push({
    id: "knowledge",
    label: "Knowledge sources (optional)",
    severity: "advisory",
    status: zeroAgents ? "pending" : knowledgeOn ? "pass" : "warn",
    detail: zeroAgents
      ? "Waiting on agents - add a team first."
      : knowledgeOn
        ? "Knowledge agent in the pod - project memory accrues from day one."
        : "No Knowledge sources connected - the pod will run, but agents won't draw on project memory yet.",
    fixStep: "agents",
    fixLabel: FIX_LABELS.knowledge,
  });

  return rows;
}

/* ------------------------------------------------------------------ */
/* Row pieces                                                           */
/* ------------------------------------------------------------------ */

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === "pass") return <CheckCircle2 className="size-4 text-status-done shrink-0" />;
  if (status === "blocked") return <XCircle className="size-4 text-status-error shrink-0" />;
  if (status === "warn") return <AlertTriangle className="size-4 text-status-waiting shrink-0" />;
  return <Circle className="size-4 text-muted-foreground/50 shrink-0" />;
}

function StatusPill({ status, severity }: { status: RowStatus; severity: GoLiveRow["severity"] }) {
  const label =
    status === "pass"
      ? "Pass"
      : status === "blocked"
        ? "Blocked"
        : status === "warn"
          ? severity === "advisory"
            ? "Advisory"
            : "Warn"
          : "Pending";
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-wider font-mono px-1.5 py-px rounded border shrink-0",
        status === "pass" && "border-status-done/50 bg-status-done/10 text-status-done",
        status === "blocked" && "border-status-error/50 bg-status-error/10 text-status-error",
        status === "warn" && "border-status-waiting/50 bg-status-waiting/10 text-status-waiting",
        status === "pending" && "border-border bg-white/5 text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function ReadinessRow({ row, onFix }: { row: GoLiveRow; onFix: (step: WizardStepId) => void }) {
  const [open, setOpen] = useState(false);
  const expandable = (row.items?.length ?? 0) > 0;
  const needsFix = row.status === "blocked" || row.status === "warn";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("px-4 py-3", row.status === "pending" && "opacity-50")}>
        <div className="flex items-center gap-3">
          <StatusIcon status={row.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium leading-tight">{row.label}</span>
              <StatusPill status={row.status} severity={row.severity} />
            </div>
            <p
              className={cn(
                "text-xs mt-0.5",
                row.status === "blocked" ? "text-status-error/90" : "text-muted-foreground",
              )}
            >
              {row.detail}
            </p>
          </div>
          {needsFix && row.status !== "pending" && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 text-xs shrink-0",
                row.status === "blocked" && "border-status-error/50 text-status-error",
              )}
              onClick={() => onFix(row.fixStep)}
            >
              {row.fixLabel}
            </Button>
          )}
          {expandable && (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={`Expand ${row.label}`}
                className="size-7 rounded-md border border-border bg-white/5 grid place-items-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              >
                <ChevronDown
                  className={cn("size-3.5 transition-transform", open && "rotate-180")}
                />
              </button>
            </CollapsibleTrigger>
          )}
        </div>

        {expandable && (
          <CollapsibleContent>
            <div className="mt-2.5 ml-7 rounded-md border border-border/60 bg-white/[0.02] divide-y divide-border/40">
              {row.items!.map((item) => (
                <div key={item.label} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                  {item.ok ? (
                    <CheckCircle2 className="size-3 text-status-done shrink-0" />
                  ) : (
                    <AlertTriangle className="size-3 text-status-waiting shrink-0" />
                  )}
                  <span className="flex-1 min-w-0 truncate">{item.label}</span>
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-wider",
                      item.ok ? "text-muted-foreground" : "text-status-waiting",
                    )}
                  >
                    {item.meta}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ */
/* Readiness gauge (conic ring)                                         */
/* ------------------------------------------------------------------ */

function ReadinessGauge({ pct }: { pct: number }) {
  const ready = pct >= 100;
  const color = ready ? "var(--status-done)" : "var(--status-waiting)";
  return (
    <div
      className="relative size-28 rounded-full"
      role="img"
      aria-label={`Readiness ${pct}%`}
      style={{
        background: `conic-gradient(${color} ${pct * 3.6}deg, color-mix(in oklab, var(--border) 55%, transparent) 0deg)`,
        boxShadow: ready
          ? "0 0 18px color-mix(in oklab, var(--status-done) 45%, transparent)"
          : undefined,
      }}
    >
      <div className="absolute inset-[7px] rounded-full bg-panel grid place-items-center">
        <div className="text-center leading-tight">
          <div className="text-2xl font-semibold font-mono" style={{ color }}>
            {pct}%
          </div>
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            ready
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Launch overlay (mock provisioning sequence, ~2.5s)                   */
/* ------------------------------------------------------------------ */

const LAUNCH_STEPS = [
  { id: "provision", label: "Provisioning pod…", ms: 800 },
  { id: "connectors", label: "Wiring connectors…", ms: 900 },
  { id: "agents", label: "Briefing agents…", ms: 800 },
] as const;

function LaunchOverlay({ podName, onComplete }: { podName: string; onComplete: () => void }) {
  const [done, setDone] = useState(0);
  const finished = done >= LAUNCH_STEPS.length;

  useEffect(() => {
    const t = setTimeout(
      () => (finished ? onComplete() : setDone((d) => d + 1)),
      finished ? 600 : LAUNCH_STEPS[done].ms,
    );
    return () => clearTimeout(t);
  }, [done, finished, onComplete]);

  const pct = Math.round((done / LAUNCH_STEPS.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-md rounded-md border border-border bg-panel/90 backdrop-blur-md p-6 shadow-[0_0_32px_color-mix(in_oklab,var(--primary)_25%,transparent)]">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={cn(
              "size-9 rounded-md border grid place-items-center shrink-0",
              finished
                ? "border-status-done/50 bg-status-done/15 text-status-done"
                : "border-primary/40 bg-primary/15 text-primary glow-pulse",
            )}
          >
            <Rocket className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {finished ? "Pod is live." : `Launching ${podName} pod…`}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              {finished ? "Taking you to your Overview…" : "Standing up your dedicated pod"}
            </div>
          </div>
        </div>

        <Progress value={pct} className="h-1.5 mb-4" />

        <ol className="space-y-2.5">
          {LAUNCH_STEPS.map((s, i) => {
            const state = i < done ? "done" : i === done && !finished ? "active" : "todo";
            return (
              <li key={s.id} className="flex items-center gap-2.5 text-xs">
                {state === "done" ? (
                  <CheckCircle2 className="size-3.5 text-status-done shrink-0" />
                ) : state === "active" ? (
                  <Loader2 className="size-3.5 text-primary animate-spin shrink-0" />
                ) : (
                  <Circle className="size-3.5 text-muted-foreground/40 shrink-0" />
                )}
                <span
                  className={cn(
                    state === "done" && "text-muted-foreground",
                    state === "active" && "text-foreground",
                    state === "todo" && "text-muted-foreground/50",
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
          <li className="flex items-center gap-2.5 text-xs">
            {finished ? (
              <CheckCircle2 className="size-3.5 text-status-done shrink-0" />
            ) : (
              <Circle className="size-3.5 text-muted-foreground/40 shrink-0" />
            )}
            <span
              className={cn(finished ? "text-status-done font-medium" : "text-muted-foreground/50")}
            >
              Pod live.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step body                                                            */
/* ------------------------------------------------------------------ */

export function StepGoLive() {
  const navigate = useNavigate();
  const { draft, launchDraft } = usePods();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const completingRef = useRef(false);

  // Intercept the WizardShell footer "Launch pod" CTA so both launch CTAs
  // share the same sequence (warn-confirm dialog + launch overlay).
  const startLaunchRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const onRequest = (e: Event) => {
      if (startLaunchRef.current) {
        e.preventDefault();
        startLaunchRef.current();
      }
    };
    window.addEventListener(LAUNCH_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(LAUNCH_REQUEST_EVENT, onRequest);
  }, []);

  const rows = useMemo(() => (draft ? buildRows(draft) : []), [draft]);
  const readiness = useMemo(() => computeReadiness(draft), [draft]);

  const blockedRows = rows.filter((r) => r.severity === "required" && r.status === "blocked");
  const warnRows = rows.filter((r) => r.severity === "advisory" && r.status === "warn");
  const blocked = blockedRows.length > 0 || !draft;
  const allGreen = !blocked && warnRows.length === 0;

  const goTo = useCallback(
    (step: WizardStepId) => void navigate({ to: "/pods/new", search: { step } }),
    [navigate],
  );

  const handleComplete = useCallback(() => {
    if (completingRef.current) return;
    completingRef.current = true;
    const name = draft?.name.trim() || "Untitled Pod";
    const summary = draft ? podSummaryLine(draft) : "";
    void (async () => {
      // Navigate first so the wizard unmounts before the draft is cleared
      // (avoids the shell's auto-draft effect recreating a stray draft).
      await navigate({ to: "/" });
      const pod = launchDraft();
      toast.success(`Pod launched - ${pod?.name ?? name} is live`, {
        description: summary ? `${summary} · ${TENANCY_LINE}` : TENANCY_LINE,
      });
    })();
  }, [draft, navigate, launchDraft]);

  if (!draft) {
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_380px] items-start">
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="size-28 rounded-full mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  const summary = podSummaryLine(draft);
  const podName = draft.name.trim() || "Untitled Pod";
  const requiredTools = blueprintById(draft.blueprintId)?.connectorIds ?? [];
  const connectedTools = draft.connections.filter((c) => c.status === "connected").length;
  const cost = estCost(draft.agentIds);
  const latency = estLatency(draft.agentIds);
  const slackWired = Boolean(draft.approverChannelId);

  const startLaunch = () => {
    if (blocked) return;
    if (warnRows.length > 0) setConfirmOpen(true);
    else setLaunching(true);
  };
  startLaunchRef.current = startLaunch;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px] items-start">
        {/* Left - checklist */}
        <div className="space-y-3 min-w-0">
          {blocked ? (
            <Alert variant="destructive" className="border-status-error/50 bg-status-error/10">
              <XCircle className="size-4" />
              <AlertTitle>
                {blockedRows.length} thing{blockedRows.length === 1 ? "" : "s"} to fix before launch
              </AlertTitle>
              <AlertDescription className="text-xs">
                Resolve the required checks below to enable launch.
              </AlertDescription>
            </Alert>
          ) : allGreen ? (
            <Alert className="border-status-done/50 bg-status-done/10 [&>svg]:text-status-done">
              <CheckCircle2 className="size-4" />
              <AlertTitle className="text-status-done">All systems go.</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                {summary} (one human can cover several) · {connectedTools} tools connected · Slack
                wired.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-status-waiting/50 bg-status-waiting/10 [&>svg]:text-status-waiting">
              <AlertTriangle className="size-4" />
              <AlertTitle className="text-status-waiting">
                Ready, with {warnRows.length} warning{warnRows.length === 1 ? "" : "s"}
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                {warnRows.map((r) => r.label).join(" · ")} - you can launch anyway.
              </AlertDescription>
            </Alert>
          )}

          <section className="rounded-md border border-border bg-panel/40 backdrop-blur-md">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Readiness checklist
              </span>
              <span className="flex-1" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                {rows.filter((r) => r.status === "pass").length}/{rows.length} checks
              </span>
            </div>
            <div className="divide-y divide-border/60">
              {rows.map((row) => (
                <ReadinessRow key={row.id} row={row} onFix={goTo} />
              ))}
            </div>
          </section>

          {draft.agentIds.length === 0 && (
            <p className="text-xs text-muted-foreground px-1">
              Add at least one agent to begin. Your pod needs a team.
            </p>
          )}
        </div>

        {/* Right - launch panel */}
        <aside className="xl:sticky xl:top-4 rounded-md border border-border bg-panel/40 backdrop-blur-md">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Launch
            </span>
          </div>
          <div className="p-4 flex flex-col items-center gap-4">
            <ReadinessGauge pct={readiness.pct} />
            {readiness.pct >= 100 && (
              <span className="text-[10px] uppercase tracking-wider font-mono text-status-done -mt-2">
                Pod is ready to launch.
              </span>
            )}

            <div className="w-full text-center">
              <div className="text-sm font-semibold truncate">{podName}</div>
              <div className="text-xs text-muted-foreground">
                {blueprintById(draft.blueprintId)?.name ?? "Custom pod"}
              </div>
            </div>

            <Separator />

            <dl className="w-full space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Team</dt>
                <dd className="font-mono">{summary}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Tools</dt>
                <dd className="font-mono">
                  {connectedTools}
                  {requiredTools.length > 0 ? `/${requiredTools.length} required` : " connected"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Slack</dt>
                <dd
                  className={cn(
                    "font-mono",
                    slackWired ? "text-status-done" : "text-status-waiting",
                  )}
                >
                  {slackWired ? "Wired" : "Approver pending"}
                </dd>
              </div>
              {draft.agentIds.length > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Est. per ticket</dt>
                  <dd className="font-mono">
                    ${cost.toFixed(2)} · {formatLatency(latency)}
                  </dd>
                </div>
              )}
            </dl>

            <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded-md border border-border bg-white/5 text-muted-foreground">
              {TENANCY_LINE}
            </span>

            {blocked ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="w-full">
                    <Button disabled className="w-full opacity-50">
                      <Rocket className="size-4" />
                      Launch pod
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Resolve all required checks to launch.</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                onClick={startLaunch}
                className={cn(
                  "w-full",
                  allGreen &&
                    "glow-pulse shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
                )}
              >
                <Rocket className="size-4" />
                Launch pod
              </Button>
            )}
          </div>
        </aside>
      </div>

      {/* Warn-override confirm (advisories never block, D2) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Launch with {warnRows.length} warning{warnRows.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <ul className="space-y-1.5 text-sm">
                {warnRows.map((r) => (
                  <li key={r.id} className="flex items-start gap-2">
                    <AlertTriangle className="size-3.5 text-status-waiting shrink-0 mt-0.5" />
                    <span>{r.detail}</span>
                  </li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                setLaunching(true);
              }}
            >
              Launch anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {launching && <LaunchOverlay podName={podName} onComplete={handleComplete} />}
    </TooltipProvider>
  );
}
