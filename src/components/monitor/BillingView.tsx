/**
 * BillingView - Usage & Billing (/billing, C9): operator economics reframed
 * as client consumption transparency.
 *
 *   1. Header - plan chip (Dedicated · pilot - pricing TBD, never invented)
 *      + Export statement (mock).
 *   2. Over-cap / triggered-alert banner (state-derived).
 *   3. Plan & budget summary - Plan & cap · Consumed this period ·
 *      Projected at period end (cap is editable client-state; removing it
 *      exercises the honest no-cap edge).
 *   4. Budget alerts - rules with state badges + toggles (email = Roadmap).
 *   5. Consumption breakdown - by agent / by project share-bar tabs.
 *   6. Monthly statement - period rows; the current period expands to line
 *      items where EVERY line links to a gate a human cleared.
 *   7. Pricing simulator - three models on this month's actual consumption,
 *      badged "MODELING - not a quote".
 */

import { Fragment, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Calculator,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Info,
  Pencil,
  PieChart,
  Wallet,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  budget,
  budgetAlerts as seedAlerts,
  CAP_STATUS_LABELS,
  consumptionByAgent,
  consumptionByProject,
  plan,
  PRICING_SIMULATOR_BADGE,
  pricingScenarios,
  usageStatements,
  type BudgetAlert,
  type CapStatus,
  type ConsumptionRow,
  type UsageStatement,
} from "@/mock/billing";
import { cn } from "@/lib/utils";

/* ----------------------------- helpers ------------------------------- */

const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const usd2 = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateLabel = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

function capStatusFor(projected: number, cap: number): CapStatus {
  if (projected > cap) return "over";
  if (projected >= cap * 0.8) return "watch";
  return "on_track";
}

const STATUS_CHIP: Record<CapStatus, string> = {
  on_track: "border-status-done/40 bg-status-done/10 text-status-done",
  watch: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
  over: "border-status-error/40 bg-status-error/10 text-status-error",
};

/* ------------------------------- view -------------------------------- */

