/**
 * ReceiptChip - the "ask-with-receipts" unit. Every copilot answer cites
 * the record with mono chips ("ledger ae-003" / "gate AM-142" / "8/8 checks")
 * that deep-link to the canonical URL for that evidence kind:
 * ledger → /compliance#audit, gate → /approvals/$gateId, validator → /governance.
 * Navigation goes through the caller (onNavigate) so the sheet can close first.
 */

import { CheckCircle2, ScrollText, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopilotReceipt } from "@/mock/copilot";

const KIND_META: Record<CopilotReceipt["kind"], { icon: LucideIcon; label: string }> = {
  ledger: { icon: ScrollText, label: "Audit ledger" },
  gate: { icon: CheckCircle2, label: "Gate record" },
  validator: { icon: ShieldCheck, label: "Validator report" },
};

/** Canonical deep-link for a receipt (one URL per entity kind). */
export function receiptHref(receipt: CopilotReceipt): string {
  switch (receipt.kind) {
    case "ledger":
      return "/compliance#audit";
    case "gate":
      return `/approvals/${receipt.refId}`;
    case "validator":
      return "/governance";
  }
}

export interface ReceiptChipProps {
  receipt: CopilotReceipt;
  /** Close the sheet, then push - supplied by PodCopilot. */
  onNavigate: (href: string) => void;
}

export function ReceiptChip({ receipt, onNavigate }: ReceiptChipProps) {
  const href = receiptHref(receipt);
  const meta = KIND_META[receipt.kind];
  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      title={`${meta.label} ${receipt.refId} → ${href}`}
      className={cn(
        "inline-flex items-center gap-1 rounded border border-border bg-white/5 px-1.5 py-0.5",
        "font-mono text-[10px] text-muted-foreground cursor-pointer transition-colors",
        "hover:border-primary/60 hover:bg-primary/10 hover:text-primary",
      )}
    >
      <meta.icon className="size-3" />
      {receipt.label}
    </button>
  );
}
