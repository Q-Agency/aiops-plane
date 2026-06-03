import { useEffect, useMemo, useState } from "react";
import {
  Check, X, Search, ChevronDown, FileText, GitPullRequest,
  AlertTriangle, AlertOctagon, Info, ListChecks, FileCode2,
  TestTube2, Brain, Clock,
} from "lucide-react";
import { useLive } from "@/hooks/useLiveTicker";
import { cn } from "@/lib/utils";
import {
  buildLineage, specMd, designMd, tasksJson, prCard, reviewReport, qaReport,
  type ArtifactKind, type TraceNode, type TraceStatus,
} from "@/mock/trace";
import { agents as seedAgents } from "@/mock/agents";
import type { AgentId, Ticket } from "@/mock/types";

const agentColor = (id: AgentId) => `var(--${seedAgents.find((a) => a.id === id)!.color})`;
const agentName  = (id: AgentId) => seedAgents.find((a) => a.id === id)!.name;

const KIND_LABEL: Record<ArtifactKind, string> = {
  context: "Curated context", spec: "Business spec", design: "Solution design",
  tasks: "Task breakdown", code: "Code + PR", review: "Code review", qa: "QA report",
};

const KIND_ICON: Record<ArtifactKind, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  context: Brain, spec: FileText, design: FileCode2, tasks: ListChecks,
  code: GitPullRequest, review: AlertTriangle, qa: TestTube2,
};

const STATUS_TONE: Record<TraceStatus, string> = {
  approved:              "text-status-done border-status-done/40 bg-status-done/10",
  "rejected-then-fixed": "text-status-waiting border-status-waiting/40 bg-status-waiting/10",
  pending:               "text-status-running border-status-running/40 bg-status-running/10",
  "not-yet-reached":     "text-muted-foreground border-border bg-white/[0.02]",
};
const STATUS_LABEL: Record<TraceStatus, string> = {
  approved: "approved",
  "rejected-then-fixed": "rejected → fixed",
  pending: "pending",
  "not-yet-reached": "not yet reached",
};

