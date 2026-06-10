/**
 * Shared Report Viewer seeds (/share/$token, wave 2, P1-H4) — the targets
 * of every "Copy share link": chrome-less, client-clean report renders for
 * people with no account. Expired/revoked tokens leak NO report data; an
 * active view is itself audited ("this view is recorded").
 */

import { appendAuditMock, type AuditEntryLike } from "./audit-bridge";

export type ShareKind = "weekly_report" | "usage_statement" | "exec_digest";
export type ShareState = "active" | "expired" | "revoked";

export interface ShareLink {
  token: string;
  kind: ShareKind;
  /** What it renders: report id (report.ts) or statement periodId (billing.ts). */
  targetId: string;
  /** Human id from humans.ts ("ask {sender} for a fresh one"). */
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  state: ShareState;
  views: { at: number }[];
}

export const SHARE_KIND_LABELS: Record<ShareKind, string> = {
  weekly_report: "Weekly status report",
  usage_statement: "Usage statement",
  exec_digest: "Exec digest",
};

const DAY = 86_400_000;
const HOUR = 3_600_000;
const now = Date.now();

export const SHARE_LINKS: ShareLink[] = [
  {
    // ACTIVE — the current weekly report (report.ts rep-2026-w24).
    token: "qshare-am-weekly-7f3k",
    kind: "weekly_report",
    targetId: "rep-2026-w24",
    createdBy: "ana",
    createdAt: now - 2 * DAY,
    expiresAt: now + 14 * DAY,
    state: "active",
    views: [{ at: now - 1 * DAY }, { at: now - 3 * HOUR }],
  },
  {
    // EXPIRED — last month's usage statement (billing.ts periodId 2026-05).
    token: "qshare-am-usage-2c9d",
    kind: "usage_statement",
    targetId: "2026-05",
    createdBy: "zlatko",
    createdAt: now - 40 * DAY,
    expiresAt: now - 10 * DAY,
    state: "expired",
    views: [{ at: now - 38 * DAY }, { at: now - 33 * DAY }, { at: now - 26 * DAY }],
  },
  {
    // REVOKED — prior week's exec digest, pulled by the pod admin.
    token: "qshare-am-exec-9k1z",
    kind: "exec_digest",
    targetId: "rep-2026-w23",
    createdBy: "ana",
    createdAt: now - 12 * DAY,
    expiresAt: now + 2 * DAY, // revoked before natural expiry
    state: "revoked",
    views: [{ at: now - 11 * DAY }],
  },
];

/** Lookup by token — undefined means "unknown token" (neutral not-found card). */
export function shareByToken(token: string): ShareLink | undefined {
  return SHARE_LINKS.find((l) => l.token === token);
}

/** State with wall-clock expiry applied (an "active" link past expiresAt is expired). */
export function effectiveShareState(link: ShareLink, at: number = Date.now()): ShareState {
  if (link.state === "revoked") return "revoked";
  if (link.state === "expired" || at >= link.expiresAt) return "expired";
  return "active";
}

/**
 * Records one view of an ACTIVE link: appends to `views` and writes the
 * audited view event ("report viewed via share link") to the session ledger.
 * Returns null for expired/revoked/unknown tokens (no data, no audit row).
 */
export function recordShareView(token: string): AuditEntryLike | null {
  const link = shareByToken(token);
  if (!link || effectiveShareState(link) !== "active") return null;
  link.views.push({ at: Date.now() });
  return appendAuditMock({
    action: "data.exported",
    target: `share:${link.token}`,
    detail: `${SHARE_KIND_LABELS[link.kind]} viewed via share link`,
  });
}
