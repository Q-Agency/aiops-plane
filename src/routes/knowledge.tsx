import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeView } from "@/components/knowledge/KnowledgeView";

export const Route = createFileRoute("/knowledge")({
  component: KnowledgeView,
});
