import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, RotateCcw, CheckCircle2, Database } from "lucide-react";

import { getAuditFn, type AuditData, type AuditEntry } from "@/lib/api/fleet.functions";
import { fmtDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const POLL_MS = 20000;

const ACTION_META: Record<string, { label: string; cls: string; Icon: typeof RotateCcw }> = {
  reset: {
    label: "reset",
    cls: "border-status-error/40 bg-status-error/10 text-status-error",
    Icon: RotateCcw,
  },
  approved: {
    label: "approved",
    cls: "border-status-done/40 bg-status-done/10 text-status-done",
    Icon: CheckCircle2,
  },
};

type Props = { initial: AuditData };

export function RealComplianceView({ initial }: Props) {
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: () => getAuditFn(),
    initialData: initial,
    refetchInterval: POLL_MS,
  });
  const { enabled, entries } = data as AuditData;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Header count={entries.length} />

      {!enabled ? (
        <NotConfigured />
      ) : entries.length === 0 ? (
        <div className="glass-panel p-8 text-center text-sm text-muted-foreground">
          No audited actions yet. Resets and approvals across the fleet are recorded here as they
          happen — durably, even after an agent deletes its own copy.
        </div>
      ) : (
        <section className="glass-panel p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left font-medium">When</th>
                  <th className="px-2 py-2 text-left font-medium">Action</th>
                  <th className="px-2 py-2 text-left font-medium">Agent</th>
                  <th className="px-2 py-2 text-left font-medium">Target</th>
                  <th className="px-2 py-2 text-left font-medium">Project</th>
                  <th className="px-2 py-2 text-left font-medium">Actor</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <AuditRowView key={e.id} e={e} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Audited today: <span className="text-foreground">resets</span> and{" "}
            <span className="text-foreground">approvals</span>. Request-changes and config edits are
            coming. Actor (“who”) isn’t captured yet — only when/what — so it shows as “—”.
          </p>
        </section>
      )}
    </div>
  );
}

function AuditRowView({ e }: { e: AuditEntry }) {
  const meta = ACTION_META[e.action] ?? {
    label: e.action,
    cls: "border-border bg-white/5 text-muted-foreground",
    Icon: ShieldCheck,
  };
  const Icon = meta.Icon;
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td
        className="whitespace-nowrap px-2 py-2 font-mono text-muted-foreground"
        title={e.occurred_at}
      >
        {fmtDateTime(e.occurred_at)}
      </td>
      <td className="px-2 py-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
            meta.cls,
          )}
        >
          <Icon className="size-3" />
          {meta.label}
        </span>
      </td>
      <td className="px-2 py-2 font-mono uppercase text-muted-foreground">{e.agent_id}</td>
      <td className="max-w-[18rem] px-2 py-2">
        <div className="truncate text-foreground" title={e.target_title ?? e.target_id ?? ""}>
          {e.target_title ?? e.target_id ?? "—"}
        </div>
        {e.target_title && e.target_id && (
          <div className="truncate font-mono text-[10px] text-muted-foreground">{e.target_id}</div>
        )}
      </td>
      <td className="px-2 py-2 text-muted-foreground">{e.project ?? "—"}</td>
      <td className="px-2 py-2 text-muted-foreground">{e.actor ?? "—"}</td>
    </tr>
  );
}

function Header({ count }: { count: number }) {
  return (
    <div className="glass-panel flex flex-wrap items-center gap-3 p-5">
      <div className="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
        <ShieldCheck className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold">Audit trail</div>
        <div className="text-xs text-muted-foreground">
          Durable, append-only record of state-changing actions across the fleet — kept in the
          control plane so it survives an agent deleting its own data.
        </div>
      </div>
      <span className="ml-auto rounded border border-border bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {count} events
      </span>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="glass-panel flex flex-col items-center gap-3 p-8 text-center">
      <Database className="size-6 text-muted-foreground" />
      <div className="text-sm font-medium">Audit ledger not configured</div>
      <div className="max-w-md text-xs text-muted-foreground">
        Set <code className="rounded bg-white/10 px-1">DASHBOARD_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-white/10 px-1">DASHBOARD_SUPABASE_SERVICE_ROLE_KEY</code> in the
        dashboard environment to enable the durable audit trail. The table already exists in the “Q
        AI Ops Plane” Supabase project.
      </div>
    </div>
  );
}
