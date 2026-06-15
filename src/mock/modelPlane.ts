/**
 * Model plane - per-agent model disclosure for Settings "Models &
 * subprocessors" (#models): who actually processes the client's content,
 * one LLM call deep - provider, pinned model id, processing region, and
 * retention terms.
 *
 * Honesty rules: `euInference` is the EU-REGION-inference flag ("roadmap"
 * renders the Roadmap badge - hosted inference is US today); self-hosted
 * rows run in-tenant (EU-West) so EU inference is live for them. The
 * agent-level Live/Roadmap badge still comes from chain.ts availability.
 */

export interface ModelPlaneRow {
  agentId: string;
  agentLabel: string;
  provider: string;
  /** Pinned model id string - never "latest". */
  pinnedModel: string;
  processingRegion: string;
  /** EU-region inference availability for this row. */
  euInference: "live" | "roadmap";
  retentionTerms: string;
}

const ZDR = "Zero-data-retention API terms";
const IN_TENANT = "Never leaves your tenant";

export const MODEL_PLANE: ModelPlaneRow[] = [
  {
    agentId: "ba",
    agentLabel: "BA Agent",
    provider: "Anthropic",
    pinnedModel: "claude-sonnet-4-5-20250929",
    processingRegion: "US",
    euInference: "roadmap",
    retentionTerms: ZDR,
  },
  {
    agentId: "sa",
    agentLabel: "SA Agent",
    provider: "Anthropic",
    pinnedModel: "claude-opus-4-1-20250805",
    processingRegion: "US",
    euInference: "roadmap",
    retentionTerms: ZDR,
  },
  {
    agentId: "uiux",
    agentLabel: "UI/UX Designer",
    provider: "Anthropic",
    pinnedModel: "claude-sonnet-4-5-20250929",
    processingRegion: "US",
    euInference: "roadmap",
    retentionTerms: ZDR,
  },
  {
    agentId: "tasklist",
    agentLabel: "Tasklist Agent",
    provider: "Self-hosted vLLM",
    pinnedModel: "qwen2.5-coder-32b-instruct",
    processingRegion: "EU-West (in-tenant)",
    euInference: "live",
    retentionTerms: IN_TENANT,
  },
  {
    agentId: "dev",
    agentLabel: "Dev Agent",
    provider: "Anthropic",
    pinnedModel: "claude-sonnet-4-5-20250929",
    processingRegion: "US",
    euInference: "roadmap",
    retentionTerms: ZDR,
  },
  {
    agentId: "review",
    agentLabel: "Code Review",
    provider: "Anthropic",
    pinnedModel: "claude-haiku-4-5-20251001",
    processingRegion: "US",
    euInference: "roadmap",
    retentionTerms: ZDR,
  },
  {
    agentId: "qa",
    agentLabel: "QA Agent",
    provider: "Anthropic",
    pinnedModel: "claude-sonnet-4-5-20250929",
    processingRegion: "US",
    euInference: "roadmap",
    retentionTerms: ZDR,
  },
  {
    agentId: "devops",
    agentLabel: "DevOps/Release",
    provider: "Anthropic",
    pinnedModel: "claude-haiku-4-5-20251001",
    processingRegion: "US",
    euInference: "roadmap",
    retentionTerms: ZDR,
  },
  {
    agentId: "knowledge",
    agentLabel: "Curator (Knowledge)",
    provider: "Self-hosted vLLM",
    pinnedModel: "bge-m3 (embeddings)",
    processingRegion: "EU-West (in-tenant)",
    euInference: "live",
    retentionTerms: IN_TENANT,
  },
];

/** Row lookup for per-agent surfaces (agent detail, charter card). */
export function modelPlaneFor(agentId: string): ModelPlaneRow | undefined {
  return MODEL_PLANE.find((r) => r.agentId === agentId);
}

/** Footer line under the Models table - every party that touches content. */
export const SUBPROCESSORS: string[] = [
  "Anthropic - LLM inference (zero-data-retention API terms)",
  "Supabase - isolated Postgres + append-only audit ledger (EU-West)",
  "Hetzner - dedicated compute & self-hosted inference (EU)",
];
