/**
 * ConversionSheet (/pilot, P1-C3) - the end-of-pilot conversion math,
 * pre-filled: pilot fee credited to year one + the annual plan summary.
 *
 * Pricing canon: EVERY money figure here is a *pricing hypothesis* (derived
 * from economics.PRICE_PAID_USD so MONITOR numbers reconcile) - never a
 * quote; final pricing is set with the Q account lead. "Generate conversion
 * sheet" is an optimistic mock export: toast + a data.exported ledger row.
 */

import { Check, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { appendAuditMock } from "@/mock/audit-bridge";
import { PRICE_PAID_USD } from "@/mock/economics";
import { PILOT_PLAN, PILOT_PRICING_NOTE } from "@/mock/pilot";
import { cn } from "@/lib/utils";

const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Shared by the in-panel CTA and the pilot-ended banner export. */
export function generateConversionSheet() {
  const { conversion } = PILOT_PLAN;
  appendAuditMock({
    action: "data.exported",
    target: "pilot-conversion-sheet",
    detail: `Conversion sheet - ${conversion.planName} · pilot fee ${usd0(conversion.pilotFeeUsd)} credited to year one (pricing hypothesis)`,
  });
  toast.success("Conversion sheet generated", {
    description: "PDF (mock) - the export is on the ledger.",
  });
}

function MoneyRow({
  label,
  amount,
  credit = false,
  strong = false,
}: {
  label: string;
  amount: string;
  credit?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className={cn("min-w-0", strong ? "font-medium text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        <span
          className={cn(
            "font-mono tabular-nums",
            credit ? "text-status-done" : strong ? "text-foreground font-semibold" : "text-foreground",
          )}
        >
          {amount}
        </span>
        <span className="text-[9px] uppercase tracking-wider font-mono text-muted-foreground/70">
          pricing hypothesis
        </span>
      </span>
    </div>
  );
}

export function ConversionSheet({ ended = false }: { ended?: boolean }) {
  const { conversion } = PILOT_PLAN;
  const fee = conversion.pilotFeeUsd;
  const annual = PRICE_PAID_USD * 12;

  return (
    <section
      className={cn(
        "glass-panel p-4 flex flex-col gap-2",
        ended && "border-status-done/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Conversion sheet
          </span>
          {ended && (
            <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-done/40 bg-status-done/10 text-status-done">
              Window closed · ready
            </span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting/40 bg-status-waiting/10 text-status-waiting">
          Pricing hypothesis - not a quote
        </span>
      </div>

      <div className="divide-y divide-border/60">
        <MoneyRow label="Pilot fee - 6 weeks" amount={usd0(fee)} />
        <MoneyRow label={`Annual plan - ${conversion.planName}`} amount={`${usd0(annual)} / yr`} />
        <MoneyRow label="Pilot fee credited to year one" amount={`−${usd0(fee)}`} credit />
      </div>

      <Separator />

      <MoneyRow label="Year-one net" amount={usd0(annual - fee)} strong />

      {conversion.creditedToYear1 && (
        <div className="flex items-center gap-1.5 text-[11px] text-status-done">
          <Check className="size-3" />
          100% of the pilot fee is credited when you convert.
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {ended
          ? "The week 1-6 record above is final - bring this sheet to your Q account lead."
          : "Pre-filled from your pilot consumption - final pricing is set with your Q account lead."}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 flex-wrap pt-1">
        <span className="text-[10px] font-mono text-muted-foreground">{PILOT_PRICING_NOTE}</span>
        <Button size="sm" onClick={generateConversionSheet}>
          <FileText className="size-3.5 mr-1.5" />
          Generate conversion sheet
        </Button>
      </div>
    </section>
  );
}
