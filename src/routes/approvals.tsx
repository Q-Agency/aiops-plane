import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { ApprovalsView } from "@/components/approvals/ApprovalsView";

export const Route = createFileRoute("/approvals")({
  beforeLoad: mockOnlyBeforeLoad,
  component: ApprovalsView,
});
