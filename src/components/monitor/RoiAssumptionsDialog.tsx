/**
 * RoiAssumptionsDialog — "Edit assumptions — your numbers, not ours" (C2).
 * Edits the blended hourly rate + baseline note behind every hours→$
 * conversion; saving flips provenance to "client-agreed" and persists to
 * localStorage ("aiops_roi_assumptions"); every ROI surface re-derives live
 * via the useRoiAssumptions sync event. "Reset to industry standard" drops the
 * override. The same editor lives in Settings → ROI baseline.
 */

import { useEffect, useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoiAssumptions } from "./useRoiAssumptions";

export interface RoiAssumptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoiAssumptionsDialog({ open, onOpenChange }: RoiAssumptionsDialogProps) {
  const { assumptions, save, reset } = useRoiAssumptions();
  const [rate, setRate] = useState(String(assumptions.blendedRateUsdPerHr));
  const [baseline, setBaseline] = useState(assumptions.baselineNote);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the inputs from the live assumptions each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setRate(String(assumptions.blendedRateUsdPerHr));
    setBaseline(assumptions.baselineNote);
    setError(null);
  }, [open, assumptions.blendedRateUsdPerHr, assumptions.baselineNote]);

  const handleSave = () => {
    const parsed = Number(rate);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an hourly rate above $0.");
      return;
    }
    if (parsed > 2000) {
      setError("That rate looks off — enter a blended $/hour below $2,000.");
      return;
    }
    save({ blendedRateUsdPerHr: Math.round(parsed), baselineNote: baseline.trim() || assumptions.baselineNote });
    toast.success("Assumptions updated", {
      description: `ROI now re-derives at $${Math.round(parsed)}/h — source: client-agreed.`,
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    reset();
    toast("Reset to industry standard", {
      description: "Back to the Q baseline ($95/h) until you provide your own numbers.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            Edit assumptions
          </DialogTitle>
          <DialogDescription>
            Your numbers, not ours — every hours→$ figure re-derives live from your
            blended rate. ROI stays computed net of plan fees.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="roi-rate">Blended rate (USD / hour)</Label>
            <Input
              id="roi-rate"
              type="number"
              inputMode="numeric"
              min={1}
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                setError(null);
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              The hourly rate behind the "human-hours freed" dollar conversion.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roi-baseline">Baseline (what the comparison assumes)</Label>
            <Input
              id="roi-baseline"
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
              placeholder="e.g. senior BA · 4h per spec"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Source</span>
            <Badge
              variant="outline"
              className="font-mono text-[10px] uppercase tracking-wider"
            >
              {assumptions.source}
            </Badge>
            {assumptions.source === "industry-standard" && (
              <span>— industry-standard default; flips to client-agreed when you save.</span>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Reset to industry standard
          </Button>
          <Button type="button" onClick={handleSave}>
            Save assumptions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
