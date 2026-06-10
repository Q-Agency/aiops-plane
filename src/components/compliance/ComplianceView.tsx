import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck, FileLock2, Lock, Server, Cloud, Download, ChevronDown, ChevronRight,
  CheckCircle2, CircleDashed, CircleAlert, History, Database, Cpu, FileSignature, AlertTriangle,
} from "lucide-react";
import {
  PROFILES, FRAMEWORK_LABEL, AUDIT, SOURCES, RESIDENCY_SPLIT, PROVENANCE, CONTROLS, RISKS,
  ATTESTATIONS, controlsByStatus,
  type Framework, type RegulatoryProfile, type ControlStatus,
  type RiskSeverity, type RiskStatus,
} from "@/mock/compliance";
import { useSessionAudit } from "@/mock/audit-bridge";
import { humans } from "@/mock/humans";
import { agents as seedAgents } from "@/mock/agents";
import { tickets } from "@/mock/tickets";
import type { AgentId } from "@/mock/types";
import { cn } from "@/lib/utils";

const humanName = (id: string) => humans.find((h) => h.id === id)?.name ?? id;
const agentColor = (id: AgentId) => {
  const a = seedAgents.find((x) => x.id === id);
  return a ? `var(--${a.color})` : "var(--muted-foreground)";
};
const agentName = (id: AgentId) => seedAgents.find((a) => a.id === id)?.name ?? id;

