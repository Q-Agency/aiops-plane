/**
 * Incidents & Recovery (/incidents, C5) - the operator's "an agent failed,
 * what now?" dataset: typed incidents across five fault kinds, each with a
 * timeline, a suggested action, and explicit recovery controls.
 *
 * Cross-links resolve into the existing comms.ts seeds (escalations esc1/esc2,
 * comms c3/c14/c18). `incidentIdFor(esc)` is owned HERE and consumed by /comms.
 * Every recovery action returns an audit-ledger-shaped entry (actor null =
 * "when-only" until real auth).
 */

import type { AgentId } from "./types";
import type { ConnectorId } from "./connectors";
import type { Escalation, EscSeverity } from "./comms";

export type IncidentType =
  | "agent-down"
  | "run-failed"
  | "gate-overdue"
  | "tool-disconnected"
  | "sync-stale";

export type IncidentStatus = "open" | "recovering" | "resolved";

export type RecoveryActionKind =
  | "retry-run"
  | "resume-run"
  | "reauth-tool"
  | "reassign-human"
  | "pause-agent"
  | "restart-agent"
  | "escalate-to-q";

export interface IncidentEvent {
  id: string;
  tsOffsetMin: number; // minutes ago (newest = smallest)
  kind:
    | "detected"
    | "notified"
    | "auto-attempt"
    | "human-action"
    | "recovery-failed"
    | "resolved";
  label: string;
  /** null = "when-only" attribution (honest until auth). */
  actor?: string | null;
}

export interface Incident {
  id: string; //                       "inc-1"
  type: IncidentType;
  severity: EscSeverity; //            reuse "low"|"med"|"high"|"critical" from comms.ts
  status: IncidentStatus;
  title: string; //                    one-liner
  summary: string; //                  1-2 sentences of what/why
  agentId?: AgentId; //                affected agent
  ticketId?: string; //                affected work item
  toolId?: ConnectorId; //             for tool-disconnected / sync-stale
  accountableHumanId?: string; //      humans.ts id - who owns the fix
  openedMinAgo: number;
  slaToResolveMin: number; //          target window (countdown bar)
  detectedBy: string; //               "liveness probe" | "CI" | "gate SLA timer" | …
  suggestedAction: RecoveryActionKind | null;
  availableActions: RecoveryActionKind[];
  linkedEscalationId?: string; //      back-reference into comms.ts ESCALATIONS
  linkedCommId?: string; //            back-reference into comms.ts COMMS
  timeline: IncidentEvent[];
}

export const RECOVERY_ACTION_LABELS: Record<RecoveryActionKind, string> = {
  "retry-run": "Retry run",
  "resume-run": "Resume run",
  "reauth-tool": "Re-authenticate tool",
  "reassign-human": "Reassign accountable human",
  "pause-agent": "Pause agent",
  "restart-agent": "Restart agent",
  "escalate-to-q": "Escalate to Q",
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  "agent-down": "Agent down",
  "run-failed": "Run failed",
  "gate-overdue": "Gate overdue",
  "tool-disconnected": "Tool disconnected",
  "sync-stale": "Sync stale",
};

