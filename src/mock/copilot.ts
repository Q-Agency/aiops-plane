/**
 * Pod Copilot (⌘J overlay, wave 2, P1-A1) - canned ask-with-receipts Q&A
 * plus NL operations rendered as proposed-action cards. NO LLM IN THE MOCK:
 * answers are precomputed from pod telemetry (seed modules) and every
 * receipt chip points at a REAL seed id - ledger rows (compliance.ts ae-*),
 * gate ids (approvals.ts "appr-…" / "clar-…"), validator reports (ticket ids).
 *
 * Actions NEVER execute unconfirmed: matchCopilot only returns a
 * ProposedAction whose `auditPreview` shows the exact row a Confirm would
 * write via audit-bridge (id/at are 0 placeholders until appendAuditMock).
 */

import type { AuditEntryLike } from "./audit-bridge";
import { budget, CAP_STATUS_LABELS } from "./billing";
import { currentReport } from "./report";

export interface CopilotReceipt {
  kind: "ledger" | "gate" | "validator";
  refId: string;
  label: string;
}

export interface CopilotAnswer {
  q: string;
  answerMd: string;
  receipts: CopilotReceipt[];
}

export interface ProposedAction {
  intent: "pause-pod" | "pause-agent" | "resume-agent" | "open-gate";
  target: string;
  /** The exact row Confirm writes (id/at filled by appendAuditMock). */
  auditPreview: AuditEntryLike;
}

export type CopilotMatch =
  | { kind: "answer"; a: CopilotAnswer }
  | { kind: "action"; p: ProposedAction }
  | { kind: "fallback" };

/** Persistent honesty badge under the input - render verbatim. */
export const COPILOT_HONESTY_BADGE =
  "Answers computed from pod telemetry · actions always confirmed by you.";

export const COPILOT_FALLBACK_LINE =
  "I answer from the ledger, gates, and runs - not from the internet. Try a gate, ticket, or person.";

export const SUGGESTED_PROMPTS = [
  "What needs me?",
  "Why did AM-142 ship?",
  "What changed overnight?",
  "Pause the QA agent",
] as const;

/* ------------------------------------------------------------------ */
/* Canned answers - keyed to the demo spine                             */
/* ------------------------------------------------------------------ */