function ago(min: number) {
  if (min <= 0) return "—";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m ago`;
}

export function TraceabilityView() {
  const { tickets } = useLive();
  const [ticketId, setTicketId] = useState("AM-142");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeKind, setActiveKind] = useState<ArtifactKind | null>(null);

  const ticket = useMemo(
    () => tickets.find((t) => t.id === ticketId) ?? tickets[0],
    [tickets, ticketId],
  );
  const lineage = useMemo(() => buildLineage(ticket), [ticket]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return tickets;
    return tickets.filter((t) => t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q));
  }, [tickets, query]);

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">artifact lineage</div>
          <h1 className="text-xl font-semibold tracking-tight">Traceability</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            Every artifact, every approver, every rejection loop — end-to-end for one ticket.
          </div>
        </div>
        <TicketPicker
          ticket={ticket}
          tickets={filtered}
          open={open} setOpen={setOpen}
          query={query} setQuery={setQuery}
          onPick={(id) => { setTicketId(id); setOpen(false); setActiveKind(null); }}
        />
      </div>

      {/* ticket summary */}
      <div className="glass-panel px-4 py-3 flex items-center gap-4 flex-wrap">
        <div className="font-mono text-sm text-foreground">{ticket.id}</div>
        <div className="text-sm font-semibold">{ticket.title}</div>
        <div className="ml-auto flex items-center gap-2 text-[11px] font-mono">
          <span className="border border-border rounded px-1.5 py-0.5 text-muted-foreground">{ticket.codebase}</span>
          <span className="border border-border rounded px-1.5 py-0.5 text-muted-foreground">{ticket.priority}</span>
          <span className="border border-border rounded px-1.5 py-0.5 text-muted-foreground">stage · {ticket.stage}</span>
          {ticket.overnightEligible && <span className="text-[11px]">🌙</span>}
        </div>
      </div>

      {/* timeline + panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_460px] gap-4 flex-1 min-h-0">
        <div className="glass-panel p-5 overflow-y-auto scrollbar-thin">
          <Timeline
            nodes={lineage}
            activeKind={activeKind}
            onPick={(k) => setActiveKind(k)}
          />
        </div>

        <div className="glass-panel p-5 overflow-y-auto scrollbar-thin min-h-0">
          {activeKind
            ? <ArtifactPanel kind={activeKind} ticket={ticket} node={lineage.find((n) => n.kind === activeKind)!} />
            : <EmptyPanel />}
        </div>
      </div>
    </div>
  );
}

function TicketPicker({
  ticket, tickets, open, setOpen, query, setQuery, onPick,
}: {
  ticket: Ticket;
  tickets: Ticket[];
  open: boolean; setOpen: (b: boolean) => void;
  query: string; setQuery: (s: string) => void;
  onPick: (id: string) => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="glass-panel px-3 py-2 inline-flex items-center gap-2 text-sm cursor-pointer hover:border-primary/40 min-w-[280px]"
      >
        <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
        <span className="truncate">{ticket.title}</span>
        <ChevronDown className="size-4 text-muted-foreground ml-auto" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[360px] glass-panel p-2 z-30 anim-in">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search tickets…"
              className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[320px] overflow-y-auto scrollbar-thin">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 cursor-pointer",
                  t.id === ticket.id ? "bg-primary/10 text-primary" : "hover:bg-white/5",
                )}
              >
                <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{t.id}</span>
                <span className="truncate flex-1">{t.title}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{t.stage}</span>
              </button>
            ))}
            {tickets.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">no match</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Timeline({
  nodes, activeKind, onPick,
}: {
  nodes: TraceNode[];
  activeKind: ArtifactKind | null;
  onPick: (k: ArtifactKind) => void;
}) {
  return (
    <ol className="relative ml-3 border-l border-border space-y-6">
      {nodes.map((n, i) => {
        const Icon = KIND_ICON[n.kind];
        const color = agentColor(n.agent);
        const isLast = i === nodes.length - 1;
        const reached = n.status !== "not-yet-reached";
        const active = activeKind === n.kind;
        return (
          <li key={n.kind} className="relative pl-8">
            {/* node dot */}
            <span
              className={cn(
                "absolute -left-[9px] top-1 size-4 rounded-full border-2 grid place-items-center",
                reached ? "" : "opacity-40",
              )}
              style={{
                borderColor: color,
                background: reached ? color : "transparent",
                boxShadow: reached && n.status === "pending" ? `0 0 0 4px color-mix(in oklab, ${color} 30%, transparent)` : undefined,
              }}
            />
            {!isLast && (
              <span
                className="absolute left-[-1px] top-5 bottom-[-24px] w-px"
                style={{ background: reached ? `color-mix(in oklab, ${color} 50%, transparent)` : undefined }}
              />
            )}

            <button
              disabled={!reached}
              onClick={() => onPick(n.kind)}
              className={cn(
                "w-full text-left rounded-lg border p-3 transition-colors",
                reached ? "border-border hover:border-primary/40 cursor-pointer" : "border-border/50 cursor-not-allowed",
                active && "border-primary/60 bg-primary/5 ring-1 ring-primary/30",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="size-4" style={{ color }} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      {KIND_LABEL[n.kind]}
                      <span className="font-mono text-[11px] text-muted-foreground">{n.artifact} {n.version !== "—" && <span className="text-foreground/70">{n.version}</span>}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      <span style={{ color }}>{agentName(n.agent)}</span>
                      {reached && <> · produced <Clock className="inline size-3 -mt-0.5" /> {ago(n.producedAtOffsetMin)}</>}
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] font-mono border rounded px-1.5 py-0.5 shrink-0", STATUS_TONE[n.status])}>
                  {STATUS_LABEL[n.status]}
                </span>
              </div>

              {/* approver line */}
              {reached && n.kind !== "context" && n.approver && (
                <div className="mt-2 text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                  {n.status === "pending" ? (
                    <>awaiting <span className="text-foreground/80">{n.approver}</span></>
                  ) : (
                    <>
                      <Check className="size-3 text-status-done" />
                      <span className="text-foreground/80">{n.approver}</span>
                      <span>approved · {ago(n.approvedAtOffsetMin ?? 0)}</span>
                    </>
                  )}
                </div>
              )}
            </button>

            {/* rejection branch */}
            {n.reject && (
              <div className="mt-3 ml-6 relative">
                <span className="absolute -left-6 top-3 w-6 border-t border-dashed border-status-error/60" />
                <span className="absolute -left-6 top-0 bottom-3 w-px border-l border-dashed border-status-error/60" />
                <div className="rounded-lg border border-status-error/30 bg-status-error/5 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <X className="size-3 text-status-error" />
                    <span className="text-status-error uppercase tracking-wider">rejection loop</span>
                    <span className="text-muted-foreground">→ rerun · fixed as {n.reject.fixedAs}</span>
                  </div>
                  <div className="mt-1.5 text-[12px] text-foreground/90">{n.reject.reason}</div>
                  <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
                    {n.reject.feedback.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function EmptyPanel() {
  return (
    <div className="h-full grid place-items-center text-center">
      <div>
        <FileText className="size-8 mx-auto text-muted-foreground mb-2" />
        <div className="text-sm font-medium">Pick a node to inspect</div>
        <div className="text-xs text-muted-foreground mt-1">Each artifact opens a real, scoped preview.</div>
      </div>
    </div>
  );
}

function ArtifactPanel({ kind, ticket, node }: { kind: ArtifactKind; ticket: Ticket; node: TraceNode }) {
  const color = agentColor(node.agent);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color }}>{agentName(node.agent)}</div>
          <div className="text-sm font-semibold truncate">{KIND_LABEL[kind]} · <span className="font-mono text-muted-foreground">{node.artifact} {node.version}</span></div>
        </div>
        <span className={cn("text-[10px] font-mono border rounded px-1.5 py-0.5", STATUS_TONE[node.status])}>
          {STATUS_LABEL[node.status]}
        </span>
      </div>
      {kind === "context" && <ContextPreview ticket={ticket} />}
      {kind === "spec"    && <SpecPreview ticket={ticket} />}
      {kind === "design"  && <DesignPreview ticket={ticket} />}
      {kind === "tasks"   && <TasksPreview ticket={ticket} />}
      {kind === "code"    && <CodePreview ticket={ticket} />}
      {kind === "review"  && <ReviewPreview ticket={ticket} />}
      {kind === "qa"      && <QaPreview ticket={ticket} />}
    </div>
  );
}

/* ---------- artifact previews ---------- */

export function ContextPreview({ ticket }: { ticket: Ticket }) {
  const docs = [
    { name: "PRD · AutoMarket v2.4",         tokens: "12.4k", source: "Confluence" },
    { name: `Prior tickets touching ${ticket.codebase}`, tokens: "8.1k", source: "Linear" },
    { name: "ADR-017 cursor pagination",     tokens: "2.3k", source: "repo" },
    { name: "Domain glossary",               tokens: "1.7k", source: "repo" },
    { name: `Schema dump · ${ticket.codebase} service`, tokens: "5.0k", source: "Postgres introspection" },
  ];
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">Curator assembled this bundle as the input context for downstream agents.</div>
      <div className="space-y-1.5">
        {docs.map((d) => (
          <div key={d.name} className="border border-border rounded px-2.5 py-1.5 flex items-center gap-2 text-xs">
            <Brain className="size-3.5 text-agent-curator" />
            <div className="flex-1 min-w-0 truncate">{d.name}</div>
            <span className="font-mono text-[10px] text-muted-foreground">{d.tokens}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{d.source}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarkdownLite({ text }: { text: string }) {
  // tiny renderer: # / ## / ### / -/ [ ] / **bold** / `code` / blockquote
  const lines = text.split("\n");
  return (
    <div className="text-sm leading-relaxed space-y-1.5">
      {lines.map((raw, i) => {
        const ln = raw;
        if (ln.startsWith("### ")) return <div key={i} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2">{ln.slice(4)}</div>;
        if (ln.startsWith("## "))  return <div key={i} className="text-sm font-semibold mt-3">{ln.slice(3)}</div>;
        if (ln.startsWith("# "))   return <div key={i} className="text-base font-semibold">{ln.slice(2)}</div>;
        if (ln.startsWith("> "))   return <div key={i} className="text-xs text-muted-foreground border-l-2 border-border pl-2">{ln.slice(2)}</div>;
        if (ln.startsWith("- [ ] ")) return <div key={i} className="flex items-start gap-2"><span className="mt-1 size-3 border border-border rounded-sm" /><span>{format(ln.slice(6))}</span></div>;
        if (ln.startsWith("- "))   return <div key={i} className="flex items-start gap-2"><span className="mt-2 size-1 rounded-full bg-muted-foreground" /><span>{format(ln.slice(2))}</span></div>;
        if (ln.trim() === "")      return <div key={i} className="h-1" />;
        return <div key={i}>{format(ln)}</div>;
      })}
    </div>
  );
}

function format(s: string): React.ReactNode {
  // **bold** and `code`
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else parts.push(<code key={key++} className="font-mono text-[12px] bg-white/5 border border-border rounded px-1">{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

export function SpecPreview({ ticket }: { ticket: Ticket }) {
  return <MarkdownLite text={specMd(ticket)} />;
}

export function DesignPreview({ ticket }: { ticket: Ticket }) {
  const d = designMd(ticket);
  return (
    <div className="space-y-4">
      <MarkdownLite text={d.md} />
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-1.5">API endpoints</div>
        <div className="border border-border rounded overflow-hidden font-mono text-[11px]">
          {d.endpoints.map((e, i) => (
            <div key={i} className={cn("grid grid-cols-[60px_1fr_100px] gap-2 px-2 py-1.5 items-center", i % 2 && "bg-white/[0.02]")}>
              <span className={cn("text-[10px] font-semibold rounded px-1 py-0.5 text-center",
                e.method === "GET" ? "bg-agent-ba/15 text-agent-ba" : "bg-agent-curator/15 text-agent-curator")}>
                {e.method}
              </span>
              <span className="truncate">{e.path}</span>
              <span className="text-muted-foreground text-right">{e.auth}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-1.5">Data model · listings</div>
        <div className="border border-border rounded overflow-hidden font-mono text-[11px]">
          <div className="grid grid-cols-[1.2fr_1fr_1.4fr] gap-2 px-2 py-1.5 border-b border-border text-muted-foreground">
            <span>column</span><span>type</span><span>notes</span>
          </div>
          {d.table.map((c, i) => (
            <div key={i} className={cn("grid grid-cols-[1.2fr_1fr_1.4fr] gap-2 px-2 py-1.5", i % 2 && "bg-white/[0.02]")}>
              <span className="text-foreground">{c.column}</span>
              <span className="text-agent-sa">{c.type}</span>
              <span className="text-muted-foreground">{c.notes}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TasksPreview({ ticket }: { ticket: Ticket }) {
  const j = tasksJson(ticket);
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        <span className="font-mono">{j.tasks.length}</span> sub-tasks · <span className="font-mono">{j.estimateTotal}</span> story points · epic <span className="font-mono">{j.ticket}</span>
      </div>
      <pre className="font-mono text-[11px] bg-white/[0.02] border border-border rounded p-3 overflow-x-auto leading-relaxed">{`{
  "ticket": "${j.ticket}",
  "epic":   "${j.epic}",
  "tasks": [`}
{j.tasks.map((t, i) => (
  <span key={t.id}>{`
    {
      "id":      "${t.id}",
      "title":   "${t.title}",
      "agent":   "${t.agent}",
      "points":  ${t.points},
      "depends": [${t.depends.map((d) => `"${d}"`).join(", ")}]
    }${i < j.tasks.length - 1 ? "," : ""}`}</span>
))}
{`
  ]
}`}
      </pre>
    </div>
  );
}

export function CodePreview({ ticket }: { ticket: Ticket }) {
  const pr = prCard(ticket);
  return (
    <div className="space-y-3">
      <div className="rounded border border-border p-3">
        <div className="flex items-center gap-2">
          <GitPullRequest className="size-4 text-agent-dev" />
          <span className="font-mono text-xs text-muted-foreground">{pr.pr}</span>
          <span className="text-sm font-medium truncate">{pr.title}</span>
        </div>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          branch · <span className="text-foreground/80">{pr.branch}</span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[11px] font-mono">
          <span className="text-muted-foreground">{pr.filesChanged} files</span>
          <span className="text-status-done">+{pr.additions}</span>
          <span className="text-status-error">−{pr.deletions}</span>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-1.5">files changed</div>
        <div className="border border-border rounded overflow-hidden font-mono text-[11px]">
          {pr.files.map((f, i) => (
            <div key={f.path} className={cn("flex items-center gap-2 px-2 py-1.5", i % 2 && "bg-white/[0.02]")}>
              <span className={cn("text-[10px] w-3 text-center",
                f.kind === "+" ? "text-status-done" : "text-status-waiting")}>{f.kind}</span>
              <span className="truncate text-foreground/80">{f.path}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-1.5">status checks</div>
        <div className="space-y-1">
          {pr.checks.map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-[11px] font-mono">
              <Check className="size-3 text-status-done" />
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-muted-foreground">{c.dur}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SEV_META = {
  blocker: { icon: AlertOctagon, tone: "text-status-error border-status-error/40 bg-status-error/10" },
  major:   { icon: AlertTriangle, tone: "text-status-waiting border-status-waiting/40 bg-status-waiting/10" },
  minor:   { icon: AlertTriangle, tone: "text-status-running border-status-running/40 bg-status-running/10" },
  info:    { icon: Info, tone: "text-muted-foreground border-border bg-white/[0.02]" },
} as const;

export function ReviewPreview({ ticket }: { ticket: Ticket }) {
  const findings = reviewReport(ticket);
  const counts = findings.reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] ?? 0) + 1 }), {});
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-mono">
        {(["blocker","major","minor","info"] as const).map((s) => (
          <span key={s} className={cn("border rounded px-1.5 py-0.5", SEV_META[s].tone)}>
            {counts[s] ?? 0} {s}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {findings.map((f, i) => {
          const Icon = SEV_META[f.severity].icon;
          return (
            <div key={i} className="border border-border rounded p-2.5">
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <Icon className={cn("size-3.5", SEV_META[f.severity].tone.split(" ")[0])} />
                <span className={cn("uppercase tracking-wider", SEV_META[f.severity].tone.split(" ")[0])}>{f.severity}</span>
                <span className="text-muted-foreground truncate">{f.file}:{f.line}</span>
              </div>
              <div className="mt-1 text-[12px] text-foreground/90">{f.msg}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QaPreview({ ticket }: { ticket: Ticket }) {
  const r = qaReport(ticket);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "passed", value: r.passed, tone: "text-status-done" },
          { label: "failed", value: r.failed, tone: "text-status-error" },
          { label: "healed", value: r.healed, tone: "text-status-waiting" },
          { label: "duration", value: `${Math.round(r.durationMs / 1000)}s`, tone: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="border border-border rounded p-2 text-center">
            <div className={cn("text-base font-semibold font-mono", s.tone)}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="font-mono text-[11px] text-muted-foreground">suite · <span className="text-foreground/80">{r.suite}</span></div>

      <div className="border border-border rounded overflow-hidden">
        {r.tests.map((t, i) => (
          <div key={i} className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", i % 2 && "bg-white/[0.02]")}>
            {t.state === "pass"
              ? <Check className="size-3 text-status-done shrink-0" />
              : <X className="size-3 text-status-error shrink-0" />}
            <span className="flex-1 truncate">{t.name}</span>
            {t.note && <span className="text-muted-foreground italic truncate max-w-[50%]">{t.note}</span>}
            <span className="font-mono text-muted-foreground">{t.ms}ms</span>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-1.5">screenshots</div>
        <div className="grid grid-cols-3 gap-2">
          {[0,1,2].map((i) => (
            <div key={i} className="aspect-video rounded border border-border bg-gradient-to-br from-panel-2/40 to-panel/40 grid place-items-center text-[10px] text-muted-foreground font-mono">
              {ticket.id}-shot-{i+1}.png
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-1.5">bugs filed</div>
        <ul className="space-y-1 text-[11px] font-mono">
          {r.bugsFiled.map((b) => (
            <li key={b} className="flex items-center gap-2 text-status-error">
              <AlertOctagon className="size-3" /> {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
