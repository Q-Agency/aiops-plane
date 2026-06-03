import { createFileRoute } from "@tanstack/react-router";
import { GovernanceView } from "@/components/governance/GovernanceView";

export const Route = createFileRoute("/governance")({
  component: GovernanceView,
});
