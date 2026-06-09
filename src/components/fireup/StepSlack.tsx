/**
 * FIRE UP step 5 — Wire Slack (body only; chrome from WizardShell).
 * Routes pod events (clarification gates / approvals / escalations / daily
 * brief) to Slack channels + picks the approver channel. Wiring persists on
 * the draft: usePods().draft.slackWiring + draft.approverChannelId.
 *
 * Gating (D2): this step FLAGS only — no approver chosen shows an amber hint
 * and leaves Readiness "Slack wired" partial; Next is never blocked here.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BellOff,
  CalendarClock,
  CheckCircle2,
  Hash,
  HelpCircle,
  Info,
  Lock,
  MessageSquare,
  ShieldCheck,
  Siren,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { COMMS, SCHEDULED } from "@/mock/comms";
import { usePods, type SlackEventId, type SlackWiringRow } from "@/lib/pods/pod-store";

/* ------------------------------------------------------------------ */
/* Mock Slack workspace + channels                                      */
/* ------------------------------------------------------------------ */

const WORKSPACE = { name: "Q-Agency", botName: "AgencyOS", channelsTotal: 7 };

interface SlackChannel {
  id: string;
  name: string;
  kind: "public" | "private" | "dm";
  memberCount: number;
}

const SLACK_CHANNELS: SlackChannel[] = [
  { id: "automarket-dev", name: "automarket-dev", kind: "public", memberCount: 14 },
  { id: "automarket-leads", name: "automarket-leads", kind: "private", memberCount: 6 },
  { id: "automarket-qa", name: "automarket-qa", kind: "public", memberCount: 9 },
  { id: "automarket-escalations", name: "automarket-escalations", kind: "private", memberCount: 5 },
  { id: "dm-zlatko", name: "DM → Zlatko", kind: "dm", memberCount: 1 },
];

function channelLabel(id: string | null): string {
  const ch = SLACK_CHANNELS.find((c) => c.id === id);
  if (!ch) return "—";
  return ch.kind === "dm" ? ch.name : `#${ch.name}`;
}

function ChannelGlyph({ kind }: { kind: SlackChannel["kind"] }) {
  const Icon = kind === "dm" ? User : kind === "private" ? Lock : Hash;
  return <Icon className="size-3 text-muted-foreground shrink-0" />;
}

/* ------------------------------------------------------------------ */
/* Event metadata (exact copy from the screens spec)                    */
/* ------------------------------------------------------------------ */

interface EventMeta {
  id: SlackEventId;
  label: string;
  description: string;
  icon: LucideIcon;
  suggestedChannelId: string;
}

const EVENTS: EventMeta[] = [
  {
    id: "clarification",
    label: "Clarification gates",
    description: "When an agent needs an answer to keep going.",
    icon: HelpCircle,
    suggestedChannelId: "automarket-dev",
  },
  {
    id: "approval",
    label: "Approvals",
    description: "When an artifact needs human sign-off.",
    icon: CheckCircle2,
    suggestedChannelId: "automarket-dev",
  },
  {
    id: "escalation",
    label: "Escalations",
    description: "When something's stuck, failing, or breaching SLA.",
    icon: Siren,
    suggestedChannelId: "automarket-escalations",
  },
  {
    id: "daily_brief",
    label: "Daily brief",
    description: "A once-a-day digest of what shipped, what's at gates, what's blocked.",
    icon: CalendarClock,
    suggestedChannelId: "automarket-leads",
  },
];

/* ------------------------------------------------------------------ */
/* Slack message preview (reuses comms.ts copy)                         */
/* ------------------------------------------------------------------ */

const commById = (id: string) => COMMS.find((c) => c.id === id);

interface PreviewMessage {
  headline: string;
  body: string;
  actions: string[];
}

function previewFor(event: SlackEventId): PreviewMessage | null {
  switch (event) {
    case "clarification": {
      const c = commById("c7");
      return c
        ? {
            headline: `Clarification gate · ${c.ticketId ?? ""}`.trim(),
            body: c.body,
            actions: ["Answer in thread", "Open ticket"],
          }
        : null;
    }
    case "approval": {
      const c = commById("c1");
      return c
        ? {
            headline: `Approval needed · ${c.ticketId ?? ""}`.trim(),
            body: c.body,
            actions: ["Approve", "Request changes"],
          }
        : null;
    }
    case "escalation": {
      const c = commById("c3");
      return c
        ? {
            headline: `Escalation · ${c.ticketId ?? ""} · gate stale 26h`.trim(),
            body: c.body,
            actions: ["Acknowledge", "Reassign"],
          }
        : null;
    }
    case "daily_brief":
      return null; // rendered from SCHEDULED s1 sections below
  }
}

function SlackActionChips({ actions }: { actions: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2" aria-hidden>
      {actions.map((a, i) => (
        <span
          key={a}
          className={cn(
            "text-[11px] px-2 py-0.5 rounded border cursor-default select-none",
            i === 0
              ? "border-status-done/60 text-status-done bg-status-done/10 font-medium"
              : "border-border text-muted-foreground bg-white/5",
          )}
        >
          {a}
        </span>
      ))}
    </div>
  );
}

