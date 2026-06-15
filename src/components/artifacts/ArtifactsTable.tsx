/**
 * ArtifactsTable - the Deliverables shelf rows: kind icon (producing
 * agent's tone), title, mono ticket id, version (+ rejected-history hint),
 * approved-by chip joined from the seeds, approved date, and the gate
 * link → /approvals/$gateId (canonical URL - read-only decided stamp).
 * Row click opens the VersionTimeline sheet.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { fmtDateTime } from "@/lib/time";
import type { ArtifactSnapshot } from "@/mock/artifacts";
import { cn } from "@/lib/utils";
import {
  ApproverChip,
  approverFor,
  hasRejectedIteration,
  KIND_ICON,
  KIND_LABEL,
  KIND_TONE,
} from "./artifact-ui";

export interface ArtifactsTableProps {
  rows: ArtifactSnapshot[];
  onOpen: (snapshot: ArtifactSnapshot) => void;
}

export function ArtifactsTable({ rows, onOpen }: ArtifactsTableProps) {
  return (
    <div className="glass-panel overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-white/[0.02]">
            <Th>artifact</Th>
            <Th>ticket</Th>
            <Th>version</Th>
            <Th>approved by</Th>
            <Th>approved</Th>
            <Th className="text-right">gate</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const Icon = KIND_ICON[s.kind];
            const rejectedHistory = hasRejectedIteration(s);
            return (
              <tr
                key={s.id}
                onClick={() => onOpen(s)}
                className="border-b border-border/60 last:border-b-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="size-7 shrink-0 rounded-md border border-border bg-white/[0.03] grid place-items-center">
                      <Icon className={cn("size-3.5", KIND_TONE[s.kind])} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-foreground font-medium truncate max-w-[340px]">
                        {s.title}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] font-mono uppercase tracking-wider mt-0.5",
                          KIND_TONE[s.kind],
                        )}
                      >
                        {KIND_LABEL[s.kind]}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                  {s.ticketId}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="font-mono text-foreground">v{s.version}</span>
                  {rejectedHistory && (
                    <div className="text-[10px] font-mono text-status-waiting mt-0.5">
                      v{s.version - 1} rejected - view diff
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <ApproverChip name={approverFor(s)} />
                </td>
                <td
                  className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap"
                  suppressHydrationWarning
                >
                  {fmtDateTime(s.approvedAt)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    to="/approvals/$gateId"
                    params={{ gateId: s.approvedByGateId }}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline whitespace-nowrap"
                  >
                    {s.approvedByGateId}
                    <ArrowRight className="size-3" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}
