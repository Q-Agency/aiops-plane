/**
 * /settings/roles - Roles & Access (wave-2 COMPLETION).
 * Un-nested route (settings_.) so it does NOT mount inside /settings.
 * Mock experience only: real-mode users are redirected by mockOnlyBeforeLoad.
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { RolesAccessView } from "@/components/settings/RolesAccessView";

export const Route = createFileRoute("/settings_/roles")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Roles & Access · Agency OS" }] }),
  component: RolesAccessView,
});
