import { useMemo, useState } from "react";
import {
  Scale, FileText, ShieldAlert, CheckCircle2, XCircle, GitPullRequest,
  HelpCircle, Filter, Clock, User2, Bot, X, MinusCircle, PlusCircle, ArrowRight,
} from "lucide-react";
import {
  constitutions, violations, prGates, openDecisions,
  type Constitution, type Violation, type Severity, type CbId,
} from "@/mock/governance";
import { agents as allAgents } from "@/mock/agents";
import type { AgentId } from "@/mock/types";
import { cn } from "@/lib/utils";

const cbLabel: Record<CbId, string> = { backend: "Backend", web: "Web", mobile: "Mobile" };
const cbTone: Record<CbId, string> = {
  backend: "var(--agent-dev)",
  web: "var(--agent-ba)",
  mobile: "var(--agent-qa)",
};

const sevTone: Record<Severity, string> = {
  blocker: "text-status-error border-status-error/50 bg-status-error/10",
  high:    "text-status-error border-status-error/40 bg-status-error/[0.06]",
  medium:  "text-status-waiting border-status-waiting/45 bg-status-waiting/10",
  low:     "text-muted-foreground border-border bg-white/5",
};

const agentMeta = (id: AgentId) => {
  const a = allAgents.find((x) => x.id === id)!;
  return { name: a.name, color: `var(--${a.color})` };
};

