import { useMemo, useState } from "react";
import {
  Database, MessageSquare, FolderKanban, Mail, Briefcase, FileSignature,
  Brain, GitMerge, AlertTriangle, CheckCircle2, FileText, Activity,
  Layers, Search, ArrowRight, Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  sources, doclingStats, parseFailures, conflicts, dedupStats, indexHealth, specLineage,
  type KnowledgeSource, type SourceId, type Freshness,
} from "@/mock/knowledge";
import { cn } from "@/lib/utils";

const sourceIcon: Record<SourceId, React.ComponentType<{ className?: string }>> = {
  slack: MessageSquare,
  gdrive: FolderKanban,
  jira: Briefcase,
  gmail: Mail,
  hubspot: Activity,
  sows: FileSignature,
};

const freshTone: Record<Freshness, { dot: string; label: string }> = {
  fresh:  { dot: "bg-status-done dot-pulse",       label: "fresh"  },
  stale:  { dot: "bg-status-waiting",              label: "stale"  },
  failed: { dot: "bg-status-error glow-pulse",     label: "failed" },
};

const stateTone = (s: KnowledgeSource["subAgentState"]) =>
  s === "running" ? "text-status-running border-status-running/40 bg-status-running/10" :
  s === "waiting" ? "text-status-waiting border-status-waiting/40 bg-status-waiting/10" :
  s === "error"   ? "text-status-error border-status-error/45 bg-status-error/10" :
                    "text-muted-foreground border-border bg-white/5";

function Spark({ data, color = "var(--primary)" }: { data: number[]; color?: string }) {
  const w = 96, h = 22, max = Math.max(...data, 1), min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.2" points={pts} />
    </svg>
  );
}

function SectionHead({ icon: Icon, title, sub }: {
  icon: React.ComponentType<{ className?: string }>; title: string; sub?: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
      </div>
      {sub && <span className="text-[11px] text-muted-foreground font-mono">· {sub}</span>}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="glass-panel p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold font-mono tabular-nums", tone)}>{value}</div>
    </div>
  );
}

