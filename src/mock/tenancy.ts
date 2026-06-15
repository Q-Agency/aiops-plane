/**
 * Tenancy - single source of truth for the trust posture (screens-doc
 * appendix, resolves coverage-review #13). Settings "Tenancy & Security"
 * + "Data & retention" read this; the TopBar TenancyBadge and
 * PodDraft.tenancy carry a subset/reference.
 *
 * Connected-tool scopes are derived from connectors.ts - deliberately
 * NOT a separate shape here.
 */

export interface Tenancy {
  deployment: "Dedicated";
  region: "EU-West";
  isolation: "Isolated per-client DB";
  encryption: "AES-256 at rest · TLS 1.3 in transit";
  dataResidency: string;
  dpaSigned: boolean;
}

export interface Retention {
  dataClass: "audit_log" | "runs" | "artifacts" | "comms";
  /** 0 = no auto-delete window (see `locked`). */
  windowDays: number;
  /** true = window not editable - audit_log is append-only by design. */
  locked: boolean;
  /** Display copy for the row, e.g. the append-only compliance note. */
  note?: string;
}

export const tenancy: Tenancy = {
  deployment: "Dedicated",
  region: "EU-West",
  isolation: "Isolated per-client DB",
  encryption: "AES-256 at rest · TLS 1.3 in transit",
  dataResidency:
    "Storage, memory, and the audit ledger remain in your EU-West tenant.",
  dpaSigned: true,
};

export const retention: Retention[] = [
  {
    dataClass: "audit_log",
    windowDays: 0,
    locked: true,
    note: "Append-only, never auto-deleted (compliance).",
  },
  {
    dataClass: "runs",
    windowDays: 365,
    locked: false,
    note: "Run telemetry & step logs.",
  },
  {
    dataClass: "artifacts",
    windowDays: 730,
    locked: false,
    note: "Specs, designs, diffs - the work product.",
  },
  {
    dataClass: "comms",
    windowDays: 90,
    locked: false,
    note: "Clarifications, escalations, digests.",
  },
];

/** Options for the retention `select`s (unlocked rows only). */
export const RETENTION_WINDOW_OPTIONS: number[] = [30, 90, 180, 365, 730];

/** Verbatim Settings copy (screens doc) - the one-paragraph data answer. */
export const DATA_HANDLING_STATEMENT =
  "Your data lives in a dedicated, isolated database in EU-West. " +
  "Connected-tool access is scoped to the minimum required and shown at connect-time. " +
  "Content is processed by each agent's pinned model provider under zero-retention terms; " +
  "storage, memory, and the audit ledger remain in your EU-West tenant. " +
  "EU-region inference: Roadmap. " +
  "The audit ledger is append-only and outlives agent resets.";
