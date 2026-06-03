// Section-aware insight engine for the contextual <SectionAssistant>.
// Each section owns: a display name, a chip set of suggested prompts, and a
// deterministic getInsight(prompt?) that reads from the same mock fixtures
// the rest of the dashboard renders. Free-text falls back to a generic
// summary so the demo always feels grounded.
//
// TODO: replace with live LLM/RAG endpoint — swap each `compute` body for a
// fetch() against a backend that has read access to the same domain data.

import { tickets } from "@/mock/tickets";
import { gateStats, GATE_AGENT } from "@/mock/flow";
import {
  ticketEconomics,
  ticketTotalUsd,
  ticketTokenUsd,
  ticketReviewMin,
  ticketRerunCount,
  aggregates,
  stageLabel,
} from "@/mock/economics";
import { ESCALATIONS, SCHEDULED, COMMS, unackedOpen } from "@/mock/comms";
import { approvals } from "@/mock/approvals";
import { humans, OWNERSHIP } from "@/mock/humans";
import { violations } from "@/mock/governance";
import { sources, conflicts } from "@/mock/knowledge";
import { agents } from "@/mock/agents";

export type SectionId =
  | "command-center"
  | "pipeline"
  | "traceability"
  | "agents"
  | "observability"
  | "approvals"
  | "accountability"
  | "governance"
  | "knowledge"
  | "economics"
  | "incidents"
  | "flow"
  | "orchestration"
  | "comms"
  | "compliance";

export interface SectionConfig {
  id: SectionId;
  name: string;
  prompts: string[];
  // Insight on open. Recomputed from live mock data.
  summary: () => string;
  // Prompt handler — returns markdown-ish plain text.
  answer: (prompt: string) => string;
}

const fmt$ = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;
const fmtH = (m: number) => (m >= 60 ? `${(m / 60).toFixed(1)}h` : `${m}m`);

/* ---------------- per-section computers ---------------- */

const commandCenter = (): SectionConfig => ({
  id: "command-center",
  name: "Command Center",
  prompts: [
    "What's the biggest bottleneck right now?",
    "Summarize today's progress",
    "What needs my attention?",
    "Which tickets are at risk?",
  ],
  summary: () => {
    const inFlight = tickets.filter((t) => t.state === "running" || t.state === "waiting").length;
    const slow = [...gateStats].sort((a, b) => b.avgWaitMin - a.avgWaitMin)[0];
    const esc = unackedOpen().length;
    const slowAgent = agents.find((a) => a.id === GATE_AGENT[slow.gate]);
    return `${inFlight} tickets in flight · ${slowAgent?.name ?? slow.gate} is the current bottleneck (avg ${fmtH(slow.avgWaitMin)} in ${slow.gate} Review) · ${esc} escalation${esc === 1 ? "" : "s"} open.`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("bottleneck")) {
      const ranked = [...gateStats].sort((a, b) => b.avgWaitMin - a.avgWaitMin);
      return [
        "**Slowest gates (avg wait):**",
        ...ranked.slice(0, 3).map((g, i) => `${i + 1}. ${g.gate} Review — ${fmtH(g.avgWaitMin)} (p95 ${fmtH(g.p95WaitMin)}) · ${g.breaches} SLA breach${g.breaches === 1 ? "" : "es"}`),
        "",
        `Top fix: speed up **${ranked[0].gate} Review** — owned by ${agents.find((a) => a.id === GATE_AGENT[ranked[0].gate])?.name}.`,
      ].join("\n");
    }
    if (lq.includes("attention") || lq.includes("risk")) {
      const stale = tickets
        .filter((t) => t.state === "waiting")
        .sort((a, b) => a.updatedAt - b.updatedAt)
        .slice(0, 4);
      return [
        "**Needs attention now:**",
        ...stale.map((t) => `• ${t.id} · ${t.title} — ${t.stage} · approver ${t.approver}${t.rerunCount ? ` · ${t.rerunCount} rerun(s)` : ""}`),
      ].join("\n");
    }
    if (lq.includes("progress") || lq.includes("today") || lq.includes("summarize")) {
      const done = tickets.filter((t) => t.stage === "done").length;
      const running = tickets.filter((t) => t.state === "running").length;
      const waiting = tickets.filter((t) => t.state === "waiting").length;
      return `Today: **${done} shipped**, ${running} running, ${waiting} waiting on humans. Aggregate spend ${fmt$(aggregates.totalCost)} across ${ticketEconomics.length} tickets.`;
    }
    return commandCenter().summary();
  },
});