export function KnowledgeView() {
  const [selectedSpec, setSelectedSpec] = useState(specLineage[0].ticketId);
  const lineage = useMemo(
    () => specLineage.find((s) => s.ticketId === selectedSpec)!,
    [selectedSpec],
  );

  const failedCount = sources.filter((s) => s.freshness === "failed").length;
  const staleCount  = sources.filter((s) => s.freshness === "stale").length;
  const totalDocs   = sources.reduce((a, s) => a + s.docsIngested, 0);

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      {/* header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            curator · knowledge layer
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Knowledge</h1>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Garbage-in is the hardest failure to see three artifacts later. Watch the upstream
            sources, parsers, conflict resolution and index that feed every spec.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="glass-panel px-2.5 py-1.5">
            <span className="text-foreground">{totalDocs.toLocaleString()}</span>
            <span className="text-muted-foreground"> docs</span>
          </span>
          <span className={cn(
            "glass-panel px-2.5 py-1.5",
            staleCount > 0 && "text-status-waiting",
          )}>{staleCount} stale</span>
          <span className={cn(
            "glass-panel px-2.5 py-1.5",
            failedCount > 0 && "text-status-error",
          )}>{failedCount} failed</span>
        </div>
      </div>

      {/* SOURCE HEALTH */}
      <section className="space-y-2">
        <SectionHead icon={Database} title="Source health" sub="LangChain Deep Agent sub-agents · isolated context per source" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sources.map((s) => {
            const Icon = sourceIcon[s.id];
            const fresh = freshTone[s.freshness];
            return (
              <div key={s.id} className="glass-panel p-4 hover-lift">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-md grid place-items-center bg-white/5 border border-border">
                    <Icon className="size-4 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm truncate">{s.name}</div>
                      <span className={cn("size-1.5 rounded-full", fresh.dot)} title={fresh.label} />
                      <span className="text-[10px] font-mono text-muted-foreground">{fresh.label}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{s.kind}</div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                    s.status === "connected"    ? "border-status-done/40 text-status-done bg-status-done/10" :
                    s.status === "degraded"     ? "border-status-waiting/45 text-status-waiting bg-status-waiting/10" :
                                                   "border-status-error/45 text-status-error bg-status-error/10",
                  )}>{s.status}</span>
                </div>

                {/* sub-agent row */}
                <div className="mt-3 flex items-center gap-2">
                  <Brain className="size-3 text-muted-foreground" />
                  <code className="text-[10px] font-mono text-muted-foreground truncate">{s.subAgent}</code>
                  <span className={cn(
                    "ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border",
                    stateTone(s.subAgentState),
                  )}>{s.subAgentState}</span>
                </div>

                {/* metrics */}
                <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-border items-end">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">docs</div>
                    <div className="text-sm font-mono tabular-nums">{s.docsIngested.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">+24h</div>
                    <div className="text-sm font-mono tabular-nums text-status-done">+{s.docsDelta24h}</div>
                  </div>
                  <div className="justify-self-end">
                    <Spark data={s.spark} color={
                      s.freshness === "failed" ? "var(--status-error)" :
                      s.freshness === "stale"  ? "var(--status-waiting)" :
                                                 "var(--status-done)"
                    } />
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <Activity className="size-3" />
                  last sync {s.lastSyncMin}m ago
                  {s.note && (
                    <span className="ml-auto text-status-waiting truncate" title={s.note}>· {s.note}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* DOCLING */}
      <section className="space-y-2">
        <SectionHead icon={FileText} title="Docling parsing" sub="extraction throughput · table accuracy · failures" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="glass-panel p-4 lg:col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-3">
              throughput by file type · last 24h
            </div>
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase font-mono text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-1.5">type</th>
                  <th className="text-right py-1.5">parsed</th>
                  <th className="text-right py-1.5">avg latency</th>
                  <th className="text-left py-1.5 pl-4">table-extract accuracy</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {doclingStats.map((d) => (
                  <tr key={d.type} className="border-b border-border/40 last:border-0">
                    <td className="py-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-white/5">
                        {d.type}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{d.parsed24h}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{d.avgMs}ms</td>
                    <td className="py-2 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full",
                              d.tableAcc >= 95 ? "bg-status-done" :
                              d.tableAcc >= 90 ? "bg-status-running" :
                                                  "bg-status-waiting",
                            )}
                            style={{ width: `${d.tableAcc}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-[11px]">{d.tableAcc}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-status-error" />
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                parse failures
              </div>
              <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border border-status-error/40 text-status-error bg-status-error/10">
                {parseFailures.length}
              </span>
            </div>
            <ul className="space-y-2">
              {parseFailures.map((f) => (
                <li key={f.file} className="text-[11px]">
                  <div className="font-mono truncate text-foreground" title={f.file}>{f.file}</div>
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-mono">{f.source}</span>
                    <span>·</span>
                    <span className="truncate">{f.reason}</span>
                    <span className="ml-auto text-[10px] font-mono shrink-0">{f.ts}m</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CONFLICTS */}
      <section className="space-y-2">
        <SectionHead icon={GitMerge} title="Conflict resolution" sub="cross-source contradictions · synthesis agent decisions" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="dedup 24h"      value={dedupStats.duplicatesCollapsed24h.toLocaleString()} />
          <Stat label="near-dupes"     value={dedupStats.nearDupesMerged24h.toLocaleString()} />
          <Stat label="conflicts"      value={dedupStats.conflictsDetected24h} />
          <Stat label="auto-resolved"  value={dedupStats.conflictsAutoResolved24h} tone="text-status-done" />
          <Stat label="escalated"      value={dedupStats.conflictsEscalated24h} tone="text-status-waiting" />
        </div>
        <div className="glass-panel divide-y divide-border">
          {conflicts.map((c) => (
            <div key={c.id} className="p-3 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto] gap-3 items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-[10px] font-mono text-muted-foreground">{c.id}</code>
                  <span className="text-sm font-medium truncate">{c.topic}</span>
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">
                  <span className="text-[10px] uppercase font-mono mr-1.5">{c.a.source}</span>
                  <span className="italic">"{c.a.quote}"</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  <span className="text-[10px] uppercase font-mono mr-1.5">{c.b.source}</span>
                  <span className="italic">"{c.b.quote}"</span>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground hidden lg:block" />
              <div className="text-[11px]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-status-done" />
                  <span className="text-[10px] uppercase font-mono text-status-done">{c.resolution.winner} wins</span>
                </div>
                <div className="text-muted-foreground mt-0.5">{c.resolution.why}</div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground justify-self-end">{c.ts}m ago</span>
            </div>
          ))}
        </div>
      </section>

      {/* INDEX HEALTH */}
      <section className="space-y-2">
        <SectionHead icon={Layers} title="Index health" sub="Elasticsearch + pgvector · hybrid retrieval (RRF)" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="ES docs"        value={indexHealth.esDocs.toLocaleString()} />
          <Stat label="embeddings"     value={indexHealth.pgvectorEmbeddings.toLocaleString()} />
          <Stat label="coverage"       value={`${indexHealth.coveragePct}%`} tone="text-status-done" />
          <Stat label="index size"     value={`${indexHealth.esIndexSizeMb} MB`} />
          <Stat label="hybrid p50"     value={`${indexHealth.hybridQueryP50Ms}ms`} />
          <Stat label="hybrid p95"     value={`${indexHealth.hybridQueryP95Ms}ms`} />
          <Stat label="shards"         value={`${indexHealth.shardsHealthy}/${indexHealth.shardsTotal}`} tone="text-status-done" />
          <div className="glass-panel p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">RRF weighting</div>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-mono">
              <span className="text-status-running">dense {indexHealth.denseWeight}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-status-waiting">bm25 {indexHealth.bm25Weight}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">k={indexHealth.rrfK}</span>
            </div>
            <div className="mt-2 h-1.5 flex rounded-full overflow-hidden bg-white/5">
              <div className="bg-status-running" style={{ width: `${indexHealth.denseWeight * 100}%` }} />
              <div className="bg-status-waiting" style={{ width: `${indexHealth.bm25Weight * 100}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* LINEAGE */}
      <section className="space-y-2">
        <SectionHead icon={Sparkles} title="Source → spec lineage" sub="which curated sources fed a given spec" />
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Search className="size-4 text-muted-foreground" />
            <span className="text-[11px] font-mono text-muted-foreground">spec:</span>
            {specLineage.map((sl) => (
              <button
                key={sl.ticketId}
                onClick={() => setSelectedSpec(sl.ticketId)}
                className={cn(
                  "text-[11px] font-mono px-2 py-1 rounded border cursor-pointer transition-colors",
                  selectedSpec === sl.ticketId
                    ? "border-primary/50 bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-white/5",
                )}
              >
                {sl.ticketId}
              </button>
            ))}
            <Link
              to="/traceability"
              className="ml-auto text-[11px] font-mono text-primary hover:underline inline-flex items-center gap-1"
            >
              open in Traceability <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="text-sm font-semibold mb-3">{lineage.spec}</div>

          <div className="space-y-2">
            {lineage.fedBy.map((f) => {
              const Icon = sourceIcon[f.source];
              return (
                <div key={f.doc} className="flex items-center gap-3">
                  <div className="size-7 rounded grid place-items-center bg-white/5 border border-border shrink-0">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-muted-foreground font-mono uppercase">{f.source}</div>
                    <div className="text-xs truncate">{f.doc}</div>
                  </div>
                  <div className="w-48 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${f.weight * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-mono tabular-nums w-10 text-right">
                      {Math.round(f.weight * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="size-3 text-status-waiting" />
            Weights reflect retrieval contribution via hybrid (dense + BM25 / RRF). Re-rank if a single source dominates.
          </div>
        </div>
      </section>
    </div>
  );
}
