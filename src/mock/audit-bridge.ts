/**
 * Session audit overlay (wave 2) — the in-memory ledger every wave-2 screen
 * writes to (welcome accept, memory ratify/forget, copilot confirms, share
 * views, artifact exports). Entries live for the browser session only and
 * render ON TOP of the seeded compliance AUDIT rows — they are the "written
 * to the ledger ✓" proof behind every optimistic mock mutation.
 *
 * Ids start at 5001 so session rows are visually distinct from seeds.
 */

import { useSyncExternalStore } from "react";

export interface AuditEntryLike {
  id: number;
  /** Epoch millis at append time. */
  at: number;
  /** Vocabulary verb, e.g. "accountability.accepted", "constitution.amended". */
  action: string;
  /** What it acted on, e.g. "appr-AM-142", "rule cr-3". */
  target?: string;
  /** Free-text detail / typed reason. */
  detail?: string;
  actor: { kind: "human" | "system"; name?: string };
}

/* ------------------------------------------------------------------ */
/* Store — module-level rows + subscriber set                           */
/* ------------------------------------------------------------------ */

const rows: AuditEntryLike[] = [];
const subscribers = new Set<() => void>();
let nextId = 5001;

/**
 * Cached snapshot — useSyncExternalStore must receive a STABLE array
 * reference between appends (a fresh array per getSnapshot call would
 * loop React). Replaced only inside appendAuditMock.
 */
let snapshot: AuditEntryLike[] = [];

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange);
  return () => subscribers.delete(onStoreChange);
}

function getSnapshot(): AuditEntryLike[] {
  return snapshot;
}

/**
 * Append one session audit row (optimistic mock mutation proof).
 * Actor defaults to the signed-in human; pass `actorName` for display.
 */
export function appendAuditMock(e: {
  action: string;
  target?: string;
  detail?: string;
  actorName?: string;
}): AuditEntryLike {
  const entry: AuditEntryLike = {
    id: nextId++,
    at: Date.now(),
    action: e.action,
    target: e.target,
    detail: e.detail,
    actor: { kind: "human", name: e.actorName },
  };
  rows.push(entry);
  snapshot = rows.slice();
  for (const fn of subscribers) fn();
  return entry;
}

/**
 * Live session rows (oldest → newest). The returned reference only changes
 * when a row is appended, so it is safe in deps arrays.
 */
export function useSessionAudit(): AuditEntryLike[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Non-hook read of the current session rows (loaders, copilot answers). */
export function sessionAuditRows(): AuditEntryLike[] {
  return snapshot;
}