function SlackMessagePreview({
  event,
  channelId,
  enabled,
}: {
  event: SlackEventId;
  channelId: string | null;
  enabled: boolean;
}) {
  const meta = EVENTS.find((e) => e.id === event)!;
  const channel = SLACK_CHANNELS.find((c) => c.id === channelId);
  const brief = SCHEDULED.find((s) => s.id === "s1");
  const msg = previewFor(event);

  return (
    <div className="rounded-md border border-border bg-panel/40 backdrop-blur-md overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          Live preview
        </span>
        <span className="flex-1" />
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          {meta.label}
        </span>
      </div>

      {/* Slack-style channel header */}
      <div className="px-3 py-2 flex items-center gap-1.5 text-xs border-b border-border/60 bg-white/[0.02]">
        {channel ? (
          <ChannelGlyph kind={channel.kind} />
        ) : (
          <Hash className="size-3 text-muted-foreground" />
        )}
        <span className="font-medium">{channel ? channelLabel(channel.id) : "Pick a channel"}</span>
        <span className="text-muted-foreground">· {WORKSPACE.name} workspace</span>
      </div>

      <div className="p-3">
        {!enabled ? (
          <div className="min-h-[140px] flex flex-col items-center justify-center gap-2 text-center">
            <BellOff className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              This event won&apos;t be posted to Slack.
            </p>
          </div>
        ) : (
          <div className="flex gap-2.5">
            <div className="size-8 rounded-md bg-primary/20 border border-primary/40 grid place-items-center text-primary shrink-0">
              <MessageSquare className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm font-semibold">{WORKSPACE.botName}</span>
                <span className="text-[9px] uppercase font-mono px-1 py-px rounded bg-white/10 border border-border text-muted-foreground">
                  app
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">just now</span>
              </div>

              {event === "daily_brief" && brief ? (
                <div className="mt-1 space-y-2">
                  <div className="text-xs font-semibold">{brief.preview.title}</div>
                  {brief.preview.sections.map((s) => (
                    <div key={s.heading} className="border-l-2 border-primary/40 pl-2">
                      <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                        {s.heading}
                      </div>
                      {s.lines.map((l) => (
                        <div key={l} className="text-xs text-foreground/90 leading-relaxed">
                          {l}
                        </div>
                      ))}
                    </div>
                  ))}
                  <SlackActionChips actions={["Open Command Center"]} />
                </div>
              ) : msg ? (
                <div className="mt-1">
                  <div className="text-xs font-semibold">{msg.headline}</div>
                  <p className="text-xs text-foreground/90 leading-relaxed mt-1">{msg.body}</p>
                  <SlackActionChips actions={msg.actions} />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Channel select                                                       */
/* ------------------------------------------------------------------ */

function ChannelSelect({
  value,
  onChange,
  disabled,
  placeholder,
  ariaLabel,
}: {
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    // Always controlled: "" shows the placeholder (radix-select ≥2 clears on empty).
    <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-8 w-full sm:w-56 bg-white/5 border-border text-xs"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {SLACK_CHANNELS.map((ch) => (
          <SelectItem key={ch.id} value={ch.id} className="text-xs">
            <span className="flex items-center gap-1.5">
              <ChannelGlyph kind={ch.kind} />
              <span>{ch.kind === "dm" ? ch.name : `#${ch.name}`}</span>
              <span className="text-muted-foreground text-[10px] font-mono">
                {ch.kind === "dm" ? "" : `· ${ch.memberCount}`}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ------------------------------------------------------------------ */
/* Step body                                                            */
/* ------------------------------------------------------------------ */

export function StepSlack() {
  const navigate = useNavigate();
  const { draft, updateDraft } = usePods();
  const [focused, setFocused] = useState<SlackEventId>("clarification");

  const slackConnected = useMemo(
    () =>
      (draft?.connections ?? []).some((c) => c.connectorId === "slack" && c.status === "connected"),
    [draft?.connections],
  );

  if (!draft) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <Skeleton className="h-8 w-72" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const rows = draft.slackWiring;
  const rowFor = (event: SlackEventId): SlackWiringRow =>
    rows.find((r) => r.event === event) ?? { event, channelId: "", enabled: true };

  const setRow = (event: SlackEventId, patch: Partial<SlackWiringRow>) => {
    updateDraft({
      slackWiring: EVENTS.map((e) => ({ ...rowFor(e.id), ...(e.id === event ? patch : {}) })),
    });
    setFocused(event);
  };

  const focusedRow = rowFor(focused);
  const approvalRow = rowFor("approval");

  const enabledRows = EVENTS.map((e) => rowFor(e.id)).filter((r) => r.enabled && r.channelId);
  const allSameChannel =
    enabledRows.length > 1 && enabledRows.every((r) => r.channelId === enabledRows[0].channelId);
  const approverDiffers =
    Boolean(draft.approverChannelId) &&
    Boolean(approvalRow.channelId) &&
    approvalRow.enabled &&
    draft.approverChannelId !== approvalRow.channelId;

  return (
    <div className="space-y-4">
      {/* Connect-first gate */}
      {!slackConnected && (
        <Alert className="border-status-waiting/50 bg-status-waiting/10 [&>svg]:text-status-waiting">
          <Info className="size-4" />
          <AlertTitle className="text-status-waiting">Connect Slack first</AlertTitle>
          <AlertDescription>
            <p className="text-xs text-muted-foreground">
              Connect Slack to wire your pod&apos;s notifications.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => void navigate({ to: "/pods/new", search: { step: "connect" } })}
            >
              <ArrowLeft className="size-3.5" />
              Connect Slack
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Workspace header strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded-md border",
            slackConnected
              ? "border-status-done/50 bg-status-done/10 text-status-done"
              : "border-border bg-white/5 text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              slackConnected ? "bg-status-done" : "bg-status-idle",
            )}
          />
          {slackConnected
            ? `Connected · ${WORKSPACE.name} workspace · ${WORKSPACE.channelsTotal} channels`
            : "Slack not connected"}
        </span>
        <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded-md border border-primary/40 bg-primary/10 text-primary">
          Slack · Live
        </span>
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          Posting as {WORKSPACE.botName}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px] items-start">
        {/* Routing card */}
        <section
          className={cn(
            "rounded-md border border-border bg-panel/40 backdrop-blur-md",
            !slackConnected && "opacity-60",
          )}
        >
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Event routing
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {EVENTS.map((meta) => {
              const row = rowFor(meta.id);
              const Icon = meta.icon;
              const isFocused = focused === meta.id;
              return (
                <div
                  key={meta.id}
                  onClick={() => setFocused(meta.id)}
                  className={cn(
                    "px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 cursor-pointer transition-colors",
                    isFocused ? "bg-primary/5" : "hover:bg-white/[0.02]",
                    !row.enabled && "opacity-70",
                  )}
                >
                  <div
                    className={cn(
                      "hidden sm:grid size-7 rounded-md border place-items-center shrink-0",
                      isFocused
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-white/5 text-muted-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">{meta.description}</div>
                  </div>
                  <div
                    className="flex items-center gap-3 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChannelSelect
                      value={row.channelId || null}
                      onChange={(id) => setRow(meta.id, { channelId: id })}
                      disabled={!slackConnected || !row.enabled}
                      placeholder={`Suggested: ${channelLabel(meta.suggestedChannelId)}`}
                      ariaLabel={`${meta.label} channel`}
                    />
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={row.enabled}
                        disabled={!slackConnected}
                        onCheckedChange={(enabled) => setRow(meta.id, { enabled })}
                        aria-label={`${meta.label} enabled`}
                      />
                      <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground w-10">
                        {row.enabled ? "On" : "Muted"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator className="bg-primary/20" />

          {/* Approver channel — visually separated, accent */}
          <div className="px-4 py-3.5 border-l-2 border-l-primary bg-primary/[0.04] rounded-br-md">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="hidden sm:grid size-7 rounded-md border border-primary/50 bg-primary/10 text-primary place-items-center shrink-0">
                <ShieldCheck className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-medium leading-tight flex items-center gap-2">
                  Approver channel
                  {draft.approverChannelId && (
                    <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-px rounded border border-status-done/50 bg-status-done/10 text-status-done">
                      Approver
                    </span>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Approval gates posted here can be cleared by the team — maps to the pod&apos;s
                  approver list.
                </p>
              </div>
              <div className="shrink-0">
                <ChannelSelect
                  value={draft.approverChannelId}
                  onChange={(id) => updateDraft({ approverChannelId: id })}
                  disabled={!slackConnected}
                  placeholder="Suggested: #automarket-leads"
                  ariaLabel="Approver channel"
                />
              </div>
            </div>

            {!draft.approverChannelId && (
              <p className="mt-2 text-[11px] text-status-waiting flex items-center gap-1.5">
                <Info className="size-3 shrink-0" />
                Pick an approver channel so approval gates can be actioned.
              </p>
            )}
            {approverDiffers && (
              <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Info className="size-3 shrink-0" />
                Approvals will post to {channelLabel(approvalRow.channelId)} and be actionable in{" "}
                {channelLabel(draft.approverChannelId)}.
              </p>
            )}
          </div>
        </section>

        {/* Live preview rail */}
        <aside className="space-y-2 lg:sticky lg:top-4">
          <SlackMessagePreview
            event={focused}
            channelId={focusedRow.channelId || null}
            enabled={slackConnected && focusedRow.enabled}
          />
          {allSameChannel && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 px-1">
              <Info className="size-3 shrink-0 mt-0.5" />
              All events route to {channelLabel(enabledRows[0].channelId)} — consider splitting
              escalations.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
