import { createFileRoute } from "@tanstack/react-router";
import { ReportsView } from "@/components/reports/ReportsView";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "SLA & Reports · Agency OS" }] }),
  component: ReportsView,
});
