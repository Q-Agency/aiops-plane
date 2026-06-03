import { createFileRoute } from "@tanstack/react-router";
import { ApprovalsView } from "@/components/approvals/ApprovalsView";

export const Route = createFileRoute("/approvals")({
  component: ApprovalsView,
});
