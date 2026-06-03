import type { ActivityEvent, AgentId } from "./types";

const now = Date.now();

let _id = 0;
const nid = () => `ev-${++_id}-${Math.random().toString(36).slice(2, 7)}`;

const seedTpl: Array<Omit<ActivityEvent, "id" | "ts">> = [
  { agentId: "ba",     ticketId: "AM-142", kind: "handoff",  message: "generated spec.md v3 → Spec Review" },
  { agentId: "human",  ticketId: "AM-138", kind: "approval", message: "Marin approved design.md → Ready for Tasks" },
  { agentId: "qa",     ticketId: "AM-131", kind: "qa",       message: "2 tests failed · Healer repaired selector drift · re-running" },
  { agentId: "dev",    ticketId: "AM-150", kind: "overnight",message: "Ralph Wiggum loop opened PR #441 (Backend)" },
  { agentId: "sa",     ticketId: "AM-140", kind: "reject",   message: "Zlatko rejected design.md → returned with feedback" },
  { agentId: "tasklist", ticketId: "AM-147", kind: "handoff",message: "produced tasks.json v1 (18 sub-tasks)" },
  { agentId: "review", ticketId: "AM-149", kind: "handoff",  message: "review.md: 3 minor · 1 blocker (sql injection risk)" },
  { agentId: "dev",    ticketId: "AM-133", kind: "handoff",  message: "committed 14 files · +482 / -67 · branch ready" },
  { agentId: "qa",     ticketId: "AM-144", kind: "handoff",  message: "Playwright suite: 24/24 passing · uploaded artifacts" },
  { agentId: "human",  ticketId: "AM-136", kind: "approval", message: "Iva approved QA → Done" },
  { agentId: "pm",     kind: "handoff",   message: "rebalanced queue · promoted AM-141 to P1" },
  { agentId: "curator",ticketId: "AM-150", kind: "handoff",  message: "refreshed context bundle (3 docs added)" },
  { agentId: "ba",     ticketId: "AM-128", kind: "handoff",  message: "spec.md v2 ready for review" },
  { agentId: "dev",    ticketId: "AM-131", kind: "error",    message: "build failed · TS2345 on ListingCard.tsx · retrying" },
  { agentId: "qa",     ticketId: "AM-130", kind: "handoff",  message: "test plan drafted (12 scenarios)" },
  { agentId: "sa",     ticketId: "AM-141", kind: "handoff",  message: "design.md v1: 4 endpoints · 2 tables" },
  { agentId: "dev",    ticketId: "AM-149", kind: "overnight",message: "overnight: pushed fix commit + green CI" },
  { agentId: "human",  ticketId: "AM-145", kind: "approval", message: "Marin approved tasks.json → Ready for Dev" },
  { agentId: "review", ticketId: "AM-133", kind: "handoff",  message: "review.md: 5 minor · LGTM" },
  { agentId: "ba",     ticketId: "AM-139", kind: "handoff",  message: "drafting spec.md (CSAM filter, NSFW pipeline)" },
  { agentId: "pm",     kind: "handoff",   message: "GPU pool: 1.7/2 H200 · queue depth 4" },
  { agentId: "dev",    ticketId: "AM-150", kind: "handoff",  message: "scaffolded FastAPI router + VIN parser" },
  { agentId: "qa",     ticketId: "AM-131", kind: "qa",       message: "re-run green · 18/18 passing" },
  { agentId: "human",  ticketId: "AM-140", kind: "reject",   message: "Zlatko: \"split caching concern into separate doc\"" },
  { agentId: "curator",kind: "handoff",   message: "indexed 2 new ADRs into the project knowledge base" },
  { agentId: "tasklist", ticketId: "AM-145", kind: "handoff",message: "tasks.json v2: dependencies graph updated" },
  { agentId: "dev",    ticketId: "AM-133", kind: "handoff",  message: "added retry/backoff on Stripe payment-intent callback" },
  { agentId: "sa",     ticketId: "AM-138", kind: "handoff",  message: "design.md v2 ready for review" },
  { agentId: "qa",     ticketId: "AM-144", kind: "handoff",  message: "captured 7 screenshots · attached to report" },
  { agentId: "ba",     ticketId: "AM-142", kind: "handoff",  message: "added 4 acceptance criteria from PM feedback" },
];

export const seedActivity: ActivityEvent[] = seedTpl
  .map((e, i) => ({ ...e, id: `seed-${i}`, ts: now - i * (60_000 + ((i * 73) % 90) * 1000) }))
  .reverse();

type Tpl = Omit<ActivityEvent, "id" | "ts" | "agentId">;
const TPLS: Record<AgentId, Tpl[]> = {
  curator: [{ kind: "handoff", message: "refreshed context bundle" }],
  ba:      [{ kind: "handoff", message: "drafted spec.md update" }, { kind: "handoff", message: "added acceptance criteria" }],
  sa:      [{ kind: "handoff", message: "produced design.md revision" }],
  tasklist:[{ kind: "handoff", message: "tasks.json regenerated" }],
  dev:     [{ kind: "handoff", message: "pushed commit · CI running" }, { kind: "overnight", message: "overnight loop opened PR" }],
  review:  [{ kind: "handoff", message: "review.md produced · 2 minor" }],
  qa:      [{ kind: "qa", message: "Playwright suite green" }, { kind: "qa", message: "Healer repaired selector drift" }],
  pm:      [{ kind: "handoff", message: "rebalanced agent queue" }],
};
const tplFor = (agentId: AgentId): Tpl[] => TPLS[agentId] ?? [{ kind: "handoff", message: "ping" }];

export function makeEvent(agentId: AgentId | "human", ticketId?: string): ActivityEvent {
  if (agentId === "human") {
    const approver = ["Zlatko", "Marin", "Iva", "Ana"][Math.floor(Math.random() * 4)];
    return { id: nid(), ts: Date.now(), agentId, ticketId, kind: "approval", message: `${approver} approved → moved forward` };
  }
  const pool = tplFor(agentId);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { id: nid(), ts: Date.now(), agentId, ticketId, ...pick };
}
