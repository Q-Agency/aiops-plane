/**
 * ExecDigest - the Sponsor / Viewer "/" landing (read-only): "what did my
 * money buy this week?" ROI hero trio, delivered list, SLA target-vs-actual
 * bars (DERIVED from sla.ts), accountability coverage and an informational
 * open-gates count - with ZERO operator dials (no approve/pause/reset
 * anywhere). roiMultiple appears ONLY as the hero subcaption - its single
 * place in the product.
 */

import { useMemo } from "react";
import { CheckCircle2, Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { aggregates, ticketEconomics } from "@/mock/economics";
import { useRoiAssumptions } from "@/components/monitor/useRoiAssumptions";
import { slaTargets } from "@/mock/sla";
import { activeHumans, agentsOf, OWNERSHIP } from "@/mock/humans";
import { HumanAvatar } from "@/components/people/PersonAvatar";
import { openGateCount } from "@/mock/approvals";
import { appendAuditMock } from "@/mock/audit-bridge";
import { sponsorMember, roleById, type RoleId } from "@/mock/roles";
import { usePods } from "@/lib/pods/pod-store";
import { SlaTargetBar } from "./SlaTargetBar";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 1000 ? 2 : 0 })}`;

function weekRange(): string {
  const today = new Date();
  const offset = (today.getDay() + 6) % 7; // Monday = 0
  const mon = new Date(today);
  mon.setDate(today.getDate() - offset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(mon)} - ${fmt(sun)}`;
}

/** ROI hero tile - same compact label/value/tier idiom as the monitor hero. */
function HeroTile({
  label,
  value,
  tier,
}: {
  label: string;
  value: string;
  tier?: "ship";
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          {label}
        </span>
        {tier && (
          <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-px rounded border border-status-waiting/40 bg-status-waiting/10 text-status-waiting shrink-0">
            AS AGENTS SHIP
          </span>
        )}
      </div>
      <div className="mt-1 text-2xl font-semibold font-mono tabular-nums" suppressHydrationWarning>
        {value}
      </div>
    </div>
  );
}

