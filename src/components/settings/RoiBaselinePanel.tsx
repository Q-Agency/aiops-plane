/**
 * RoiBaselinePanel (Settings → ROI baseline) — the home for the numbers
 * behind every ROI figure, built for the real sales situation (owner,
 * 2026-06-12): clients rarely share their baselines, so the pod starts on
 * an INDUSTRY-STANDARD default — always labeled — and the operator
 * replaces it with client-agreed numbers here the moment they exist.
 *
 * Same store as the /economics "Edit assumptions" dialog (useRoiAssumptions
 * sync event), so every ROI surface re-derives live. Saves/resets land on
 * the session ledger (policy.changed) — a baseline change changes reported
 * ROI, so it is a recorded decision.
 *
 * The "How ROI is measured" explainer states the three buckets in plain
 * terms: measured facts (ledger) · agreed inputs (this panel) · arithmetic.
 */

import { useEffect, useState } from "react";
import { Calculator, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { roiSourceLabel, useRoiAssumptions } from "@/components/monitor/useRoiAssumptions";

const BUCKETS = [
  {
    title: "Measured — ledger facts",
    body: "Agent run costs per ticket (reruns included), cycle times from the board drag to Done, and every human decision (gates, clarifications, rejects). Exportable evidence; no opinions.",
  },
  {
    title: "Agreed inputs — this panel",
    body: "What an hour of the client's team costs and what this class of work used to take them. Industry-standard defaults apply until the client provides numbers — the label tells you which is in effect.",
  },
  {
    title: "Arithmetic — no magic",
    body: "Hours freed = baseline hours − human-in-the-loop hours, × tickets shipped. Money saved = (baseline cost − pod cost) × tickets shipped, net of plan fees. Change an input and every figure re-derives.",
  },
] as const;

export function RoiBaselinePanel() {
  const { assumptions, derived, mounted, save, reset } = useRoiAssumptions();
  const [rate, setRate] = useState(String(assumptions.blendedRateUsdPerHr));
  const [baseline, setBaseline] = useState(assumptions.baselineNote);
  const [error, setError] = useState<string | null>(null);

  // Hydrate the form once the stored override is read (and after sync).
  useEffect(() => {
    setRate(String(assumptions.blendedRateUsdPerHr));
    setBaseline(assumptions.baselineNote);
  }, [assumptions.blendedRateUsdPerHr, assumptions.baselineNote]);

  const industry = assumptions.source === "industry-standard";

  const handleSave = () => {
    const parsed = Number(rate);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an hourly rate above $0.");
      return;
    }
    setError(null);
    save({ blendedRateUsdPerHr: parsed, baselineNote: baseline.trim() || assumptions.baselineNote });
    toast.success(`ROI baseline saved — $${Math.round(parsed)}/h · client-agreed`, {
      description: "Every ROI surface re-derives now. Recorded in the ledger (policy.changed).",
    });
  };

  return (
    <section className="glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Calculator className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">ROI baseline</h2>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] uppercase tracking-wider font-mono",
            industry
              ? "border-border bg-white/5 text-muted-foreground"
              : "border-status-done/40 bg-status-done/10 text-status-done",
          )}
        >
          {mounted ? roiSourceLabel(assumptions.source) : "…"}
        </Badge>
      </div>
      <p className="max-w-2xl text-xs text-muted-foreground">
        The comparison behind every ROI figure. Clients rarely share their baselines — so an{" "}
        <span className="text-foreground/80">industry-standard default</span> applies until you
        enter <span className="text-foreground/80">client-agreed</span> numbers here. The label
        travels with every figure, so a number is never presented as client-proven when it isn't.
      </p>

      {/* How ROI is measured — the three buckets, in plain terms */}
      <div className="grid gap-3 sm:grid-cols-3">
        {BUCKETS.map((b) => (
          <div key={b.title} className="rounded-md border border-border bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              {b.title}
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <div className="space-y-1.5">
          <Label htmlFor="roi-rate" className="text-xs">
            Blended hourly rate (USD)
          </Label>
          <Input
            id="roi-rate"
            data-test="roi-rate"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Every hours→$ conversion uses this rate.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="roi-baseline" className="text-xs">
            Baseline note (what the comparison assumes)
          </Label>
          <Input
            id="roi-baseline"
            data-test="roi-baseline"
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            e.g. "senior BA · 4h per spec — senior engineer · 6h per story point".
          </p>
        </div>
      </div>
      {error && <p className="text-[11px] text-status-error">{error}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" data-test="roi-save" onClick={handleSave}>
          Save — mark client-agreed
        </Button>
        <Button size="sm" variant="outline" onClick={reset} disabled={industry}>
          <RotateCcw className="size-3.5" />
          Reset to industry standard
        </Button>
        <span className="text-[11px] font-mono text-muted-foreground">
          currently: {derived.rateLine} · changes land on the ledger
        </span>
      </div>
    </section>
  );
}
