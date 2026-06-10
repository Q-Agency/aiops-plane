/**
 * /artifacts — Deliverables (wave 2, Blind spot 4): the shelf of everything
 * the pod has produced, snapshotted at gate-clearance.
 * Mock experience only: real-mode users are redirected by mockOnlyBeforeLoad.
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { ArtifactsView } from "@/components/artifacts/ArtifactsView";

export const Route = createFileRoute("/artifacts")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Deliverables · Agency OS" }] }),
  component: ArtifactsView,
});
