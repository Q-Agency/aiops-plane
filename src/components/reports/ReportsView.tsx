/**
 * ReportsView (/reports, C8) — SLA & Client Reports, two tabs:
 *
 *  - "SLA status" (DEFAULT): SlaDefinition rows with target-vs-actual bars
 *    + breach history drawer. The PM's breach-spotting surface.
 *  - "Client report": the weekly sponsor-facing report in a CLIENT-CLEAN
 *    style (light paper card — deliberately NOT glass/neon) with
 *    Copy share link / Export PDF / Mark as sent (all mock).
 *
 * The TopBar pod switcher is canonical; the header chip mirrors the
 * active pod.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePods } from "@/lib/pods/pod-store";
import { SlaStatusTab } from "./SlaStatusTab";
import { ClientReportTab } from "./ClientReportTab";

export function ReportsView() {
  const { activePod } = usePods();

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      {/* header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            monitor · service levels & the sponsor artifact
          </div>
          <h1 className="text-xl font-semibold tracking-tight">SLA &amp; Reports</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            Service-level targets per stage, and the weekly status report your sponsor reads.
          </div>
        </div>
        <div className="text-[11px] font-mono text-muted-foreground glass-panel px-3 py-1.5" suppressHydrationWarning>
          <span className="text-foreground">{activePod?.name ?? "—"}</span>
          <span className="mx-1.5">·</span>
          this period
        </div>
      </div>

      <Tabs defaultValue="sla" className="flex-1 min-h-0">
        <TabsList className="bg-white/[0.04] border border-border h-8">
          <TabsTrigger
            value="sla"
            className="text-[11px] font-mono uppercase tracking-wider px-3 py-0.5"
          >
            SLA status
          </TabsTrigger>
          <TabsTrigger
            value="report"
            className="text-[11px] font-mono uppercase tracking-wider px-3 py-0.5"
          >
            Client report
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sla" className="mt-3">
          <SlaStatusTab />
        </TabsContent>
        <TabsContent value="report" className="mt-3">
          <ClientReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
