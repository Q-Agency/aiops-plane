/** Shared gate-review constants (C4 + P1-G1 policy surfacing). */

import type { ArtifactKind } from "@/mock/chain";
import type { ArtifactGatePolicy } from "@/mock/gate-policies";
import type { Stage } from "@/mock/types";

/** Reject requires a typed reason of at least this length (C4). */
export const REJECT_REASON_MIN_CHARS = 10;

/**
 * Where an approval sends the ticket next — ONE record for both the copy
 * (label) and the actual move (stage id), so they can never drift.
 */
export const APPROVAL_ADVANCE: Record<string, { label: string; stage: Stage }> = {
  "Spec approval": { label: "Ready for Design", stage: "ready-design" },
  "Design approval": { label: "Ready for Tasks", stage: "ready-tasks" },
  "Tasks approval": { label: "Ready for Dev", stage: "ready-dev" },
  "Code approval": { label: "Ready for QA", stage: "ready-qa" },
  "QA approval": { label: "Done", stage: "done" },
};

/**
 * Root-cause reject targets per gate (vision §2 "rework follows the
 * artifact chain"): a reject can aim at ANY upstream agent stage — the
 * gate's own agent is the default, but a QA failure born in the design
 * goes back to the SA, and everything downstream re-runs forward.
 */
export interface RejectTarget {
  stage: Stage;
  agentName: string;
  stageLabel: string;
}

const BA: RejectTarget = { stage: "ready-spec", agentName: "BA", stageLabel: "Ready for Spec" };
const SA: RejectTarget = { stage: "ready-design", agentName: "SA", stageLabel: "Ready for Design" };
const TASKS: RejectTarget = { stage: "ready-tasks", agentName: "Tasklist", stageLabel: "Ready for Tasks" };
const DEV: RejectTarget = { stage: "ready-dev", agentName: "Dev", stageLabel: "Ready for Dev" };
const QA: RejectTarget = { stage: "ready-qa", agentName: "QA", stageLabel: "Ready for QA" };

/** Chain order, up to and including the gate's own agent (the default = last). */
export const REJECT_TARGETS: Record<string, RejectTarget[]> = {
  "Spec approval": [BA],
  "Design approval": [BA, SA],
  "Tasks approval": [BA, SA, TASKS],
  "Code approval": [BA, SA, TASKS, DEV],
  "QA approval": [BA, SA, TASKS, DEV, QA],
};

/** Map a defect's suspected root-cause stage line to a reject target stage. */
export function stageForSuspected(suspected: string): Stage | null {
  if (/design|\bsa\b/i.test(suspected)) return "ready-design";
  if (/implementation|\bdev\b/i.test(suspected)) return "ready-dev";
  if (/spec|\bba\b/i.test(suspected)) return "ready-spec";
  if (/task/i.test(suspected)) return "ready-tasks";
  return null;
}

/**
 * Gate label → pipeline ArtifactKind (chain.ts), covering BOTH vocabularies:
 * the queue's `Approval["gate"]` names ("Spec Review") and the review
 * surface's `GateDetail.gateLabel` badges ("Spec approval"). Clarifications
 * have no artifact gate → null (callers fall back to the agent policy).
 */
const GATE_ARTIFACT_KIND: Record<string, ArtifactKind> = {
  "Spec Review": "spec",
  "Spec approval": "spec",
  "Design Review": "design",
  "Design approval": "design",
  "Tasks Review": "tasks",
  "Tasks approval": "tasks",
  "Dev Review": "code",
  "Code approval": "code",
  "QA Review": "test",
  "QA approval": "test",
};

export function artifactKindForGate(gateLabel: string): ArtifactKind | null {
  return GATE_ARTIFACT_KIND[gateLabel] ?? null;
}

/** Review-mode header copy — "Review mode: full" etc. (P1-G1). */
export const REVIEW_MODE_LABEL: Record<ArtifactGatePolicy["reviewMode"], string> = {
  full: "full",
  batch: "batch",
  "auto-with-sampling": "auto-with-sampling",
};

/** Subtle mono hint on auto-with-sampling rows (queue must stay quiet). */
export const SAMPLED_HINT = "sampled 1-in-5";
