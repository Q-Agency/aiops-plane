import { KpiTile } from "./KpiTile";
import { useLive } from "@/hooks/useLiveTicker";

// deterministic pseudo-random so SSR and client match
const sp = (b: number, n = 18) =>
  Array.from({ length: n }, (_, i) => {
    const r = Math.sin(i * 12.9898 + b * 78.233) * 43758.5453;
    const noise = (r - Math.floor(r)) - 0.5;
    return b + Math.sin(i / 2) * b * 0.2 + noise * b * 0.18;
  });

export function KpiStrip() {
  const { tickets, approvals, tokenSpend, gpuUtil } = useLive();
  const inFlight = tickets.filter((t) => t.stage !== "done" && t.stage !== "backlog").length;
  const interventions = approvals.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      <KpiTile label="Tickets in flight"      value={inFlight}         delta={+8.2}  sparkline={sp(inFlight + 2)}   accent="agent-pm" />
      <KpiTile label="Throughput / wk"        value={23}               delta={+12.4} sparkline={sp(20)}             accent="agent-dev" />
      <KpiTile label="Avg cycle (days)"       value={3.4} format={(n) => n.toFixed(1)} delta={-6.3} sparkline={sp(4)} accent="agent-tasklist" />
      <KpiTile label="Human intervents·24h"   value={interventions}    delta={-3.1}  sparkline={sp(interventions+1)} accent="agent-review" />
      <KpiTile label="Auto-approval %"        value={64} format={(n)=>`${Math.round(n)}%`} delta={+4.2} sparkline={sp(60)} accent="agent-curator" />
      <KpiTile label="Token spend·$"          value={tokenSpend} format={(n)=>`$${n.toFixed(2)}`} delta={+18.7} sparkline={sp(190)} accent="agent-ba" />
      <KpiTile label="GPU util %"             value={gpuUtil} format={(n)=>`${Math.round(n)}%`} delta={+2.1} sparkline={sp(70)} accent="agent-sa" />
      <KpiTile label="Overnight PRs"          value={11}               delta={+22.0} sparkline={sp(9)}              accent="agent-qa" />
    </div>
  );
}