export function BillingView() {
  // Cap is editable client-state (popover writes it; mock-only). null = no cap set.
  const [capUsd, setCapUsd] = useState<number | null>(budget.monthlyCapUsd);
  const [alerts, setAlerts] = useState<BudgetAlert[]>(seedAlerts);
  const [capDialogOpen, setCapDialogOpen] = useState(false);

  const mtd = budget.mtdSpendUsd;
  const projected = budget.projectedMonthlyUsd;
  const capStatus: CapStatus | null = capUsd ? capStatusFor(projected, capUsd) : null;
  const pctOfCap = capUsd ? (mtd / capUsd) * 100 : null;
  const projectedPct = capUsd ? Math.round((projected / capUsd) * 100) : null;
  const periodEnd = dateLabel(plan.billingPeriodEnd);
  const hasUsage = mtd > 0;

  const triggeredAlert = alerts.find((a) => a.enabled && a.state === "triggered");

  const exportStatement = () => {
    toast.success("Statement downloaded", {
      description: `${usageStatements[0].label} usage statement (PDF · mock).`,
    });
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      {/* 1 · Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            usage &amp; billing
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Usage &amp; Billing</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            Consumption vs. your plan for this billing period.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
            {plan.tenancy} · pilot
          </Badge>
          <Button size="sm" onClick={exportStatement}>
            <FileText className="size-3.5 mr-1.5" />
            Export statement
          </Button>
        </div>
      </div>

      {/* 2 · State banner (over-cap wins over a triggered threshold alert) */}
      {capUsd !== null && capStatus === "over" ? (
        <div className="rounded-md border border-status-error/40 bg-status-error/10 px-4 py-3 flex items-center gap-3 flex-wrap">
          <AlertTriangle className="size-4 text-status-error shrink-0" />
          <div className="text-sm flex-1 min-w-48">
            <span className="font-semibold text-status-error">Over budget cap for this period</span>{" "}
            <span className="text-xs text-muted-foreground">
              - projected {usd0(projected)} ({projectedPct}% of cap) by {periodEnd}.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCapDialogOpen(true)}>
            Adjust cap
          </Button>
        </div>
      ) : capUsd !== null && triggeredAlert && pctOfCap !== null ? (
        <div className="rounded-md border border-status-waiting/40 bg-status-waiting/10 px-4 py-3 flex items-center gap-3 flex-wrap">
          <BellRing className="size-4 text-status-waiting shrink-0" />
          <div className="text-sm flex-1 min-w-48">
            <span className="font-semibold text-status-waiting">
              You&apos;ve used {Math.round(pctOfCap)}% of your monthly budget.
            </span>{" "}
            <span className="text-xs text-muted-foreground">
              Projected to reach {projectedPct}% ({usd0(projected)}) by {periodEnd}.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCapDialogOpen(true)}>
            Adjust cap
          </Button>
        </div>
      ) : null}

      {/* 3 · Plan & budget summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Plan & cap */}
        <div className="glass-panel p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            <Wallet className="size-3" /> Plan &amp; cap
          </div>
          <div className="text-lg font-semibold">{plan.name}</div>
          <p className="text-xs text-muted-foreground">{plan.pricingNote}</p>
          <div className="text-[11px] font-mono text-muted-foreground">
            Period {dateLabel(plan.billingPeriodStart)} - {dateLabel(plan.billingPeriodEnd, { month: "short", day: "numeric", year: "numeric" })}
          </div>
          <div className="flex items-center gap-2 pt-1">
            {capUsd !== null ? (
              <>
                <span className="text-sm font-mono tabular-nums font-semibold">{usd0(capUsd)}</span>
                <span className="text-[11px] text-muted-foreground">monthly budget cap</span>
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground">No cap set.</span>
            )}
            <button
              type="button"
              onClick={() => setCapDialogOpen(true)}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <Pencil className="size-3" />
              {capUsd !== null ? "Adjust cap" : "Set a budget cap"}
            </button>
          </div>
        </div>

        {/* Consumed this period */}
        <div className="glass-panel p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Used this period
            </span>
            <UnitInfo />
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums" suppressHydrationWarning>
            {usd2(mtd)}
          </div>
          {!hasUsage ? (
            <p className="text-xs text-muted-foreground">
              No usage yet this period. Charges appear as your pod works.
            </p>
          ) : capUsd !== null && pctOfCap !== null ? (
            <>
              <Progress
                value={Math.min(100, pctOfCap)}
                className={cn("h-2", pctOfCap > 100 && "[&>div]:bg-status-error")}
              />
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                <span suppressHydrationWarning>
                  {Math.round(pctOfCap)}% of cap
                  {pctOfCap > 100 && <span className="text-status-error"> · over</span>}
                </span>
                <span>
                  day {budget.daysElapsed} of {budget.daysInMonth}
                </span>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Set a budget cap to track consumption against it.
            </p>
          )}
        </div>

        {/* Projected at period end */}
        <div className="glass-panel p-4 space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Projected by {periodEnd}
          </span>
          <div className="text-2xl font-semibold font-mono tabular-nums" suppressHydrationWarning>
            {usd0(projected)}
          </div>
          {capUsd !== null && capStatus !== null ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border",
                  STATUS_CHIP[capStatus],
                )}
              >
                {CAP_STATUS_LABELS[capStatus]}
              </span>
              <span
                className={cn(
                  "text-[11px] font-mono tabular-nums",
                  projected > capUsd ? "text-status-error" : "text-status-done",
                )}
                suppressHydrationWarning
              >
                {projected > capUsd
                  ? `${usd0(projected - capUsd)} over cap`
                  : `${usd0(capUsd - projected)} under cap`}
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Run-rate projection from {budget.daysElapsed} days of usage.
            </p>
          )}
        </div>
      </section>

      {/* 4 · Budget alerts */}
      <section className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BellRing className="size-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Budget alerts
            </span>
          </div>
          {capUsd === null && (
            <span className="text-[11px] text-muted-foreground">
              Set a cap to enable budget alerts.
            </span>
          )}
        </div>
        <ul className="divide-y divide-border/60">
          {alerts.map((a) => {
            const isEmail = a.channel === "email";
            const disabled = isEmail || capUsd === null;
            return (
              <li key={a.id} className="py-2.5 flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="text-sm flex items-center gap-2 flex-wrap">
                    <span className={cn(capUsd === null && "text-muted-foreground")}>{a.label}</span>
                    <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                      {a.channel === "in_app" ? "in-app" : a.channel}
                    </span>
                    {isEmail && (
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase tracking-wider font-mono border-dashed text-muted-foreground"
                      >
                        Roadmap
                      </Badge>
                    )}
                  </div>
                  {a.thresholdPct > 0 && capUsd !== null && (
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5" suppressHydrationWarning>
                      fires at {usd0((a.thresholdPct / 100) * capUsd)} ({a.thresholdPct}% of cap)
                    </div>
                  )}
                </div>
                {a.state === "triggered" && a.enabled ? (
                  <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting/40 bg-status-waiting/10 text-status-waiting">
                    Triggered · {a.triggeredAt ? dateLabel(a.triggeredAt.slice(0, 10)) : ""}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                    {a.enabled ? "Armed" : "Off"}
                  </span>
                )}
                <Switch
                  checked={a.enabled && !disabled}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    setAlerts((prev) =>
                      prev.map((x) => (x.id === a.id ? { ...x, enabled: checked } : x)),
                    );
                    toast(checked ? "Alert enabled" : "Alert disabled", { description: a.label });
                  }}
                  aria-label={`Toggle: ${a.label}`}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {/* 5 · Consumption breakdown */}
      <section className="glass-panel p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PieChart className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Consumption breakdown
          </span>
          <span className="text-[10px] text-muted-foreground/70 font-mono">· this period</span>
        </div>
        {hasUsage ? (
          <Tabs defaultValue="agent">
            <TabsList className="h-8">
              <TabsTrigger value="agent" className="text-xs">By agent</TabsTrigger>
              <TabsTrigger value="project" className="text-xs">By project</TabsTrigger>
            </TabsList>
            <TabsContent value="agent" className="mt-2">
              <BreakdownTable rows={consumptionByAgent()} firstCol="Agent / stage" />
            </TabsContent>
            <TabsContent value="project" className="mt-2">
              <BreakdownTable rows={consumptionByProject()} firstCol="Project" />
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-xs text-muted-foreground">
            No usage yet this period. Charges appear as your pod works.
          </p>
        )}
      </section>

      {/* 6 · Monthly statement */}
      <StatementSection onDownload={exportStatement} />

      {/* 7 · Pricing simulator */}
      <PricingSimulator />

      <CapDialog
        open={capDialogOpen}
        onOpenChange={setCapDialogOpen}
        capUsd={capUsd}
        onSave={(next) => {
          setCapUsd(next);
          if (next === null) {
            toast("Budget cap removed", {
              description: "Budget alerts are disabled until a cap is set.",
            });
          } else {
            toast.success("Budget cap updated", { description: `${usd0(next)} / month.` });
          }
        }}
      />
    </div>
  );
}