export function ExecDigest({ role }: { role: RoleId }) {
  const { activePod } = usePods();
  const { derived } = useRoiAssumptions();
  const canExport = roleById(role).capabilities.export;

  const merged = useMemo(() => ticketEconomics.filter((t) => t.merged), []);
  const targets = useMemo(() => slaTargets().slice(0, 3), []);
  const owners = useMemo(() => activeHumans(), []);
  const agentTotal = Object.keys(OWNERSHIP).length;
  const hasMerged = aggregates.mergedCount > 0;
  const openGates = openGateCount();
  const range = weekRange();
  const shown = merged.slice(0, 7);

  const onDownload = () => {
    appendAuditMock({
      action: "data.exported",
      target: "weekly-report",
      detail: `Sponsor weekly digest · PDF (mock) · ${range}`,
      actorName: role === "sponsor" ? sponsorMember.name : "Viewer",
    });
    toast.success("This week's report is on its way", {
      description: "PDF export (mock) · written to the audit ledger as data.exported",
    });
  };

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* header strip - pod · window · export */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            weekly status digest
          </div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
            <span>{activePod?.name ?? "AutoMarket Web Pod"}</span>
            {activePod?.sample && (
              <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
                Sample
              </span>
            )}
          </h1>
          <div className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
            Weekly status · {range}
          </div>
        </div>
        {canExport && (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-md bg-primary/15 border border-primary/50 text-primary text-sm font-medium px-3 py-2 hover:bg-primary/25 transition-colors"
          >
            <Download className="size-4" /> Download this week&apos;s report
          </button>
        )}
      </div>

      {/* hero band - the canonical ROI trio; roiMultiple ONLY as subcaption */}
      <div className="glass-panel px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
          <HeroTile
            label="Human-hours freed"
            value={hasMerged ? `${Math.round(derived.hoursFreed).toLocaleString("en-US")} h` : "-"}
          />
          <HeroTile
            label="Cost per shipped ticket"
            value={hasMerged ? usd(aggregates.costPerMerged) : "-"}
            tier="ship"
          />
          <HeroTile
            label="Cost per story point"
            value={hasMerged ? usd(aggregates.costPerStoryPoint) : "-"}
            tier="ship"
          />
        </div>
        <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
          {hasMerged ? (
            <span suppressHydrationWarning>
              ≈ <span className="font-mono text-primary">{derived.roiMultiple}×</span> your plan
              spend, net of fees
            </span>
          ) : (
            <span>No delivered work yet - your first report generates once a ticket ships.</span>
          )}
        </div>
      </div>

      {/* 2-col body */}
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[1fr_340px] items-start">
        <div className="space-y-4 lg:space-y-5 min-w-0">
          {/* delivered this week */}
          <section className="glass-panel p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Delivered this week
            </div>
            <div className="text-sm font-semibold mt-0.5">
              {merged.length} tickets shipped to production
            </div>
            <div className="mt-3 space-y-1.5">
              {shown.map((t) => (
                <div
                  key={t.ticketId}
                  className="flex items-center gap-3 rounded-md border border-border/60 bg-white/[0.02] px-3 py-2"
                >
                  <CheckCircle2 className="size-3.5 text-status-done shrink-0" />
                  <span className="font-mono text-xs text-foreground/90 shrink-0">{t.ticketId}</span>
                  <span className="text-sm truncate flex-1">{t.title}</span>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {t.storyPoints} sp · {t.cb}
                  </span>
                </div>
              ))}
              {merged.length > shown.length && (
                <div className="text-[11px] text-muted-foreground px-3 pt-1">
                  + {merged.length - shown.length} more shipped earlier in the period
                </div>
              )}
              {merged.length === 0 && (
                <div className="text-xs text-muted-foreground px-3 py-4">
                  No delivered work yet - your first report generates once a ticket ships.
                </div>
              )}
            </div>
          </section>

          {/* SLA target vs actual - derived from the /reports definitions */}
          <section className="glass-panel p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              SLA · target vs actual
            </div>
            <div className="mt-3 space-y-3">
              {targets.map((t) => (
                <SlaTargetBar key={t.id} target={t} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:space-y-5 min-w-0">
          {/* accountability coverage */}
          <section className="glass-panel p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-status-done" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                Accountability coverage
              </span>
            </div>
            <div className="text-sm font-semibold mt-1.5">
              {agentTotal}/{agentTotal} agents have a named accountable human
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden border border-border/60 flex">
              {owners.map((h) => {
                const n = agentsOf(h.id).length;
                if (n === 0) return null;
                return (
                  <div
                    key={h.id}
                    title={`${h.name} · ${n} agent${n > 1 ? "s" : ""}`}
                    style={{
                      width: `${(n / agentTotal) * 100}%`,
                      background: `color-mix(in oklab, var(--agent-${h.primaryAgentId}) 65%, transparent)`,
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-3 space-y-1.5">
              {owners.map((h) => {
                return (
                  <div key={h.id} className="flex items-center gap-2">
                    <HumanAvatar human={h} size="sm" />
                    <span className="text-xs truncate flex-1">{h.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {agentsOf(h.id).length} agents
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* open gates - informational only, no actions */}
          <section className="glass-panel p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Open gates · informational
            </div>
            <div className="mt-1 text-2xl font-semibold font-mono tabular-nums">{openGates}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Human checkpoints awaiting your operators - nothing for you to action here.
            </div>
          </section>
        </aside>
      </div>

      {/* read-only footer micro-note */}
      <div
        className={cn(
          "text-[11px] text-muted-foreground font-mono border-t border-border/60 pt-3",
        )}
      >
        Read-only view for sponsors. Operator controls are hidden.
      </div>
    </div>
  );
}
