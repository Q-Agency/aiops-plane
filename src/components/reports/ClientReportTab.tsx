/**
 * ClientReportTab (/reports · "Client report" tab, C8) - the weekly
 * sponsor-facing status report in a CLIENT-CLEAN style: a light "paper"
 * card island inside the dark shell. No neon, no scanlines, no mono
 * chips - plain language a sponsor reads in 60 seconds.
 *
 * Action bar: period selector + Copy share link (copies the real
 * /share/$token viewer URL, P1-H4) + Export PDF (mock toast) +
 * Mark as sent (draft → sent, local).
 *
 * Honesty: `headline.humanHoursSaved` renders as "human-hours freed" (C2);
 * breached SLAs are shown with their mitigation note, never hidden.
 */

import { useState } from "react";
import { CheckCircle2, FileDown, Link2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  currentReport, reportById, reports,
  type ReportGate, type WeeklyReport,
} from "@/mock/report";
import { SHARE_LINKS, effectiveShareState } from "@/mock/share";
import type { Stage } from "@/mock/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Plain-language helpers (sponsor copy - no internal jargon)           */
/* ------------------------------------------------------------------ */

/** Fixed display TZ (same convention as @/lib/time) so SSR === client. */
const _day = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Zagreb",
  day: "2-digit",
  month: "short",
});
const fmtDay = (ms: number) => _day.format(new Date(ms));

const STAGE_PLAIN: Partial<Record<Stage, string>> = {
  done: "Shipped",
  "dev-review": "In code review",
  "ready-qa": "Ready for QA",
  "qa-review": "In QA review",
};
const stagePlain = (s: Stage) => STAGE_PLAIN[s] ?? s.replace(/-/g, " ");

const gateKindPlain = (k: ReportGate["kind"]) =>
  k === "approval" ? "Approval" : "Clarification";

const fmtUsd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/* ------------------------------------------------------------------ */
/* Tab                                                                  */
/* ------------------------------------------------------------------ */

