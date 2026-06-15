/**
 * Experience gate (wave 2) - the single helper that walls the FULL mock
 * product off from the live-only experience.
 *
 * EXPERIENCE RULE (since 2026-06-12): `user.dataMode` is the EFFECTIVE
 * mode - the account's default ("standard" for qai@, "real" for zlatko)
 * unless the per-browser switch (Settings → Experience) overrides it; the
 * override is resolved server-side in fetchUser (auth.ts), so every
 * consumer here sees one truth. "standard" = the full product on sample
 * data; "real" = only live-connected surfaces. Mock-only routes attach
 * `beforeLoad: mockOnlyBeforeLoad` so the live experience can never land
 * on a seeded screen.
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
