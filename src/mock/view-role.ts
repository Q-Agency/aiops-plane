/**
 * view-role.ts (wave 2, ROLES) — the "viewing as" store behind the role-scoped
 * "/" landings. PM-only DEMO affordance: it never authenticates anything, it
 * just lets the Pod Admin preview what each persona lands on (spec: My
 * Workspace role-landing router + Read-only LeftRail).
 *
 * SSR-safe via useSyncExternalStore: the server (and first client paint)
 * always renders the default Pod Admin cockpit; the persisted persona
 * (localStorage "aiops_view_role_v1") is re-read right after hydration.
 *
 * Mock-only by construction — every consumer sits behind the experience gate
 * (real mode renders RealCommandCenter / the live rail and never calls this
 * with effect).
 */

import { useSyncExternalStore } from "react";
import { roles, type RoleId } from "./roles";

export const VIEW_ROLE_STORAGE_KEY = "aiops_view_role_v1";

const DEFAULT_ROLE: RoleId = "pod_admin";

const VALID_ROLE_IDS = new Set<string>(roles.map((r) => r.id));

/* ------------------------------------------------------------------ */
/* Store — module-level value + subscriber set                          */
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

/** Server snapshot — always the PM cockpit (matches the SSR'd markup). */
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
    /* storage unavailable — session-only persona */
  }
  for (const fn of subscribers) fn();
}

/** The viewing-as persona + setter. Reload restores the persisted role. */
export function useViewRole(): { role: RoleId; setRole: (r: RoleId) => void } {
  const role = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { role, setRole: setViewRole };
}

/* ------------------------------------------------------------------ */
/* Landing resolution — which "/" surface a persona gets               */
/* ------------------------------------------------------------------ */

/**
 * cockpit — the existing mock Overview (RUN landing) (Pod Admin; Eng Lead previews
 *           the same operator cockpit in this slice);
 * qa      — the scoped QA gate queue;
 * exec    — the read-only Exec Status Digest (sponsor + viewer, and the
 *           fallback for anything unknown).
 */
export type ViewLanding = "cockpit" | "qa" | "exec";

export function viewLandingFor(role: RoleId): ViewLanding {
  switch (role) {
    case "pod_admin":
    case "eng_lead":
      return "cockpit";
    case "qa_lead":
      return "qa";
    case "sponsor":
    case "viewer":
      return "exec";
    default:
      // unknown role → read-only digest (spec fallback)
      return "exec";
  }
}

/** Read-only personas — drives the filtered MONITOR-only LeftRail. */
export function isReadOnlyViewRole(role: RoleId): boolean {
  return role === "sponsor" || role === "viewer";
}
