/**
 * Deliverables shelf (/artifacts, wave 2, Blind spot 4).
 *
 * CONTROL-PLANE RULE (load-bearing): approved artifacts are SNAPSHOTTED
 * INTO THE CONTROL PLANE AT GATE-CLEARANCE (`snapshotAt`) - the same
 * rationale that created the audit DB. No agent reset deletes a paid
 * deliverable: the shelf outlives the agents that produced it.
 *
 * Joins: kinds from chain.ts ArtifactKind, ticket ids from tickets.ts,
 * gate ids from approvals.ts/billing.ts (`appr-<ticket>`), reject history
 * mirrors compliance.ts (AM-138 ae-005/006) and memory.ts amendment-1
 * (AM-142 spec v1 returned for missing error-state ACs).
 */

import type { ArtifactKind } from "./chain";

export interface ArtifactSnapshot {
  id: string;
  kind: ArtifactKind;
  ticketId: string;
  title: string;
  version: number;
  /** The gate whose clearance triggered the snapshot. */
  approvedByGateId: string;
  approvedAt: number;
  /** Storage pointer, e.g. "AM-142/spec.md@v2". */
  contentRef: string;
  /** Snapshot written at gate-clearance - survives agent resets. */
  snapshotAt: number;
}

/** One iteration in a per-ticket version timeline (incl. rejected drafts). */
export interface ArtifactIteration {
  ticketId: string;
  kind: ArtifactKind;
  version: number;
  state: "approved" | "rejected";
  at: number;
  gateId: string;
  /** Display name of the deciding human. */
  actorName: string;
  /** Typed reason - present on every rejected iteration (reject canon). */
  rejectReason?: string;
  /** Markdown body at this version (before/after strings for the diff demo). */
  contentMd: string;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = Date.now();

export const SNAPSHOT_STAMP = "Snapshotted at clearance · survives agent resets";

/* ------------------------------------------------------------------ */
/* The shelf - everything the pod has delivered                         */
/* ------------------------------------------------------------------ */

export const ARTIFACT_SNAPSHOTS: ArtifactSnapshot[] = [
  {
    // Demo spine: AM-142 spec at v2 - v1 was rejected (see artifactVersions).
    id: "art-am142-spec",
    kind: "spec",
    ticketId: "AM-142",
    title: "Vehicle search with filters - SPEC.md",
    version: 2,
    approvedByGateId: "appr-AM-142",
    approvedAt: now - 2 * HOUR,
    contentRef: "AM-142/spec.md@v2",
    snapshotAt: now - 2 * HOUR,
  },
  {
    // The merged ticket from economics (AM-136, stage "done") - full chain.
    id: "art-am136-spec",
    kind: "spec",
    ticketId: "AM-136",
    title: "Listing detail page - SPEC.md",
    version: 1,
    approvedByGateId: "appr-AM-136",
    approvedAt: now - 5 * DAY,
    contentRef: "AM-136/spec.md@v1",
    snapshotAt: now - 5 * DAY,
  },
  {
    id: "art-am136-design",
    kind: "design",
    ticketId: "AM-136",
    title: "Listing detail page - design.md",
    version: 1,
    approvedByGateId: "appr-AM-136",
    approvedAt: now - 4 * DAY - 12 * HOUR,
    contentRef: "AM-136/design.md@v1",
    snapshotAt: now - 4 * DAY - 12 * HOUR,
  },
  {
    id: "art-am136-tasks",
    kind: "tasks",
    ticketId: "AM-136",
    title: "Listing detail page - tasks.json (9 tasks)",
    version: 1,
    approvedByGateId: "appr-AM-136",
    approvedAt: now - 4 * DAY,
    contentRef: "AM-136/tasks.json@v1",
    snapshotAt: now - 4 * DAY,
  },
  {
    id: "art-am136-code",
    kind: "code",
    ticketId: "AM-136",
    title: "Listing detail page - PR #408 (merged)",
    version: 1,
    approvedByGateId: "appr-AM-136",
    approvedAt: now - 3 * DAY,
    contentRef: "AM-136/pr#408",
    snapshotAt: now - 3 * DAY,
  },
  {
    id: "art-am136-test",
    kind: "test",
    ticketId: "AM-136",
    title: "Listing detail page - QA report (all green)",
    version: 1,
    approvedByGateId: "appr-AM-136",
    approvedAt: now - 6 * HOUR,
    contentRef: "AM-136/qa.md@v1",
    snapshotAt: now - 6 * HOUR,
  },
  {
    // v2 after Marin returned v1 ("Threading model incomplete" - ae-005/006).
    id: "art-am138-design",
    kind: "design",
    ticketId: "AM-138",
    title: "Buyer-seller messaging - design.md",
    version: 2,
    approvedByGateId: "appr-AM-138",
    approvedAt: now - 36 * HOUR,
    contentRef: "AM-138/design.md@v2",
    snapshotAt: now - 36 * HOUR,
  },
  {
    // Petra's QA clearance (compliance ae-013: "KYC test matrix complete").
    id: "art-am144-test",
    kind: "test",
    ticketId: "AM-144",
    title: "Seller KYC verification - test matrix",
    version: 3,
    approvedByGateId: "appr-AM-144",
    approvedAt: now - 9 * HOUR,
    contentRef: "AM-144/qa.md@v3",
    snapshotAt: now - 9 * HOUR,
  },
  {
    id: "art-am131-uix",
    kind: "uix-ui-spec",
    ticketId: "AM-131",
    title: "Listing image upload - UI states & flows",
    version: 1,
    approvedByGateId: "appr-AM-131",
    approvedAt: now - 28 * HOUR,
    contentRef: "AM-131/uix-ui-spec.md@v1",
    snapshotAt: now - 28 * HOUR,
  },
  {
    // Ana's spec approval (report.ts gatesCleared: AM-128, Ana, 2.4h turnaround).
    id: "art-am128-spec",
    kind: "spec",
    ticketId: "AM-128",
    title: "Search autocomplete - SPEC.md",
    version: 1,
    approvedByGateId: "appr-AM-128",
    approvedAt: now - 1 * DAY,
    contentRef: "AM-128/spec.md@v1",
    snapshotAt: now - 1 * DAY,
  },
];

/* ------------------------------------------------------------------ */
/* Version timelines - incl. rejected iterations (diff demo bodies)     */
/* ------------------------------------------------------------------ */

const AM142_SPEC_V1 = `# AM-142 · Vehicle search with filters - SPEC.md (v1)

## Acceptance criteria
- **AC-1** WHEN a search request is made under 50 RPS sustained load, THE SYSTEM SHALL respond with p95 latency < 200ms.
- **AC-2** WHEN filters are combined, THE SYSTEM SHALL apply them with AND semantics.
- **AC-3** WHEN results exceed one page, THE SYSTEM SHALL paginate by cursor (?after=…) - never offset.
- **AC-4** WHEN the mobile client consumes the contract, THE SYSTEM SHALL serve the identical schema consumed by web.
- **AC-5** WHEN vehicle search is invoked, THE SYSTEM SHALL emit a telemetry event with payload size and duration.

## Saved filters
Saved filter chips persist per device (localStorage).`;

const AM142_SPEC_V2 = `# AM-142 · Vehicle search with filters - SPEC.md (v2)

## Acceptance criteria
- **AC-1** WHEN a search request is made under 50 RPS sustained load, THE SYSTEM SHALL respond with p95 latency < 200ms.
- **AC-2** WHEN filters are combined, THE SYSTEM SHALL apply them with AND semantics.
- **AC-3** WHEN results exceed one page, THE SYSTEM SHALL paginate by cursor (?after=…) - never offset.
- **AC-4** WHEN the mobile client consumes the contract, THE SYSTEM SHALL serve the identical schema consumed by web.
- **AC-5** WHEN vehicle search is invoked, THE SYSTEM SHALL emit a telemetry event with payload size and duration.
- **AC-6** WHEN vehicle search yields zero results, THE SYSTEM SHALL render the empty-state hint with a CTA to broaden filters.
- **AC-7** WHEN the search index is unreachable, THE SYSTEM SHALL degrade to cached results with a staleness banner and retry within 30s.

## Saved filters
Saved filter chips persist **per account** (constitution rule cr-3 - never per device).`;

const AM138_DESIGN_V1 = `# AM-138 · Buyer-seller messaging - design.md (v1)

## Data model
\`conversations\` (id, listing_id, buyer_id, seller_id) → \`messages\` (id, conversation_id, body, sent_at).

## Delivery
Messages fan out via a single worker consuming the outbox table.`;

const AM138_DESIGN_V2 = `# AM-138 · Buyer-seller messaging - design.md (v2)

## Data model
\`conversations\` (id, listing_id, buyer_id, seller_id) → \`messages\` (id, conversation_id, **thread_id**, body, sent_at).
Threads group replies; a conversation owns many threads.

## Delivery & concurrency
Messages fan out via a partitioned worker pool (partition key = conversation_id) -
per-conversation ordering guaranteed, cross-conversation delivery parallel.
Outbox consumers are idempotent (message id dedupe) per constitution rule cr-5.`;

const SINGLE_VERSION_BODY = (ref: string, title: string) =>
  `# ${title}\n\nApproved at gate-clearance and snapshotted to the control plane (\`${ref}\`).\nOpen Traceability for the full artifact body.`;

/**
 * The v1..vN timeline for one ticket's headline artifact - including
 * rejected iterations with their typed reason and full before/after
 * markdown bodies (the struck-through diff demo).
 */
export function artifactVersions(ticketId: string): ArtifactIteration[] {
  switch (ticketId) {
    case "AM-142":
      return [
        {
          ticketId: "AM-142",
          kind: "spec",
          version: 1,
          state: "rejected",
          at: now - 26 * HOUR,
          gateId: "appr-AM-142",
          actorName: "Zlatko",
          rejectReason:
            "Error-state acceptance criteria missing - the AC set only covers the happy path (no zero-results, no index-unreachable behavior).",
          contentMd: AM142_SPEC_V1,
        },
        {
          ticketId: "AM-142",
          kind: "spec",
          version: 2,
          state: "approved",
          at: now - 2 * HOUR,
          gateId: "appr-AM-142",
          actorName: "Zlatko",
          contentMd: AM142_SPEC_V2,
        },
      ];
    case "AM-138":
      return [
        {
          ticketId: "AM-138",
          kind: "design",
          version: 1,
          state: "rejected",
          at: now - 39 * HOUR,
          gateId: "appr-AM-138",
          actorName: "Marin Crnković",
          rejectReason: "Threading model incomplete - reroute to SA.",
          contentMd: AM138_DESIGN_V1,
        },
        {
          ticketId: "AM-138",
          kind: "design",
          version: 2,
          state: "approved",
          at: now - 36 * HOUR,
          gateId: "appr-AM-138",
          actorName: "Marin Crnković",
          contentMd: AM138_DESIGN_V2,
        },
      ];
    default: {
      // Single-version tickets: synthesize the approved iteration per snapshot.
      return ARTIFACT_SNAPSHOTS.filter((s) => s.ticketId === ticketId).map((s) => ({
        ticketId: s.ticketId,
        kind: s.kind,
        version: s.version,
        state: "approved" as const,
        at: s.approvedAt,
        gateId: s.approvedByGateId,
        actorName: approverNameFor(s.ticketId),
        contentMd: SINGLE_VERSION_BODY(s.contentRef, s.title),
      }));
    }
  }
}

/** Display approver per ticket - mirrors tickets.ts/report.ts clearedBy names. */
function approverNameFor(ticketId: string): string {
  const map: Record<string, string> = {
    "AM-136": "Iva",
    "AM-144": "Petra Novak",
    "AM-131": "Iva",
    "AM-128": "Ana Kovač",
  };
  return map[ticketId] ?? "Ana Kovač";
}

export function snapshotsFor(ticketId: string): ArtifactSnapshot[] {
  return ARTIFACT_SNAPSHOTS.filter((s) => s.ticketId === ticketId);
}
