/**
 * /pitch - Agency OS product brief: chrome-less, no-auth, client-clean
 * single-page document (the printable approval pack).
 *
 * NO mock-only guard and NO auth - it's a brief, not app data. The root
 * route's beforeLoad skips the /login redirect for /pitch (same escape as
 * /share/*) and returns a null user, so the AppShell never wraps this page
 * (see __root.tsx). [DEMO] pills link into the app and cross the auth
 * boundary intentionally - logged-out readers land on /login, correctly.
 */

import { createFileRoute } from "@tanstack/react-router";
import { PitchPage } from "@/components/pitch/PitchPage";

export const Route = createFileRoute("/pitch")({
  head: () => ({ meta: [{ title: "Agency OS - Product Brief" }] }),
  component: PitchPage,
});
