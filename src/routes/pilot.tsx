/**
 * /pilot - Pilot Scorecard (wave 2, P1-C3). Rail item renders only while
 * the tenant is in pilot mode (src/mock/pilot.ts PILOT_MODE).
 * Mock experience only: real-mode users are redirected by mockOnlyBeforeLoad.
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { PilotView } from "@/components/pilot/PilotView";

export const Route = createFileRoute("/pilot")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Pilot scorecard · AI PodOps" }] }),
  component: PilotView,
});