const pipeline = (): SectionConfig => ({
  id: "pipeline",
  name: "Pipeline Board",
  prompts: [
    "Which tickets are stuck and why?",
    "What's been rejected most?",
    "Where is flow slowing down?",
  ],
  summary: () => {
    const waiting = tickets.filter((t) => t.state === "waiting").length;
    const reruns = tickets.filter((t) => (t.rerunCount ?? 0) > 0).length;
    const slow = [...gateStats].sort((a, b) => b.avgWaitMin - a.avgWaitMin)[0];
    return `${waiting} tickets waiting on a human gate · ${reruns} with reruns · ${slow.gate} is the slowest column (avg ${fmtH(slow.avgWaitMin)}).`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("rejected") || lq.includes("rerun")) {
      const r = [...tickets]
        .filter((t) => (t.rerunCount ?? 0) > 0)
        .sort((a, b) => (b.rerunCount ?? 0) - (a.rerunCount ?? 0));
      return ["**Most rejected:**", ...r.map((t) => `• ${t.id} · ${t.rerunCount} rerun(s) · ${t.stage}`)].join("\n");
    }
    if (lq.includes("slow") || lq.includes("flow")) {
      return [
        "**Flow drag, slowest first:**",
        ...[...gateStats].sort((a, b) => b.avgWaitMin - a.avgWaitMin).map((g) => `• ${g.gate} — avg ${fmtH(g.avgWaitMin)} · ${g.open} open`),
      ].join("\n");
    }
    const stuck = tickets
      .filter((t) => t.state === "waiting")
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .slice(0, 5);
    return [
      "**Stuck tickets (oldest first):**",
      ...stuck.map((t) => `• ${t.id} · ${t.stage} · approver ${t.approver} · idle ${fmtH(Math.round((Date.now() - t.updatedAt) / 60000))}`),
    ].join("\n");
  },
});

const traceability = (): SectionConfig => ({
  id: "traceability",
  name: "Traceability",
  prompts: [
    "Summarize this ticket's journey",
    "Where did it get delayed?",
    "What changed between spec versions?",
  ],
  summary: () => {
    const t = tickets[0];
    return `Showing ${t.id} · ${t.title}. Currently in ${t.stage} · ${tickets.filter((x) => (x.rerunCount ?? 0) > 0).length} tickets in pipeline have rerun history.`;
  },
  answer: (q) => {
    const t = tickets[0];
    const lq = q.toLowerCase();
    if (lq.includes("delay")) return `Biggest delay for ${t.id}: stuck ${fmtH(Math.round((Date.now() - t.updatedAt) / 60000))} in ${t.stage}, approver ${t.approver}.`;
    if (lq.includes("changed") || lq.includes("version")) return `Spec v1 → v2 for ${t.id}: clarified acceptance criteria, added 2 edge cases (empty-state, paginated results). v2 cited 3 SOW lines and 1 Slack decision.`;
    return `${t.id} journey: BA spec → SA design → Tasks → Dev → Code Review → QA. Currently at **${t.stage}**, last touched ${fmtH(Math.round((Date.now() - t.updatedAt) / 60000))} ago.`;
  },
});

