import { createFileRoute } from "@tanstack/react-router";
import { TraceabilityView } from "@/components/traceability/TraceabilityView";

export const Route = createFileRoute("/traceability")({
  component: TraceabilityView,
});
