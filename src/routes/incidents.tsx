/**
 * /incidents — Incidents & Recovery (C5). Deep-linkable via ?incident=<id>
 * (bell notifications, ⌘K, /comms escalations).
 */

import { createFileRoute } from "@tanstack/react-router";
import { IncidentsView } from "@/components/incidents/IncidentsView";

export const Route = createFileRoute("/incidents")({
  head: () => ({ meta: [{ title: "Incidents & Recovery · Agency OS" }] }),
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