const agentsSection = (): SectionConfig => ({
  id: "agents",
  name: "Agents",
  prompts: [
    "How is this agent performing vs last week?",
    "Why did acceptance rate change?",
    "What's driving this agent's cost?",
  ],
  summary: () => {
    const top = [...agents].sort((a, b) => b.successRate - a.successRate)[0];
    const bot = [...agents].sort((a, b) => a.successRate - b.successRate)[0];
    return `${agents.length} agents online · top acceptance ${top.name} ${top.successRate}% · lowest ${bot.name} ${bot.successRate}%.`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("cost") || lq.includes("driving")) {
      const ranked = [...agents].sort((a, b) => b.tokenCostToday - a.tokenCostToday);
      return ["**Spend today:**", ...ranked.slice(0, 5).map((a) => `• ${a.name} — $${a.tokenCostToday.toFixed(2)} · ${a.latencyMs}ms p50`)].join("\n");
    }
    if (lq.includes("acceptance") || lq.includes("performing")) {
      return ["**Acceptance vs latency:**", ...agents.map((a) => `• ${a.name} — ${a.successRate}% accepted · ${a.latencyMs}ms`)].join("\n");
    }
    return agentsSection().summary();
  },
});

const observability = (): SectionConfig => ({
  id: "observability",
  name: "Observability",
  prompts: [
    "What's driving token spend today?",
    "Any latency anomalies?",
    "Where can we save with local models?",
  ],
  summary: () => {
    const localPct = Math.round((aggregates.totalLocal / aggregates.totalTokens) * 100);
    return `Token spend ${fmt$(aggregates.totalTokens)} · local-model share ${localPct}% · cloud ${fmt$(aggregates.totalCloud)}.`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("save") || lq.includes("local")) {
      return `Largest cloud-cost stage is **Dev** (heavy generation). Routing ~30% of Dev to local vLLM could save ~${fmt$(aggregates.totalCloud * 0.18)}/period at current volume.`;
    }
    if (lq.includes("latency") || lq.includes("anom")) {
      const slow = [...agents].sort((a, b) => b.latencyMs - a.latencyMs)[0];
      return `Highest p50 latency: **${slow.name}** at ${slow.latencyMs}ms — within band, no anomaly flagged.`;
    }
    const ranked = [...agents].sort((a, b) => b.tokenCostToday - a.tokenCostToday).slice(0, 3);
    return ["**Top spend today:**", ...ranked.map((a) => `• ${a.name} — $${a.tokenCostToday.toFixed(2)}`)].join("\n");
  },
});

const approvalsSection = (): SectionConfig => ({
  id: "approvals",
  name: "Approvals",
  prompts: [
    "What should I review first?",
    "Summarize what's waiting on me",
    "Anything breaching response time?",
  ],
  summary: () => `${approvals.length} approvals open across all gates. Oldest: ${approvals[0]?.ticketId} (${approvals[0]?.gate}).`,
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("first") || lq.includes("priority")) {
      const sorted = [...approvals].sort((a, b) => a.openedAt - b.openedAt).slice(0, 4);
      return ["**Review first (oldest):**", ...sorted.map((a) => `• ${a.ticketId} · ${a.gate} · opened ${fmtH(Math.round((Date.now() - a.openedAt) / 60000))} ago`)].join("\n");
    }
    if (lq.includes("breach")) {
      const breaching = approvals.filter((a) => Date.now() - a.openedAt > 90 * 60_000);
      return `${breaching.length} approval(s) past 90m SLA: ${breaching.map((a) => a.ticketId).join(", ") || "none"}.`;
    }
    return approvalsSection().summary();
  },
});

const accountability = (): SectionConfig => ({
  id: "accountability",
  name: "Accountability",
  prompts: ["Are any agents uncovered?", "Who's overloaded?", "Show me Ana's current load"],
  summary: () => {
    const covered = new Set(Object.values(OWNERSHIP));
    return `${humans.length} humans · ${covered.size} accountable for at least one agent.`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("uncovered")) {
      const missing = agents.filter((a) => !OWNERSHIP[a.id]);
      return missing.length ? `Uncovered: ${missing.map((a) => a.name).join(", ")}.` : "Every agent has a named accountable human.";
    }
    if (lq.includes("ana")) {
      const ana = humans.find((h) => h.name.toLowerCase().includes("ana"));
      if (!ana) return "No Ana found.";
      const owns = Object.entries(OWNERSHIP).filter(([, hid]) => hid === ana.id).map(([a]) => a);
      const queue = tickets.filter((t) => t.approver === ana.name).length;
      return `${ana.name} owns: ${owns.join(", ") || "—"}. Current approval queue: ${queue}.`;
    }
    const loads = humans.map((h) => ({ h, q: tickets.filter((t) => t.approver === h.name).length })).sort((a, b) => b.q - a.q);
    return ["**Load (open approvals):**", ...loads.slice(0, 5).map((x) => `• ${x.h.name} — ${x.q}`)].join("\n");
  },
});

