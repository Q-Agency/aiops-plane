/**
 * /approvals/$gateId — the canonical gate-review URL (C1).
 *
 * File is `approvals_.$gateId.tsx` (trailing-underscore segment) so the
 * route does NOT nest under /approvals — ApprovalsView has no Outlet; the
 * review surface owns the full content region. The URL stays exactly
 * /approvals/$gateId.
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { GateReviewShell } from "@/components/gates/GateReviewShell";

export const Route = createFileRoute("/approvals_/$gateId")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Gate Review · Agency OS" }] }),
  component: GateReviewRoute,
});

function GateReviewRoute() {
  const { gateId } = Route.useParams();
  return <GateReviewShell gateId={gateId} />;
}
