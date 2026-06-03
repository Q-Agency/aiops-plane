import { createFileRoute } from "@tanstack/react-router";
import { PodView } from "@/components/pod/PodView";

export const Route = createFileRoute("/pod")({
  component: PodView,
});