export const INCIDENTS: Incident[] = [
  {
    id: "inc-1",
    type: "agent-down",
    severity: "high",
    status: "open",
    title: "QA Agent unresponsive · liveness lost 6m",
    summary:
      "The QA agent's liveness probe has had no heartbeat for 6 minutes. Two queued suites are stalled.",
    agentId: "qa",
    accountableHumanId: "petra",
    openedMinAgo: 6,
    slaToResolveMin: 30,
    detectedBy: "liveness probe",
    suggestedAction: "restart-agent",
    availableActions: ["restart-agent", "pause-agent", "escalate-to-q"],
    timeline: [
      { id: "inc-1-e1", tsOffsetMin: 6, kind: "detected", label: "Detected by liveness probe - no heartbeat 3 consecutive checks", actor: null },
      { id: "inc-1-e2", tsOffsetMin: 5, kind: "notified", label: "Notified #automarket-dev and Petra (QA accountable)", actor: null },
      { id: "inc-1-e3", tsOffsetMin: 4, kind: "auto-attempt", label: "Auto-restart 1/1 attempted - agent did not come back healthy", actor: null },
    ],
  },
  {
    id: "inc-2",
    type: "run-failed",
    severity: "med",
    status: "open",
    title: "Dev build failed on AM-131 · TS2345 · retry 1/3",
    summary:
      "Dev agent build failed with TS2345 on ListingCard.tsx. Auto-retry 1 of 3 is queued; the ticket holds in Ready for QA.",
    agentId: "dev",
    ticketId: "AM-131",
    accountableHumanId: "ivan",
    openedMinAgo: 22,
    slaToResolveMin: 60,
    detectedBy: "CI",
    suggestedAction: "retry-run",
    availableActions: ["retry-run", "pause-agent", "escalate-to-q"],
    linkedCommId: "c14",
    timeline: [
      { id: "inc-2-e1", tsOffsetMin: 22, kind: "detected", label: "Detected by CI - build failed (TS2345, ListingCard.tsx)", actor: null },
      { id: "inc-2-e2", tsOffsetMin: 21, kind: "notified", label: "Notified #automarket-dev", actor: null },
      { id: "inc-2-e3", tsOffsetMin: 18, kind: "auto-attempt", label: "Auto-retry 1/3 failed - same error", actor: null },
    ],
  },
  {
    id: "inc-3",
    type: "gate-overdue",
    severity: "high",
    status: "open",
    title: "Design gate AM-138 stale 26h · SLA 24h",
    summary:
      "design.md v2 has waited in Design Review for 26h against a 24h SLA. Two downstream tickets are blocked. Accountable: Marin.",
    agentId: "sa",
    ticketId: "AM-138",
    accountableHumanId: "marin",
    openedMinAgo: 2 * 60,
    slaToResolveMin: 4 * 60,
    detectedBy: "gate SLA timer",
    suggestedAction: "reassign-human",
    availableActions: ["reassign-human", "escalate-to-q"],
    linkedEscalationId: "esc1",
    linkedCommId: "c3",
    timeline: [
      { id: "inc-3-e1", tsOffsetMin: 120, kind: "detected", label: "Detected by gate SLA timer - Design Review > 24h", actor: null },
      { id: "inc-3-e2", tsOffsetMin: 118, kind: "notified", label: "DM sent to Marin · escalation esc1 raised", actor: null },
      { id: "inc-3-e3", tsOffsetMin: 60, kind: "notified", label: "Reminder notified - no response yet", actor: null },
    ],
  },
  {
    id: "inc-4",
    type: "tool-disconnected",
    severity: "critical",
    status: "open",
    title: "GitHub token expired · Dev runs blocked",
    summary:
      "The GitHub OAuth token expired at 03:12 UTC. Dev and Review agents cannot push or read PRs until re-authenticated.",
    toolId: "github",
    accountableHumanId: "ivan",
    openedMinAgo: 47,
    slaToResolveMin: 60,
    detectedBy: "OAuth health check",
    suggestedAction: "reauth-tool",
    availableActions: ["reauth-tool", "pause-agent", "escalate-to-q"],
    timeline: [
      { id: "inc-4-e1", tsOffsetMin: 47, kind: "detected", label: "Detected by OAuth health check - 401 on token refresh", actor: null },
      { id: "inc-4-e2", tsOffsetMin: 46, kind: "notified", label: "Notified #automarket-dev and Ivan (Dev accountable)", actor: null },
      { id: "inc-4-e3", tsOffsetMin: 40, kind: "auto-attempt", label: "Token refresh retried 3/3 - still expired, re-auth required", actor: null },
    ],
  },
  {
    id: "inc-5",
    type: "sync-stale",
    severity: "med",
    status: "open",
    title: "Drive knowledge sync amber > 12h",
    summary:
      "Curator's Drive source sync has been amber for 12h - 3 sources stale. Spec context may miss the latest SOW revision.",
    toolId: "gdrive",
    agentId: "curator",
    accountableHumanId: "zlatko",
    openedMinAgo: 12 * 60,
    slaToResolveMin: 24 * 60,
    detectedBy: "sync watchdog",
    suggestedAction: "reauth-tool",
    availableActions: ["reauth-tool", "escalate-to-q"],
    linkedCommId: "c18",
    timeline: [
      { id: "inc-5-e1", tsOffsetMin: 720, kind: "detected", label: "Detected by sync watchdog - last successful sync 12h ago", actor: null },
      { id: "inc-5-e2", tsOffsetMin: 700, kind: "notified", label: "Flagged in Curator weekly digest (3 stale sources)", actor: null },
    ],
  },
  {
    id: "inc-6",
    type: "run-failed",
    severity: "critical",
    status: "open",
    title: "AM-149 quality gate failing 3x · sql-injection blocker",
    summary:
      "Code Review keeps blocking AM-149 on a SQL-injection risk in OfferRepository. Dev needs guidance before resuming.",
    agentId: "review",
    ticketId: "AM-149",
    accountableHumanId: "ivan",
    openedMinAgo: 80,
    slaToResolveMin: 2 * 60,
    detectedBy: "quality gate",
    suggestedAction: null,
    // retry-run is the forced-fail demo path (recoverIncident) - keep it first.
    availableActions: ["retry-run", "resume-run", "reassign-human", "pause-agent", "escalate-to-q"],
    linkedEscalationId: "esc2",
    timeline: [
      { id: "inc-6-e1", tsOffsetMin: 80, kind: "detected", label: "Detected by quality gate - 3rd consecutive blocker on AM-149", actor: null },
      { id: "inc-6-e2", tsOffsetMin: 78, kind: "notified", label: "Escalation esc2 raised → Ivan (acknowledged 22m later)", actor: null },
      { id: "inc-6-e3", tsOffsetMin: 30, kind: "auto-attempt", label: "Manual triage required - no safe auto-recovery for blockers", actor: null },
    ],
  },
  {
    id: "inc-7",
    type: "run-failed",
    severity: "med",
    status: "resolved",
    title: "AM-149 source conflict · SOW vs Slack decision",
    summary:
      "Curator found the signed SOW contradicting a later Slack decision. Synthesis picked the SOW; Zlatko confirmed and the run resumed.",
    agentId: "curator",
    ticketId: "AM-149",
    accountableHumanId: "zlatko",
    openedMinAgo: 180,
    slaToResolveMin: 4 * 60,
    detectedBy: "source-conflict scanner",
    suggestedAction: null,
    availableActions: [],
    linkedCommId: "c7",
    timeline: [
      { id: "inc-7-e1", tsOffsetMin: 180, kind: "detected", label: "Detected by source-conflict scanner - SOW v4 vs Slack decision", actor: null },
      { id: "inc-7-e2", tsOffsetMin: 178, kind: "notified", label: "DM sent to Zlatko with both sources", actor: null },
      { id: "inc-7-e3", tsOffsetMin: 95, kind: "human-action", label: "Resume run confirmed - SOW kept as source of truth", actor: null },
      { id: "inc-7-e4", tsOffsetMin: 93, kind: "resolved", label: "Recovered - spec updated, run resumed", actor: null },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Selectors                                                            */
/* ------------------------------------------------------------------ */

export function openIncidents(): Incident[] {
  return INCIDENTS.filter((i) => i.status !== "resolved");
}

export function incidentsByType(): Record<IncidentType, Incident[]> {
  const out: Record<IncidentType, Incident[]> = {
    "agent-down": [],
    "run-failed": [],
    "gate-overdue": [],
    "tool-disconnected": [],
    "sync-stale": [],
  };
  for (const i of INCIDENTS) out[i.type].push(i);
  return out;
}

export function incidentById(id: string): Incident | undefined {
  return INCIDENTS.find((i) => i.id === id);
}

/**
 * Escalation → incident cross-ref, consumed by /comms ("Open in Incidents →").
 * Data-driven off linkedEscalationId; null = no recovery required.
 */
export function incidentIdFor(esc: Escalation): string | null {
  return INCIDENTS.find((i) => i.linkedEscalationId === esc.id)?.id ?? null;
}

/**
 * Derived open count - keeps the legacy INCIDENTS_OPEN_COUNT export name
 * working (incidents-stub.ts re-exports this; the nav badge reads it).
 * Snapshot at module load; live views should call openIncidents().length.
 */
export const INCIDENTS_OPEN_COUNT = openIncidents().length;

/* ------------------------------------------------------------------ */
/* Recovery actions - every action returns an audit-shaped entry        */
/* ------------------------------------------------------------------ */

/** Mirrors the dashboard audit_log row shape (actor null = "when-only"). */
export interface AuditEntryLike {
  action: string; //      "incident.recovered"
  target: string; //      "inc-1 · restart-agent"
  actor: string | null;
  ts: number;
  reason?: string | null;
}

let recoverySeq = 0;

/**
 * Commits a recovery action: appends a human-action event (actor when-only),
 * then resolves the incident (except the forced-fail demo path on inc-6
 * retry, which appends recovery-failed instead). Returns the audit-shaped
 * entry the toast confirms ("written to audit ledger ✓").
 */
export function recoverIncident(
  id: string,
  action: RecoveryActionKind,
  reason?: string,
): AuditEntryLike | null {
  const incident = incidentById(id);
  if (!incident || incident.status === "resolved") return null;

  const label = RECOVERY_ACTION_LABELS[action];
  incident.timeline.push({
    id: `${id}-h${++recoverySeq}`,
    tsOffsetMin: 0,
    kind: "human-action",
    label: reason ? `${label} - "${reason}"` : label,
    actor: null, // when-only until auth
  });

  // Forced-fail demo path: retrying the blocked AM-149 quality gate fails.
  const forcedFail = id === "inc-6" && action === "retry-run";
  if (forcedFail) {
    incident.status = "open";
    incident.timeline.push({
      id: `${id}-f${recoverySeq}`,
      tsOffsetMin: 0,
      kind: "recovery-failed",
      label: "Retry failed - escalating to accountable human",
      actor: null,
    });
  } else {
    incident.status = "resolved";
    incident.timeline.push({
      id: `${id}-r${recoverySeq}`,
      tsOffsetMin: 0,
      kind: "resolved",
      label: `Recovered via ${label}`,
      actor: null,
    });
  }

  return {
    action: forcedFail ? "incident.recovery_failed" : "incident.recovered",
    target: `${id} · ${action}`,
    actor: null,
    ts: Date.now(),
    reason: reason ?? null,
  };
}

/** Reassigns the accountable human (the gate-overdue recovery path). */
export function reassignIncident(id: string, humanId: string, reason?: string): AuditEntryLike | null {
  const incident = incidentById(id);
  if (!incident || incident.status === "resolved") return null;
  incident.accountableHumanId = humanId;
  return recoverIncident(id, "reassign-human", reason);
}

/* ------------------------------------------------------------------ */
/* Demo Director seam (wave-2 COMPLETION) - additive flag, never reshapes */
/* ------------------------------------------------------------------ */

export interface IncidentRestagePatch {
  status?: IncidentStatus;
  openedMinAgo?: number;
}

/**
 * Flips a seeded incident for a staged demo beat (status/openedMinAgo only
 * - timelines and recovery actions stay untouched). Returns the PREVIOUS
 * values of exactly the patched fields so the Demo Director's checkpoint
 * restore can put them back; null = unknown id.
 */
export function restageIncident(
  id: string,
  patch: IncidentRestagePatch,
): IncidentRestagePatch | null {
  const incident = incidentById(id);
  if (!incident) return null;
  const prev: IncidentRestagePatch = {};
  if (patch.status !== undefined) {
    prev.status = incident.status;
    incident.status = patch.status;
  }
  if (patch.openedMinAgo !== undefined) {
    prev.openedMinAgo = incident.openedMinAgo;
    incident.openedMinAgo = patch.openedMinAgo;
  }
  return prev;
}
