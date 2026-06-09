import { createFileRoute } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export const Route = createFileRoute("/incidents")({
  head: () => ({ meta: [{ title: "Incidents · Agency OS" }] }),
  component: IncidentsRoute,
});

function IncidentsRoute() {
  return (
    <PlaceholderPage
      icon={Siren}
      title="Incidents & Recovery"
      purpose="Tool disconnects, stuck runs and SLA breaches land here — triage and recover, with every action written to the audit ledger."
      buildOrder={6}
    />
  );
}