const fmtAge = (ts: number) => {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export function GovernanceView() {
  const [open, setOpen] = useState<Constitution | null>(null);
  const [cbFilter, setCbFilter] = useState<CbId | "all">("all");
  const [sevFilter, setSevFilter] = useState<Severity | "all">("all");

  const filtered = useMemo(
    () => violations.filter(
      (v) => (cbFilter === "all" || v.cb === cbFilter) && (sevFilter === "all" || v.severity === sevFilter),
    ),
    [cbFilter, sevFilter],
  );

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            constitution compliance
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Governance</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            The ruleset every agent runs inside — constitutions, violations, merge gates and open architectural decisions.
          </div>
        </div>
        <div className="text-[11px] font-mono text-muted-foreground glass-panel px-3 py-1.5">
          <span className="text-foreground">{constitutions.length}</span> constitutions
          <span className="mx-1.5">·</span>
          <span className="text-status-error">{violations.filter((v) => v.status === "open").length}</span> open violations
          <span className="mx-1.5">·</span>
          <span className="text-status-waiting">{openDecisions.filter((d) => d.status !== "exploring").length}</span> decisions pending
        </div>
      </div>

      {/* Constitution cards */}
      <section className="space-y-2">
        <SectionHead icon={FileText} title="Active constitutions" sub="One per codebase · click for full ruleset + version history" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {constitutions.map((c) => (
            <button
              key={c.cb}
              onClick={() => setOpen(c)}
              className="glass-panel p-4 text-left hover-lift cursor-pointer"
              style={{ borderColor: `color-mix(in oklab, ${cbTone[c.cb]} 35%, transparent)` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                      style={{
                        color: cbTone[c.cb],
                        borderColor: `color-mix(in oklab, ${cbTone[c.cb]} 50%, transparent)`,
                        background: `color-mix(in oklab, ${cbTone[c.cb]} 12%, transparent)`,
                      }}
                    >
                      {cbLabel[c.cb]}
                    </span>
                    <span className={cn(
                      "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                      c.status === "ACTIVE"
                        ? "text-status-done border-status-done/50 bg-status-done/10"
                        : "text-status-waiting border-status-waiting/45 bg-status-waiting/10",
                    )}>
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{c.stack} · {c.version}</div>
                </div>
                <ComplianceRing value={c.compliance} color={cbTone[c.cb]} />
              </div>
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-[10px] font-mono">
                <Meta icon={Bot}   label="author"   value={c.author} />
                <Meta icon={Clock} label="updated"  value={fmtAge(c.lastModified) + " ago"} />
                <Meta icon={FileText} label="rules" value={`${c.rules.length}`} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Violations */}
      <section className="space-y-2">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <SectionHead icon={ShieldAlert} title="Compliance violations" sub="Generated artifacts flagged against constitution rules" />
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <Filter className="size-3 text-muted-foreground" />
            <FilterChips
              options={[["all","All"],["backend","Backend"],["web","Web"],["mobile","Mobile"]] as const}
              value={cbFilter}
              onChange={(v) => setCbFilter(v as CbId | "all")}
            />
            <span className="text-muted-foreground/40">|</span>
            <FilterChips
              options={[["all","All"],["blocker","Blocker"],["high","High"],["medium","Med"],["low","Low"]] as const}
              value={sevFilter}
              onChange={(v) => setSevFilter(v as Severity | "all")}
            />
          </div>
        </div>
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <Th>rule</Th><Th>severity</Th><Th>codebase</Th><Th>ticket</Th><Th>agent</Th><Th>artifact</Th><Th>status</Th><Th className="text-right">age</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <ViolationRow key={v.id} v={v} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center text-muted-foreground py-8 text-[11px] font-mono">No violations match the filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PR gates */}
      <section className="space-y-2">
        <SectionHead icon={GitPullRequest} title="Quality-gate status per PR" sub="Merge checklist from each constitution — red = blocking" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {prGates.map((pr) => {
            const failing = pr.checks.filter((c) => c.status === "fail").length;
            const a = agentMeta(pr.author);
            return (
              <div key={pr.prId} className="glass-panel p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-muted-foreground">{pr.prId}</span>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-foreground">{pr.ticketId}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded border"
                        style={{ color: cbTone[pr.cb], borderColor: `color-mix(in oklab, ${cbTone[pr.cb]} 50%, transparent)` }}
                      >{cbLabel[pr.cb]}</span>
                    </div>
                    <div className="text-sm font-medium mt-0.5 truncate">{pr.title}</div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap",
                    failing
                      ? "text-status-error border-status-error/50 bg-status-error/10"
                      : "text-status-done border-status-done/50 bg-status-done/10",
                  )}>
                    {failing ? `${failing} failing` : "all green"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {pr.checks.map((c) => (
                    <span
                      key={c.name}
                      title={c.detail ?? c.name}
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-1 rounded border",
                        c.status === "pass"
                          ? "text-status-done border-status-done/40 bg-status-done/[0.06]"
                          : c.status === "fail"
                          ? "text-status-error border-status-error/50 bg-status-error/10"
                          : "text-muted-foreground border-border bg-white/5",
                      )}
                    >
                      {c.status === "pass" ? <CheckCircle2 className="size-3" /> : c.status === "fail" ? <XCircle className="size-3" /> : <MinusCircle className="size-3" />}
                      {c.name}
                      {c.detail && <span className="opacity-70">· {c.detail}</span>}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  produced by <span style={{ color: a.color }}>{a.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Open decisions */}
      <section className="space-y-2">
        <SectionHead icon={HelpCircle} title="Open governance decisions" sub="Architectural questions the agents are currently working around" />
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <Th>codebase</Th><Th>question</Th><Th>owner</Th><Th>status</Th><Th className="text-right">age</Th>
              </tr>
            </thead>
            <tbody>
              {openDecisions.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-3 py-2">
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                      style={{ color: cbTone[d.cb], borderColor: `color-mix(in oklab, ${cbTone[d.cb]} 50%, transparent)` }}
                    >{cbLabel[d.cb]}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{d.question}</div>
                    <div className="text-[11px] text-muted-foreground">{d.detail}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    <span className="inline-flex items-center gap-1"><User2 className="size-3 text-muted-foreground" />{d.owner}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                      d.status === "needs-decision" && "text-status-waiting border-status-waiting/45 bg-status-waiting/10",
                      d.status === "exploring" && "text-foreground/80 border-border bg-white/5",
                      d.status === "blocked" && "text-status-error border-status-error/50 bg-status-error/10",
                    )}>{d.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{d.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {open && <ConstitutionDrawer c={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ViolationRow({ v }: { v: Violation }) {
  const a = agentMeta(v.agent);
  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-white/[0.02] align-top">
      <td className="px-3 py-2">
        <div className="text-foreground">{v.rule}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{v.ruleId}{v.note && ` · ${v.note}`}</div>
      </td>
      <td className="px-3 py-2">
        <span className={cn("inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase", sevTone[v.severity])}>
          {v.severity}
        </span>
      </td>
      <td className="px-3 py-2">
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
          style={{ color: cbTone[v.cb], borderColor: `color-mix(in oklab, ${cbTone[v.cb]} 50%, transparent)` }}
        >{cbLabel[v.cb]}</span>
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-foreground">{v.ticketId}</td>
      <td className="px-3 py-2 font-mono text-[11px]" style={{ color: a.color }}>{a.name}</td>
      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground truncate max-w-[220px]">{v.artifact}</td>
      <td className="px-3 py-2">
        <span className={cn(
          "text-[10px] font-mono px-1.5 py-0.5 rounded border",
          v.status === "open" && "text-status-error border-status-error/50 bg-status-error/10",
          v.status === "waived" && "text-status-waiting border-status-waiting/45 bg-status-waiting/10",
          v.status === "fixed" && "text-status-done border-status-done/50 bg-status-done/10",
        )}>{v.status === "waived" ? "waived (justified)" : v.status}</span>
      </td>
      <td className="px-3 py-2 text-right font-mono text-muted-foreground" suppressHydrationWarning>{fmtAge(v.detectedAt)}</td>
    </tr>
  );
}

function ConstitutionDrawer({ c, onClose }: { c: Constitution; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="ml-auto h-full w-full max-w-2xl bg-panel border-l border-border shadow-2xl relative flex flex-col">
        <div className="flex items-start justify-between p-4 border-b border-border">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{cbLabel[c.cb]} · {c.stack}</div>
            <div className="text-lg font-semibold">{c.name}</div>
            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
              {c.version} · {c.status} · by {c.author} · {fmtAge(c.lastModified)} ago · compliance {c.compliance}%
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 cursor-pointer" aria-label="Close">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">Rules</div>
            <ul className="space-y-1.5">
              {c.rules.map((r) => (
                <li key={r.id} className="glass-panel p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{r.id}</span>
                    <div className="flex-1">
                      <div className="text-sm">{r.rule}</div>
                      <div className="text-[11px] text-muted-foreground">{r.rationale}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">Version history</div>
            <ol className="space-y-3">
              {c.history.map((h, i) => (
                <li key={h.version} className="glass-panel p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-foreground font-semibold">{h.version}</span>
                      {i === 0 && <span className="text-[9px] px-1 rounded border border-status-done/50 bg-status-done/10 text-status-done">current</span>}
                      <span className="text-muted-foreground/60">·</span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        {h.byKind === "agent" ? <Bot className="size-3" /> : <User2 className="size-3" />}
                        {h.by}
                      </span>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-muted-foreground">{fmtAge(h.ts)} ago</span>
                    </div>
                  </div>
                  <div className="text-[12px] mt-1 text-foreground/90">{h.summary}</div>
                  <pre className="mt-2 text-[11px] font-mono leading-relaxed bg-black/30 rounded p-2 border border-border overflow-x-auto">
                    {h.diff.map((d, j) => (
                      <div key={j} className={cn(
                        "flex items-start gap-1.5",
                        d.kind === "+" && "text-status-done",
                        d.kind === "-" && "text-status-error",
                        d.kind === "~" && "text-status-waiting",
                      )}>
                        <span className="select-none w-3">{d.kind === "+" ? <PlusCircle className="size-3 inline" /> : d.kind === "-" ? <MinusCircle className="size-3 inline" /> : <ArrowRight className="size-3 inline" />}</span>
                        <span>{d.line}</span>
                      </div>
                    ))}
                  </pre>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceRing({ value, color }: { value: number; color: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <div className="relative size-12 shrink-0">
      <svg viewBox="0 0 44 44" className="size-12 -rotate-90">
        <circle cx="22" cy="22" r={r} stroke="color-mix(in oklab, currentColor 15%, transparent)" strokeWidth="4" fill="none" className="text-muted-foreground" />
        <circle cx="22" cy="22" r={r} stroke={color} strokeWidth="4" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[10px] font-mono font-semibold tabular-nums">
        {value}%
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground", className)}>{children}</th>;
}

function Meta({ icon: Icon, label, value }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1"><Icon className="size-2.5" />{label}</div>
      <div className="text-foreground truncate">{value}</div>
    </div>
  );
}

function SectionHead({ icon: Icon, title, sub }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{title}</span>
      {sub && <span className="text-[10px] text-muted-foreground/70 font-mono">· {sub}</span>}
    </div>
  );
}

function FilterChips<T extends string>({
  options, value, onChange,
}: { options: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded border border-border overflow-hidden">
      {options.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            "px-2 py-1 text-[10px] cursor-pointer transition-colors",
            value === k ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-white/5",
          )}
        >{label}</button>
      ))}
    </div>
  );
}

// Avoid unused import warnings for icons referenced conditionally above
void Scale;
