import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { TraceabilityView } from "@/components/traceability/TraceabilityView";

export const Route = createFileRoute("/traceability")({
  beforeLoad: mockOnlyBeforeLoad,
  component: TraceabilityView,
});
