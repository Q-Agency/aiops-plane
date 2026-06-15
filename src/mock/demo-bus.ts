/**
 * Demo bus (wave-2 COMPLETION) - a tiny reactive tick for the Demo Director.
 *
 * The Director's staged steps mutate the existing in-memory mock stores
 * (approvals, notifications, incidents, tickets…). Those arrays are not
 * reactive on their own, so any view that should repaint when a staged
 * mutation lands calls `useDemoTick()` - and every `fire()` in
 * demoDirector.ts ends with `bumpDemo()`.
 *
 * Zero deps, zero context: a module-level version counter over
 * useSyncExternalStore. SSR-safe (server snapshot = same counter).
 */

import { useSyncExternalStore } from "react";

let version = 0;
const subscribers = new Set<() => void>();

/** Notify every subscribed view that staged mock mutations landed. */
export function bumpDemo(): void {
  version++;
  for (const fn of subscribers) fn();
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** Stable snapshot - the same function instance for client and server. */
function getSnapshot(): number {
  return version;
}

/**
 * Re-render when the Demo Director lands a staged mutation.
 * Usage: `useDemoTick();` at the top of any mock view - the returned
 * number is only useful as a dependency key.
 */
export function useDemoTick(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
