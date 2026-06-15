import type { AgentId } from "./types";

export type Framework = "EU_AI_ACT" | "GDPR" | "ISO_42001" | "SOC2" | "DORA" | "PCI_DSS";

export const FRAMEWORK_LABEL: Record<Framework, string> = {
  EU_AI_ACT: "EU AI Act",
  GDPR: "GDPR",
  ISO_42001: "ISO 42001",
  SOC2: "SOC 2",
  DORA: "DORA",
  PCI_DSS: "PCI-DSS",
};

export interface RegulatoryProfile {
  projectId: string;
  projectName: string;
  active: Framework[];
}

export const PROFILES: RegulatoryProfile[] = [
  { projectId: "automarket", projectName: "AutoMarket", active: ["GDPR", "EU_AI_ACT"] },
  { projectId: "fintrust", projectName: "FinTrust Banking", active: ["GDPR", "DORA", "SOC2"] },
  { projectId: "medsync", projectName: "MedSync", active: ["GDPR", "ISO_42001"] },
];

export type AuditAction =
  | "artifact.created"
  | "artifact.versioned"
  | "gate.approved"
  | "gate.rejected"
  | "ingest.completed"
  | "model.invoked"
  | "data.exported"
  | "escalation.raised"
  | "dispatch.sent";

export interface AuditEntry {
  id: string;
  ts: number; // ms
  actor: { kind: "agent" | "human" | "system"; id: string };
  action: AuditAction;
  ticketId?: string;
  rationale: string;
  artifactRef?: string;
  hash: string; // tamper-evident
  prevHash: string;
}

const now = Date.UTC(2026, 5, 1, 8, 0, 0); // deterministic
const m = 60_000;
const h = 60 * m;

function mkHash(seed: number): string {
  // deterministic faux sha-256 prefix
  const s = (seed * 2654435761) >>> 0;
  return s.toString(16).padStart(8, "0") + "a93f1c2d";
}

