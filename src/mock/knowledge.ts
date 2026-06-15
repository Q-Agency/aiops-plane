// Knowledge / Curator layer mock data

export type SourceId = "slack" | "gdrive" | "jira" | "gmail" | "hubspot" | "sows";
export type Freshness = "fresh" | "stale" | "failed";

export interface KnowledgeSource {
  id: SourceId;
  name: string;
  kind: string;
  subAgent: string; // LangChain Deep Agent sub-agent name
  subAgentState: "running" | "idle" | "waiting" | "error";
  lastSyncMin: number; // minutes ago
  freshness: Freshness;
  docsIngested: number;
  docsDelta24h: number;
  spark: number[];
  status: "connected" | "degraded" | "disconnected";
  note?: string;
}

const spark = (seed: number, n = 24) =>
  Array.from({ length: n }, (_, i) =>
    Math.round(40 + 30 * Math.sin((i + seed) / 2.1) + (seed * 7 + i * 3) % 22),
  );

export const sources: KnowledgeSource[] = [
  {
    id: "slack",
    name: "Slack",
    kind: "Chat · #automarket-*",
    subAgent: "slack-curator",
    subAgentState: "running",
    lastSyncMin: 2,
    freshness: "fresh",
    docsIngested: 18_402,
    docsDelta24h: 312,
    spark: spark(1),
    status: "connected",
  },
  {
    id: "gdrive",
    name: "Google Drive",
    kind: "Docs · Sheets · Slides",
    subAgent: "gdrive-curator",
    subAgentState: "running",
    lastSyncMin: 7,
    freshness: "fresh",
    docsIngested: 4_271,
    docsDelta24h: 41,
    spark: spark(2),
    status: "connected",
  },
  {
    id: "jira",
    name: "Jira / Teamwork",
    kind: "Tickets · Epics · Comments",
    subAgent: "ticketing-curator",
    subAgentState: "running",
    lastSyncMin: 4,
    freshness: "fresh",
    docsIngested: 9_186,
    docsDelta24h: 84,
    spark: spark(3),
    status: "connected",
  },
  {
    id: "gmail",
    name: "Gmail",
    kind: "Threads · Attachments",
    subAgent: "mail-curator",
    subAgentState: "waiting",
    lastSyncMin: 38,
    freshness: "stale",
    docsIngested: 12_044,
    docsDelta24h: 18,
    spark: spark(4),
    status: "degraded",
    note: "OAuth refresh required in 6h",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    kind: "CRM · Deals · Notes",
    subAgent: "crm-curator",
    subAgentState: "idle",
    lastSyncMin: 14,
    freshness: "fresh",
    docsIngested: 3_512,
    docsDelta24h: 22,
    spark: spark(5),
    status: "connected",
  },
  {
    id: "sows",
    name: "SOWs / Contracts",
    kind: "PDF · DOCX (legal vault)",
    subAgent: "contracts-curator",
    subAgentState: "error",
    lastSyncMin: 142,
    freshness: "failed",
    docsIngested: 218,
    docsDelta24h: 0,
    spark: spark(6),
    status: "disconnected",
    note: "Last sync failed - 2 PDFs malformed (see Docling)",
  },
];

// Docling parsing
export type DoclingType = "PDF" | "DOCX" | "PPTX" | "XLSX" | "HTML";

export interface DoclingType_Stat {
  type: DoclingType;
  parsed24h: number;
  avgMs: number;
  tableAcc: number; // 0-100
}

export const doclingStats: DoclingType_Stat[] = [
  { type: "PDF",  parsed24h: 412, avgMs: 1840, tableAcc: 92 },
  { type: "DOCX", parsed24h: 188, avgMs: 640,  tableAcc: 97 },
  { type: "PPTX", parsed24h: 74,  avgMs: 1120, tableAcc: 88 },
  { type: "XLSX", parsed24h: 56,  avgMs: 410,  tableAcc: 99 },
  { type: "HTML", parsed24h: 904, avgMs: 220,  tableAcc: 95 },
];

export interface ParseFailure {
  file: string;
  source: SourceId;
  reason: string;
  ts: number; // minutes ago
}

