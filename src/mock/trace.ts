import type { AgentId, Ticket } from "./types";
import { tickets as seedTickets } from "./tickets";

export type TraceStatus = "approved" | "rejected-then-fixed" | "pending" | "not-yet-reached";
export type ArtifactKind = "context" | "spec" | "design" | "tasks" | "code" | "review" | "qa";

export interface TraceNode {
  kind: ArtifactKind;
  agent: AgentId;
  artifact: string;       // e.g. spec.md
  version: string;        // v1, v3
  status: TraceStatus;
  approver?: string;
  approvedAtOffsetMin?: number; // minutes ago
  producedAtOffsetMin: number;  // minutes ago
  reject?: {
    reason: string;
    fixedAs: string;       // new version label e.g. v2
    feedback: string[];
  };
}

const stageOrder = [
  "backlog","ready-spec","spec-review","ready-design","design-review",
  "ready-tasks","tasks-review","ready-dev","dev-review","ready-qa","qa-review","done",
];

function reachedThrough(ticket: Ticket): ArtifactKind[] {
  const idx = stageOrder.indexOf(ticket.stage);
  const out: ArtifactKind[] = ["context"];
  // context always exists once a ticket is picked up
  if (idx >= stageOrder.indexOf("ready-spec")) out.push("spec");
  if (idx >= stageOrder.indexOf("ready-design")) out.push("design");
  if (idx >= stageOrder.indexOf("ready-tasks")) out.push("tasks");
  if (idx >= stageOrder.indexOf("ready-dev")) out.push("code");
  if (idx >= stageOrder.indexOf("dev-review")) out.push("review");
  if (idx >= stageOrder.indexOf("ready-qa")) out.push("qa");
  return out;
}

const APPROVERS = ["Zlatko", "Marin", "Iva", "Ana", "Petar"];
const pickApprover = (i: number) => APPROVERS[i % APPROVERS.length];

const KIND_META: Record<ArtifactKind, { agent: AgentId; label: string; file: string }> = {
  context: { agent: "curator",  label: "Curated context",  file: "context.bundle" },
  spec:    { agent: "ba",       label: "Business spec",     file: "spec.md" },
  design:  { agent: "sa",       label: "Solution design",   file: "design.md" },
  tasks:   { agent: "tasklist", label: "Task breakdown",    file: "tasks.json" },
  code:    { agent: "dev",      label: "Code + PR",         file: "PR" },
  review:  { agent: "review",   label: "Code review",       file: "review.md" },
  qa:      { agent: "qa",       label: "QA report",         file: "qa.report" },
};

export function buildLineage(ticket: Ticket): TraceNode[] {
  const reached = reachedThrough(ticket);
  const all: ArtifactKind[] = ["context", "spec", "design", "tasks", "code", "review", "qa"];

  // create deterministic per-ticket "noise" based on id
  const seed = ticket.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  return all.map((kind, idx) => {
    const meta = KIND_META[kind];
    const wasReached = reached.includes(kind);
    const isLastReached = wasReached && kind === reached[reached.length - 1];

    const producedAtOffsetMin = 60 * (reached.length - reached.indexOf(kind)) + (seed % 17) + idx * 8;

    if (!wasReached) {
      return {
        kind, agent: meta.agent, artifact: meta.file, version: "-",
        status: "not-yet-reached" as const,
        producedAtOffsetMin: 0,
      };
    }

    // versioning: rerunCount affects spec/design (where rejection happens commonly)
    const rerun = ticket.rerunCount ?? 0;
    let version = "v1";
    let reject: TraceNode["reject"] | undefined;

    if (rerun > 0 && (kind === "spec" || kind === "design")) {
      version = `v${rerun + 1}`;
      reject = {
        reason:
          kind === "spec"
            ? "Acceptance criteria too loose · success metric missing"
            : "API contract incomplete · caching concern not addressed",
        fixedAs: version,
        feedback:
          kind === "spec"
            ? [
                "Add measurable AC for filter performance (<200ms p95)",
                "Define empty-state and zero-results behaviour",
                "Clarify pagination contract (cursor vs offset)",
              ]
            : [
                "Split caching concern into a dedicated ADR",
                "Specify rate-limit per endpoint",
                "Document failure modes for downstream services",
              ],
      };
    } else if (kind === "spec" && ticket.id === "AM-142") {
      version = "v3";
    } else if (kind === "design" && ticket.id === "AM-142") {
      version = "v2";
    } else if (kind === "tasks") {
      version = "v1";
    }

    const status: TraceStatus = isLastReached
      ? (ticket.state === "approved" ? "approved" : "pending")
      : reject
        ? "rejected-then-fixed"
        : "approved";

    const approver = status === "pending"
      ? undefined
      : ticket.approver ?? pickApprover(idx);

    return {
      kind, agent: meta.agent, artifact: meta.file, version,
      status,
      approver,
      approvedAtOffsetMin: status === "approved" || status === "rejected-then-fixed"
        ? producedAtOffsetMin - 12 - (seed % 10)
        : undefined,
      producedAtOffsetMin,
      reject,
    };
  });
}

