import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "SLA & Reports · Agency OS" }] }),
  component: ReportsRoute,
});

function ReportsRoute() {
  return (
    <PlaceholderPage
      icon={FileBarChart}
      title="SLA & Reports"
      purpose="SLA definitions and a shareable weekly client report — the sponsor-facing artifact of the pod."
      buildOrder={8}
    />
  );
}
