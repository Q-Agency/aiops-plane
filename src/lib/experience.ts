/**
 * Experience gate (wave 2) — the single helper that walls the FULL mock
 * product off from real-mode accounts.
 *
 * EXPERIENCE RULE: user.dataMode === "standard" (qai@) sees the full mock
 * product; dataMode === "real" (zlatko) sees ONLY live-connected surfaces.
 * Wave-2 mock-only routes attach `beforeLoad: mockOnlyBeforeLoad` so a
 * real-mode user can never land on a seeded screen.
 *
 * Typing is intentionally structural/loose so any file route can use it
 * without generics pain.
 */

import { redirect } from "@tanstack/react-router";

/** True when the user should see the mock experience (anything but "real"). */
export function isMock(user?: { dataMode?: string } | null): boolean {
  return user?.dataMode !== "real";
}

/**
 * Route guard for mock-only screens: real-mode users are bounced to "/".
 * Usage: `createFileRoute("/memory")({ beforeLoad: mockOnlyBeforeLoad, … })`.
 */
export function mockOnlyBeforeLoad(ctx: {
  context: { user?: { dataMode?: string } | null };
}): void {
  if (!isMock(ctx.context.user)) {
    throw redirect({ to: "/" });
  }
}
