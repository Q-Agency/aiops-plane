/**
 * DataRetentionPanel - Settings "Data handling & retention": the verbatim
 * data-handling statement, per-data-class retention windows (audit_log is
 * locked - append-only, never auto-deleted), and the Export-data dialog
 * ("Preparing export…" → mock file links + `data.exported` on the session
 * ledger). Retention selects are local-state only (mocked, no ledger row).
 * Standard (mock) experience only.
 */

import { useState } from "react";
import { Download, FileDown, HardDriveDownload, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appendAuditMock } from "@/mock/audit-bridge";
import {
  DATA_HANDLING_STATEMENT,
  RETENTION_WINDOW_OPTIONS,
  retention,
  type Retention,
} from "@/mock/tenancy";

/* ------------------------------ retention ----------------------------- */

function RetentionTable() {
  const [windows, setWindows] = useState<Record<Retention["dataClass"], number>>(() =>
    Object.fromEntries(retention.map((r) => [r.dataClass, r.windowDays])) as Record<
      Retention["dataClass"],
      number
    >,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            <th className="text-left px-2 py-2 font-medium">Data class</th>
            <th className="text-left px-2 py-2 font-medium">What it covers</th>
            <th className="text-left px-2 py-2 font-medium">Retention window</th>
          </tr>
        </thead>
        <tbody>
          {retention.map((r) => (
            <tr key={r.dataClass} className="border-b border-border/60 last:border-0">
              <td className="px-2 py-2.5 font-mono text-foreground">{r.dataClass}</td>
              <td className="px-2 py-2.5 text-muted-foreground">{r.note}</td>
              <td className="px-2 py-2.5">
                {r.locked ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-mono uppercase tracking-wider">
                    <Lock className="size-3" />
                    Append-only · never auto-deleted
                  </span>
                ) : (
                  <Select
                    value={String(windows[r.dataClass])}
                    onValueChange={(v) => {
                      const next = Number(v);
                      const before = windows[r.dataClass];
                      if (next === before) return;
                      setWindows((w) => ({ ...w, [r.dataClass]: next }));
                      toast("Retention window updated (mock)", {
                        description: `${r.dataClass}: ${before} → ${next} days - applies from the next cycle.`,
                      });
                    }}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RETENTION_WINDOW_OPTIONS.map((d) => (
                        <SelectItem key={d} value={String(d)} className="text-xs font-mono">
                          {d} days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------- export dialog ---------------------------- */

const EXPORTABLE: Retention["dataClass"][] = ["audit_log", "runs", "artifacts", "comms"];

function ExportDataDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [picked, setPicked] = useState<Record<string, boolean>>({
    audit_log: true,
    runs: true,
    artifacts: false,
    comms: false,
  });
  const [phase, setPhase] = useState<"pick" | "preparing" | "ready">("pick");
  const files = EXPORTABLE.filter((c) => picked[c]).map((c) => `${c}.csv`);

  const reset = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) setPhase("pick");
  };

  const generate = () => {
    if (files.length === 0) return;
    setPhase("preparing");
    window.setTimeout(() => {
      setPhase("ready");
      appendAuditMock({
        action: "data.exported",
        target: "settings:data-export",
        detail: `${files.join(", ")} - generated from Settings → Data & retention`,
      });
      toast.success(`Export ready (${files.join(", ")})`, {
        description: "Recorded in the ledger as data.exported.",
      });
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export data</DialogTitle>
          <DialogDescription>
            Pick the data classes to bundle. Exports are recorded in the ledger as{" "}
            <code className="font-mono rounded bg-white/10 px-1 text-[11px]">data.exported</code>.
          </DialogDescription>
        </DialogHeader>

        {phase === "pick" && (
          <div className="space-y-2.5 py-1">
            {EXPORTABLE.map((c) => (
              <div key={c} className="flex items-center gap-2.5">
                <Checkbox
                  id={`exp-${c}`}
                  checked={!!picked[c]}
                  onCheckedChange={(v) => setPicked((p) => ({ ...p, [c]: v === true }))}
                />
                <Label htmlFor={`exp-${c}`} className="font-mono text-xs cursor-pointer">
                  {c}.csv
                </Label>
              </div>
            ))}
          </div>
        )}

        {phase === "preparing" && (
          <div className="flex items-center gap-2.5 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Preparing export…
          </div>
        )}

        {phase === "ready" && (
          <ul className="space-y-1.5 py-1">
            {files.map((f) => (
              <li key={f}>
                <button
                  type="button"
                  onClick={() =>
                    toast("Downloaded (mock)", { description: `${f} - sample export, no live data.` })
                  }
                  className="w-full flex items-center gap-2 rounded border border-border bg-white/[0.03] px-2.5 py-2 text-xs font-mono text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <FileDown className="size-3.5 shrink-0" />
                  {f}
                  <span className="ml-auto text-[10px] text-muted-foreground font-sans">
                    mock link
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          {phase === "pick" ? (
            <>
              <Button variant="outline" onClick={() => reset(false)}>
                Cancel
              </Button>
              <Button disabled={files.length === 0} onClick={generate}>
                <Download className="size-3.5 mr-1.5" />
                Generate export
              </Button>
            </>
          ) : (
            <Button variant="outline" disabled={phase === "preparing"} onClick={() => reset(false)}>
              {phase === "preparing" ? "Preparing…" : "Done"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- panel -------------------------------- */

export function DataRetentionPanel() {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <section id="data" className="glass-panel p-5 space-y-4 scroll-mt-24">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <HardDriveDownload className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Data handling &amp; retention</h2>
        </div>
        <Button size="sm" onClick={() => setExportOpen(true)}>
          <Download className="size-3.5 mr-1.5" />
          Export data
        </Button>
      </div>

      <div className="flex items-start gap-2.5 rounded-md border border-border bg-white/[0.02] p-3">
        <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
          {DATA_HANDLING_STATEMENT}
        </p>
      </div>

      <RetentionTable />

      <p className="text-[11px] text-muted-foreground">
        Posture is visible to all members; export, retention, and gate policies require Pod Admin.
      </p>

      <ExportDataDialog open={exportOpen} onOpenChange={setExportOpen} />
    </section>
  );
}
