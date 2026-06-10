import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { PodView } from "@/components/pod/PodView";

export const Route = createFileRoute("/pod")({
  beforeLoad: mockOnlyBeforeLoad,
  component: PodView,
});
