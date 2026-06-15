/**
 * ShareViewer (/share/$token, P1-H4) - chrome-less, client-clean render of a
 * shared report for someone with NO account: the token is the only auth.
 *
 * States:
 *  - active  → the weekly ClientStatusReport blocks, read-only, plus the
 *              "this view is recorded" footer. Opening it appends the audited
 *              view event (data.exported, via recordShareView) - once per mount.
 *  - expired / revoked / unknown → calm cards that leak ZERO report data.
 *
 * Light-first via ClientCleanTheme even though the app shell is dark;
 * print-friendly. SSR-safe: the audit write happens in useEffect only.
 */

import { useEffect, useRef } from "react";
import { FileQuestion, ShieldOff, TimerOff, type LucideIcon } from "lucide-react";
import { ClientStatusReport } from "@/components/reports/ClientReportTab";
import { humans } from "@/mock/humans";
import { reportById } from "@/mock/report";
import {
  SHARE_KIND_LABELS,
  effectiveShareState,
  recordShareView,
  shareByToken,
} from "@/mock/share";
import { ClientCleanTheme } from "./ClientCleanTheme";
import { FunnelLink, ShareFooter } from "./ShareFooter";

export function ShareViewer({ token }: { token: string }) {
  const link = shareByToken(token);
  const state = link ? effectiveShareState(link) : "unknown";

  /* The audited view event - client-only, once per mount per token
     (recordShareView itself no-ops unless the link is active). */
  const recordedFor = useRef<string | null>(null);
  useEffect(() => {
    if (state !== "active" || recordedFor.current === token) return;
    recordedFor.current = token;
    recordShareView(token);
  }, [token, state]);

  if (!link || state === "unknown") {
    return (
      <StatusCard
        icon={FileQuestion}
        title="Link not found"
        body="This share link isn't valid. Check the address, or ask the sender for a fresh one."
      />
    );
  }

  if (state === "expired") {
    const sender = humans.find((h) => h.id === link.createdBy)?.name ?? "the sender";
    return (
      <StatusCard
        icon={TimerOff}
        title="This link has expired"
        body={`This link has expired. Ask ${sender} to share a fresh one.`}
      />
    );
  }

  if (state === "revoked") {
    return (
      <StatusCard
        icon={ShieldOff}
        title="Link revoked"
        body="This link was revoked by the pod admin."
      />
    );
  }

  /* active */
  const report = reportById(link.targetId);
  if (!report) {
    // Active link whose target isn't a renderable report in the mock
    // (e.g. a usage statement) - stay graceful, stay data-free.
    return (
      <StatusCard
        icon={FileQuestion}
        title={`${SHARE_KIND_LABELS[link.kind]} unavailable`}
        body="This shared document can't be displayed right now. Ask the sender for a fresh link."
      />
    );
  }

  return (
    <ClientCleanTheme>
      <ClientStatusReport
        report={report}
        isSent={report.status === "sent"}
        sentAt={report.sentAt}
      />
      <ShareFooter podName={report.podName} expiresAt={link.expiresAt} />
    </ClientCleanTheme>
  );
}

/* ------------------------------------------------------------------ */
/* Calm, data-free state cards (expired / revoked / unknown)            */
/* ------------------------------------------------------------------ */

function StatusCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <ClientCleanTheme>
      <div className="mx-auto mt-[16vh] w-full max-w-md rounded-xl border border-black/10 bg-white p-8 text-center shadow-xl print:shadow-none">
        <div className="mx-auto grid size-10 place-items-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="size-5" />
        </div>
        <h1 className="mt-4 text-base font-semibold text-slate-900">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
      </div>
      <div className="mt-5 text-center">
        <FunnelLink />
      </div>
    </ClientCleanTheme>
  );
}