export const parseFailures: ParseFailure[] = [
  { file: "automarket-escrow-amendment-v3.pdf", source: "sows",   reason: "encrypted - password-protected", ts: 142 },
  { file: "Q4-roadmap-deck.pptx",               source: "gdrive", reason: "embedded font missing glyph table", ts: 88 },
  { file: "seller-kyc-flow.pdf",                source: "sows",   reason: "image-only scan · OCR confidence 41%", ts: 56 },
  { file: "compliance-checklist.xlsx",          source: "gdrive", reason: "merged cells broke table extractor", ts: 22 },
];

// Conflict resolution
export interface Conflict {
  id: string;
  topic: string;
  a: { source: SourceId; quote: string };
  b: { source: SourceId; quote: string };
  resolution: { winner: SourceId; why: string };
  ts: number; // minutes ago
}

export const conflicts: Conflict[] = [
  {
    id: "C-204",
    topic: "Escrow hold period",
    a: { source: "slack",  quote: "@petar said 7 days is fine for v1" },
    b: { source: "sows",   quote: "Hold period of 14 calendar days (§4.2)" },
    resolution: { winner: "sows", why: "Contract supersedes verbal alignment" },
    ts: 18,
  },
  {
    id: "C-203",
    topic: "Listing image limit",
    a: { source: "jira",   quote: "ticket AM-131 spec: max 12 images" },
    b: { source: "gdrive", quote: "PRD doc revision 4: max 20 images" },
    resolution: { winner: "gdrive", why: "PRD is newer (rev 4 > ticket spec)" },
    ts: 64,
  },
  {
    id: "C-201",
    topic: "VIN decoder provider",
    a: { source: "hubspot", quote: "Deal note: 'using CARFAX'" },
    b: { source: "gmail",   quote: "Exec thread confirmed switch to VinAudit (cost)" },
    resolution: { winner: "gmail", why: "Most recent exec decision, dated after CRM note" },
    ts: 220,
  },
];

export const dedupStats = {
  duplicatesCollapsed24h: 1_842,
  nearDupesMerged24h: 433,
  conflictsDetected24h: 12,
  conflictsAutoResolved24h: 9,
  conflictsEscalated24h: 3,
};

// Elasticsearch / pgvector index health
export const indexHealth = {
  esDocs: 47_823,
  esIndexSizeMb: 412,
  pgvectorEmbeddings: 47_823,
  pgvectorDims: 1536,
  coveragePct: 98.6,
  hybridQueryP50Ms: 38,
  hybridQueryP95Ms: 112,
  rrfK: 60,
  bm25Weight: 0.4,
  denseWeight: 0.6,
  shardsHealthy: 6,
  shardsTotal: 6,
};

// Source → spec lineage
export interface SpecLineage {
  ticketId: string;
  spec: string;
  fedBy: { source: SourceId; doc: string; weight: number }[];
}

export const specLineage: SpecLineage[] = [
  {
    ticketId: "AM-142",
    spec: "spec.md · Vehicle search with filters",
    fedBy: [
      { source: "gdrive", doc: "PRD-vehicle-search-rev4.docx",  weight: 0.42 },
      { source: "jira",   doc: "Epic AM-E12 + 8 child tickets", weight: 0.21 },
      { source: "slack",  doc: "#automarket-search · 3 threads", weight: 0.18 },
      { source: "sows",   doc: "Marketplace SOW §3.1 search SLA", weight: 0.12 },
      { source: "hubspot", doc: "Dealer feedback notes (4 deals)", weight: 0.07 },
    ],
  },
  {
    ticketId: "AM-138",
    spec: "spec.md · Buyer-seller messaging",
    fedBy: [
      { source: "gdrive", doc: "Messaging PRD v2.docx", weight: 0.38 },
      { source: "slack",  doc: "#design-reviews · 6 threads", weight: 0.27 },
      { source: "gmail",  doc: "Legal counsel thread re: retention", weight: 0.20 },
      { source: "sows",   doc: "Privacy addendum §2", weight: 0.15 },
    ],
  },
  {
    ticketId: "AM-150",
    spec: "spec.md · VIN decoder service",
    fedBy: [
      { source: "gmail",   doc: "Exec thread: VinAudit decision", weight: 0.40 },
      { source: "hubspot", doc: "VinAudit vendor evaluation", weight: 0.30 },
      { source: "gdrive",  doc: "VIN integration sketch.gdoc", weight: 0.18 },
      { source: "slack",   doc: "#backend · API design thread", weight: 0.12 },
    ],
  },
];
