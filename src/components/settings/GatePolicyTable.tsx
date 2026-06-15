/**
 * GatePolicyTable - Settings "Gate policies & autonomy" (#gates, P1-G1a):
 * one row per pipeline ArtifactKind from ARTIFACT_GATE_POLICIES - required
 * role, N-eyes, clearance SLA (editable), delegation, override policy, and
 * review mode (full · batch · auto-with-sampling, editable).
 *
 * Every edit goes through a confirm dialog carrying the deterministic
 * preview stat, then lands as an optimistic row update + a
 * `policy.changed {field, before, after}` row on the session ledger
 * (audit-bridge) + a sonner toast. Standard (mock) experience only.
 */

import { useState } from "react";
import { Scale, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KIND_ICON, KIND_LABEL, KIND_TONE } from "@/components/artifacts/artifact-ui";
import { appendAuditMock } from "@/mock/audit-bridge";
import {
  ARTIFACT_GATE_POLICIES,
  autonomyPreviewStat,
  type ArtifactGatePolicy,
} from "@/mock/gate-policies";
import type { ArtifactKind } from "@/mock/chain";
import { cn } from "@/lib/utils";

/* ----------------------------- vocabulary ----------------------------- */

const REVIEW_MODE_LABELS: Record<ArtifactGatePolicy["reviewMode"], string> = {
  full: "Full review",
  batch: "Batch",
  "auto-with-sampling": "Auto + sampling",
};

const REVIEW_MODES: ArtifactGatePolicy["reviewMode"][] = [
  "full",
  "batch",
  "auto-with-sampling",
];

const SLA_OPTIONS_MIN = [240, 480, 720, 1440];

const slaLabel = (min: number) => `≤ ${min / 60}h`;

const DELEGATION_LABELS: Record<ArtifactGatePolicy["delegation"], string> = {
  "deputy-allowed": "Deputy allowed",
  none: "None",
};

const OVERRIDE_LABELS: Record<ArtifactGatePolicy["overridePolicy"], string> = {
  "pod-admin-only": "Pod Admin only",
  "accountable-human": "Accountable human",
};

/* ----------------------------- edit state ----------------------------- */

interface PendingEdit {
  kind: ArtifactKind;
  /** Ledger field key, e.g. "review-mode". */
  field: string;
  /** Human label for dialog copy, e.g. "review mode". */
  fieldLabel: string;
  before: string;
  after: string;
  apply: () => void;
}

/* -------------------------------- view -------------------------------- */

export function GatePolicyTable() {
  const [rows, setRows] = useState<ArtifactGatePolicy[]>(() =>
    ARTIFACT_GATE_POLICIES.map((r) => ({ ...r })),
  );
  const [pending, setPending] = useState<PendingEdit | null>(null);

  const proposeReviewMode = (row: ArtifactGatePolicy, next: ArtifactGatePolicy["reviewMode"]) => {
    if (next === row.reviewMode) return;
    setPending({
      kind: row.artifactKind,
      field: "review-mode",
      fieldLabel: "review mode",
      before: REVIEW_MODE_LABELS[row.reviewMode],
      after: REVIEW_MODE_LABELS[next],
      apply: () =>
        setRows((rs) =>
          rs.map((r) => (r.artifactKind === row.artifactKind ? { ...r, reviewMode: next } : r)),
        ),
    });
  };

  const proposeSla = (row: ArtifactGatePolicy, nextMin: number) => {
    if (nextMin === row.slaClearMin) return;
    setPending({
      kind: row.artifactKind,
      field: "clearance-sla",
      fieldLabel: "clearance SLA",
      before: slaLabel(row.slaClearMin),
      after: slaLabel(nextMin),
      apply: () =>
        setRows((rs) =>
          rs.map((r) =>
            r.artifactKind === row.artifactKind ? { ...r, slaClearMin: nextMin } : r,
          ),
        ),
    });
  };

  const confirmPending = () => {
    if (!pending) return;
    pending.apply();
    appendAuditMock({
      action: "policy.changed",
      target: `gate-policy:${pending.kind}`,
      detail: `${pending.field}: ${pending.before} → ${pending.after}`,
    });
    toast.success("Policy updated · recorded in the ledger", {
      description: `${KIND_LABEL[pending.kind]} - ${pending.fieldLabel}: ${pending.before} → ${pending.after}`,
    });
    setPending(null);
  };

  return (
    <div className="glass-panel p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Scale className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Gate policies</h3>
      </div>
      <p className="text-xs text-muted-foreground max-w-3xl">
        Who clears which gate, under what SLA - seeded from blueprint defaults. Every change is on
        the record.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              <th className="text-left px-2 py-2 font-medium">Gate</th>
              <th className="text-left px-2 py-2 font-medium">Required role</th>
              <th className="text-left px-2 py-2 font-medium">N-eyes</th>
              <th className="text-left px-2 py-2 font-medium">Clearance SLA</th>
              <th className="text-left px-2 py-2 font-medium">Delegation</th>
              <th className="text-left px-2 py-2 font-medium">Override</th>
              <th className="text-left px-2 py-2 font-medium">Review mode</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const Icon = KIND_ICON[row.artifactKind];
              return (
                <tr key={row.artifactKind} className="border-b border-border/60 last:border-0">
                  <td className="px-2 py-2">
                    <span className="inline-flex items-center gap-2">
                      <Icon className={cn("size-3.5 shrink-0", KIND_TONE[row.artifactKind])} />
                      <span className="text-foreground">{KIND_LABEL[row.artifactKind]}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {row.artifactKind}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-foreground">{row.requiredRole}</td>
                  <td className="px-2 py-2">
                    <span
                      className={cn(
                        "font-mono text-[10px] px-1.5 py-0.5 rounded border",
                        row.nEyes === 2
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {row.nEyes}-eyes
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <Select
                      value={String(row.slaClearMin)}
                      onValueChange={(v) => proposeSla(row, Number(v))}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SLA_OPTIONS_MIN.map((min) => (
                          <SelectItem key={min} value={String(min)} className="text-xs font-mono">
                            {slaLabel(min)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {DELEGATION_LABELS[row.delegation]}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {OVERRIDE_LABELS[row.overridePolicy]}
                  </td>
                  <td className="px-2 py-2">
                    <Select
                      value={row.reviewMode}
                      onValueChange={(v) =>
                        proposeReviewMode(row, v as ArtifactGatePolicy["reviewMode"])
                      }
                    >
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REVIEW_MODES.map((m) => (
                          <SelectItem key={m} value={m} className="text-xs">
                            {REVIEW_MODE_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm dialog - preview stat inside, per the screens spec */}
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending
                ? `Change ${pending.fieldLabel} for ${KIND_LABEL[pending.kind]}?`
                : "Change policy?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {pending && (
                  <>
                    <div className="font-mono text-xs rounded border border-border bg-white/[0.03] px-2.5 py-2 text-foreground">
                      {pending.field}: {pending.before}{" "}
                      <span className="text-muted-foreground">→</span> {pending.after}
                    </div>
                    <div className="flex items-start gap-2 rounded border border-primary/30 bg-primary/5 px-2.5 py-2">
                      <TrendingUp className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground">
                        {autonomyPreviewStat(pending.kind).line}
                      </span>
                    </div>
                    <p className="text-[11px]">
                      Recorded in the ledger as{" "}
                      <code className="font-mono rounded bg-white/10 px-1">policy.changed</code> -
                      revertable the same way.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPending}>
              Confirm - record in ledger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
