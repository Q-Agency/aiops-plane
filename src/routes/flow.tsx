import { createFileRoute } from "@tanstack/react-router";
import { FlowView } from "@/components/flow/FlowView";
import { RealFlowView } from "@/components/flow/RealFlowView";
import { getFlowAnalyticsFn, type FlowAnalyticsData } from "@/lib/api/fleet.functions";

const EMPTY: FlowAnalyticsData = {
  totals: {
    runs: 0,
    succeeded: 0,
    sessions: 0,
    firstTryPct: 0,
    reworkPct: 0,
    avgTurns: 0,
    maxTurns: 0,
    avgSessionMs: 0,
    firstTryRate: null,
    firstTryCount: 0,
    finalizeDenom: 0,
    successRate: 0,
    p50Ms: null,
    p95Ms: null,
    resets: 0,
    approvals: 0,
    openGate: 0,
    eventsWindowed: true,
    avgCompleteness: null,
    completenessN: 0,
  },
  durationHist: [],
  byFinalize: [],
  sessions: [],
  trail: [],
  completenessTrend: [],
};

export const Route = createFileRoute("/flow")({
  loader: async ({ context }) => {
    if (context.user?.dataMode === "real") {
      const data = await getFlowAnalyticsFn().catch(() => EMPTY);
      return { mode: "real" as const, data };
    }
    return { mode: "mock" as const };
  },
  component: FlowRoute,
});

function FlowRoute() {
  const d = Route.useLoaderData();
  return d.mode === "real" ? <RealFlowView initial={d.data} /> : <FlowView />;
}
