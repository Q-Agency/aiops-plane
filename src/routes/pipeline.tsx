import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";

export const Route = createFileRoute("/pipeline")({
  beforeLoad: mockOnlyBeforeLoad,
  // ?ticket=<id> - deep link from Work Intake routing previews (C10);
  // the matching card gets a highlight ring on the board.
  validateSearch: (search: Record<string, unknown>): { ticket?: string } =>
    typeof search.ticket === "string" && search.ticket.length > 0
      ? { ticket: search.ticket }
      : {},
  component: PipelineRoute,
});

function PipelineRoute() {
  const { ticket } = Route.useSearch();
  return <PipelineBoard highlightTicketId={ticket} />;
}