// ---- realistic artifact bodies ----

export interface ArtifactPreview {
  kind: ArtifactKind;
  ticket: Ticket;
}

export function specMd(t: Ticket): string {
  const title = t.title;
  return `# ${t.id} · ${title}

> Owner: ${t.approver}  ·  Codebase: ${t.codebase}  ·  Priority: ${t.priority}

## Problem
Users browsing AutoMarket need to ${title.toLowerCase()} with predictable performance and clear feedback states.

## User stories
- As a **buyer**, I can ${title.toLowerCase()} so that I find relevant listings in <2 clicks.
- As a **seller**, I see analytics on how often my listing surfaces in ${title.toLowerCase()} flows.
- As an **admin**, I can audit ${title.toLowerCase()} usage for fraud signals.

## Acceptance criteria
- [ ] Endpoint **p95 latency < 200ms** under 50 RPS sustained load.
- [ ] Empty state renders \`<EmptyListingsHint />\` with CTA to broaden filters.
- [ ] Pagination uses **cursor** (\`?after=...\`) - never offset.
- [ ] Mobile (Flutter BLoC) consumes the same contract via \`${t.codebase === "mobile" ? "ListingsBloc" : "ListingsRepository"}\`.
- [ ] Telemetry: emit \`listing.${t.id.toLowerCase()}.invoked\` with payload size & duration.

## Non-goals
- No re-ranking ML in this iteration.
- No saved-search persistence - covered by AM-147.
`;
}

export function designMd(t: Ticket): { md: string; endpoints: Array<{ method: string; path: string; auth: string; notes: string }>; table: Array<{ column: string; type: string; notes: string }> } {
  const version = (t.rerunCount ?? 0) + 1;
  // The full design document the SA gate review renders (C4 - design twin
  // of the BA spec review). Sections are `## ` so the outline + scroll-nav
  // derive automatically; endpoint/column data is mirrored as bullets so a
  // simple markdown renderer shows it faithfully.
  const endpoints = [
    { method: "GET",  path: `/api/v1/listings/search`,             auth: "session+anon", notes: "primary search endpoint" },
    { method: "GET",  path: `/api/v1/listings/{listing_id}`,       auth: "session+anon", notes: "detail view (304-able)" },
    { method: "POST", path: `/api/v1/listings/{listing_id}/save`,  auth: "session",      notes: "save to user shortlist" },
    { method: "GET",  path: `/api/v1/listings/facets`,             auth: "anon",         notes: "filter values + counts" },
  ];
  const table = [
    { column: "listing_id",   type: "uuid PK",       notes: "indexed" },
    { column: "seller_id",    type: "uuid FK",       notes: "→ users(user_id)" },
    { column: "vin",          type: "char(17)",      notes: "unique partial idx" },
    { column: "price_cents",  type: "bigint",        notes: "stored in cents" },
    { column: "search_vector",type: "tsvector",      notes: "GIN index" },
    { column: "created_at",   type: "timestamptz",   notes: "default now()" },
  ];
  return {
    md: `# Design · ${t.id} · ${t.title}

> design.md@v${version} · produced by SA Agent · consumes spec.md@v2 · contract v0.5

## Approach
Server-side filtering in FastAPI, exposed via a typed REST contract. Next.js consumes via a React Query hook; Flutter consumes via a generated Dio client wrapped in a BLoC. The design covers every acceptance criterion of the approved spec - the coverage map below is checked deterministically (D1).

## Architecture & components
- \`search-api\` (FastAPI router) - entry point; consumes the typed contract.
- \`query-builder\` - translates filter params onto \`listings_search_idx\`; consumed by search-api.
- \`pagination-util\` (shared) - cursor encode/decode; consumed by search-api and the web hook.
- \`web/useListingSearch\` (React Query) - consumes search-api; renders results + filters.
- \`mobile/ListingsBloc\` (Dio) - consumes search-api; same contract, no fork.

## API contract
${endpoints.map((e) => `- \`${e.method} ${e.path}\` - auth: ${e.auth} - ${e.notes}`).join("\n")}

