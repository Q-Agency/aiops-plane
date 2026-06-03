import { createFileRoute } from "@tanstack/react-router";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";

export const Route = createFileRoute("/pipeline")({
  component: PipelineBoard,
});
