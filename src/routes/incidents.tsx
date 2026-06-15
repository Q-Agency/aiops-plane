/**
 * /incidents - Incidents & Recovery (C5). Deep-linkable via ?incident=<id>
 * (bell notifications, ⌘K, /comms escalations).
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { IncidentsView } from "@/components/incidents/IncidentsView";

export const Route = createFileRoute("/incidents")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Incidents & Recovery · AI PodOps" }] }),
  validateSearch: (search: Record<string, unknown>): { incident?: string } =>
    typeof search.incident === "string" && search.incident.length > 0
      ? { incident: search.incident }
      : {},
  component: IncidentsRoute,
});

function IncidentsRoute() {
  const { incident } = Route.useSearch();
  return <IncidentsView deepLinkId={incident} />;
}
