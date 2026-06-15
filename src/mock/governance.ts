import type { AgentId, Codebase } from "./types";

export type CbId = Codebase;

export interface Constitution {
  cb: CbId;
  name: string;
  stack: string;
  version: string;
  status: "DRAFT" | "ACTIVE";
  author: string;
  lastModified: number;
  compliance: number; // 0-100
  rules: { id: string; rule: string; rationale: string }[];
  history: ConstitutionVersion[];
}

export interface ConstitutionVersion {
  version: string;
  ts: number;
  by: string; // human or agent
  byKind: "human" | "agent";
  summary: string;
  diff: { kind: "+" | "-" | "~"; line: string }[];
}

const day = 86_400_000;
const now = Date.now();

export const constitutions: Constitution[] = [
  {
    cb: "backend",
    name: "Backend Constitution",
    stack: "Python · FastAPI",
    version: "v1.4.2",
    status: "ACTIVE",
    author: "BA Agent",
    lastModified: now - 2 * day,
    compliance: 86,
    rules: [
      { id: "be.repo",  rule: "All DB access via repositories - no raw SQL in services",       rationale: "Testability, swap engine" },
      { id: "be.types", rule: "No `Any` without inline justification comment",                  rationale: "Static guarantees" },
      { id: "be.cov",   rule: "pytest coverage ≥ 80% (unit + integration)",                    rationale: "Regression safety" },
      { id: "be.fat",   rule: "Endpoint handler ≤ 20 lines; delegate to service",              rationale: "Thin transport layer" },
      { id: "be.model", rule: "No business logic in SQLAlchemy models",                        rationale: "Anemic models on purpose" },
      { id: "be.sec",   rule: "No hardcoded secrets - `Settings` via pydantic-settings only",  rationale: "12-factor / rotation" },
      { id: "be.async", rule: "All IO must be async (async SQLAlchemy, httpx)",                rationale: "Throughput on FastAPI" },
    ],
    history: [
      { version: "v1.4.2", ts: now - 2*day, by: "BA Agent", byKind: "agent", summary: "Tightened endpoint length rule (was 30 → 20).", diff: [
        { kind: "-", line: "Endpoint handler ≤ 30 lines" },
        { kind: "+", line: "Endpoint handler ≤ 20 lines; delegate to service" },
      ]},
      { version: "v1.4.1", ts: now - 9*day, by: "Marin Crnković", byKind: "human", summary: "Added async-IO rule after p95 latency review.", diff: [
        { kind: "+", line: "All IO must be async (async SQLAlchemy, httpx)" },
      ]},
      { version: "v1.4.0", ts: now - 21*day, by: "BA Agent", byKind: "agent", summary: "Coverage threshold raised 75% → 80%.", diff: [
        { kind: "~", line: "pytest coverage ≥ 75% → ≥ 80%" },
      ]},
    ],
  },
  {
    cb: "web",
    name: "Web Constitution",
    stack: "Next.js · TS",
    version: "v0.9.1",
    status: "DRAFT",
    author: "BA Agent",
    lastModified: now - 18 * 3600_000,
    compliance: 72,
    rules: [
      { id: "we.case",  rule: "PascalCase components · kebab-case routes",                  rationale: "Convention" },
      { id: "we.app",   rule: "App Router only - no pages/ directory",                       rationale: "Server-first" },
      { id: "we.act",   rule: "Mutations via Server Actions; never client fetch + POST",     rationale: "Type-safe, progressive" },
      { id: "we.zod",   rule: "All inputs validated with zod at the boundary",               rationale: "Runtime safety" },
      { id: "we.tok",   rule: "Use Tailwind tokens - no raw hex / arbitrary colors",         rationale: "Design system" },
      { id: "we.cov",   rule: "vitest coverage ≥ 70%",                                       rationale: "Regression safety" },
      { id: "we.l10n",  rule: "All user-facing strings via next-intl",                       rationale: "Multi-market" },
    ],
    history: [
      { version: "v0.9.1", ts: now - 18*3600_000, by: "BA Agent", byKind: "agent", summary: "Forbid raw hex; require tokens.", diff: [
        { kind: "+", line: "Use Tailwind tokens - no raw hex / arbitrary colors" },
      ]},
      { version: "v0.9.0", ts: now - 6*day, by: "Ana Kovač", byKind: "human", summary: "Initial Web constitution draft.", diff: [
        { kind: "+", line: "App Router only" }, { kind: "+", line: "Mutations via Server Actions" },
      ]},
    ],
  },
  {
    cb: "mobile",
    name: "Mobile Constitution",
    stack: "Flutter · Dart",
    version: "v1.1.0",
    status: "ACTIVE",
    author: "BA Agent",
    lastModified: now - 4 * day,
    compliance: 91,
    rules: [
      { id: "mo.bloc",  rule: "BLoC for state - no setState in feature widgets",        rationale: "Testable state" },
      { id: "mo.route", rule: "Routing via go_router only",                              rationale: "Deep-link parity" },
      { id: "mo.feat",  rule: "Feature-first folder layout (feature/{x}/data|domain|ui)", rationale: "Modularity" },
      { id: "mo.gold",  rule: "Golden tests for every screen",                          rationale: "Visual regression" },
      { id: "mo.print", rule: "No `print()` in committed code - use logger",            rationale: "Prod hygiene" },
      { id: "mo.cov",   rule: "dart test coverage ≥ 75%",                                rationale: "Regression safety" },
    ],
    history: [
      { version: "v1.1.0", ts: now - 4*day, by: "BA Agent", byKind: "agent", summary: "Added golden-test mandate.", diff: [
        { kind: "+", line: "Golden tests for every screen" },
      ]},
      { version: "v1.0.0", ts: now - 30*day, by: "Petra Novak", byKind: "human", summary: "First active version.", diff: [
        { kind: "+", line: "BLoC for state" }, { kind: "+", line: "go_router only" },
      ]},
    ],
  },
];

