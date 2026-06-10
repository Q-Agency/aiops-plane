/** Shared gate-review constants (C4 + P1-G1 policy surfacing). */

import type { ArtifactKind } from "@/mock/chain";
import type { ArtifactGatePolicy } from "@/mock/gate-policies";

/** Reject requires a typed reason of at least this length (C4). */
export const REJECT_REASON_MIN_CHARS = 10;

/** Where an approval sends the ticket next — confirm-dialog copy. */
export const NEXT_STAGE_AFTER_APPROVAL: Record<string, string> = {
  "Spec approval": "Ready for Design",
  "Design approval": "Ready for Tasks",
  "Tasks approval": "Ready for Dev",
  "Code approval": "Ready for QA",
  "QA approval": "Done",
};

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
