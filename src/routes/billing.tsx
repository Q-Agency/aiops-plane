import { createFileRoute } from "@tanstack/react-router";
import { BillingView } from "@/components/monitor/BillingView";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Usage & Billing · Agency OS" }] }),
  component: BillingRoute,
});

function BillingRoute() {
  return <BillingView />;
}
