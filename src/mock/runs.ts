import type { AgentId } from "./types";

export interface RunStep {
  id: string;
  name: string;
  tool?: string;
  durationMs: number;
  tokens?: number;
  input?: string;
  output?: string;
  children?: RunStep[];
}

export interface AgentRun {
  id: string;            // run-AM-142-r3
  ticketId: string;
  startedOffsetMin: number; // mins ago
  durationMs: number;
  tokens: number;
  model: string;
  outcome: "approved" | "rejected" | "error";
  variant?: "Backend" | "Frontend" | "Mobile";
  trace: RunStep[];
}

const tplTrace: Record<AgentId, (ticket: string) => RunStep[]> = {
  curator: (t) => [
    { id: "s1", name: "load project graph",       durationMs: 120, tokens: 0,    output: "47 docs · 12 ADRs" },
    { id: "s2", name: "score relevance for "+t,   durationMs: 380, tokens: 1200, output: "top-12 chunks selected" },
    { id: "s3", name: "compose context.bundle",   durationMs: 220, tokens: 800,  output: "bundle.size = 29.4k tokens" },
  ],
  ba: (t) => [
    { id: "s1", name: "read curated context",     tool: "fs.read",      durationMs: 90,  tokens: 0 },
    { id: "s2", name: "draft user stories",       durationMs: 4200, tokens: 3800, output: "3 personas · 6 stories" },
    { id: "s3", name: "derive acceptance criteria", durationMs: 3100, tokens: 2900, output: "5 ACs · 1 perf budget" },
    { id: "s4", name: "render spec.md",           tool: "fs.write",     durationMs: 60,  tokens: 0,    output: `wrote spec/${t}.md` },
  ],
  sa: (t) => [
    { id: "s1", name: "load spec.md + ADRs",      tool: "fs.read",      durationMs: 110, tokens: 0 },
    { id: "s2", name: "explore data model",       tool: "pg.introspect",durationMs: 640, tokens: 0,    output: "12 tables touched" },
    { id: "s3", name: "draft endpoint contract",  durationMs: 5800, tokens: 5200, output: "4 endpoints · cursor pagination" },
    { id: "s4", name: "render architecture.md",         tool: "fs.write",     durationMs: 80,  tokens: 0,    output: `wrote architecture/${t}.md` },
  ],
  tasklist: (t) => [
    { id: "s1", name: "parse architecture.md",          durationMs: 220, tokens: 600 },
    { id: "s2", name: "split into sub-tasks",     durationMs: 2400, tokens: 2200, output: `${t}-T1 … ${t}-T8` },
    { id: "s3", name: "infer dependencies",       durationMs: 480, tokens: 700 },
    { id: "s4", name: "emit tasks.json",          tool: "fs.write",     durationMs: 60,  tokens: 0 },
  ],
  dev: (t) => [
    { id: "s1", name: "checkout branch",          tool: "git.checkout", durationMs: 320,  tokens: 0,     output: `feature/${t.toLowerCase()}` },
    { id: "s2", name: "scaffold module",          durationMs: 18_400, tokens: 6400, output: "router.py · schemas.py · repository.py" },
    { id: "s3", name: "implement endpoint logic", durationMs: 42_000, tokens: 18_200, output: "SQLAlchemy + pydantic · 482 lines" },
    { id: "s4", name: "write unit tests",         durationMs: 12_600, tokens: 7800, output: "11 tests · pytest" },
    { id: "s5", name: "run tests in Docker",      tool: "docker.run",   durationMs: 31_000, tokens: 0,     output: "11/11 green" },
    { id: "s6", name: "open PR",                  tool: "gh.pr.create", durationMs: 1100,  tokens: 0,     output: "#441" },
  ],
  review: (t) => [
    { id: "s1", name: "fetch PR diff",            tool: "gh.pr.diff",   durationMs: 380,  tokens: 0 },
    { id: "s2", name: "static analysis",          tool: "ruff+semgrep", durationMs: 4200, tokens: 0,    output: "2 findings" },
    { id: "s3", name: "LLM review pass",          durationMs: 14_800, tokens: 9200, output: "3 minor · 1 blocker (sql)" },
    { id: "s4", name: "emit review.md",           tool: "fs.write",     durationMs: 80,   tokens: 0, output: `review/${t}.md` },
  ],
  qa: (t) => [
    { id: "s1", name: "read requirements",        tool: "fs.read",      durationMs: 110, tokens: 0 },
    { id: "s2", name: "draft test plan",          durationMs: 3400, tokens: 2400, output: "12 scenarios" },
    { id: "s3", name: "generate Playwright spec", tool: "playwright.mcp", durationMs: 8800, tokens: 5200, output: `e2e/${t.toLowerCase()}.spec.ts` },
    { id: "s4", name: "run in Docker",            tool: "docker.run",   durationMs: 197_000, tokens: 0, output: "22/24 pass · 2 fail" },
    { id: "s5", name: "Healer · selector drift",  tool: "qa.healer",    durationMs: 9400, tokens: 1800, output: "repaired 2 selectors", children: [
      { id: "s5a", name: "diff DOM snapshot",       durationMs: 320, tokens: 0 },
      { id: "s5b", name: "propose new selector",    durationMs: 1100, tokens: 800, output: '[data-testid="filter-bar"]' },
      { id: "s5c", name: "re-run failing tests",    tool: "playwright.mcp", durationMs: 7800, tokens: 0, output: "2/2 green" },
    ]},
    { id: "s6", name: "analyse + file bugs",      durationMs: 2800, tokens: 1900, output: `${t}-QA-1, ${t}-QA-2` },
  ],
  pm: (t) => [
    { id: "s1", name: "scan pipeline state",      durationMs: 80, tokens: 0,   output: "16 tickets · 5 gates" },
    { id: "s2", name: "rebalance queue",          durationMs: 220, tokens: 600, output: `promoted ${t}` },
    { id: "s3", name: "notify approvers",         tool: "slack.post",  durationMs: 410, tokens: 0 },
  ],
};

