import type { ReactNode } from "react";
import { ShieldCheck, AlertTriangle, ScrollText, Gavel, Users } from "lucide-react";

import type { GovernanceData } from "@/lib/api/fleet.functions";
import { cn } from "@/lib/utils";

const DIMS: { key: keyof GovernanceData["summary"]["completeness"]; label: string }[] = [
  { key: "user_roles", label: "User roles" },
  { key: "business_rules", label: "Business rules" },
  { key: "acceptance_criteria", label: "Acceptance criteria" },
  { key: "scope_boundaries", label: "Scope boundaries" },
  { key: "error_handling", label: "Error handling" },
  { key: "data_model", label: "Data model" },
];

// Coverage / agreement scores arrive as 0–1 fractions; completeness dims as 0–100.
const asPct = (v?: number) => (v == null ? null : v <= 1 ? Math.round(v * 100) : Math.round(v));
const pctText = (v?: number) => {
  const n = asPct(v);
  return n == null ? "—" : `${n}%`;
};
const scoreTone = (n: number | null) =>
  n == null
    ? "text-muted-foreground"
    : n >= 80
      ? "text-status-done"
      : n >= 50
        ? "text-status-waiting"
        : "text-status-error";

// Keyed by the shared LifecycleStage (not BA's native status).
const STAGE_STYLE: Record<string, string> = {
  in_progress: "border-status-running/40 bg-status-running/10 text-status-running",
  waiting: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
  ready: "border-status-running/40 bg-status-running/10 text-status-running",
  approved: "border-status-done/40 bg-status-done/10 text-status-done",
  delivered: "border-status-done/40 bg-status-done/10 text-status-done",
  reset: "border-status-error/40 bg-status-error/10 text-status-error",
  blocked: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
  error: "border-status-error/40 bg-status-error/10 text-status-error",
  backlog: "border-border bg-white/5 text-muted-foreground",
};

type Props = { data: GovernanceData };

export function RealGovernanceView({ data }: Props) {
  const { specs, summary } = data;

  if (specs.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <Header />
        <div className="glass-panel mt-4 p-8 text-center text-sm text-muted-foreground">
          No specs to assess yet. Governance signals (completeness, ambiguities, EARS/GWT coverage)
          appear once BA produces specs.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Header count={summary.count} />

      {/* Scorecard */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Completeness"
          value={`${summary.completeness_avg}%`}
          tone={scoreTone(summary.completeness_avg)}
          icon={<ShieldCheck className="size-3.5" />}
        />
        <Kpi
          label="Ambiguities"
          value={String(summary.ambiguities_total)}
          tone={summary.ambiguities_total > 0 ? "text-status-waiting" : "text-status-done"}
          icon={<AlertTriangle className="size-3.5" />}
        />
        <Kpi
          label="EARS coverage"
          value={pctText(summary.ears_avg)}
          tone={scoreTone(asPct(summary.ears_avg))}
          icon={<ScrollText className="size-3.5" />}
        />
        <Kpi
          label="GWT coverage"
          value={pctText(summary.gwt_avg)}
          tone={scoreTone(asPct(summary.gwt_avg))}
          icon={<ScrollText className="size-3.5" />}
        />
        <Kpi
          label="Judge agreement"
          value={pctText(summary.judge_avg)}
          tone={scoreTone(asPct(summary.judge_avg))}
          icon={<Gavel className="size-3.5" />}
        />
        <Kpi
          label="Persona approval"
          value={pctText(summary.persona_avg)}
          tone={scoreTone(asPct(summary.persona_avg))}
          icon={<Users className="size-3.5" />}
        />
      </section>

      {/* Completeness by dimension */}
      <section className="glass-panel p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Completeness · by dimension (avg across {summary.count} specs)
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {DIMS.map((d) => {
            const v = summary.completeness[d.key] ?? 0;
            return (
              <div key={d.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className={cn("font-mono tabular-nums", scoreTone(v))}>{v}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      v >= 80
                        ? "bg-status-done"
                        : v >= 50
                          ? "bg-status-waiting"
                          : "bg-status-error",
                    )}
                    style={{ width: `${Math.min(100, v)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-spec table */}
      <section className="glass-panel p-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Specs ({specs.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left font-medium">Spec</th>
                <th className="px-2 py-2 text-left font-medium">Stage</th>
                <th className="px-2 py-2 text-right font-medium">Complete</th>
                <th className="px-2 py-2 text-right font-medium">Ambig.</th>
                <th className="px-2 py-2 text-right font-medium">EARS</th>
                <th className="px-2 py-2 text-right font-medium">GWT</th>
                <th className="px-2 py-2 text-right font-medium">Judge</th>
                <th className="px-2 py-2 text-right font-medium">Persona</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {specs.map((s) => (
                <tr key={s.session_id} className="border-b border-border/60 last:border-0">
                  <td className="max-w-[16rem] px-2 py-2" title={s.session_id}>
                    <div className="truncate text-foreground">{s.title ?? s.session_id}</div>
                    {s.project && (
                      <div className="truncate text-[10px] text-muted-foreground">{s.project}</div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {s.stage ? (
                      <span
                        title={s.status}
                        className={cn(
                          "inline-block rounded border px-1.5 py-0.5 text-[10px]",
                          STAGE_STYLE[s.stage] ?? "border-border bg-white/5 text-muted-foreground",
                        )}
                      >
                        {s.stage.replace("_", " ")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <ScoreCell n={s.completeness_avg ?? null} />
                  <td
                    className={cn(
                      "px-2 py-2 text-right tabular-nums",
                      s.ambiguities > 0 ? "text-status-waiting" : "text-muted-foreground",
                    )}
                  >
                    {s.ambiguities}
                  </td>
                  <ScoreCell n={asPct(s.ears_coverage)} />
                  <ScoreCell n={asPct(s.gwt_coverage)} />
                  <ScoreCell n={asPct(s.judge_agreement)} />
                  <ScoreCell n={asPct(s.persona_approval)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Cross-spec consistency analysis is an on-demand LLM check — wired as an action later, not
          run on load.
        </p>
      </section>
    </div>
  );
}

function ScoreCell({ n }: { n: number | null }) {
  return (
    <td className={cn("px-2 py-2 text-right tabular-nums", scoreTone(n))}>
      {n == null ? "—" : `${n}%`}
    </td>
  );
}

function Header({ count }: { count?: number }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        governance
      </div>
      <h1 className="text-lg font-semibold">Spec quality</h1>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Completeness, ambiguity, requirement coverage and reviewer agreement
        {count ? ` across the ${count} most recent specs` : ""}.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-xl tabular-nums", tone ?? "text-foreground")}>
        {value}
      </div>
    </div>
  );
}
