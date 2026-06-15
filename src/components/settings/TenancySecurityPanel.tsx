/**
 * TenancySecurityPanel - Settings "Tenancy & Security" (#tenancy):
 * the trust posture dl from tenancy.ts, the TopBar tenancy-badge mirror,
 * the Trust & Evidence link-out to /compliance, and (inside it, #models)
 * the per-agent "Models & subprocessors" disclosure from modelPlane.ts.
 * Standard (mock) experience only - read-only, no mutations.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, ShieldCheck } from "lucide-react";
import { TENANCY_LINE } from "@/lib/pods/pod-store";
import { catalogEntry } from "@/mock/catalog";
import { isChainRoleId } from "@/mock/chain";
import { MODEL_PLANE, SUBPROCESSORS } from "@/mock/modelPlane";
import { tenancy } from "@/mock/tenancy";
import { cn } from "@/lib/utils";

function PostureField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function EuInferenceBadge({ state }: { state: "live" | "roadmap" }) {
  return (
    <span
      className={cn(
        "text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border shrink-0",
        state === "live"
          ? "border-status-done/50 bg-status-done/10 text-status-done"
          : "border-dashed border-border bg-white/5 text-muted-foreground",
      )}
    >
      {state === "live" ? "EU inference · Live" : "EU inference · Roadmap"}
    </span>
  );
}

export function TenancySecurityPanel() {
  return (
    <section id="tenancy" className="glass-panel p-5 space-y-5 scroll-mt-24">
      {/* Header + badge mirror */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Tenancy &amp; Security posture</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-border bg-white/5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            {TENANCY_LINE}
          </span>
          {tenancy.dpaSigned && (
            <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-done/50 bg-status-done/10 text-status-done">
              DPA signed
            </span>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <PostureField label="Deployment">{tenancy.deployment}</PostureField>
        <PostureField label="Region">{tenancy.region}</PostureField>
        <PostureField label="Database">{tenancy.isolation}</PostureField>
        <PostureField label="Encryption">{tenancy.encryption}</PostureField>
      </dl>

      <p className="text-xs text-muted-foreground max-w-3xl">{tenancy.dataResidency}</p>

      {/* Trust & Evidence link row */}
      <Link
        to="/compliance"
        className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 hover:border-primary/60 hover:bg-primary/10 transition-colors group"
      >
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">Trust &amp; Evidence</div>
          <div className="text-[11px] text-muted-foreground">
            AI Act deployer readiness + evidence-pack export live on Compliance &amp; Audit.
          </div>
        </div>
        <ArrowRight className="size-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* Models & subprocessors */}
      <div id="models" className="space-y-3 scroll-mt-24 border-t border-border/60 pt-4">
        <div className="flex items-center gap-2">
          <Cpu className="size-3.5 text-muted-foreground" />
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Models &amp; subprocessors
          </h3>
        </div>
        <p className="text-xs text-muted-foreground max-w-3xl">
          Which model processes your content, where, and under what retention terms - per agent,
          pinned, honest.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                <th className="text-left px-2 py-2 font-medium">Agent</th>
                <th className="text-left px-2 py-2 font-medium">Provider</th>
                <th className="text-left px-2 py-2 font-medium">Pinned model</th>
                <th className="text-left px-2 py-2 font-medium">Processing region</th>
                <th className="text-left px-2 py-2 font-medium">Retention terms</th>
              </tr>
            </thead>
            <tbody>
              {MODEL_PLANE.map((row) => {
                const color = isChainRoleId(row.agentId)
                  ? `var(--${catalogEntry(row.agentId).color})`
                  : "var(--muted-foreground)";
                return (
                  <tr key={row.agentId} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-foreground">{row.agentLabel}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{row.provider}</td>
                    <td className="px-2 py-2 font-mono text-foreground">{row.pinnedModel}</td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        <span className="font-mono">{row.processingRegion}</span>
                        <EuInferenceBadge state={row.euInference} />
                      </span>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{row.retentionTerms}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Subprocessors:</span>{" "}
          {SUBPROCESSORS.join(" · ")}
        </p>
      </div>
    </section>
  );
}