const governanceSection = (): SectionConfig => ({
  id: "governance",
  name: "Governance",
  prompts: [
    "What violations are open?",
    "Which codebase has the most issues?",
    "What's failing quality gates?",
  ],
  summary: () => {
    const open = violations.filter((v) => v.status === "open").length;
    return `${open} open violation${open === 1 ? "" : "s"} across ${new Set(violations.map((v) => v.cb)).size} codebases.`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("codebase")) {
      const byCb: Record<string, number> = {};
      violations.filter((v) => v.status === "open").forEach((v) => (byCb[v.cb] = (byCb[v.cb] || 0) + 1));
      return ["**Open by codebase:**", ...Object.entries(byCb).sort((a, b) => b[1] - a[1]).map(([cb, n]) => `• ${cb} — ${n}`)].join("\n");
    }
    if (lq.includes("failing") || lq.includes("gate")) {
      return "Failing gates: see PR Gates table — most common failure: missing tests for new branches and lint violations on backend.";
    }
    const open = violations.filter((v) => v.status === "open").slice(0, 5);
    return ["**Open violations:**", ...open.map((v) => `• [${v.severity}] ${v.cb} · ${v.rule}`)].join("\n");
  },
});

const knowledge = (): SectionConfig => ({
  id: "knowledge",
  name: "Knowledge",
  prompts: [
    "Which sources are stale?",
    "What conflicts were found?",
    "Is the knowledge fresh enough to spec AM-150?",
  ],
  summary: () => {
    const stale = sources.filter((s) => s.freshness !== "fresh").length;
    return `${sources.length} sources connected · ${stale} stale/failed · ${conflicts.length} active conflict${conflicts.length === 1 ? "" : "s"}.`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("stale")) {
      const stale = sources.filter((s) => s.freshness !== "fresh");
      return ["**Stale/failed sources:**", ...stale.map((s) => `• ${s.id} — ${s.freshness}`)].join("\n");
    }
    if (lq.includes("conflict")) return ["**Conflicts:**", ...conflicts.slice(0, 4).map((c) => `• ${c.topic} — ${c.a.source} vs ${c.b.source} (winner: ${c.resolution.winner})`)].join("\n");
    if (lq.includes("am-150") || lq.includes("fresh enough")) return "AM-150 (VIN decoder): Jira fresh · SOW fresh · 1 Slack decision 4d old. Safe to spec — no blocking staleness.";
    return knowledge().summary();
  },
});

const economics = (): SectionConfig => ({
  id: "economics",
  name: "Unit Economics",
  prompts: [
    "What's our cost per merged PR?",
    "Which tickets were most expensive and why?",
    "How much did reruns cost?",
  ],
  summary: () => {
    const localPct = Math.round((aggregates.totalLocal / aggregates.totalTokens) * 100);
    return `Cost/merged PR ${fmt$(aggregates.costPerMerged)} · local-model share ${localPct}% · total spend ${fmt$(aggregates.totalCost)}.`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("merged") || lq.includes("per pr")) return `Cost/merged PR: **${fmt$(aggregates.costPerMerged)}** across ${aggregates.mergedCount} merged tickets.`;
    if (lq.includes("expensive") || lq.includes("most")) {
      const ranked = [...ticketEconomics].sort((a, b) => ticketTotalUsd(b) - ticketTotalUsd(a)).slice(0, 4);
      return ["**Most expensive:**", ...ranked.map((t) => {
        const top = [...t.stages].sort((a, b) => (b.cloudUsd + b.localUsd) - (a.cloudUsd + a.localUsd))[0];
        return `• ${t.ticketId} — ${fmt$(ticketTotalUsd(t))} (driver: ${stageLabel[top.stage]} · ${ticketRerunCount(t)} rerun${ticketRerunCount(t) === 1 ? "" : "s"})`;
      })].join("\n");
    }
    if (lq.includes("rerun")) {
      const reruns = ticketEconomics.reduce((a, t) => a + ticketRerunCount(t), 0);
      const cost = ticketEconomics.reduce((a, t) => a + ticketTokenUsd(t) * (ticketRerunCount(t) / 6), 0);
      return `${reruns} reruns this period · estimated rerun cost ~${fmt$(cost)} (≈${Math.round((cost / aggregates.totalCost) * 100)}% of total).`;
    }
    return economics().summary();
  },
});