export function ClientReportTab() {
  const [periodId, setPeriodId] = useState<string>(() => currentReport().id);
  /** Local "Mark as sent" overlay - mock-only, survives tab switches. */
  const [sentOverride, setSentOverride] = useState<Record<string, number>>({});

  const report = reportById(periodId) ?? currentReport();
  const sentAt = sentOverride[report.id] ?? report.sentAt;
  const isSent = report.status === "sent" || report.id in sentOverride;

  const copyShareLink = async () => {
    // The live token for the weekly report - its /share/$token viewer (P1-H4).
    const link = SHARE_LINKS.find(
      (l) => l.kind === "weekly_report" && effectiveShareState(l) === "active",
    );
    if (!link) {
      toast.error("No active share link for this report");
      return;
    }
    const url = `${window.location.origin}/share/${link.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard unavailable - toast still shows the link */
    }
    const daysLeft = Math.max(1, Math.ceil((link.expiresAt - Date.now()) / 86_400_000));
    toast.success(`Share link copied - expires in ${daysLeft} days`, { description: url });
  };

  const exportPdf = () => {
    toast.success("PDF exported (mock)", {
      description: `weekly-status_${report.id}.pdf`,
    });
  };

  const markAsSent = () => {
    setSentOverride((prev) => ({ ...prev, [report.id]: Date.now() }));
    toast.success("Weekly report sent to sponsor", {
      description: `${report.podName} · ${fmtDay(report.periodStart)} - ${fmtDay(report.periodEnd)}`,
    });
  };

  return (
    <div className="space-y-3">
      {/* action bar */}
      <div className="flex items-center justify-end flex-wrap gap-2">
        <Select value={report.id} onValueChange={setPeriodId}>
          <SelectTrigger className="h-8 w-[230px] bg-white/5 border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reports.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-xs">
                <span suppressHydrationWarning>
                  {fmtDay(r.periodStart)} - {fmtDay(r.periodEnd)}
                  {" · "}
                  {r.status === "sent" || r.id in sentOverride ? "sent" : "draft"}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={copyShareLink}>
          <Link2 className="size-3.5" /> Copy share link
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportPdf}>
          <FileDown className="size-3.5" /> Export PDF
        </Button>
        {!isSent && (
          <Button size="sm" className="h-8 text-xs" onClick={markAsSent}>
            <Send className="size-3.5" /> Mark as sent
          </Button>
        )}
      </div>

      <ClientStatusReport report={report} isSent={isSent} sentAt={sentAt} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The report sheet - CLIENT-CLEAN (light paper card, plain language)   */
/* ------------------------------------------------------------------ */

export function ClientStatusReport({
  report, isSent, sentAt,
}: {
  report: WeeklyReport;
  isSent: boolean;
  sentAt?: number;
}) {
  const empty = report.delivered.length === 0 && report.gatesCleared.length === 0;

  return (
    <div className="mx-auto w-full max-w-[880px] rounded-xl border border-black/10 bg-white text-slate-900 shadow-xl print:shadow-none">
      {/* report header */}
      <header className="flex items-start justify-between gap-4 p-6 sm:p-8 pb-5 border-b border-slate-200">
        <div className="flex items-start gap-4 min-w-0">
          {/* client logo slot */}
          <div
            className="size-12 shrink-0 rounded-lg border border-dashed border-slate-300 grid place-items-center text-slate-400 text-sm font-semibold"
            title="Client logo slot"
          >
            AM
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-slate-400 font-medium">
              Weekly client status report
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-0.5 truncate">
              Weekly Status - {report.podName}
            </h2>
            <div className="text-xs text-slate-500 mt-0.5" suppressHydrationWarning>
              {fmtDay(report.periodStart)} - {fmtDay(report.periodEnd)} · prepared for AutoMarket GmbH
            </div>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 text-[11px] font-medium rounded-full px-2.5 py-1",
            isSent ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200",
          )}
          suppressHydrationWarning
        >
          {isSent ? (sentAt ? `Sent ${fmtDay(sentAt)}` : "Sent") : "Draft"}
        </span>
      </header>

      {empty ? (
        <div className="p-10 text-center text-sm text-slate-500">
          Nothing delivered in this period yet. Your first weekly report generates once work clears a gate.
        </div>
      ) : (
        <div className="p-6 sm:p-8 space-y-7">
          <p className="text-sm text-slate-700">Here&apos;s what your pod delivered this week.</p>

          {/* headline metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <HeadlineStat label="Items delivered" value={String(report.headline.itemsDelivered)} />
            <HeadlineStat label="Gates cleared" value={String(report.headline.gatesCleared)} />
            <HeadlineStat label="Avg cycle time" value={`${(report.headline.avgCycleTimeHr / 24).toFixed(1)} days`} />
            <HeadlineStat label="Human-hours freed" value={`${report.headline.humanHoursSaved.toFixed(0)} h`} accent />
            <HeadlineStat label="Spend this period" value={fmtUsd(report.headline.spendUsd)} />
          </div>

          {/* narrative */}
          <ReportBlock title="Summary">
            <p className="text-sm text-slate-700 leading-relaxed">{report.narrative}</p>
          </ReportBlock>

          {/* delivered */}
          <ReportBlock title="What we delivered">
            <ul className="divide-y divide-slate-100">
              {report.delivered.map((item) => (
                <li key={item.workItemId} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-800 font-medium truncate">{item.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {item.workItemId} · {stagePlain(item.stage)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-slate-500">{item.storyPoints} pts</div>
                    <div className="text-xs text-slate-400" suppressHydrationWarning>{fmtDay(item.deliveredAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </ReportBlock>

          {/* gates cleared - the named-human sign-off table */}
          <ReportBlock title="Gates cleared - and who cleared them">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                  <th className="py-1.5 pr-3 font-medium">Work item</th>
                  <th className="py-1.5 pr-3 font-medium">Gate</th>
                  <th className="py-1.5 pr-3 font-medium">Decision</th>
                  <th className="py-1.5 pr-3 font-medium">Cleared by</th>
                  <th className="py-1.5 text-right font-medium">Turnaround</th>
                </tr>
              </thead>
              <tbody>
                {report.gatesCleared.map((g, i) => (
                  <tr key={`${g.workItemId}-${g.kind}-${i}`} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-2 pr-3">
                      <div className="text-slate-800">{g.title}</div>
                      <div className="text-xs text-slate-400">{g.workItemId}</div>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{gateKindPlain(g.kind)}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
                          g.decision === "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
                        )}
                      >
                        {g.decision === "approved" ? "Approved" : "Returned with feedback"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-800">{g.clearedBy}</td>
                    <td className="py-2 text-right text-slate-600 tabular-nums">{g.turnaroundHr.toFixed(1)} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">
              Every delivery above passed a named human sign-off before it moved forward.
            </p>
          </ReportBlock>

          {/* service levels - honest, incl. breaches */}
          <ReportBlock title="Service levels">
            <div className="flex items-center gap-5 text-sm">
              <SlaDot color="bg-emerald-500" label={`${report.slaSummary.onTrack} on track`} />
              <SlaDot color="bg-amber-500" label={`${report.slaSummary.atRisk} at risk`} />
              <SlaDot color="bg-red-500" label={`${report.slaSummary.breached} breached`} />
            </div>
            {report.slaSummary.notable.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {report.slaSummary.notable.map((n) => (
                  <li key={n} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 rounded-full bg-red-500 shrink-0" />
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </ReportBlock>

          {/* spend */}
          <ReportBlock title="Spend vs budget">
            <p className="text-sm text-slate-700">{report.costNote}</p>
          </ReportBlock>

          {/* next week */}
          <ReportBlock title="Next week">
            <ul className="space-y-1.5">
              {report.upcoming.map((u) => (
                <li key={u} className="text-sm text-slate-700 flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-slate-300 mt-0.5 shrink-0" />
                  {u}
                </li>
              ))}
            </ul>
          </ReportBlock>
        </div>
      )}

      <footer className="px-6 sm:px-8 py-4 border-t border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>Prepared by AI PodOps · Q - generated from the pod&apos;s live delivery record.</span>
        <span suppressHydrationWarning>{isSent && sentAt ? `Sent ${fmtDay(sentAt)}` : "Not sent yet"}</span>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Report pieces                                                        */
/* ------------------------------------------------------------------ */

export function ReportBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-widest text-slate-400 font-medium mb-2.5">
        {title}
      </h3>
      {children}
    </section>
  );
}

function HeadlineStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
      <div className={cn("text-lg font-semibold tabular-nums", accent ? "text-emerald-700" : "text-slate-900")}>
        {value}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function SlaDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-700">
      <span className={cn("size-2 rounded-full", color)} />
      {label}
    </span>
  );
}
