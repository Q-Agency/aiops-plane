import { createFileRoute } from "@tanstack/react-router";
import { EconomicsView } from "@/components/economics/EconomicsView";

export const Route = createFileRoute("/economics")({
  component: EconomicsView,
});
