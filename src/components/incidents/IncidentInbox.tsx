/**
 * IncidentInbox — left master list of /incidents (C5): Open/Resolved/All
 * tabs, type · severity · agent filters, and the selectable incident rows.
 * Row order preserves the seed order (the demo's QA-down incident on top).
 */

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { agents } from "@/mock/agents";
import type { EscSeverity } from "@/mock/comms";
import {
  INCIDENT_TYPE_LABELS,
  type Incident,
  type IncidentStatus,
  type IncidentType,
} from "@/mock/incidents";
import type { AgentId } from "@/mock/types";
import { fmtAgo, SeverityChip, StatusChip, TYPE_ICON } from "./incident-ui";

type StatusTab = "open" | "resolved" | "all";

export interface IncidentInboxProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Locally in-flight recovery — row shows the recovering state. */
  recoveringId: string | null;
}

const SEVERITIES: EscSeverity[] = ["critical", "high", "med", "low"];

export function IncidentInbox({ incidents, selectedId, onSelect, recoveringId }: IncidentInboxProps) {
  const [tab, setTab] = useState<StatusTab>("open");
  const [type, setType] = useState<IncidentType | "all">("all");
  const [severity, setSeverity] = useState<EscSeverity | "all">("all");
  const [agent, setAgent] = useState<AgentId | "all">("all");

  const agentOptions = useMemo(() => {
    const ids = new Set(incidents.map((i) => i.agentId).filter(Boolean) as AgentId[]);
    return agents.filter((a) => ids.has(a.id));
  }, [incidents]);

  const displayStatus = (i: Incident): IncidentStatus =>
    recoveringId === i.id ? "recovering" : i.status;

  const filtered = incidents.filter((i) => {
    const s = displayStatus(i);
    if (tab === "open" && s === "resolved") return false;
    if (tab === "resolved" && s !== "resolved") return false;
    if (type !== "all" && i.type !== type) return false;
    if (severity !== "all" && i.severity !== severity) return false;
    if (agent !== "all" && i.agentId !== agent) return false;
    return true;
  });

  const hasFilters = type !== "all" || severity !== "all" || agent !== "all";
  const openCount = incidents.filter((i) => displayStatus(i) !== "resolved").length;
  const resolvedCount = incidents.length - openCount;

  return (
    <section className="glass-panel flex flex-col min-h-0 overflow-hidden">
      {/* status tabs + filters */}
      <div className="p-3 border-b border-border space-y-2.5">
        <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
          <TabsList className="h-8 bg-white/5 border border-border">
            <TabsTrigger value="open" className="text-xs h-6 px-2.5">
              Open · {openCount}
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs h-6 px-2.5">
              Resolved · {resolvedCount}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs h-6 px-2.5">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select value={type} onValueChange={(v) => setType(v as IncidentType | "all")}>
            <SelectTrigger className="h-7 w-auto min-w-[96px] text-[11px] bg-white/5 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All types</SelectItem>
              {(Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[]).map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {INCIDENT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={(v) => setSeverity(v as EscSeverity | "all")}>
            <SelectTrigger className="h-7 w-auto min-w-[96px] text-[11px] bg-white/5 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All severities</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agent} onValueChange={(v) => setAgent(v as AgentId | "all")}>
            <SelectTrigger className="h-7 w-auto min-w-[96px] text-[11px] bg-white/5 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All agents</SelectItem>
              {agentOptions.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-xs">
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* rows */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          tab === "open" && !hasFilters ? (
            <div className="p-8 text-center space-y-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-status-done">
                <span className="size-2 rounded-full bg-status-done dot-pulse" />
                No open incidents · pod is healthy
              </div>
              <p className="text-xs text-muted-foreground max-w-[34ch] mx-auto">
                Incidents appear here when an agent stalls, a run fails, a gate goes overdue, a
                tool disconnects, or a sync goes stale.
              </p>
              <ShieldCheck className="size-5 text-status-done/60 mx-auto" />
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No incidents match these filters.
            </div>
          )
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((i) => (
              <IncidentRow
                key={i.id}
                incident={i}
                status={displayStatus(i)}
                selected={i.id === selectedId}
                onSelect={() => onSelect(i.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function IncidentRow({
  incident,
  status,
  selected,
  onSelect,
}: {
  incident: Incident;
  status: IncidentStatus;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = TYPE_ICON[incident.type];
  const affected = incident.ticketId ?? incident.toolId ?? incident.agentId ?? "—";
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full text-left px-3 py-2.5 transition-colors cursor-pointer",
          selected
            ? "bg-primary/10 border-l-2 border-l-primary"
            : "border-l-2 border-l-transparent hover:bg-white/[0.03]",
          status === "resolved" && !selected && "opacity-60",
        )}
      >
        <div className="flex items-center gap-2">
          <SeverityChip s={incident.severity} />
          <Icon className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] font-mono text-muted-foreground ml-auto shrink-0">
            {fmtAgo(incident.openedMinAgo)} ago
          </span>
        </div>
        <div className="mt-1.5 text-[13px] leading-snug text-foreground/95 line-clamp-2">
          {incident.title}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span className="truncate">{INCIDENT_TYPE_LABELS[incident.type]} · {affected}</span>
          <span className="ml-auto shrink-0">
            <StatusChip s={status} />
          </span>
        </div>
      </button>
    </li>
  );
}
