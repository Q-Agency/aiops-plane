import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { WizardShell } from "@/components/fireup/WizardShell";

const wizardSearchSchema = z.object({
  step: z.enum(["blueprint", "agents", "connect", "people", "slack", "golive"]).catch("blueprint"),
});

export const Route = createFileRoute("/pods/new")({
  beforeLoad: mockOnlyBeforeLoad,
  validateSearch: wizardSearchSchema,
  head: () => ({ meta: [{ title: "New Pod · AI PodOps" }] }),
  component: NewPodRoute,
});

function NewPodRoute() {
  const { step } = Route.useSearch();
  return <WizardShell step={step} />;
}
