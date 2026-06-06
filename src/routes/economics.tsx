import { createFileRoute } from "@tanstack/react-router";
import { EconomicsView } from "@/components/economics/EconomicsView";
import { RealEconomicsView } from "@/components/economics/RealEconomicsView";
import { getEconomicsFn, type EconomicsData } from "@/lib/api/fleet.functions";

const EMPTY: EconomicsData = {
  totals: { runs: 0, succeeded: 0, cost: 0, tokensIn: 0, tokensOut: 0 },
  byModel: [],
  byProject: [],
  byDay: [],
};

export const Route = createFileRoute("/economics")({
  loader: async ({ context }) => {
    if (context.user?.dataMode === "real") {
      const data = await getEconomicsFn().catch(() => EMPTY);
      return { mode: "real" as const, data };
    }
    return { mode: "mock" as const };
  },
  component: EconomicsRoute,
});

function EconomicsRoute() {
  const d = Route.useLoaderData();
  return d.mode === "real" ? <RealEconomicsView initial={d.data} /> : <EconomicsView />;
}
