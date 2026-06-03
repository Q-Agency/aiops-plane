import type { Approval, Stage } from "./types";
import { tickets } from "./tickets";

const gateMap: Partial<Record<Stage, Approval["gate"]>> = {
  "spec-review": "Spec Review",
  "design-review": "Design Review",
  "tasks-review": "Tasks Review",
  "dev-review": "Dev Review",
  "qa-review": "QA Review",
};

const artifactFor: Record<Approval["gate"], string> = {
  "Spec Review": "spec.md",
  "Design Review": "design.md",
  "Tasks Review": "tasks.json",
  "Dev Review": "PR + diff",
  "QA Review": "qa.report",
};

export const approvals: Approval[] = tickets
  .map((t) => {
    const gate = gateMap[t.stage];
    if (!gate) return null;
    return {
      id: `appr-${t.id}`,
      ticketId: t.id,
      gate,
      approver: t.approver,
      artifact: `${artifactFor[gate]} · ${t.id}`,
      openedAt: t.updatedAt,
    } satisfies Approval;
  })
  .filter(Boolean) as Approval[];
