import { createFileRoute } from "@tanstack/react-router";
import { FlowView } from "@/components/flow/FlowView";

export const Route = createFileRoute("/flow")({
  component: FlowView,
});
