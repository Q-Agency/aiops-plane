import { createFileRoute } from "@tanstack/react-router";
import { ComplianceView } from "@/components/compliance/ComplianceView";
import { RealComplianceView } from "@/components/compliance/RealComplianceView";
import { getAuditFn, type AuditData } from "@/lib/api/fleet.functions";

const EMPTY: AuditData = { enabled: false, entries: [] };

export const Route = createFileRoute("/compliance")({
  loader: async ({ context }) => {
    if (context.user?.dataMode === "real") {
      const data = await getAuditFn().catch(() => EMPTY);
      return { mode: "real" as const, data };
    }
    return { mode: "mock" as const };
  },
  component: ComplianceRoute,
});

function ComplianceRoute() {
  const d = Route.useLoaderData();
  return d.mode === "real" ? <RealComplianceView initial={d.data} /> : <ComplianceView />;
}