const report = currentReport();
const fmtUsd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const COPILOT_ANSWERS: CopilotAnswer[] = [
  {
    q: "What needs me?",
    answerMd:
      "Two gates and one escalation are waiting on a human: the **AM-142 spec approval** is in Zlatko's queue (8/8 validators green), the **AM-141 geo-search clarification** is waiting on Marin, and the curator escalated a **source conflict on pricing tiers** that needs a call.",
    receipts: [
      { kind: "gate", refId: "appr-AM-142", label: "gate AM-142" },
      { kind: "gate", refId: "clar-AM-141", label: "clarification AM-141" },
      { kind: "ledger", refId: "ae-011", label: "ledger ae-011" },
    ],
  },
  {
    q: "Why did AM-142 ship?",
    answerMd:
      "AM-142's spec cleared its gate as **v2**: Zlatko approved it with the reason *\"Spec scope matches SOW §3.2\"* after v1 was returned for **missing error-state ACs** - and all **8 structural validators passed** on the approved version. The approval is on the ledger.",
    receipts: [
      { kind: "ledger", refId: "ae-003", label: "ledger ae-003" },
      { kind: "gate", refId: "appr-AM-142", label: "gate AM-142" },
      { kind: "validator", refId: "AM-142", label: "8/8 checks" },
    ],
  },
  {
    q: "What changed overnight?",
    answerMd:
      "The 22:00 overnight batch dispatched to the dev agent and came back green - **3 PRs, all passing** - and the **AM-150 VIN decoder implementation** was pushed on local compute (qwen2.5-coder-32b, on-prem). Nothing needed a human overnight.",
    receipts: [
      { kind: "ledger", refId: "ae-010", label: "ledger ae-010" },
      { kind: "ledger", refId: "ae-020", label: "ledger ae-020" },
    ],
  },
  {
    q: "How is the pod doing this week?",
    answerMd: `A steady week: **${report.headline.itemsDelivered} items delivered**, **${report.headline.gatesCleared} gates cleared**, spend ${fmtUsd(report.headline.spendUsd)} against the ${fmtUsd(budget.monthlyCapUsd)} cap. One honest miss: the **AM-138 design review breached its 8h target (26h)** - reassignment is in progress.`,
    receipts: [
      { kind: "gate", refId: "appr-AM-138", label: "gate AM-138" },
      { kind: "ledger", refId: "ae-013", label: "ledger ae-013" },
    ],
  },
  {
    q: "Who cleared the KYC test matrix?",
    answerMd:
      "**Petra Novak** (QA Lead) approved the AM-144 Seller KYC verification gate with the reason *\"KYC test matrix complete\"* - the cleared artifact is **qa.md v3**, snapshotted at clearance.",
    receipts: [
      { kind: "ledger", refId: "ae-013", label: "ledger ae-013" },
      { kind: "gate", refId: "appr-AM-144", label: "gate AM-144" },
    ],
  },
  {
    q: "Why was AM-138 rejected?",
    answerMd:
      "Marin Crnković rejected the AM-138 messaging design at v1 with the typed reason *\"Threading model incomplete - reroute to SA\"*. His note became the SA agent's added context, and **v2 with the threaded model** landed 3 hours later.",
    receipts: [
      { kind: "ledger", refId: "ae-005", label: "ledger ae-005" },
      { kind: "ledger", refId: "ae-006", label: "ledger ae-006" },
      { kind: "gate", refId: "appr-AM-138", label: "gate AM-138" },
    ],
  },
  {
    q: "Are we over budget?",
    answerMd: `No - month-to-date spend is **${fmtUsd(budget.mtdSpendUsd)}** of a **${fmtUsd(budget.monthlyCapUsd)}** cap (day ${budget.daysElapsed} of ${budget.daysInMonth}), projecting **${fmtUsd(budget.projectedMonthlyUsd)}** by month end - status **${CAP_STATUS_LABELS[budget.capStatus]}**. The biggest single line item was AM-136's ship gate.`,
    receipts: [
      { kind: "gate", refId: "appr-AM-136", label: "gate AM-136" },
      { kind: "ledger", refId: "ae-010", label: "ledger ae-010" },
    ],
  },
  {
    q: "What's blocked right now?",
    answerMd:
      "One real blocker: the **AM-149 offer/escrow quality gate** is stuck - a retry already failed and it's escalated to a human. Separately, the curator raised a **SOW-vs-Slack pricing conflict** that needs a ruling before the BA drafts against it.",
    receipts: [
      { kind: "gate", refId: "appr-AM-149", label: "gate AM-149" },
      { kind: "ledger", refId: "ae-011", label: "ledger ae-011" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Proposed-action templates                                            */
/* ------------------------------------------------------------------ */

function preview(action: string, target: string, detail: string): AuditEntryLike {
  return { id: 0, at: 0, action, target, detail, actor: { kind: "human" } };
}

export const PROPOSED_ACTIONS: ProposedAction[] = [
  {
    intent: "pause-agent",
    target: "qa",
    auditPreview: preview("agent.paused", "qa", "reason required"),
  },
  {
    intent: "resume-agent",
    target: "qa",
    auditPreview: preview("agent.resumed", "qa", "queued work resumes in order"),
  },
  {
    intent: "pause-pod",
    target: "automarket",
    auditPreview: preview("pod.paused", "automarket", "reason required · open gates stay answerable"),
  },
  {
    intent: "open-gate",
    target: "appr-AM-142",
    auditPreview: preview("gate.opened", "appr-AM-142", "navigates to /approvals/appr-AM-142"),
  },
];

/* ------------------------------------------------------------------ */
/* Matching - keyword scoring, no model                                 */
/* ------------------------------------------------------------------ */

/** Parallel keyword sets for COPILOT_ANSWERS (same index order). */
const ANSWER_KEYWORDS: string[][] = [
  ["needs me", "need me", "what needs", "waiting on me", "my queue", "for me"],
  ["am-142", "ship", "why did"],
  ["overnight", "last night", "changed overnight", "while i slept", "this morning"],
  ["this week", "pod doing", "how is the pod", "weekly", "doing"],
  ["am-144", "kyc", "who cleared", "who approved", "test matrix"],
  ["am-138", "rejected", "why was", "reject", "messaging design"],
  ["budget", "spend", "spent", "cost", "cap", "money"],
  ["blocked", "incident", "stuck", "escalation", "blocker"],
];

const AGENT_TOKENS = [
  "ba",
  "sa",
  "uiux",
  "tasklist",
  "dev",
  "review",
  "qa",
  "devops",
  "knowledge",
] as const;

function findAgent(q: string): string | null {
  for (const id of AGENT_TOKENS) {
    if (new RegExp(`\\b${id}\\b`).test(q)) return id;
  }
  return null;
}

function actionFor(intent: ProposedAction["intent"], target: string): ProposedAction {
  const tpl = PROPOSED_ACTIONS.find((p) => p.intent === intent) ?? PROPOSED_ACTIONS[0];
  return {
    intent,
    target,
    auditPreview: { ...tpl.auditPreview, target },
  };
}

/**
 * Keyword match: NL operations first (pause/resume/open-gate → proposed-
 * action card, nothing executes unconfirmed), then the canned answers,
 * else the honest fallback.
 */
export function matchCopilot(input: string): CopilotMatch {
  const q = input.trim().toLowerCase();
  if (!q) return { kind: "fallback" };

  // --- NL operations -> proposed-action cards -----------------------
  if (/\b(resume|unpause|restart)\b/.test(q)) {
    return { kind: "action", p: actionFor("resume-agent", findAgent(q) ?? "qa") };
  }
  if (/\b(pause|stop|halt)\b/.test(q)) {
    if (/\bpod\b|\beverything\b|\ball agents\b/.test(q)) {
      return { kind: "action", p: actionFor("pause-pod", "automarket") };
    }
    return { kind: "action", p: actionFor("pause-agent", findAgent(q) ?? "qa") };
  }
  if (/\bopen\b/.test(q) && /\bgate\b/.test(q)) {
    const m = q.match(/am-\d+/);
    return {
      kind: "action",
      p: actionFor("open-gate", m ? `appr-${m[0].toUpperCase()}` : "appr-AM-142"),
    };
  }

  // --- Canned answers ------------------------------------------------
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < COPILOT_ANSWERS.length; i++) {
    const score = ANSWER_KEYWORDS[i].reduce((a, k) => (q.includes(k) ? a + 1 : a), 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestIdx >= 0) return { kind: "answer", a: COPILOT_ANSWERS[bestIdx] };

  return { kind: "fallback" };
}
