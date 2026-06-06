import { createFileRoute } from "@tanstack/react-router";
import { GovernanceView } from "@/components/governance/GovernanceView";
import { RealGovernanceView } from "@/components/governance/RealGovernanceView";
import { getGovernanceFn, type GovernanceData } from "@/lib/api/fleet.functions";

const EMPTY: GovernanceData = {
  specs: [],
  summary: {
    count: 0,
    completeness: {
      user_roles: 0,
      business_rules: 0,
      acceptance_criteria: 0,
      scope_boundaries: 0,
      error_handling: 0,
      data_model: 0,
    },
    completeness_avg: 0,
    ambiguities_total: 0,
  },
};

export const Route = createFileRoute("/governance")({
  loader: async ({ context }) => {
    if (context.user?.dataMode === "real") {
      const data = await getGovernanceFn().catch(() => EMPTY);
      return { mode: "real" as const, data };
    }
    return { mode: "mock" as const };
  },
  component: GovernanceRoute,
});

function GovernanceRoute() {
  const d = Route.useLoaderData();
  return d.mode === "real" ? <RealGovernanceView data={d.data} /> : <GovernanceView />;
}
