/**
 * view-role.ts (wave 2, ROLES) - the "viewing as" store behind the role-scoped
 * "/" landings. PM-only DEMO affordance: it never authenticates anything, it
 * just lets the Pod Admin preview what each persona lands on (spec: My
 * Workspace role-landing router + Read-only LeftRail).
 *
 * SSR-safe via useSyncExternalStore: the server (and first client paint)
 * always renders the default Pod Admin cockpit; the persisted persona
 * (localStorage "aiops_view_role_v1") is re-read right after hydration.
 *
 * Mock-only by construction - every consumer sits behind the experience gate
 * (real mode renders RealCommandCenter / the live rail and never calls this
 * with effect).
 */

import { useSyncExternalStore } from "react";
import { roles, type RoleId } from "./roles";

export const VIEW_ROLE_STORAGE_KEY = "aiops_view_role_v1";

const DEFAULT_ROLE: RoleId = "pod_admin";

/**
 * Owner request: the "Viewing as" persona switcher is hidden on the Overview
 * for now. While disabled, every consumer (the landing router + the read-only
 * LeftRail) sees the default Pod Admin, so nothing is stranded on a persisted
 * non-PM role. Flip to `true` to bring the demo control back.
 */
export const VIEW_AS_ENABLED: boolean = false;

const VALID_ROLE_IDS = new Set<string>(roles.map((r) => r.id));

/* ------------------------------------------------------------------ */
/* Store - module-level value + subscriber set                          */
/* ------------------------------------------------------------------ */

let current: RoleId = DEFAULT_ROLE;
/** Lazily read localStorage exactly once on the client. */
let hydrated = false;
const subscribers = new Set<() => void>();

function readStored(): RoleId {
  try {
    const raw = window.localStorage.getItem(VIEW_ROLE_STORAGE_KEY);
    return raw && VALID_ROLE_IDS.has(raw) ? (raw as RoleId) : DEFAULT_ROLE;
  } catch {
    return DEFAULT_ROLE;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange);
  return () => subscribers.delete(onStoreChange);
}

function getSnapshot(): RoleId {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    current = readStored();
  }
  return current;
}

/** Server snapshot - always the PM cockpit (matches the SSR'd markup). */
function getServerSnapshot(): RoleId {
  return DEFAULT_ROLE;
}

/** Set the viewing-as persona (persisted; junk input falls back to default). */
export function setViewRole(next: RoleId): void {
  hydrated = true;
  current = VALID_ROLE_IDS.has(next) ? next : DEFAULT_ROLE;
  try {
    window.localStorage.setItem(VIEW_ROLE_STORAGE_KEY, current);
  } catch {
    /* storage unavailable - session-only persona */
  }
  for (const fn of subscribers) fn();
}

/** The viewing-as persona + setter. Reload restores the persisted role. */
export function useViewRole(): { role: RoleId; setRole: (r: RoleId) => void } {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // While the switcher is hidden, pin everyone to the default cockpit so the
  // landing + rail never reflect a persisted non-PM role with no way back.
  return VIEW_AS_ENABLED
    ? { role: stored, setRole: setViewRole }
    : { role: DEFAULT_ROLE, setRole: () => {} };
}

/* ------------------------------------------------------------------ */
/* Landing resolution - which "/" surface a persona gets               */
/* ------------------------------------------------------------------ */

/**
 * Each persona lands on a view scoped to what it actually does:
 *   cockpit - the full operator Overview (Pod Admin - runs the whole pod);
 *   eng     - the Engineering Lead delivery floor (code/architecture gates +
 *             flow bottlenecks + technical incidents; no billing/ROI);
 *   qa      - the scoped QA gate queue + quality posture;
 *   exec    - the Sponsor "what did my money buy" digest (ROI $, SLA, report);
 *   status  - the Viewer read-only status board (pod health + pipeline + SLA,
 *             deliberately NON-financial - the money story is the sponsor's).
 */
export type ViewLanding = "cockpit" | "eng" | "qa" | "exec" | "status";

export function viewLandingFor(role: RoleId): ViewLanding {
  switch (role) {
    case "pod_admin":
      return "cockpit";
    case "eng_lead":
      return "eng";
    case "qa_lead":
      return "qa";
    case "sponsor":
      return "exec";
    case "viewer":
      return "status";
    default:
      // unknown role → read-only status board (spec fallback)
      return "status";
  }
}

/** Read-only personas - drives the filtered MONITOR-only LeftRail. */
export function isReadOnlyViewRole(role: RoleId): boolean {
  return role === "sponsor" || role === "viewer";
}