const rawAudit: Omit<AuditEntry, "hash" | "prevHash">[] = [
  { id: "ae-001", ts: now - 48 * h, actor: { kind: "agent", id: "curator" }, action: "ingest.completed", rationale: "Slack #automarket-product synced (412 docs)", artifactRef: "src:slack-automarket" },
  { id: "ae-002", ts: now - 47 * h, actor: { kind: "agent", id: "ba" }, action: "artifact.created", ticketId: "AM-142", rationale: "spec.md v1 drafted from synthesized sources", artifactRef: "AM-142/spec.md@v1" },
  { id: "ae-003", ts: now - 46 * h, actor: { kind: "human", id: "zlatko" }, action: "gate.approved", ticketId: "AM-142", rationale: "Spec scope matches SOW §3.2", artifactRef: "AM-142/spec.md@v1" },
  { id: "ae-004", ts: now - 40 * h, actor: { kind: "agent", id: "sa" }, action: "artifact.created", ticketId: "AM-138", rationale: "design.md v1 produced", artifactRef: "AM-138/design.md@v1" },
  { id: "ae-005", ts: now - 39 * h, actor: { kind: "human", id: "marin" }, action: "gate.rejected", ticketId: "AM-138", rationale: "Threading model incomplete - reroute to SA", artifactRef: "AM-138/design.md@v1" },
  { id: "ae-006", ts: now - 36 * h, actor: { kind: "agent", id: "sa" }, action: "artifact.versioned", ticketId: "AM-138", rationale: "design.md v2 with threaded model", artifactRef: "AM-138/design.md@v2" },
  { id: "ae-007", ts: now - 30 * h, actor: { kind: "agent", id: "dev" }, action: "model.invoked", ticketId: "AM-131", rationale: "local qwen2.5-coder-32b @ on-prem H200", artifactRef: "model:qwen2.5-coder-32b" },
  { id: "ae-008", ts: now - 26 * h, actor: { kind: "human", id: "ivan" }, action: "gate.approved", ticketId: "AM-133", rationale: "Callback signature verified", artifactRef: "AM-133/pr#412" },
  { id: "ae-009", ts: now - 22 * h, actor: { kind: "agent", id: "qa" }, action: "artifact.created", ticketId: "AM-131", rationale: "qa-report.md generated", artifactRef: "AM-131/qa.md@v1" },
  { id: "ae-010", ts: now - 18 * h, actor: { kind: "system", id: "scheduler" }, action: "dispatch.sent", rationale: "22:00 overnight batch dispatched to dev agent", artifactRef: "batch:overnight-2026-05-31" },
  { id: "ae-011", ts: now - 14 * h, actor: { kind: "agent", id: "curator" }, action: "escalation.raised", rationale: "Source conflict: SOW vs Slack thread on pricing tiers", artifactRef: "esc-002" },
  { id: "ae-012", ts: now - 12 * h, actor: { kind: "agent", id: "ba" }, action: "model.invoked", ticketId: "AM-150", rationale: "cloud gpt-5-mini @ us-east", artifactRef: "model:gpt-5-mini" },
  { id: "ae-013", ts: now - 9 * h, actor: { kind: "human", id: "petra" }, action: "gate.approved", ticketId: "AM-144", rationale: "KYC test matrix complete", artifactRef: "AM-144/qa.md@v3" },
  { id: "ae-014", ts: now - 6 * h, actor: { kind: "agent", id: "review" }, action: "artifact.created", ticketId: "AM-149", rationale: "code-review.md flagged 2 medium findings", artifactRef: "AM-149/review.md@v1" },
  { id: "ae-015", ts: now - 4 * h, actor: { kind: "human", id: "ana" }, action: "data.exported", rationale: "Audit log CSV export for client procurement review", artifactRef: "export:audit-2026-05-31.csv" },
  { id: "ae-016", ts: now - 2 * h, actor: { kind: "agent", id: "pm" }, action: "artifact.versioned", ticketId: "AM-147", rationale: "tasklist.md v2 with split subtasks", artifactRef: "AM-147/tasks.md@v2" },
  { id: "ae-017", ts: now - 70 * m, actor: { kind: "human", id: "zlatko" }, action: "gate.approved", ticketId: "AM-149", rationale: "Escrow flow reviewed against PCI-DSS §3.2", artifactRef: "AM-149/spec.md@v2" },
  { id: "ae-018", ts: now - 45 * m, actor: { kind: "agent", id: "tasklist" }, action: "model.invoked", ticketId: "AM-145", rationale: "local llama-3.3-70b @ on-prem H200", artifactRef: "model:llama-3.3-70b" },
  { id: "ae-019", ts: now - 20 * m, actor: { kind: "agent", id: "curator" }, action: "ingest.completed", rationale: "HubSpot CRM delta sync (38 docs)", artifactRef: "src:hubspot" },
  { id: "ae-020", ts: now - 8 * m, actor: { kind: "agent", id: "dev" }, action: "artifact.created", ticketId: "AM-150", rationale: "VIN decoder implementation pushed", artifactRef: "AM-150/pr#421" },
];

export const AUDIT: AuditEntry[] = (() => {
  let prev = "0000000000000000";
  return rawAudit.map((e, i) => {
    const hash = mkHash(i + 1);
    const entry: AuditEntry = { ...e, hash, prevHash: prev };
    prev = hash;
    return entry;
  });
})();

// ---------- Data governance ----------

export type DataClass = "PII" | "Sensitive" | "Business" | "Public";
export type Residency = "on-prem" | "cloud-eu" | "cloud-us";

export interface IngestedSource {
  id: string;
  name: string;
  kind: "Slack" | "Drive" | "Jira" | "Gmail" | "HubSpot" | "SOW";
  classification: DataClass;
  retentionDays: number;
  residency: Residency;
  erasureRequests: number;
  docs: number;
}

export const SOURCES: IngestedSource[] = [
  { id: "s1", name: "Slack #automarket-product", kind: "Slack", classification: "Business", retentionDays: 365, residency: "on-prem", erasureRequests: 0, docs: 1248 },
  { id: "s2", name: "Google Drive - Contracts", kind: "Drive", classification: "Sensitive", retentionDays: 2555, residency: "on-prem", erasureRequests: 0, docs: 312 },
  { id: "s3", name: "Jira - AutoMarket", kind: "Jira", classification: "Business", retentionDays: 730, residency: "on-prem", erasureRequests: 0, docs: 891 },
  { id: "s4", name: "Gmail - client thread", kind: "Gmail", classification: "PII", retentionDays: 180, residency: "on-prem", erasureRequests: 2, docs: 412 },
  { id: "s5", name: "HubSpot CRM", kind: "HubSpot", classification: "PII", retentionDays: 1095, residency: "on-prem", erasureRequests: 1, docs: 2104 },
  { id: "s6", name: "SOWs / MSAs", kind: "SOW", classification: "Sensitive", retentionDays: 2555, residency: "on-prem", erasureRequests: 0, docs: 48 },
];

