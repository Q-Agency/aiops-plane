import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { BillingView } from "@/components/monitor/BillingView";

export const Route = createFileRoute("/billing")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Usage & Billing · AI PodOps" }] }),
  component: BillingRoute,
});

function BillingRoute() {
  return <BillingView />;
}