All four endpoints declare request/response schemas in the typed contract; error envelopes follow the platform standard (D2).

## Data model
${table.map((c) => `- \`${c.column}\` · ${c.type} - ${c.notes}`).join("\n")}

One foreign key (\`seller_id → users.user_id\`); no dangling references (D3).

## NFR budgets
Spec bound: p95 < 200ms under 50 RPS (AC-1). Decomposition: edge 15ms + API 25ms + query 110ms + serialize 30ms = **180ms budget** - 20ms headroom (D6).

## Failure modes & fallbacks
- Postgres search: 250ms statement timeout → cached facet fallback + degraded-results banner.
- Redis rate-limiter: 50ms timeout → fail-open with per-pod alarm (never blocks reads).

## Constraints
- Re-use \`listings_search_idx\` (GIN on tsvector + btree on price, year).
- Honour the cursor pagination contract from \`spec.md\`.
- Rate limited at 30 req/min per session (Redis token-bucket).

## Decisions
Three decision records accompany this design - chosen option, alternatives and rationale render in the review's Decision-records block; one is marked Low-confidence and is surfaced for human attention.
`,
    endpoints,
    table,
  };
}

export function tasksJson(t: Ticket) {
  return {
    ticket: t.id,
    epic: t.title,
    estimateTotal: 18,
    tasks: [
      { id: `${t.id}-T1`, title: "Add SQLAlchemy model + Alembic migration", agent: "Dev (Backend)", points: 2, depends: [] },
      { id: `${t.id}-T2`, title: "Implement FastAPI router & pydantic schemas", agent: "Dev (Backend)", points: 3, depends: [`${t.id}-T1`] },
      { id: `${t.id}-T3`, title: "Cursor pagination helper (shared util)", agent: "Dev (Backend)", points: 2, depends: [] },
      { id: `${t.id}-T4`, title: "React Query hook useListingSearch()", agent: "Dev (Web)", points: 2, depends: [`${t.id}-T2`] },
      { id: `${t.id}-T5`, title: "<ListingResults /> + <FilterBar /> components", agent: "Dev (Web)", points: 3, depends: [`${t.id}-T4`] },
      { id: `${t.id}-T6`, title: "Flutter ListingsBloc + Dio client wiring", agent: "Dev (Mobile)", points: 3, depends: [`${t.id}-T2`] },
      { id: `${t.id}-T7`, title: "Telemetry + tracing spans", agent: "Dev (Backend)", points: 1, depends: [`${t.id}-T2`] },
      { id: `${t.id}-T8`, title: "Playwright + Patrol coverage (12 scenarios)", agent: "QA", points: 2, depends: [`${t.id}-T5`, `${t.id}-T6`] },
    ],
  };
}

export function prCard(t: Ticket) {
  const slug = t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    branch: `feature/${t.id.toLowerCase()}-${slug}`,
    pr: `#${440 + (t.id.charCodeAt(t.id.length - 1) % 30)}`,
    title: `${t.id}: ${t.title}`,
    filesChanged: 14,
    additions: 482,
    deletions: 67,
    files: [
      { path: "backend/app/listings/router.py",            kind: "+" },
      { path: "backend/app/listings/schemas.py",           kind: "+" },
      { path: "backend/app/listings/repository.py",        kind: "~" },
      { path: "backend/alembic/versions/2026_05_30_b3.py", kind: "+" },
      { path: "web/src/features/listings/useListingSearch.ts", kind: "+" },
      { path: "web/src/features/listings/ListingResults.tsx",  kind: "+" },
      { path: "web/src/features/listings/FilterBar.tsx",       kind: "~" },
      { path: "mobile/lib/features/listings/listings_bloc.dart", kind: "+" },
    ],
    checks: [
      { name: "backend · pytest",       state: "pass" as const, dur: "1m 42s" },
      { name: "backend · mypy",         state: "pass" as const, dur: "11s" },
      { name: "web · vitest",           state: "pass" as const, dur: "38s" },
      { name: "web · typecheck",        state: "pass" as const, dur: "22s" },
      { name: "mobile · flutter test",  state: "pass" as const, dur: "1m 04s" },
      { name: "playwright · e2e",       state: "pass" as const, dur: "3m 17s" },
    ],
  };
}

