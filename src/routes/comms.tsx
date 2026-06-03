import { createFileRoute } from "@tanstack/react-router";
import { CommsView } from "@/components/comms/CommsView";

export const Route = createFileRoute("/comms")({
  head: () => ({
    meta: [
      { title: "Comms & Escalations · Agency OS" },
      { name: "description", content: "Agent-initiated outbound communications and escalations." },
    ],
  }),
  component: CommsView,
});
