import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle, Clock, FileText, Hash, Mail, Megaphone, Newspaper, Reply, Send, Sunrise,
} from "lucide-react";
import {
  OUTBOUND_FEED, OUTBOUND_HONESTY, OUTBOUND_KIND_LABEL,
  type OutboundItem, type OutboundKind,
} from "@/mock/outbound";
import { cn } from "@/lib/utils";

/**
 * Proactive outbound feed (vision §2 "Slack-first communication") - the pod
 * talks FIRST, in the tools humans already use. Read-only surface: nothing
 * here mutates or writes audit; deep links are the "optional depth".
 * Mock-only (route already experience-gated).
 */

const KIND_STYLE: Record<OutboundKind, { icon: typeof Clock; chip: string }> = {
  daily_preparation: { icon: Sunrise, chip: "border-primary/40 bg-primary/10 text-primary" },
  daily_digest: { icon: Newspaper, chip: "border-primary/40 bg-primary/10 text-primary" },
  weekly_report: { icon: FileText, chip: "border-status-done/40 bg-status-done/10 text-status-done" },
  escalation: { icon: AlertTriangle, chip: "border-status-waiting/50 bg-status-waiting/10 text-status-waiting" },
  clarification_echo: { icon: Reply, chip: "border-border bg-white/5 text-muted-foreground" },
};

/** Markdown-lite: the feed summaries only use **bold**. */
function mdBold(s: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    parts.push(
      <strong key={k++} className="font-semibold text-foreground">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

/** Per target part: #channel → Hash, email recipient → Mail, DM/thread → Send. */
function targetIcon(part: string, item: OutboundItem) {
  if (part.startsWith("#")) return Hash;
  if (item.channels.includes("email")) return Mail;
  return Send;
}

function HonestyChips() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {OUTBOUND_HONESTY.split(" · ").map((seg) => {
        const roadmap = /teams/i.test(seg);
        return (
          <span
            key={seg}
            className={cn(
              "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono border",
              roadmap
                ? "border-dashed border-border bg-white/5 text-muted-foreground"
                : "border-status-done/40 bg-status-done/10 text-status-done",
            )}
          >
            {seg}
            {roadmap && (
              <span className="text-[9px] uppercase tracking-wider px-1 rounded border border-dashed border-border text-muted-foreground">
                Roadmap
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function OutboundRow({ item }: { item: OutboundItem }) {
  const kind = KIND_STYLE[item.kind];
  const KindIcon = kind.icon;
  const isEsc = item.kind === "escalation";
  return (
    <li
      className={cn(
        "rounded-md border p-2.5 transition-colors",
        isEsc
          ? "border-status-waiting/40 bg-status-waiting/[0.06] hover:bg-status-waiting/[0.09]"
          : "border-border/60 bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border",
            kind.chip,
          )}
        >
          <KindIcon className="size-3" />
          {OUTBOUND_KIND_LABEL[item.kind]}
        </span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border border-border bg-white/5 text-muted-foreground">
          <Clock className="size-3" />
          {item.cadence} · {item.at}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {item.target.split(" · ").map((part) => {
            const TIcon = targetIcon(part, item);
            return (
              <span
                key={part}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/60 bg-white/[0.03] text-foreground/80"
              >
                <TIcon className="size-3 text-muted-foreground" />
                {part}
              </span>
            );
          })}
        </span>
      </div>
      <div className="mt-1.5 text-xs text-foreground/85 leading-relaxed">{mdBold(item.summaryMd)}</div>
      {item.deepLink && (
        <div className="mt-1">
          <Link
            to={item.deepLink.to}
            className={cn(
              "text-[11px] font-mono hover:underline",
              isEsc ? "text-status-waiting" : "text-primary",
            )}
          >
            {item.deepLink.label}
          </Link>
        </div>
      )}
    </li>
  );
}

export function OutboundFeed() {
  return (
    <section className="glass-panel p-4 border-primary/25">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Proactive outbound · Slack-first
          </div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <Megaphone className="size-4 text-primary" />
            Pushed by the pod - on its own schedule
            <span className="font-mono text-[10px] text-muted-foreground">{OUTBOUND_FEED.length} sends</span>
          </div>
        </div>
        <HonestyChips />
      </div>
      <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-3xl">
        Humans answer in their own tools - the pod reaches out; the dashboard is optional depth.
      </p>
      <ul className="space-y-1.5">
        {OUTBOUND_FEED.map((item) => (
          <OutboundRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