export function reviewReport(t: Ticket) {
  return [
    { severity: "blocker" as const, file: "backend/app/listings/repository.py", line: 84,  msg: "Raw string concatenation in dynamic order_by - SQL injection risk via ?sort param." },
    { severity: "major"   as const, file: "backend/app/listings/router.py",     line: 31,  msg: "Missing rate-limit decorator - design.md requires 30 req/min." },
    { severity: "minor"   as const, file: "web/src/features/listings/FilterBar.tsx", line: 142, msg: "Debounce hook recreated every render; memoise input handler." },
    { severity: "minor"   as const, file: "mobile/lib/features/listings/listings_bloc.dart", line: 67, msg: "Equatable props missing `cursor`; will mis-trigger BlocBuilder rebuilds." },
    { severity: "info"    as const, file: "backend/app/listings/schemas.py",    line: 22,  msg: `Consider extracting Filter model - reused by ${t.id} and AM-147.` },
  ];
}

/**
 * The full qa-report document the QA gate review renders (C4 - QA twin of
 * the spec/design reviews). Built FROM qaReport(t)'s data so the review,
 * Traceability and the artifact shelf stay one source of truth.
 */
export function qaReportMd(t: Ticket): string {
  const r = qaReport(t);
  const failed = r.tests.filter((x) => x.state === "fail");
  const healed = r.tests.filter((x) => x.note?.includes("Healer"));
  return `# QA report · ${t.id} · ${t.title}

> qa-report@v1 · produced by QA Agent · verifies PR #421 against spec.md@v2 · suite \`${r.suite}\`

## Summary
${r.passed}/${r.total} tests pass in ${Math.round(r.durationMs / 1000)}s. ${failed.length} failures - both filed as defects below. Recommendation: **HOLD** until QA-1 is fixed; QA-2 can ride the next train.

## Scope & environments
- Suites: web (Playwright) · mobile (Patrol) · api (pytest) - all three executed.
- Environment matrix: chrome + safari × iOS + Android - 4/4 cells run.

## Results by suite
${r.tests.map((x) => `- ${x.state === "pass" ? "✓" : "✗"} ${x.name} · ${x.ms}ms${x.note ? ` - ${x.note}` : ""}`).join("\n")}

## Performance vs budget
AC-1 bound: p95 < 200ms under 50 RPS. Measured: k6 soak, 50 RPS × 10min - **p95 174ms** (26ms headroom). Evidence attached to the run.

## Flaky & quarantined
${healed.length} selector drift auto-repaired by the Healer (recorded, not skipped). 0 tests quarantined.

## Defects
${r.bugsFiled.map((b) => `- ${b}`).join("\n")}

Each defect carries a suspected root-cause stage in the Defects block of this review - a reject from this gate can target that stage directly.

## Recommendation
**HOLD** - ship after QA-1 (missing Retry-After header) is fixed and re-verified. The failing contract behaviour traces upstream; see the defect's root-cause line.
`;
}

export function qaReport(t: Ticket) {
  return {
    suite: `e2e/${t.id.toLowerCase()}.spec.ts`,
    total: 24,
    passed: 22,
    failed: 2,
    healed: 2,
    durationMs: 197_000,
    tests: [
      { name: "shows empty state when filters yield zero results", state: "pass" as const, ms: 1840 },
      { name: "applies price range filter and updates URL",        state: "pass" as const, ms: 2210 },
      { name: "honours cursor pagination across 5 pages",          state: "pass" as const, ms: 6420 },
      { name: "mobile: BLoC emits Loading → Success",              state: "pass" as const, ms: 3110 },
      { name: "respects rate-limit headers on 429",                state: "fail" as const, ms: 4012, note: "expected Retry-After header missing" },
      { name: "telemetry event fires once per query",              state: "fail" as const, ms: 1980, note: "duplicate event under StrictMode" },
      { name: "filter bar resets to defaults on logo click",       state: "pass" as const, ms: 1502, note: "Healer repaired selector drift" },
      { name: "results announced to screen-reader (aria-live)",    state: "pass" as const, ms: 1310 },
    ],
    bugsFiled: [`${t.id}-QA-1 missing Retry-After header`, `${t.id}-QA-2 duplicate telemetry under StrictMode`],
  };
}

export { seedTickets };