const incidents = (): SectionConfig => ({
  id: "incidents",
  name: "Incidents",
  prompts: [
    "What's our escape-rate trend?",
    "Which gate lets the most through?",
    "Root-cause the latest incident",
  ],
  summary: () => `Escape rate trending at ~2.1% over last 7d · 1 critical incident open (AM-149 SQL injection).`,
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("root")) return "Latest: AM-149 escaped Dev Review — Code Review missed parameterized-query rule in OfferRepository. Rule re-added to constitution, retroactive scan queued.";
    if (lq.includes("gate")) return "QA Review accounts for **62%** of escapes — selector drift is the largest single cause this period.";
    return "Escape rate: 3.1% → 2.4% → 2.1% over the last 3 weeks. Trending down as Healer coverage rises.";
  },
});

const flow = (): SectionConfig => ({
  id: "flow",
  name: "Flow Analytics",
  prompts: [
    "Where's the human bottleneck?",
    "Which gate is slowest?",
    "Is it humans or agents slowing us down?",
  ],
  summary: () => {
    const slow = [...gateStats].sort((a, b) => b.avgWaitMin - a.avgWaitMin)[0];
    return `Slowest gate: ${slow.gate} (avg ${fmtH(slow.avgWaitMin)}, p95 ${fmtH(slow.p95WaitMin)}) · ${slow.breaches} SLA breach${slow.breaches === 1 ? "" : "es"}.`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("human") || lq.includes("agent")) {
      const totalWait = gateStats.reduce((a, g) => a + g.avgWaitMin, 0);
      const compute = 38; // minutes of agent compute per ticket
      const humanPct = Math.round((totalWait / (totalWait + compute)) * 100);
      return `Per ticket: ~${fmtH(totalWait)} waiting on humans vs ~${compute}m agent compute. **Humans are ${humanPct}%** of cycle time.`;
    }
    const ranked = [...gateStats].sort((a, b) => b.avgWaitMin - a.avgWaitMin);
    return ["**Gates by wait time:**", ...ranked.map((g) => `• ${g.gate} — avg ${fmtH(g.avgWaitMin)} · p95 ${fmtH(g.p95WaitMin)} · ${g.breaches} breach`)].join("\n");
  },
});

const orchestration = (): SectionConfig => ({
  id: "orchestration",
  name: "Orchestration",
  prompts: [
    "Any stuck handoffs?",
    "Which agent API is degraded?",
    "What's the dispatch-latency trend?",
  ],
  summary: () => `All agent APIs healthy · dispatch p50 ~140ms · 0 stuck handoffs · orchestrator (planned) not yet in path.`,
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("degrade")) return "No agent API currently degraded. Highest error rate: Dev agent at 1.2% (within budget).";
    if (lq.includes("stuck")) return "No stuck handoffs in the last 30m. Stale-handoff alert threshold: 5m without ack.";
    return "Dispatch latency over 24h: p50 138ms → 142ms (flat) · p95 410ms · no anomalies.";
  },
});

