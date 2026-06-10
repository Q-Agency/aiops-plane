/**
 * Shared visual vocabulary for the Deliverables shelf (/artifacts):
 * kind icon/label/tone maps (tone = the producing agent's color token via
 * the chain contract), the approver join from the version-timeline seeds,
 * the ApproverChip, and the minimal line-level diff used by the
 * rejected-iteration demo (line add/remove tinting — no word-level diff).
 */

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  FileCode2,
  FileText,
  GitPullRequest,
  ListChecks,
  Palette,
  Rocket,
  SearchCheck,
  TestTube2,
} from "lucide-react";
import type { ArtifactKind } from "@/mock/chain";
import { artifactVersions, type ArtifactSnapshot } from "@/mock/artifacts";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Kind metadata (full chain.ts ArtifactKind union)                     */
/* ------------------------------------------------------------------ */

export const KIND_LABEL: Record<ArtifactKind, string> = {
  spec: "Business spec",
  design: "Solution design",
  "uix-ui-spec": "UI/UX spec",
  tasks: "Task breakdown",
  code: "Code + PR",
  review: "Code review",
  test: "QA report",
  release: "Release",
  knowledge: "Knowledge",
};

export const KIND_ICON: Record<ArtifactKind, LucideIcon> = {
  spec: FileText,
  design: FileCode2,
  "uix-ui-spec": Palette,
  tasks: ListChecks,
  code: GitPullRequest,
  review: SearchCheck,
  test: TestTube2,
  release: Rocket,
  knowledge: BookOpen,
};

/** Producing agent's color token (mirrors chain.ts producerOf). */
export const KIND_TONE: Record<ArtifactKind, string> = {
  spec: "text-agent-ba",
  design: "text-agent-sa",
  "uix-ui-spec": "text-agent-uiux",
  tasks: "text-agent-tasklist",
  code: "text-agent-dev",
  review: "text-agent-review",
  test: "text-agent-qa",
  release: "text-agent-devops",
  knowledge: "text-agent-curator",
};

/** Contract order — keeps filter options in pipeline order. */
export const KIND_ORDER: ArtifactKind[] = [
  "spec",
  "design",
  "uix-ui-spec",
  "tasks",
  "code",
  "review",
  "test",
  "release",
  "knowledge",
];

/* ------------------------------------------------------------------ */
/* Joins                                                                */
/* ------------------------------------------------------------------ */

/** Approved-by, joined from the version-timeline seeds (ledger join). */
export function approverFor(s: ArtifactSnapshot): string {
  const it = artifactVersions(s.ticketId).find(
    (i) => i.kind === s.kind && i.version === s.version && i.state === "approved",
  );
  return it?.actorName ?? "—";
}

/** True when the snapshot's timeline carries a rejected iteration (diff demo). */
export function hasRejectedIteration(s: ArtifactSnapshot): boolean {
  return artifactVersions(s.ticketId).some((i) => i.kind === s.kind && i.state === "rejected");
}

/* ------------------------------------------------------------------ */
/* ApproverChip                                                         */
/* ------------------------------------------------------------------ */

export function ApproverChip({ name, className }: { name: string; className?: string }) {
  const initials =
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.03] pl-0.5 pr-2 py-0.5 text-[11px] text-foreground whitespace-nowrap",
        className,
      )}
    >
      <span className="size-4 rounded-full bg-primary/15 border border-primary/30 text-primary grid place-items-center text-[8px] font-semibold">
        {initials}
      </span>
      {name}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Minimal line diff (LCS over lines — bodies are small)                */
/* ------------------------------------------------------------------ */

export type DiffLineType = "same" | "add" | "del";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const m = a.length;
  const n = b.length;
  // LCS length table (bottom-up).
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < m) out.push({ type: "del", text: a[i++] });
  while (j < n) out.push({ type: "add", text: b[j++] });
  return out;
}

const DIFF_LINE_TONE: Record<DiffLineType, string> = {
  same: "text-muted-foreground",
  add: "bg-status-done/10 text-status-done",
  del: "bg-status-error/10 text-status-error/90 line-through decoration-status-error/40",
};

const DIFF_GLYPH: Record<DiffLineType, string> = { same: " ", add: "+", del: "−" };

/** Line-level add/remove tinting — enough for the rejected-iteration demo. */
export function LineDiff({ before, after }: { before: string; after: string }) {
  const lines = diffLines(before, after);
  return (
    <div className="border border-border rounded-md overflow-hidden font-mono text-[11px] leading-relaxed">
      {lines.map((l, idx) => (
        <div key={idx} className={cn("flex gap-2 px-2 py-px whitespace-pre-wrap", DIFF_LINE_TONE[l.type])}>
          <span className="w-2 shrink-0 select-none opacity-70">{DIFF_GLYPH[l.type]}</span>
          <span className="min-w-0 flex-1">{l.text || " "}</span>
        </div>
      ))}
    </div>
  );
}
