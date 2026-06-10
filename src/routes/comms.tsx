import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { CommsView } from "@/components/comms/CommsView";

export const Route = createFileRoute("/comms")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({
    meta: [
      { title: "Comms & Escalations · Agency OS" },
      { name: "description", content: "Agent-initiated outbound communications and escalations." },
    ],
  }),
  component: CommsView,
});
