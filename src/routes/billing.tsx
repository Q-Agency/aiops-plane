import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Usage & Billing · Agency OS" }] }),
  component: BillingRoute,
});

function BillingRoute() {
  return (
    <PlaceholderPage
      icon={CreditCard}
      title="Usage & Billing"
      purpose="Consumption vs. plan, budget alerts and a monthly statement — the commercial fundamentals of the pod."
      buildOrder={10}
    />
  );
}