export type Severity = "blocker" | "high" | "medium" | "low";
export type ViolationStatus = "open" | "waived" | "fixed";

export interface Violation {
  id: string;
  ruleId: string;
  rule: string;
  severity: Severity;
  cb: CbId;
  ticketId: string;
  agent: AgentId;
  artifact: string;
  status: ViolationStatus;
  detectedAt: number;
  note?: string;
}

export const violations: Violation[] = [
  { id: "v-001", ruleId: "be.repo",  rule: "Raw SQL in VinDecoderService (should go through VinRepository)",       severity: "high",    cb: "backend", ticketId: "AM-150", agent: "dev",    artifact: "services/vin_decoder.py", status: "open",   detectedAt: now - 2*3600_000 },
  { id: "v-002", ruleId: "be.cov",   rule: "Coverage 74% < 80% threshold (offer/escrow flow)",                     severity: "blocker", cb: "backend", ticketId: "AM-149", agent: "qa",     artifact: "tests/test_escrow.py",     status: "open",   detectedAt: now - 70*60_000 },
  { id: "v-003", ruleId: "be.fat",   rule: "Endpoint POST /messages is 34 lines (>20) - extract to service",        severity: "medium",  cb: "backend", ticketId: "AM-138", agent: "dev",    artifact: "api/messages.py",          status: "open",   detectedAt: now - 40*60_000 },
  { id: "v-004", ruleId: "be.types", rule: "Untyped `Any` in fraud_signals.score() with no justification",          severity: "medium",  cb: "backend", ticketId: "AM-140", agent: "sa",     artifact: "design.md §3",             status: "waived", note: "Score is open-schema until v2", detectedAt: now - 6*3600_000 },
  { id: "v-005", ruleId: "be.model", rule: "Listing model contains pricing logic - move to PricingService",         severity: "high",    cb: "backend", ticketId: "AM-141", agent: "sa",     artifact: "models/listing.py",        status: "open",   detectedAt: now - 90*60_000 },
  { id: "v-006", ruleId: "be.sec",   rule: "Hardcoded SENDGRID_API_KEY literal in notifications module",            severity: "blocker", cb: "backend", ticketId: "AM-145", agent: "dev",    artifact: "notify/email.py",          status: "fixed",  detectedAt: now - 26*3600_000 },
  { id: "v-007", ruleId: "we.tok",   rule: "Raw hex #1f1f1f in ListingCard - use `bg-surface` token",               severity: "low",     cb: "web",     ticketId: "AM-136", agent: "dev",    artifact: "components/ListingCard.tsx", status: "fixed", detectedAt: now - 18*3600_000 },
  { id: "v-008", ruleId: "we.act",   rule: "Client-side fetch POST in SavedSearches - convert to server action",    severity: "high",    cb: "web",     ticketId: "AM-147", agent: "dev",    artifact: "app/(app)/searches/page.tsx", status: "open", detectedAt: now - 25*60_000 },
  { id: "v-009", ruleId: "we.l10n",  rule: "Hardcoded English string 'Save changes' in SearchBar (not in l10n)",    severity: "medium",  cb: "web",     ticketId: "AM-128", agent: "dev",    artifact: "components/SearchBar.tsx", status: "open",   detectedAt: now - 22*60_000 },
  { id: "v-010", ruleId: "we.cov",   rule: "vitest coverage 64% < 70% (saved-searches feature)",                    severity: "high",    cb: "web",     ticketId: "AM-147", agent: "qa",     artifact: "tests/searches.test.ts",   status: "open",   detectedAt: now - 50*60_000 },
  { id: "v-011", ruleId: "mo.print", rule: "`print()` left in onboarding_bloc.dart line 184",                       severity: "medium",  cb: "mobile",  ticketId: "AM-130", agent: "dev",    artifact: "features/onboarding/onboarding_bloc.dart", status: "open", detectedAt: now - 110*60_000 },
  { id: "v-012", ruleId: "mo.gold",  rule: "No golden test for PushPrefs screen",                                   severity: "medium",  cb: "mobile",  ticketId: "AM-145", agent: "qa",     artifact: "test/golden/push_prefs_test.dart", status: "waived", note: "Screen is a flag-gated experiment", detectedAt: now - 4*3600_000 },
  { id: "v-013", ruleId: "mo.route", rule: "Navigator.push used instead of go_router in test-drive flow",           severity: "low",     cb: "mobile",  ticketId: "AM-135", agent: "dev",    artifact: "features/test_drive/router.dart", status: "open", detectedAt: now - 18*3600_000 },
];