function fmtUtc(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}Z`;
}
function fmtDate(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const StatusPill = ({ s }: { s: ControlStatus }) => {
  const map = {
    captured: { c: "text-status-done border-status-done/40 bg-status-done/10", l: "EVIDENCE CAPTURED", I: CheckCircle2 },
    partial: { c: "text-status-waiting border-status-waiting/40 bg-status-waiting/10", l: "PARTIAL", I: CircleDashed },
    gap: { c: "text-status-error border-status-error/40 bg-status-error/10", l: "GAP", I: CircleAlert },
  } as const;
  const m = map[s];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border", m.c)}>
      <m.I className="size-3" /> {m.l}
    </span>
  );
};

const sevColor = (s: RiskSeverity) =>
  s === "critical" ? "var(--status-error)" :
  s === "high" ? "var(--agent-qa)" :
  s === "med" ? "var(--status-waiting)" : "var(--muted-foreground)";

const riskStatusLabel: Record<RiskStatus, string> = {
  open: "OPEN", mitigating: "MITIGATING", accepted: "ACCEPTED", closed: "CLOSED",
};

// Widened to string so session-overlay verbs (accountability.accepted,
// constitution.amended, …) share the same dot vocabulary as seeded actions.
const actionDot = (a: string) =>
  a.startsWith("gate.approved") ? "bg-status-done" :
  a.startsWith("gate.rejected") ? "bg-status-error" :
  a === "escalation.raised" ? "bg-agent-qa" :
  a === "ingest.completed" ? "bg-agent-curator" :
  a === "model.invoked" ? "bg-primary" :
  "bg-muted-foreground/60";

export function ComplianceView() {
  const [projectId, setProjectId] = useState<string>("automarket");
  const profile: RegulatoryProfile = PROFILES.find((p) => p.projectId === projectId) ?? PROFILES[0];

  const [ticketFilter, setTicketFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filteredAudit = useMemo(
    () =>
      AUDIT.filter(
        (e) =>
          (ticketFilter === "all" || e.ticketId === ticketFilter) &&
          (actorFilter === "all" || `${e.actor.kind}:${e.actor.id}` === actorFilter),
      ).sort((a, b) => b.ts - a.ts),
    [ticketFilter, actorFilter],
  );

  // Session overlay (wave 2): rows appended by THIS browser session's actions
  // (accountability.accepted, constitution.amended, data.exported, …) render
  // above the seeded ledger under a "this session" divider. Session rows
  // carry no seeded actor id, so any specific actor filter hides them; the
  // ticket filter matches against the row target (e.g. "appr-AM-142").
  const sessionAudit = useSessionAudit();
  const sessionRows = useMemo(
    () =>
      actorFilter !== "all"
        ? []
        : sessionAudit
            .filter((e) => ticketFilter === "all" || (e.target ?? "").includes(ticketFilter))
            .slice()
            .reverse(),
    [sessionAudit, ticketFilter, actorFilter],
  );

  const filteredControls = CONTROLS.filter((c) =>
    c.frameworks.some((f) => profile.active.includes(f.framework)),
  );
  const stats = controlsByStatus(filteredControls);
  const split = RESIDENCY_SPLIT[projectId as keyof typeof RESIDENCY_SPLIT] ?? RESIDENCY_SPLIT.automarket;

  return (
    <div className="p-6 space-y-6">
      {/* Header + profile selector */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" /> Compliance & Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Evidence the system already generates — artifact lineage, human approvals, accountability,
            data flows — surfaced for compliance officers, auditors, and procurement reviews.
            Read-only view; no certification claims.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="block mt-1 bg-panel border border-border rounded-md px-2 py-1.5 text-sm cursor-pointer"
            >
              {PROFILES.map((p) => (
                <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1 max-w-md">
            {profile.active.map((f) => (
              <span key={f} className="text-[10px] font-mono px-2 py-1 rounded border border-primary/40 bg-primary/10 text-primary">
                {FRAMEWORK_LABEL[f]}
              </span>
            ))}
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-white/5 hover:bg-white/10 text-xs cursor-pointer">
            <Download className="size-3.5" /> Export bundle
          </button>
        </div>
      </div>

      {/* Top stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={CheckCircle2} label="Controls with evidence" value={stats.captured} tone="done" sub={`of ${filteredControls.length} active`} />
        <Stat icon={CircleDashed} label="Partial" value={stats.partial} tone="warn" sub="needs attention" />
        <Stat icon={CircleAlert} label="Gaps" value={stats.gap} tone="error" sub="no evidence yet" />
        <Stat icon={Server} label="On-prem inference" value={`${split.onPrem}%`} tone="done" sub="client data residency" />
      </div>

      {/* Audit trail */}
      <section id="audit" className="rounded-lg border border-border bg-panel/40">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <h2 className="font-semibold">Immutable audit trail</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-status-done/40 bg-status-done/10 text-status-done">
              <Lock className="inline size-3 mr-0.5" /> APPEND-ONLY
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <select
              value={ticketFilter}
              onChange={(e) => setTicketFilter(e.target.value)}
              className="bg-panel border border-border rounded px-2 py-1 cursor-pointer"
            >
              <option value="all">All tickets</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>{t.id}</option>
              ))}
            </select>
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="bg-panel border border-border rounded px-2 py-1 cursor-pointer"
            >
              <option value="all">All actors</option>
              {seedAgents.map((a) => (
                <option key={a.id} value={`agent:${a.id}`}>Agent: {a.name}</option>
              ))}
              {humans.map((h) => (
                <option key={h.id} value={`human:${h.id}`}>Human: {h.name}</option>
              ))}
              <option value="system:scheduler">System: scheduler</option>
            </select>
            <button className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-white/5 hover:bg-white/10 cursor-pointer">
              <Download className="size-3" /> CSV
            </button>
          </div>
        </div>
        <div className="divide-y divide-border max-h-[420px] overflow-auto">
          {sessionRows.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-primary/[0.04] flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary dot-pulse shrink-0" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary/90">
                  this session · {sessionRows.length}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground truncate">
                  appended live from your actions in this workspace
                </span>
              </div>
              {sessionRows.map((e) => (
                <div key={`session-${e.id}`} className="px-4 py-2.5 hover:bg-white/[0.02]">
                  <div className="flex items-start gap-3">
                    <span className="w-3.5 shrink-0" aria-hidden />
                    <span className={cn("size-1.5 rounded-full mt-2 shrink-0", actionDot(e.action))} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-muted-foreground">{fmtUtc(e.at)}</span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/5 border border-border">
                          {e.action}
                        </span>
                        {e.target && (
                          <span className="text-xs font-mono text-primary">{e.target}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          by {e.actor.kind === "human" ? (e.actor.name ?? "you") : "system"}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-px rounded border border-primary/30 bg-primary/10 text-primary/80 tracking-wider">
                          SESSION
                        </span>
                      </div>
                      {e.detail && <div className="text-sm mt-0.5 truncate">{e.detail}</div>}
                    </div>
                  </div>
                </div>
              ))}
              <div className="px-4 py-1 bg-white/[0.02] text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                earlier — seeded ledger
              </div>
            </>
          )}
          {filteredAudit.map((e) => {
            const isOpen = expanded === e.id;
            return (
              <div key={e.id} className="px-4 py-2.5 hover:bg-white/[0.02]">
                <button
                  onClick={() => setExpanded(isOpen ? null : e.id)}
                  className="w-full flex items-start gap-3 text-left cursor-pointer"
                >
                  {isOpen ? <ChevronDown className="size-3.5 mt-1 text-muted-foreground" /> : <ChevronRight className="size-3.5 mt-1 text-muted-foreground" />}
                  <span className={cn("size-1.5 rounded-full mt-2 shrink-0", actionDot(e.action))} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-muted-foreground">{fmtUtc(e.ts)}</span>
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/5 border border-border">
                        {e.action}
                      </span>
                      {e.ticketId && (
                        <Link to="/traceability" className="text-xs font-mono text-primary hover:underline">
                          {e.ticketId}
                        </Link>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {e.actor.kind === "agent"
                          ? <>by <span style={{ color: agentColor(e.actor.id as AgentId) }}>{agentName(e.actor.id as AgentId)}</span></>
                          : e.actor.kind === "human"
                          ? <>by {humanName(e.actor.id)}</>
                          : <>by system:{e.actor.id}</>}
                      </span>
                    </div>
                    <div className="text-sm mt-0.5 truncate">{e.rationale}</div>
                  </div>
                </button>
                {isOpen && (
                  <div className="mt-2 ml-9 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
                    <Kv k="artifact" v={e.artifactRef ?? "—"} />
                    <Kv k="hash" v={e.hash} />
                    <Kv k="prev_hash" v={e.prevHash} />
                    <Kv k="entry_id" v={e.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-up: oversight + residency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Human oversight evidence */}
        <section className="rounded-lg border border-border bg-panel/40">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <FileSignature className="size-4 text-primary" />
            <h2 className="font-semibold">Human-oversight record</h2>
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-mono text-muted-foreground uppercase">
                  <th className="pb-2">Ticket</th>
                  <th className="pb-2">Decision</th>
                  <th className="pb-2">Accountable</th>
                  <th className="pb-2">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {AUDIT.filter((e) => e.action.startsWith("gate.")).slice(0, 8).map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 font-mono text-xs text-primary">{e.ticketId}</td>
                    <td className="py-2">
                      <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                        e.action === "gate.approved"
                          ? "border-status-done/40 bg-status-done/10 text-status-done"
                          : "border-status-error/40 bg-status-error/10 text-status-error",
                      )}>
                        {e.action === "gate.approved" ? "APPROVE" : "REJECT"}
                      </span>
                    </td>
                    <td className="py-2 text-xs">{humanName(e.actor.id)}</td>
                    <td className="py-2 font-mono text-[11px] text-muted-foreground">{fmtUtc(e.ts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Residency */}
        <section id="residency" className="rounded-lg border border-border bg-panel/40">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Server className="size-4 text-primary" />
              <h2 className="font-semibold">Data residency</h2>
            </div>
            {split.onPrem === 100 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-status-done/40 bg-status-done/10 text-status-done">
                ON-PREM ONLY
              </span>
            )}
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <ResidencyBar label="On-prem (vLLM / H200)" pct={split.onPrem} icon={Server} tone="done" />
              <ResidencyBar label="Cloud — EU region" pct={split.cloudEU} icon={Cloud} tone="warn" />
              <ResidencyBar label="Cloud — US region" pct={split.cloudUS} icon={Cloud} tone="error" />
            </div>
            <div className="text-[11px] text-muted-foreground border-t border-border pt-3">
              All client PII ingested by the Curator is stored and processed on-prem.
              Cloud inference is used only for non-PII synthesis where the project profile permits it.
            </div>
          </div>
        </section>
      </div>

      {/* Data governance table */}
      <section id="governance" className="rounded-lg border border-border bg-panel/40">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Database className="size-4 text-primary" />
          <h2 className="font-semibold">Data governance — ingested sources</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02]">
            <tr className="text-left text-[10px] font-mono text-muted-foreground uppercase">
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Kind</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Retention</th>
              <th className="px-4 py-2">Residency</th>
              <th className="px-4 py-2">Erasure reqs</th>
              <th className="px-4 py-2 text-right">Docs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {SOURCES.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{s.kind}</td>
                <td className="px-4 py-2">
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                    s.classification === "PII" ? "border-status-error/40 bg-status-error/10 text-status-error" :
                    s.classification === "Sensitive" ? "border-agent-qa/40 bg-agent-qa/10 text-agent-qa" :
                    s.classification === "Business" ? "border-primary/40 bg-primary/10 text-primary" :
                    "border-border bg-white/5 text-muted-foreground",
                  )}>{s.classification}</span>
                </td>
                <td className="px-4 py-2 font-mono text-xs tabular-nums">{s.retentionDays}d</td>
                <td className="px-4 py-2 text-xs">{s.residency}</td>
                <td className="px-4 py-2 font-mono text-xs tabular-nums">
                  {s.erasureRequests > 0
                    ? <span className="text-status-waiting">{s.erasureRequests} pending</span>
                    : <span className="text-muted-foreground">0</span>}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-right tabular-nums">{s.docs.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Model & prompt provenance */}
      <section id="provenance" className="rounded-lg border border-border bg-panel/40">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Cpu className="size-4 text-primary" />
          <h2 className="font-semibold">Model & prompt provenance</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02]">
            <tr className="text-left text-[10px] font-mono text-muted-foreground uppercase">
              <th className="px-4 py-2">Artifact</th>
              <th className="px-4 py-2">Agent</th>
              <th className="px-4 py-2">Model</th>
              <th className="px-4 py-2">Model ver.</th>
              <th className="px-4 py-2">Prompt ver.</th>
              <th className="px-4 py-2">Residency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PROVENANCE.map((p) => (
              <tr key={p.artifactRef} className="hover:bg-white/[0.02]">
                <td className="px-4 py-2 font-mono text-xs">
                  <Link to="/traceability" className="text-primary hover:underline">{p.artifactRef}</Link>
                </td>
                <td className="px-4 py-2 text-xs" style={{ color: agentColor(p.agent) }}>{agentName(p.agent)}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.model}</td>
                <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{p.modelVersion}</td>
                <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{p.promptVersion}</td>
                <td className="px-4 py-2">
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1",
                    p.residency === "on-prem"
                      ? "border-status-done/40 bg-status-done/10 text-status-done"
                      : p.residency === "cloud-eu"
                      ? "border-status-waiting/40 bg-status-waiting/10 text-status-waiting"
                      : "border-status-error/40 bg-status-error/10 text-status-error",
                  )}>
                    {p.residency === "on-prem" ? <Server className="size-3" /> : <Cloud className="size-3" />}
                    {p.residency}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Regulatory mapping matrix */}
      <section className="rounded-lg border border-border bg-panel/40">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <FileLock2 className="size-4 text-primary" />
          <h2 className="font-semibold">Regulatory mapping — {profile.active.map((f) => FRAMEWORK_LABEL[f]).join(" · ")}</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02]">
            <tr className="text-left text-[10px] font-mono text-muted-foreground uppercase">
              <th className="px-4 py-2">Control</th>
              <th className="px-4 py-2">Evidence</th>
              <th className="px-4 py-2">Requirements</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredControls.map((c) => (
              <tr key={c.id} className={cn(
                "hover:bg-white/[0.02]",
                c.status === "gap" && "bg-status-error/5",
                c.status === "partial" && "bg-status-waiting/5",
              )}>
                <td className="px-4 py-2.5">{c.control}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {c.evidenceRef.startsWith("/") ? (
                    <Link to={c.evidenceRef as "/pod"} className="text-primary hover:underline">{c.evidence}</Link>
                  ) : (
                    <a href={c.evidenceRef} className="text-primary hover:underline">{c.evidence}</a>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col gap-1">
                    {c.frameworks
                      .filter((f) => profile.active.includes(f.framework))
                      .map((f, i) => (
                        <span key={i} className="text-[11px] font-mono text-muted-foreground">
                          <span className="text-foreground">{FRAMEWORK_LABEL[f.framework]}</span> · {f.requirement}
                        </span>
                      ))}
                  </div>
                </td>
                <td className="px-4 py-2.5"><StatusPill s={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Risks + Attestations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section id="risks" className="rounded-lg border border-border bg-panel/40">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <AlertTriangle className="size-4 text-agent-qa" />
            <h2 className="font-semibold">Risk register</h2>
          </div>
          <div className="divide-y divide-border">
            {RISKS.map((r) => (
              <div key={r.id} className="px-4 py-3 hover:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="size-2 rounded-full shrink-0" style={{ background: sevColor(r.severity) }} />
                      <span className="font-medium text-sm">{r.title}</span>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">{r.severity}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{r.mitigation}</div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-1">
                      owner: {humanName(r.ownerHumanId)} · source: {r.source}
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0",
                    r.status === "closed" ? "border-status-done/40 bg-status-done/10 text-status-done" :
                    r.status === "mitigating" ? "border-primary/40 bg-primary/10 text-primary" :
                    r.status === "accepted" ? "border-border bg-white/5 text-muted-foreground" :
                    "border-status-error/40 bg-status-error/10 text-status-error",
                  )}>{riskStatusLabel[r.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-panel/40">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="size-4 text-primary" />
              <h2 className="font-semibold">Release attestations</h2>
            </div>
            <button className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-white/5 hover:bg-white/10 cursor-pointer">
              <FileSignature className="size-3" /> New attestation
            </button>
          </div>
          <div className="divide-y divide-border">
            {ATTESTATIONS.map((a) => (
              <div key={a.id} className="px-4 py-3 hover:bg-white/[0.02]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-medium text-sm">{a.release}</div>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                    a.status === "signed"
                      ? "border-status-done/40 bg-status-done/10 text-status-done"
                      : "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
                  )}>{a.status.toUpperCase()}</span>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground mt-1">
                  {fmtDate(a.date)} · signer: {humanName(a.signerHumanId)} · {a.frameworks.map((f) => FRAMEWORK_LABEL[f]).join(" · ")}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <Kv k="audit entries" v={a.bundle.auditEntries.toString()} />
                  <Kv k="oversight" v={a.bundle.oversightDecisions.toString()} />
                  <Kv k="residency" v={a.bundle.residencyReport} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, sub, tone,
}: { icon: any; label: string; value: string | number; sub?: string; tone: "done" | "warn" | "error" | "neutral" }) {
  const toneColor =
    tone === "done" ? "text-status-done" :
    tone === "warn" ? "text-status-waiting" :
    tone === "error" ? "text-status-error" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-panel/40 p-4">
      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        <Icon className={cn("size-3.5", toneColor)} /> {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cn("text-2xl font-semibold tabular-nums", toneColor)}>{value}</span>
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function ResidencyBar({ label, pct, icon: Icon, tone }: { label: string; pct: number; icon: any; tone: "done" | "warn" | "error" }) {
  const fill =
    tone === "done" ? "bg-status-done" :
    tone === "warn" ? "bg-status-waiting" : "bg-status-error";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5"><Icon className="size-3.5 text-muted-foreground" /> {label}</span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={cn("h-full", fill)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</div>
      <div className="truncate text-foreground">{v}</div>
    </div>
  );
}
