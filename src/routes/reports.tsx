import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { ReportsView } from "@/components/reports/ReportsView";

export const Route = createFileRoute("/reports")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "SLA & Reports · AI PodOps" }] }),
  component: ReportsView,
});