export type GateStatus = "pass" | "fail" | "skip";
export interface GateCheck { name: string; status: GateStatus; detail?: string }

export interface PrGate {
  prId: string;
  ticketId: string;
  cb: CbId;
  title: string;
  author: AgentId;
  checks: GateCheck[];
}

export const prGates: PrGate[] = [
  { prId: "PR-#412", ticketId: "AM-150", cb: "backend", title: "feat(vin): decoder service", author: "dev", checks: [
    { name: "ruff check",          status: "pass" },
    { name: "mypy --strict",       status: "pass" },
    { name: "pytest unit",         status: "pass", detail: "184 passed" },
    { name: "pytest integration",  status: "fail", detail: "1 failed · escrow.test_refund" },
    { name: "coverage ≥ 80%",      status: "fail", detail: "74%" },
  ]},
  { prId: "PR-#410", ticketId: "AM-149", cb: "backend", title: "feat(escrow): offer flow",   author: "dev", checks: [
    { name: "ruff check",          status: "pass" },
    { name: "mypy --strict",       status: "fail", detail: "3 errors in services/escrow.py" },
    { name: "pytest unit",         status: "pass" },
    { name: "pytest integration",  status: "pass" },
    { name: "coverage ≥ 80%",      status: "pass", detail: "83%" },
  ]},
  { prId: "PR-#408", ticketId: "AM-147", cb: "web", title: "feat(web): saved searches", author: "dev", checks: [
    { name: "pnpm typecheck",      status: "pass" },
    { name: "pnpm lint",           status: "pass" },
    { name: "vitest",              status: "pass", detail: "62 passed" },
    { name: "coverage ≥ 70%",      status: "fail", detail: "64%" },
    { name: "Lighthouse Perf ≥90", status: "pass", detail: "93" },
    { name: "Lighthouse A11y ≥95", status: "fail", detail: "92" },
  ]},
  { prId: "PR-#405", ticketId: "AM-130", cb: "mobile", title: "feat(mobile): onboarding flow", author: "dev", checks: [
    { name: "dart analyze",        status: "pass" },
    { name: "dart test",           status: "pass", detail: "94 passed" },
    { name: "coverage ≥ 75%",      status: "pass", detail: "78%" },
    { name: "golden tests",        status: "pass" },
    { name: "release build",       status: "pass", detail: "android · ios" },
  ]},
];

export interface OpenDecision {
  id: string;
  cb: CbId;
  question: string;
  detail: string;
  owner: string;
  status: "exploring" | "needs-decision" | "blocked";
  age: string;
}

export const openDecisions: OpenDecision[] = [
  { id: "d-be1", cb: "backend", question: "Payment / escrow architecture",       detail: "Stripe Connect Custom vs Adyen MarketPay vs in-house ledger.",            owner: "Marin Crnković", status: "needs-decision", age: "11d" },
  { id: "d-be2", cb: "backend", question: "Geo search engine",                   detail: "PostGIS on existing Postgres vs Elasticsearch geo_shape cluster.",        owner: "Marin Crnković", status: "exploring",      age: "6d" },
  { id: "d-be3", cb: "backend", question: "Background job runner",               detail: "Arq vs Celery vs Temporal for VIN decode + image moderation pipelines.",  owner: "Ivan Horvat",    status: "exploring",      age: "4d" },
  { id: "d-we1", cb: "web",     question: "Render strategy: SSR vs SSG vs ISR",  detail: "Listing detail = ISR(60s); search = SSR; static pages = SSG. Confirm?",    owner: "Ana Kovač",      status: "needs-decision", age: "8d" },
  { id: "d-we2", cb: "web",     question: "Image CDN",                           detail: "next/image + Vercel vs Cloudflare Images vs imgproxy on R2.",             owner: "Ana Kovač",      status: "exploring",      age: "5d" },
  { id: "d-mo1", cb: "mobile",  question: "Minimum OS versions",                 detail: "iOS 15 vs 16 (drops 8% of installs); Android 8 vs 9 (drops 3%).",          owner: "Petra Novak",    status: "needs-decision", age: "13d" },
  { id: "d-mo2", cb: "mobile",  question: "Push provider",                       detail: "FCM only vs FCM + APNs direct vs OneSignal.",                              owner: "Petra Novak",    status: "blocked",        age: "16d" },
];
