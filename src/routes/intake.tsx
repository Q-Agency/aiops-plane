/**
 * /intake (C10) — Work Intake: the client-board picker (scope-matched
 * checkbox table), the "Paste a ticket" composer, and per-ticket routing
 * previews. Pulled rows land at the top of the Pipeline Backlog.
 * ?sim=error renders the tracker-unreachable demo state.
 */

import { createFileRoute } from "@tanstack/react-router";
import { WorkIntakeView } from "@/components/intake/WorkIntakeView";

export const Route = createFileRoute("/intake")({
  head: () => ({ meta: [{ title: "Work Intake · Agency OS" }] }),
  validateSearch: (search: Record<string, unknown>): { sim?: "error" } =>
    search.sim === "error" ? { sim: "error" } : {},
  component: IntakeRoute,
});

function IntakeRoute() {
  const { sim } = Route.useSearch();
  return <WorkIntakeView simError={sim === "error"} />;
}
