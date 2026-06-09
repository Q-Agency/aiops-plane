import { useQuery } from "@tanstack/react-query";
import { Settings as SettingsIcon, Database, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

import { getAuditStatusFn, type AuditStatus } from "@/lib/api/fleet.functions";
import { fmtDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

type Props = { initial: AuditStatus | null };

export function SettingsView({ initial }: Props) {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["audit-status"],
    queryFn: () => getAuditStatusFn(),
    initialData: initial ?? undefined,
    refetchInterval: 30000,
  });
  const s = (data ?? null) as AuditStatus | null;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="glass-panel flex flex-wrap items-center gap-3 p-5">
        <div className="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <SettingsIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold">Settings</div>
          <div className="text-xs text-muted-foreground">Dashboard-owned configuration.</div>
        </div>
      </div>

      <section className="glass-panel p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Audit database</h2>
          </div>
          <StatusBadge s={s} />
        </div>

        <p className="mb-4 max-w-2xl text-xs text-muted-foreground">
          The control plane’s append-only audit ledger (Supabase). Records state-changing fleet
          actions so they survive an agent deleting its own data.
        </p>

        <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
          <Field label="Project URL" mono>
            {s?.url ?? <span className="text-muted-foreground">—</span>}
          </Field>
          <Field label="Recorded events">
            {s?.reachable ? (s.rowCount ?? 0).toLocaleString("en-US") : "—"}
          </Field>
          <Field label="Last action">
            {s?.lastOccurredAt ? fmtDateTime(s.lastOccurredAt) : "—"}
          </Field>
          <Field label="Service-role key" mono>
            <span className="text-muted-foreground">set via env — never shown</span>
          </Field>
        </dl>

        {s?.error && (
          <div className="mt-4 rounded-md border border-status-error/30 bg-status-error/5 p-2.5 text-[11px] text-status-error">
            Connection error: {s.error}
          </div>
        )}

        {s && !s.configured && (
          <div className="mt-4 rounded-md border border-border bg-white/[0.02] p-3 text-[11px] text-muted-foreground">
            Not configured. Set these in the dashboard environment, then restart:
            <ul className="mt-1.5 space-y-0.5 font-mono">
              <li>
                <code className="rounded bg-white/10 px-1">DASHBOARD_SUPABASE_URL</code>
              </li>
              <li>
                <code className="rounded bg-white/10 px-1">
                  DASHBOARD_SUPABASE_SERVICE_ROLE_KEY
                </code>{" "}
                <span className="font-sans">(service-role secret)</span>
              </li>
            </ul>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white/5 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            Test connection
          </button>
          <span className="text-[11px] text-muted-foreground">
            The key is a server secret, so it isn’t editable here by design.
          </span>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ s }: { s: AuditStatus | null }) {
  const [label, cls, Icon] = !s?.configured
    ? (["not configured", "border-border bg-white/5 text-muted-foreground", Database] as const)
    : s.reachable
      ? ([
          "connected",
          "border-status-done/40 bg-status-done/10 text-status-done",
          CheckCircle2,
        ] as const)
      : ([
          "unreachable",
          "border-status-error/40 bg-status-error/10 text-status-error",
          XCircle,
        ] as const);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider",
        cls,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

function Field({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-sm", mono && "font-mono text-xs")}>{children}</dd>
    </div>
  );
}