const MODELS: Record<AgentId, string[]> = {
  curator: ["Qwen-2.5-7B (local)"],
  ba:      ["claude-sonnet-4", "gpt-5-mini"],
  sa:      ["claude-sonnet-4"],
  tasklist:["claude-sonnet-4", "Qwen-2.5-32B (local)"],
  dev:     ["claude-sonnet-4 (Code)"],
  review:  ["claude-sonnet-4", "gpt-5-mini"],
  qa:      ["claude-sonnet-4 (Code)"],
  pm:      ["gpt-5-mini"],
};

// deterministic per-agent runs
export function buildRuns(agentId: AgentId): AgentRun[] {
  const tickets = ["AM-142","AM-150","AM-138","AM-131","AM-149","AM-140","AM-147","AM-145","AM-141","AM-133","AM-128","AM-144"];
  const variants: AgentRun["variant"][] = ["Backend","Frontend","Mobile"];
  return tickets.map((tid, i) => {
    const seed = (i * 17 + agentId.charCodeAt(0)) % 100;
    const outcome: AgentRun["outcome"] =
      seed < 10 ? "error" : seed < 28 ? "rejected" : "approved";
    return {
      id: `run-${tid}-r${(seed % 4) + 1}`,
      ticketId: tid,
      startedOffsetMin: i * 26 + (seed % 17) + 4,
      durationMs: 8_000 + seed * 1_400 + (agentId === "dev" ? 60_000 : agentId === "qa" ? 40_000 : 0),
      tokens: 1_200 + seed * 280 + (agentId === "dev" ? 8_000 : 0),
      model: MODELS[agentId][seed % MODELS[agentId].length],
      outcome,
      variant: agentId === "dev" ? variants[i % 3] : undefined,
      trace: tplTrace[agentId](tid),
    };
  });
}

/* ---- chart series (deterministic) ---- */

const noise = (i: number, seed: number) =>
  Math.sin(i * 0.7 + seed) * 0.5 + Math.cos(i * 1.3 + seed * 2) * 0.3;

export function invocationsSeries(agentId: AgentId, n = 24) {
  const base = { ba: 18, sa: 12, tasklist: 9, dev: 7, review: 14, qa: 11, curator: 26, pm: 32 }[agentId] ?? 10;
  return Array.from({ length: n }, (_, i) => ({
    h: `${String(i).padStart(2, "0")}:00`,
    runs: Math.max(0, Math.round(base + noise(i, agentId.charCodeAt(0)) * base * 0.6)),
  }));
}

export function acceptanceSeries(agentId: AgentId, n = 14) {
  const base = { ba: 88, sa: 82, tasklist: 91, dev: 76, review: 84, qa: 71, curator: 94, pm: 96 }[agentId] ?? 85;
  return Array.from({ length: n }, (_, i) => {
    const accept = Math.max(50, Math.min(99, Math.round(base + noise(i, agentId.charCodeAt(1) ?? 1) * 12)));
    return { day: `d-${n - i}`, accepted: accept, rejected: 100 - accept };
  });
}

export function latencyHistogram(agentId: AgentId) {
  const buckets = agentId === "dev"
    ? ["<30s","30-60s","1-2m","2-5m","5-10m","10m+"]
    : agentId === "qa"
    ? ["<10s","10-30s","30-60s","1-3m","3-10m","10m+"]
    : ["<1s","1-3s","3-10s","10-30s","30-60s","60s+"];
  return buckets.map((b, i) => ({
    bucket: b,
    count: Math.max(1, Math.round(20 + noise(i, agentId.charCodeAt(0)) * 18 + (i === 2 ? 12 : 0))),
  }));
}

export function tokenCostSeries(agentId: AgentId, n = 14) {
  const cloudBase = { ba: 9.4, sa: 12.7, tasklist: 3.1, dev: 38.6, review: 6.8, qa: 18.9, curator: 0.0, pm: 2.1 }[agentId] ?? 4;
  const localBase = { curator: 1.42, tasklist: 0.8 }[agentId as "curator"|"tasklist"] ?? 0.2;
  return Array.from({ length: n }, (_, i) => {
    const j = noise(i, agentId.charCodeAt(0));
    return {
      day: `d-${n - i}`,
      cloud: +(Math.max(0, cloudBase + j * cloudBase * 0.3)).toFixed(2),
      local: +(Math.max(0, localBase + j * localBase * 0.5)).toFixed(2),
    };
  });
}

export function overnightHistory() {
  return Array.from({ length: 10 }, (_, i) => {
    const seed = i * 13;
    const tickets = 3 + ((seed) % 5);
    const prs = Math.max(1, tickets - (seed % 2));
    const tests = 80 + (seed % 18);
    return {
      night: `night-${10 - i}`,
      tickets,
      prs,
      testsPass: `${tests}%`,
      healerFixes: (seed % 4),
      gpuHours: +(2 + (seed % 6) * 0.4).toFixed(1),
    };
  });
}
