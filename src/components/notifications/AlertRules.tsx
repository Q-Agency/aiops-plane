/**
 * AlertRuleCard + AlertRuleEditorSheet (C6) — the /notifications Alert rules
 * tab. Card list of rules (trigger condition, threshold, channels, routedTo,
 * on/off switch, Edit) + a side Sheet with the rule form. "New rule" prepends.
 * Mock-local state only.
 */

import { useState } from "react";
import { BellPlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { humans } from "@/mock/humans";
import {
  CHANNEL_AVAILABILITY,
  KIND_LABELS,
  alertRules,
  type AlertRule,
  type NotificationChannel,
  type NotificationKind,
} from "@/mock/notifications";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "In-app",
  slack: "Slack",
  email: "Email",
  push: "Push",
};

const RULE_KINDS: NotificationKind[] = [
  "approval_gate",
  "clarification_gate",
  "escalation",
  "sla_at_risk",
  "sla_breach",
  "incident_opened",
  "run_failed",
  "tool_disconnected",
];

/** "#automarket-leads" style route targets + humans. */
const ROUTE_TARGETS: { id: string; label: string }[] = [
  ...humans.map((h) => ({ id: h.id, label: h.name })),
  { id: "#automarket-leads", label: "#automarket-leads (Slack)" },
  { id: "#automarket-dev", label: "#automarket-dev (Slack)" },
];

function targetLabel(id: string): string {
  return ROUTE_TARGETS.find((t) => t.id === id)?.label ?? id;
}

function conditionLine(rule: AlertRule): string {
  const kind = KIND_LABELS[rule.trigger.kind];
  const threshold =
    rule.trigger.thresholdMin != null
      ? rule.trigger.thresholdMin >= 60
        ? `${rule.trigger.comparator}${Math.round(rule.trigger.thresholdMin / 60)}h`
        : `${rule.trigger.comparator}${rule.trigger.thresholdMin}m`
      : "fires";
  const where = rule.channels.map((c) => CHANNEL_LABELS[c]).join(" + ");
  const who = rule.routedTo.map(targetLabel).join(" + ");
  return rule.trigger.thresholdMin != null
    ? `When ${kind} is ${threshold} overdue → ${where} → ${who}`
    : `When ${kind} ${threshold} → ${where} → ${who}`;
}

interface RuleDraft {
  id: string | null; // null = new rule
  name: string;
  kind: NotificationKind;
  thresholdMin: string; // form text; "" = no threshold
  channels: NotificationChannel[];
  routedTo: string;
}

function draftFrom(rule: AlertRule | null): RuleDraft {
  if (!rule) {
    return {
      id: null,
      name: "",
      kind: "sla_at_risk",
      thresholdMin: "",
      channels: ["in_app", "slack"],
      routedTo: humans[0]?.id ?? "",
    };
  }
  return {
    id: rule.id,
    name: rule.name,
    kind: rule.trigger.kind,
    thresholdMin: rule.trigger.thresholdMin != null ? String(rule.trigger.thresholdMin) : "",
    channels: [...rule.channels],
    routedTo: rule.routedTo[0] ?? "",
  };
}

