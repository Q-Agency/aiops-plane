import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { WizardShell } from "@/components/fireup/WizardShell";

const wizardSearchSchema = z.object({
  step: z.enum(["blueprint", "agents", "connect", "people", "slack", "golive"]).catch("blueprint"),
});

export const Route = createFileRoute("/pods/new")({
  validateSearch: wizardSearchSchema,
  head: () => ({ meta: [{ title: "New Pod · Agency OS" }] }),
  component: NewPodRoute,
});

function NewPodRoute() {
  const { step } = Route.useSearch();
  return <WizardShell step={step} />;
}