// Residency split per project - % of inference compute
export const RESIDENCY_SPLIT = {
  automarket: { onPrem: 78, cloudEU: 22, cloudUS: 0 },
  fintrust: { onPrem: 100, cloudEU: 0, cloudUS: 0 },
  medsync: { onPrem: 94, cloudEU: 6, cloudUS: 0 },
} as const;

// ---------- Model & prompt provenance ----------

export interface ModelProvenance {
  artifactRef: string;
  ticketId: string;
  agent: AgentId;
  model: string;
  modelVersion: string;
  promptVersion: string;
  residency: Residency;
}

export const PROVENANCE: ModelProvenance[] = [
  { artifactRef: "AM-142/spec.md@v1", ticketId: "AM-142", agent: "ba", model: "gpt-5-mini", modelVersion: "2026-04-12", promptVersion: "ba-spec@1.4.2", residency: "cloud-eu" },
  { artifactRef: "AM-138/design.md@v2", ticketId: "AM-138", agent: "sa", model: "claude-sonnet-4.5", modelVersion: "2026-03-08", promptVersion: "sa-design@2.1.0", residency: "cloud-eu" },
  { artifactRef: "AM-131/qa.md@v1", ticketId: "AM-131", agent: "qa", model: "qwen2.5-72b", modelVersion: "local-2025-12", promptVersion: "qa-report@1.0.7", residency: "on-prem" },
  { artifactRef: "AM-150/pr#421", ticketId: "AM-150", agent: "dev", model: "qwen2.5-coder-32b", modelVersion: "local-2025-12", promptVersion: "dev-impl@3.0.1", residency: "on-prem" },
  { artifactRef: "AM-149/review.md@v1", ticketId: "AM-149", agent: "review", model: "claude-sonnet-4.5", modelVersion: "2026-03-08", promptVersion: "review@1.2.0", residency: "cloud-eu" },
  { artifactRef: "AM-145/tasks.md@v1", ticketId: "AM-145", agent: "tasklist", model: "llama-3.3-70b", modelVersion: "local-2025-11", promptVersion: "tasks@2.0.0", residency: "on-prem" },
];

// ---------- Control mapping ----------

export type ControlStatus = "captured" | "partial" | "gap";

export interface Control {
  id: string;
  control: string;
  evidence: string;
  evidenceRef: string; // route or anchor
  frameworks: { framework: Framework; requirement: string }[];
  status: ControlStatus;
}

export const CONTROLS: Control[] = [
  {
    id: "c1",
    control: "Named human approval at each gate",
    evidence: "Gate decision log (Pod / Accountability)",
    evidenceRef: "/pod",
    frameworks: [
      { framework: "EU_AI_ACT", requirement: "Art. 14 - Human oversight" },
      { framework: "ISO_42001", requirement: "A.6.2.4 - Human oversight" },
    ],
    status: "captured",
  },
  {
    id: "c2",
    control: "Append-only action log",
    evidence: "Immutable audit trail (this view)",
    evidenceRef: "#audit",
    frameworks: [
      { framework: "EU_AI_ACT", requirement: "Art. 12 - Record-keeping" },
      { framework: "SOC2", requirement: "CC7.2 - System monitoring" },
    ],
    status: "captured",
  },
  {
    id: "c3",
    control: "On-prem processing of client PII",
    evidence: "Residency split (this view)",
    evidenceRef: "#residency",
    frameworks: [
      { framework: "GDPR", requirement: "Art. 32 - Security of processing" },
      { framework: "GDPR", requirement: "Art. 44 - Cross-border transfers" },
    ],
    status: "captured",
  },
  {
    id: "c4",
    control: "Source-level provenance for all artifacts",
    evidence: "Traceability lineage (Curator → spec)",
    evidenceRef: "/traceability",
    frameworks: [
      { framework: "EU_AI_ACT", requirement: "Art. 13 - Transparency" },
    ],
    status: "captured",
  },
  {
    id: "c5",
    control: "Model & prompt version recorded per artifact",
    evidence: "Provenance table (this view)",
    evidenceRef: "#provenance",
    frameworks: [
      { framework: "EU_AI_ACT", requirement: "Annex IV §2(b)" },
      { framework: "ISO_42001", requirement: "A.8.4 - AI system documentation" },
    ],
    status: "captured",
  },
  {
    id: "c6",
    control: "Erasure-request handling within 30 days",
    evidence: "Data governance table",
    evidenceRef: "#governance",
    frameworks: [{ framework: "GDPR", requirement: "Art. 17 - Right to erasure" }],
    status: "partial",
  },
  {
    id: "c7",
    control: "Risk register with owners and mitigations",
    evidence: "Risk register (this view)",
    evidenceRef: "#risks",
    frameworks: [
      { framework: "EU_AI_ACT", requirement: "Art. 9 - Risk management" },
      { framework: "ISO_42001", requirement: "A.5 - AI risk" },
    ],
    status: "captured",
  },
  {
    id: "c8",
    control: "Incident notification ≤ 72h",
    evidence: "Incident log → escalation routing",
    evidenceRef: "/comms",
    frameworks: [{ framework: "GDPR", requirement: "Art. 33 - Breach notification" }],
    status: "partial",
  },
  {
    id: "c9",
    control: "Bias / fairness testing on user-facing models",
    evidence: "Not yet implemented",
    evidenceRef: "#",
    frameworks: [{ framework: "EU_AI_ACT", requirement: "Art. 10 - Data governance" }],
    status: "gap",
  },
];

