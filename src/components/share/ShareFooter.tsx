/**
 * ShareFooter (/share/$token) - the slim provenance line under an active
 * shared report: "Shared by {pod} via Agency OS · this view is recorded ·
 * expires {date}". The muted "What is Agency OS?" link is the funnel asset
 * and the page's only navigation (spec: Shared Report Viewer, P1-H4).
 */

/** Fixed display TZ (same convention as @/lib/time) so SSR === client. */
const _date = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Zagreb",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Muted funnel link - a plain <a> (full load) since the viewer has no session. */
export function FunnelLink() {
  return (
    <a
      href="/"
      className="text-xs text-slate-400 underline underline-offset-2 transition-colors hover:text-slate-600"
    >
      What is Agency OS?
    </a>
  );
}

export function ShareFooter({ podName, expiresAt }: { podName: string; expiresAt: number }) {
  return (
    <footer className="mt-6 flex flex-col items-center gap-1.5 pb-8 text-center print:pb-0">
      <p className="text-xs text-slate-500" suppressHydrationWarning>
        Shared by {podName} via Agency OS · this view is recorded · expires{" "}
        {_date.format(new Date(expiresAt))}
      </p>
      <FunnelLink />
    </footer>
  );
}
