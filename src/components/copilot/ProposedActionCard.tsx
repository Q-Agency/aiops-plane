/**
 * ProposedActionCard — an NL operation rendered as a confirm-first card:
 * action summary, target, and THE EXACT audit row a Confirm will write
 * (previewDetail keeps the preview byte-identical to what appendAuditMock
 * receives). NOTHING EXECUTES UNCONFIRMED. Pause intents require a typed
 * reason — same rule as the equivalent buttons — and the typed reason is
 * written to the ledger verbatim as the row's detail.
 *
 * Confirmed → collapses to the written row ("agent.paused · ledger #5001").
 * Cancelled → collapses to a muted "nothing executed, nothing written".
 */

import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_POD } from "@/lib/pods/pod-store";
import { cn } from "@/lib/utils";
import { agents } from "@/mock/agents";
import type { ProposedAction } from "@/mock/copilot";
import { actionRequiresReason, previewDetail, type ActionStatus } from "./useCopilotAnswers";

const INTENT_ICON: Record<ProposedAction["intent"], LucideIcon> = {
  "pause-agent": PauseCircle,
  "resume-agent": PlayCircle,
  "pause-pod": PauseCircle,
  "open-gate": ExternalLink,
};

interface TargetMeta {
  /** "QA Agent", "AutoMarket Web Pod", "appr-AM-142" */
  name: string;
  /** Agent color token var — agents only. */
  colorVar?: string;
}

function targetMeta(p: ProposedAction): TargetMeta {
  if (p.intent === "pause-agent" || p.intent === "resume-agent") {
    const a = agents.find((x) => x.id === p.target);
    return { name: a?.name ?? p.target, colorVar: a ? `var(--${a.color})` : undefined };
  }
  if (p.intent === "pause-pod") {
    return { name: p.target === SAMPLE_POD.id ? SAMPLE_POD.name : p.target };
  }
  return { name: p.target };
}

function titleFor(p: ProposedAction, target: TargetMeta): string {
  switch (p.intent) {
    case "pause-agent":
      return `Pause ${target.name}`;
    case "resume-agent":
      return `Resume ${target.name}`;
    case "pause-pod":
      return `Pause pod — ${target.name}`;
    case "open-gate":
      return `Open gate ${p.target}`;
  }
}

function summaryFor(p: ProposedAction, target: TargetMeta): string {
  switch (p.intent) {
    case "pause-agent":
      return `${target.name} finishes its in-flight run, then stops picking up work (reason required).`;
    case "resume-agent":
      return `${target.name} starts picking up work again — queued work resumes in order.`;
    case "pause-pod":
      return `All agents finish in-flight runs, then stop. Open gates stay answerable (reason required).`;
    case "open-gate":
      return `Jumps to the gate review at /approvals/${p.target}.`;
  }
}

const Verb = ({ children }: { children: string }) => (
  <code className="font-mono text-[11px] bg-white/5 border border-border rounded px-1">
    {children}
  </code>
);

export interface ProposedActionCardProps {
  action: ProposedAction;
  status: ActionStatus;
  /** Session-ledger id, set once confirmed. */
  ledgerId?: number;
  /** Detail as written to the ledger (typed reason where required). */
  writtenDetail?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ProposedActionCard({
  action,
  status,
  ledgerId,
  writtenDetail,
  onConfirm,
  onCancel,
}: ProposedActionCardProps) {
  const [reason, setReason] = useState("");
  const target = targetMeta(action);
  const needsReason = actionRequiresReason(action.intent);
  const Icon = INTENT_ICON[action.intent];

  /* ----- collapsed: confirmed — the written audit row ----- */
  if (status === "confirmed") {
    return (
      <div className="rounded-lg border border-status-done/40 bg-status-done/10 px-3 py-2">
        <div className="flex items-center gap-2 font-mono text-xs text-status-done">
          <CheckCircle2 className="size-3.5 shrink-0" />
          <span className="truncate">
            {action.auditPreview.action} · ledger #{ledgerId ?? "—"}
          </span>
        </div>
        {writtenDetail && (
          <div className="mt-1 pl-5.5 text-[11px] text-muted-foreground truncate">
            “{writtenDetail}”
          </div>
        )}
      </div>
    );
  }

  /* ----- collapsed: cancelled ----- */
  if (status === "cancelled") {
    return (
      <div className="rounded-lg border border-border/60 bg-white/[0.02] px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Ban className="size-3.5 shrink-0" />
        Cancelled — nothing executed, nothing written.
      </div>
    );
  }

  /* ----- pending: confirm-first card ----- */
  const detail = previewDetail(action, reason);
  const confirmBlocked = needsReason && !reason.trim();

  return (
    <div className="rounded-lg border border-primary/40 bg-panel/40 backdrop-blur-md overflow-hidden">
      {/* header */}
      <div className="px-3 py-2.5 border-b border-border/60 flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold truncate">{titleFor(action, target)}</span>
        <span className="ml-auto shrink-0 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
          PROPOSED
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-2.5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {summaryFor(action, target)} Will write <Verb>{action.auditPreview.action}</Verb> to the
          ledger.
        </p>

        {/* target */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Target
          </span>
          <span
            className="font-mono text-[11px] rounded border border-border bg-white/5 px-1.5 py-0.5"
            style={target.colorVar ? { color: target.colorVar } : undefined}
          >
            {action.target}
          </span>
          <span className="text-muted-foreground truncate">{target.name}</span>
        </div>

        {/* THE EXACT audit row a Confirm writes */}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Will write to ledger
          </div>
          <div className="rounded border border-border bg-white/[0.03] font-mono text-[11px] divide-y divide-border/60">
            {(
              [
                ["action", action.auditPreview.action, false],
                ["target", action.auditPreview.target ?? action.target, false],
                ["detail", detail, needsReason && !reason.trim()],
                ["actor", "human · you", false],
                ["id", "#— assigned on confirm", true],
              ] as const
            ).map(([k, v, muted]) => (
              <div key={k} className="grid grid-cols-[56px_1fr] gap-2 px-2 py-1">
                <span className="text-muted-foreground">{k}</span>
                <span className={cn("break-words", muted ? "text-muted-foreground italic" : "text-foreground")}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* typed reason — required exactly where the equivalent button requires one */}
        {needsReason && (
          <div>
            <label
              htmlFor={`copilot-reason-${action.intent}-${action.target}`}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block"
            >
              Reason <span className="text-status-error">· required</span>
            </label>
            <Textarea
              id={`copilot-reason-${action.intent}-${action.target}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Typed reason — written to the ledger verbatim."
              className="min-h-[52px] text-xs bg-white/[0.03] border-border/60"
            />
          </div>
        )}

        {/* confirm / cancel — nothing executes unconfirmed */}
        <div className="flex items-center gap-2 pt-0.5">
          <Button
            size="sm"
            disabled={confirmBlocked}
            onClick={() => onConfirm(reason)}
            title={confirmBlocked ? "Type a reason first — it is written to the ledger." : undefined}
          >
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <span className="ml-auto text-[10px] text-muted-foreground">
            Nothing executes unconfirmed
          </span>
        </div>
      </div>
    </div>
  );
}