// ---------- Risks ----------

export type RiskSeverity = "low" | "med" | "high" | "critical";
export type RiskStatus = "open" | "mitigating" | "accepted" | "closed";

export interface Risk {
  id: string;
  title: string;
  severity: RiskSeverity;
  mitigation: string;
  ownerHumanId: string;
  status: RiskStatus;
  source: string;
}

export const RISKS: Risk[] = [
  { id: "r1", title: "Curator source conflict - pricing tier ambiguity", severity: "med", mitigation: "Synthesis agent prefers SOW; flagged to BA for human confirm", ownerHumanId: "zlatko", status: "mitigating", source: "esc-002" },
  { id: "r2", title: "PII leak via Gmail thread re-index", severity: "high", mitigation: "Erasure queue + per-thread classifier", ownerHumanId: "ana", status: "mitigating", source: "incident-2026-05-28" },
  { id: "r3", title: "Escaped defect - escrow callback race", severity: "high", mitigation: "Added integration test gate; QA prompt v3", ownerHumanId: "petra", status: "closed", source: "AM-133" },
  { id: "r4", title: "Local model degradation under load", severity: "med", mitigation: "Auto-failover to cloud-eu with audit flag", ownerHumanId: "ivan", status: "open", source: "ops" },
  { id: "r5", title: "No bias testing for ranking model", severity: "med", mitigation: "Planned: fairness suite Q3", ownerHumanId: "marin", status: "open", source: "control-c9" },
];

// ---------- Attestations ----------

export interface Attestation {
  id: string;
  release: string;
  date: number;
  signerHumanId: string;
  frameworks: Framework[];
  bundle: { auditEntries: number; oversightDecisions: number; residencyReport: string };
  status: "signed" | "pending";
}

export const ATTESTATIONS: Attestation[] = [
  {
    id: "att-001",
    release: "AutoMarket v0.4.1 - Buyer messaging GA",
    date: now - 10 * 24 * h,
    signerHumanId: "zlatko",
    frameworks: ["GDPR", "EU_AI_ACT"],
    bundle: { auditEntries: 412, oversightDecisions: 38, residencyReport: "residency-2026-05-21.pdf" },
    status: "signed",
  },
  {
    id: "att-002",
    release: "AutoMarket v0.4.2 - Listing image upload",
    date: now - 2 * 24 * h,
    signerHumanId: "ana",
    frameworks: ["GDPR", "EU_AI_ACT"],
    bundle: { auditEntries: 287, oversightDecisions: 24, residencyReport: "residency-2026-05-29.pdf" },
    status: "signed",
  },
  {
    id: "att-003",
    release: "AutoMarket v0.5.0 - VIN decoder + KYC",
    date: now + 3 * 24 * h,
    signerHumanId: "zlatko",
    frameworks: ["GDPR", "EU_AI_ACT"],
    bundle: { auditEntries: 0, oversightDecisions: 0, residencyReport: "-" },
    status: "pending",
  },
];

export function controlsByStatus(controls: Control[]) {
  return controls.reduce(
    (acc, c) => {
      acc[c.status]++;
      return acc;
    },
    { captured: 0, partial: 0, gap: 0 } as Record<ControlStatus, number>,
  );
}
