/**
 * Accountability acceptance store (/welcome, P1-O2) — "coverage is
 * accepted, not assigned." ONE seeded human (Ana) is assigned-but-
 * unaccepted until the Accept accountability action runs; the /pod
 * matrix renders her cells amber until then.
 *
 * Persisted in localStorage (`aiops_welcome_accepted_v1`) so revisits to
 * /welcome collapse to the "Accepted · {date} · ledger #{n}" stamp.
 * SSR-safe: useSyncExternalStore serves `null` during server render +
 * hydration, then flips to the stored record after mount (same external-
 * store pattern as src/mock/audit-bridge.ts).
 */

import { useSyncExternalStore } from "react";

export const WELCOME_ACCEPTED_KEY = "aiops_welcome_accepted_v1";

/** The ONE seeded assigned-but-not-yet-accepted human (/pod amber cells). */
export const UNACCEPTED_HUMAN_ID = "ana";

export interface AcceptanceRecord {
  /** humans.ts id of the accepting human. */
  humanId: string;
  /** Agent ids the acceptance covers — one Accept covers all of them. */
  agentIds: string[];
  /** Epoch millis at accept time. */
  at: number;
  /** Session audit row id — the "ledger #{n}" pointer on the stamp. */
  ledgerId: number;
  /** Deputy coverage (covers-not-owns) — the owner accountability stays with. */
  deputyOf?: string;
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

const subscribers = new Set<() => void>();

/** undefined = not yet read from storage; null = read, nothing stored. */
let snapshot: AcceptanceRecord | null | undefined;

function readStorage(): AcceptanceRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WELCOME_ACCEPTED_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as AcceptanceRecord;
    if (typeof rec?.at !== "number" || !Array.isArray(rec.agentIds)) return null;
    return rec;
  } catch {
    return null;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange);
  return () => subscribers.delete(onStoreChange);
}

function getSnapshot(): AcceptanceRecord | null {
  if (snapshot === undefined) snapshot = readStorage();
  return snapshot;
}

function getServerSnapshot(): AcceptanceRecord | null {
  return null;
}

/** Persist + broadcast an acceptance (optimistic, survives reloads). */
export function recordAcceptance(rec: AcceptanceRecord): void {
  snapshot = rec;
  try {
    window.localStorage.setItem(WELCOME_ACCEPTED_KEY, JSON.stringify(rec));
  } catch {
    /* storage unavailable — session-only acceptance still works */
  }
  for (const fn of subscribers) fn();
}

/**
 * The current acceptance, or null while unaccepted. Server-renders null,
 * then flips to the stored record right after hydration — so /welcome and
 * the /pod matrix react in the same session without a reload.
 */
export function useAcceptance(): AcceptanceRecord | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