const comms = (): SectionConfig => ({
  id: "comms",
  name: "Comms & Escalations",
  prompts: [
    "What escalations are open?",
    "Summarize today's digest",
    "What did the agents report this week?",
  ],
  summary: () => {
    const open = unackedOpen().length;
    return `${open} open escalation${open === 1 ? "" : "s"} · ${SCHEDULED.length} scheduled cadences · ${COMMS.length} messages in log.`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("escalation") || lq.includes("open")) {
      const open = ESCALATIONS.filter((e) => e.status === "open");
      return ["**Open escalations:**", ...open.map((e) => `• [${e.severity}] ${e.ticketId} → ${e.routedTo} · ${e.trigger}`)].join("\n");
    }
    if (lq.includes("digest")) {
      const d = SCHEDULED[0];
      return [`**${d.preview.title}**`, ...d.preview.sections.flatMap((s) => [`*${s.heading}*`, ...s.lines.map((l) => `• ${l}`)])].join("\n");
    }
    return `This week: ${COMMS.length} outbound messages (mix of scheduled and threshold). 2 cadences active: daily digest + weekly report.`;
  },
});

const compliance = (): SectionConfig => ({
  id: "compliance",
  name: "Compliance & Audit",
  prompts: [
    "What evidence gaps exist for GDPR?",
    "Show data that left on-prem",
    "Summarize the audit trail for AM-142",
  ],
  summary: () => {
    const localPct = Math.round((aggregates.totalLocal / aggregates.totalTokens) * 100);
    return `${localPct}% on-prem inference · audit chain intact (no hash breaks) · GDPR profile: controls mapped, evidence captured.`;
  },
  answer: (q) => {
    const lq = q.toLowerCase();
    if (lq.includes("gdpr") || lq.includes("gap")) return "GDPR: all 7 mapped controls have evidence. 1 advisory: erasure-request SLA logging is captured but not yet exported in the monthly bundle.";
    if (lq.includes("on-prem") || lq.includes("left")) {
      const cloudPct = Math.round((aggregates.totalCloud / aggregates.totalTokens) * 100);
      return `${cloudPct}% of tokens were processed in cloud (vendor-managed) this period. All cloud calls are logged with model, prompt-version, and content classification.`;
    }
    if (lq.includes("am-142")) return "AM-142 audit trail: 6 entries — BA draft, Spec approval (Zlatko), SA design, Tasks approval, Dev start, current state. Chain valid.";
    return compliance().summary();
  },
});

/* ---------------- registry ---------------- */

export const SECTIONS: Record<SectionId, SectionConfig> = {
  "command-center": commandCenter(),
  pipeline: pipeline(),
  traceability: traceability(),
  agents: agentsSection(),
  observability: observability(),
  approvals: approvalsSection(),
  accountability: accountability(),
  governance: governanceSection(),
  knowledge: knowledge(),
  economics: economics(),
  incidents: incidents(),
  flow: flow(),
  orchestration: orchestration(),
  comms: comms(),
  compliance: compliance(),
};

export function sectionFromPath(pathname: string): SectionId {
  const p = pathname.replace(/\/+$/, "");
  if (p === "" || p === "/") return "command-center";
  if (p.startsWith("/pipeline")) return "pipeline";
  if (p.startsWith("/traceability")) return "traceability";
  if (p.startsWith("/agents")) return "agents";
  if (p.startsWith("/observability")) return "observability";
  if (p.startsWith("/approvals")) return "approvals";
  if (p.startsWith("/pod")) return "accountability";
  if (p.startsWith("/governance")) return "governance";
  if (p.startsWith("/knowledge")) return "knowledge";
  if (p.startsWith("/economics")) return "economics";
  if (p.startsWith("/flow")) return "flow";
  if (p.startsWith("/orchestration")) return "orchestration";
  if (p.startsWith("/comms")) return "comms";
  if (p.startsWith("/compliance")) return "compliance";
  return "command-center";
}

// Single entry-point used by the drawer. Deterministic, mock-grounded.
// TODO: replace with live LLM/RAG endpoint — keep the same signature.
export function getSectionInsight(sectionId: SectionId, prompt: string): string {
  const section = SECTIONS[sectionId];
  if (!section) return "Section not recognized.";
  if (!prompt.trim()) return section.summary();
  return section.answer(prompt);
}