export function AlertRulesPanel() {
  const [rules, setRules] = useState<AlertRule[]>(() => alertRules.map((r) => ({ ...r })));
  const [draft, setDraft] = useState<RuleDraft | null>(null);

  function toggleRule(id: string, enabled: boolean) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
    const rule = rules.find((r) => r.id === id);
    toast.success(`${rule?.name ?? "Rule"} ${enabled ? "enabled" : "paused"}`);
  }

  function saveDraft() {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Give the rule a name");
      return;
    }
    if (draft.channels.length === 0) {
      toast.error("Pick at least one channel");
      return;
    }
    if (!draft.routedTo) {
      toast.error("Route the alert to someone");
      return;
    }
    if (draft.thresholdMin !== "" && !/^\d+$/.test(draft.thresholdMin.trim())) {
      toast.error("Threshold must be minutes (a whole number)");
      return;
    }
    const next: AlertRule = {
      id: draft.id ?? `rule-${Date.now()}`,
      name: draft.name.trim(),
      enabled: true,
      trigger: {
        kind: draft.kind,
        comparator: draft.thresholdMin !== "" ? ">" : ">=",
        ...(draft.thresholdMin !== ""
          ? { thresholdMin: Number(draft.thresholdMin.trim()) }
          : {}),
      },
      channels: draft.channels,
      routedTo: [draft.routedTo],
      scope: "pod",
    };
    setRules((prev) =>
      draft.id ? prev.map((r) => (r.id === draft.id ? next : r)) : [next, ...prev],
    );
    setDraft(null);
    toast.success(`Rule saved — ${next.name}`);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Get paged when an SLA is about to breach — rules fire into the channels you pick.
        </p>
        <Button size="sm" onClick={() => setDraft(draftFrom(null))}>
          <BellPlus className="size-3.5 mr-1.5" />
          New rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No alert rules yet — add one to get paged when an SLA is about to breach.
          </p>
          <Button size="sm" className="mt-3" onClick={() => setDraft(draftFrom(null))}>
            New rule
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "rounded-md border border-border bg-panel/40 backdrop-blur-md px-4 py-3 flex items-center gap-3",
                !rule.enabled && "opacity-60",
              )}
            >
              <Switch
                checked={rule.enabled}
                onCheckedChange={(v) => toggleRule(rule.id, v)}
                aria-label={`Enable ${rule.name}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{rule.name}</div>
                <p className="text-[11px] text-muted-foreground truncate">{conditionLine(rule)}</p>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                {rule.channels.map((c) => (
                  <span
                    key={c}
                    className="text-[9px] uppercase tracking-wider font-mono px-1 py-0.5 rounded border border-border bg-white/5 text-muted-foreground"
                  >
                    {CHANNEL_LABELS[c]}
                  </span>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setDraft(draftFrom(rule))}
              >
                <Pencil className="size-3.5 mr-1" />
                Edit
              </Button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {draft && (
            <>
              <SheetHeader>
                <SheetTitle>{draft.id ? "Edit rule" : "New rule"}</SheetTitle>
                <SheetDescription>
                  When <span className="text-foreground">{KIND_LABELS[draft.kind]}</span>
                  {draft.thresholdMin !== "" && ` is >${draft.thresholdMin}m overdue`} →{" "}
                  {draft.channels.map((c) => CHANNEL_LABELS[c]).join(" + ") || "—"} →{" "}
                  {draft.routedTo ? targetLabel(draft.routedTo) : "—"}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rule-name" className="text-xs">
                    Rule name
                  </Label>
                  <Input
                    id="rule-name"
                    value={draft.name}
                    placeholder="Spec gate overdue"
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Trigger</Label>
                  <Select
                    value={draft.kind}
                    onValueChange={(v) =>
                      setDraft((d) => (d ? { ...d, kind: v as NotificationKind } : d))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rule-threshold" className="text-xs">
                    Threshold (minutes overdue — leave empty to fire immediately)
                  </Label>
                  <Input
                    id="rule-threshold"
                    inputMode="numeric"
                    value={draft.thresholdMin}
                    placeholder="240"
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, thresholdMin: e.target.value } : d))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Channels</Label>
                  <div className="space-y-2">
                    {(Object.keys(CHANNEL_LABELS) as NotificationChannel[]).map((ch) => {
                      const roadmap = CHANNEL_AVAILABILITY[ch] === "roadmap";
                      return (
                        <label
                          key={ch}
                          className={cn(
                            "flex items-center gap-2 text-xs",
                            roadmap && "opacity-50",
                          )}
                        >
                          <Checkbox
                            checked={draft.channels.includes(ch)}
                            disabled={roadmap}
                            onCheckedChange={(v) =>
                              setDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      channels: v
                                        ? [...d.channels, ch]
                                        : d.channels.filter((c) => c !== ch),
                                    }
                                  : d,
                              )
                            }
                          />
                          <span>{CHANNEL_LABELS[ch]}</span>
                          {roadmap && (
                            <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
                              Roadmap
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Route to</Label>
                  <Select
                    value={draft.routedTo}
                    onValueChange={(v) => setDraft((d) => (d ? { ...d, routedTo: v } : d))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a person or channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUTE_TARGETS.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SheetFooter>
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button onClick={saveDraft}>Save rule</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
