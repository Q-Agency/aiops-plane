/**
 * ArtifactsView — /artifacts "Deliverables" (wave 2, Blind spot 4): the
 * shelf of everything the pod has produced, snapshotted at gate-clearance.
 *
 *   1. Header — count chip + "Export all" (mock zip → data.exported audit
 *      row + toast).
 *   2. Filter bar — kind (chain.ts ArtifactKind) · ticket · period ·
 *      approver (simple local-state selects).
 *   3. ArtifactsTable — approved-by joined from the seeds; gate links to
 *      the canonical /approvals/$gateId.
 *   4. Row click → VersionTimeline sheet (rejected-iteration diffs +
 *      SnapshotStamp).
 *
 * Empty state per spec: deliverables land at gate-clearance and stay even
 * if an agent resets (the control-plane snapshot rule).
 */

import { useMemo, useState } from "react";
import { Download, Package, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appendAuditMock } from "@/mock/audit-bridge";
import { ARTIFACT_SNAPSHOTS, SNAPSHOT_STAMP, type ArtifactSnapshot } from "@/mock/artifacts";
import type { ArtifactKind } from "@/mock/chain";
import { approverFor, KIND_LABEL, KIND_ORDER } from "./artifact-ui";
import { ArtifactsTable } from "./ArtifactsTable";
import { VersionTimeline } from "./VersionTimeline";

/* ----------------------------- filters ------------------------------- */

type PeriodKey = "all" | "24h" | "7d" | "30d";

const PERIOD_LABEL: Record<PeriodKey, string> = {
  all: "All time",
  "24h": "Last 24h",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const PERIOD_MS: Record<Exclude<PeriodKey, "all">, number> = {
  "24h": 24 * 3_600_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
};

/* ------------------------------- view -------------------------------- */

export function ArtifactsView() {
  const [kind, setKind] = useState<ArtifactKind | "all">("all");
  const [ticket, setTicket] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [approver, setApprover] = useState<string>("all");
  const [openSnapshot, setOpenSnapshot] = useState<ArtifactSnapshot | null>(null);

  // Newest clearance first — the renewal-meeting question reads top-down.
  const shelf = useMemo(
    () => [...ARTIFACT_SNAPSHOTS].sort((a, b) => b.approvedAt - a.approvedAt),
    [],
  );

  const kindOptions = useMemo(
    () => KIND_ORDER.filter((k) => shelf.some((s) => s.kind === k)),
    [shelf],
  );
  const ticketOptions = useMemo(
    () => [...new Set(shelf.map((s) => s.ticketId))].sort(),
    [shelf],
  );
  const approverOptions = useMemo(
    () => [...new Set(shelf.map((s) => approverFor(s)))].sort(),
    [shelf],
  );

  const filtered = shelf.filter((s) => {
    if (kind !== "all" && s.kind !== kind) return false;
    if (ticket !== "all" && s.ticketId !== ticket) return false;
    if (approver !== "all" && approverFor(s) !== approver) return false;
    if (period !== "all" && s.approvedAt < Date.now() - PERIOD_MS[period]) return false;
    return true;
  });

  const hasFilters = kind !== "all" || ticket !== "all" || period !== "all" || approver !== "all";

  const clearFilters = () => {
    setKind("all");
    setTicket("all");
    setPeriod("all");
    setApprover("all");
  };

  const exportAll = () => {
    const entry = appendAuditMock({
      action: "data.exported",
      target: "artifacts · all",
      detail: `${shelf.length} deliverables · deliverables.zip (mock)`,
    });
    toast.success("Export prepared — written to audit ledger ✓", {
      description: `${shelf.length} deliverables · deliverables.zip (mock) · ${entry.action}`,
    });
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      {/* 1 · header */}
      <header className="flex items-center gap-3 flex-wrap shrink-0">
        <div className="size-9 rounded-md bg-primary/10 border border-primary/30 grid place-items-center text-primary">
          <Package className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold tracking-tight">Deliverables</h1>
            <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
              {shelf.length} snapshotted
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            What your pod produced — snapshotted at gate-clearance, owned by you.
          </p>
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={exportAll} disabled={shelf.length === 0}>
          <Download className="size-3.5 mr-1.5" />
          Export all
        </Button>
      </header>

      {/* 2 · filter bar */}
      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        <Select value={kind} onValueChange={(v) => setKind(v as ArtifactKind | "all")}>
          <SelectTrigger className="h-7 w-auto min-w-[110px] text-[11px] bg-white/5 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All kinds
            </SelectItem>
            {kindOptions.map((k) => (
              <SelectItem key={k} value={k} className="text-xs">
                {KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ticket} onValueChange={setTicket}>
          <SelectTrigger className="h-7 w-auto min-w-[96px] text-[11px] bg-white/5 border-border font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All tickets
            </SelectItem>
            {ticketOptions.map((t) => (
              <SelectItem key={t} value={t} className="text-xs font-mono">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="h-7 w-auto min-w-[96px] text-[11px] bg-white/5 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((p) => (
              <SelectItem key={p} value={p} className="text-xs">
                {PERIOD_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={approver} onValueChange={setApprover}>
          <SelectTrigger className="h-7 w-auto min-w-[110px] text-[11px] bg-white/5 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All approvers
            </SelectItem>
            {approverOptions.map((a) => (
              <SelectItem key={a} value={a} className="text-xs">
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 cursor-pointer"
          >
            Clear
          </button>
        )}
        <span className="flex-1" />
        <span className="text-[10px] font-mono text-muted-foreground">
          {filtered.length} of {shelf.length} shown
        </span>
      </div>

      {/* 3 · shelf */}
      {shelf.length === 0 ? (
        <div className="glass-panel p-10 text-center space-y-2">
          <Package className="size-6 text-muted-foreground mx-auto" />
          <div className="text-sm font-medium">Nothing delivered yet</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Approved artifacts land here the moment a gate clears, and stay here even if an
            agent resets.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-8 text-center space-y-2">
          <div className="text-sm font-medium">No deliverables match these filters</div>
          <p className="text-xs text-muted-foreground">
            Every approved artifact stays on the shelf — broaden the filters to see it.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-primary hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <ArtifactsTable rows={filtered} onOpen={setOpenSnapshot} />
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-muted-foreground shrink-0">
            <ShieldCheck className="size-3 text-status-done" />
            {SNAPSHOT_STAMP}
          </div>
        </>
      )}

      {/* 4 · version timeline sheet */}
      <VersionTimeline snapshot={openSnapshot} onClose={() => setOpenSnapshot(null)} />
    </div>
  );
}