/* --------------------------- unit tooltip ----------------------------- */

function UnitInfo() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="What is a delivery unit?" className="text-muted-foreground hover:text-foreground cursor-help">
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs">
          {plan.unitDefinition}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ------------------------ consumption table --------------------------- */

function BreakdownTable({ rows, firstCol }: { rows: ConsumptionRow[]; firstCol: string }) {
  const maxShare = Math.max(...rows.map((r) => r.sharePct), 0.0001);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            <th className="text-left px-2 py-2 font-medium">{firstCol}</th>
            <th className="text-right px-2 py-2 font-medium">Items</th>
            <th className="text-right px-2 py-2 font-medium">Amount</th>
            <th className="text-left px-2 py-2 font-medium w-[32%]">Share</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border/60 last:border-0">
              <td className="px-2 py-2 text-foreground">{r.label}</td>
              <td className="px-2 py-2 text-right tabular-nums">{r.items}</td>
              <td className="px-2 py-2 text-right tabular-nums text-foreground">{usd2(r.amountUsd)}</td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(r.sharePct / maxShare) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                    {r.sharePct}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------- statement table --------------------------- */

const STATEMENT_STATUS: Record<UsageStatement["status"], { label: string; chip: string }> = {
  current: { label: "Current", chip: "border-primary/40 bg-primary/10 text-primary" },
  paid: { label: "Paid", chip: "border-border text-muted-foreground" },
  estimated: { label: "Estimated", chip: "border-dashed border-border text-muted-foreground" },
};

function StatementSection({ onDownload }: { onDownload: () => void }) {
  // Current period opens expanded - the gate-linked line items ARE the pitch.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [usageStatements[0].periodId]: true,
  });

  return (
    <section className="glass-panel p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Monthly statement
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Every line item links to a gate a human cleared.
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              <th className="w-6 px-2 py-2"></th>
              <th className="text-left px-2 py-2 font-medium">Period</th>
              <th className="text-right px-2 py-2 font-medium">Items delivered</th>
              <th className="text-right px-2 py-2 font-medium">Units</th>
              <th className="text-right px-2 py-2 font-medium">Amount</th>
              <th className="text-left px-2 py-2 font-medium">Status</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {usageStatements.map((s) => {
              const status = STATEMENT_STATUS[s.status];
              const hasItems = s.lineItems.length > 0;
              const isOpen = !!expanded[s.periodId];
              return (
                <Fragment key={s.periodId}>
                  <tr
                    className={cn(
                      "border-b border-border/60",
                      hasItems && "cursor-pointer hover:bg-white/[0.03]",
                    )}
                    onClick={
                      hasItems
                        ? () => setExpanded((e) => ({ ...e, [s.periodId]: !isOpen }))
                        : undefined
                    }
                  >
                    <td className="px-2 py-2 text-muted-foreground">
                      {hasItems &&
                        (isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />)}
                    </td>
                    <td className="px-2 py-2 text-foreground">{s.label}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{s.itemsDelivered}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{s.unitsConsumed}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-foreground font-semibold" suppressHydrationWarning>
                      {usd2(s.totalUsd)}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
                          status.chip,
                        )}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        aria-label={`Download ${s.label} statement`}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload();
                        }}
                      >
                        <Download className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                  {isOpen && hasItems && (
                    <tr className="border-b border-border bg-black/20 dark:bg-black/20 [.light_&]:bg-white/40">
                      <td></td>
                      <td colSpan={6} className="px-2 py-2">
                        <ul className="space-y-1.5">
                          {s.lineItems.map((li) => (
                            <li key={li.id} className="flex items-center gap-3 text-[11px]">
                              <span className="flex-1 min-w-0 truncate text-foreground">{li.label}</span>
                              {li.gateId ? (
                                <Link
                                  to="/approvals/$gateId"
                                  params={{ gateId: li.gateId }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-primary hover:underline shrink-0"
                                >
                                  {li.clearedBy ? `${li.clearedBy} cleared` : "gate"}
                                  <ArrowRight className="size-3" />
                                </Link>
                              ) : (
                                <span className="text-muted-foreground shrink-0">no gate · automated</span>
                              )}
                              <span className="tabular-nums text-foreground w-16 text-right shrink-0">
                                {usd2(li.amountUsd)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------- pricing simulator -------------------------- */

function PricingSimulator() {
  return (
    <section className="glass-panel p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Calculator className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Pricing simulator
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting/40 bg-status-waiting/10 text-status-waiting">
          {PRICING_SIMULATOR_BADGE}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {pricingScenarios.map((sc) => (
          <div key={sc.id} className="rounded border border-border bg-white/[0.02] [.light_&]:bg-white/60 p-3">
            <div className="text-xs font-semibold">{sc.label}</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums" suppressHydrationWarning>
              {usd0(sc.monthUsd)}
              <span className="text-[10px] text-muted-foreground font-normal"> this month</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{sc.descriptor}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Models applied to this month&apos;s actual consumption. Pilot pricing is set with your Q
        account lead - not by this simulator.
      </p>
    </section>
  );
}

/* ------------------------------ cap dialog ---------------------------- */

function CapDialog({
  open,
  onOpenChange,
  capUsd,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capUsd: number | null;
  onSave: (next: number | null) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Re-seed the input from the live cap each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setValue(capUsd !== null ? String(capUsd) : "");
    setError(null);
  }, [open, capUsd]);

  const handleSave = () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a monthly cap above $0 - or remove the cap.");
      return;
    }
    onSave(Math.round(parsed));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{capUsd !== null ? "Adjust budget cap" : "Set a budget cap"}</DialogTitle>
          <DialogDescription>
            The monthly consumption ceiling alerts and projections are measured against.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-1">
          <Label htmlFor="cap-usd">Monthly cap (USD)</Label>
          <Input
            id="cap-usd"
            type="number"
            inputMode="numeric"
            min={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="4000"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {capUsd !== null ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                onSave(null);
                onOpenChange(false);
              }}
            >
              Remove cap
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={handleSave}>
            Save cap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
