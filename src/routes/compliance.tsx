import { createFileRoute } from "@tanstack/react-router";
import { ComplianceView } from "@/components/compliance/ComplianceView";

export const Route = createFileRoute("/compliance")({
  component: ComplianceView,
});
