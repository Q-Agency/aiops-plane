/**
 * /intake (C10) - Work Intake: the confirmation surface of the single
 * doorbell (vision §2). The board sends work; the operator confirms or
 * declines each start. Tickets are created on the board, never here.
 * ?sim=error renders the tracker-unreachable demo state.
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { WorkIntakeView } from "@/components/intake/WorkIntakeView";

export const Route = createFileRoute("/intake")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Work Intake · Agency OS" }] }),
  validateSearch: (search: Record<string, unknown>): { sim?: "error" } =>
    search.sim === "error" ? { sim: "error" } : {},
  component: IntakeRoute,
});

function IntakeRoute() {
  const { sim } = Route.useSearch();
  return <WorkIntakeView simError={sim === "error"} />;
}
