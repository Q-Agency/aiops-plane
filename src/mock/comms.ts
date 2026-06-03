import type { AgentId } from "./types";

export type CommChannel = "slack" | "teams" | "email" | "dm";
export type CommTrigger = "scheduled" | "threshold";
export type CommStatus = "acknowledged" | "replied" | "no-response";

export interface CommEntry {
  id: string;
  agentId: AgentId;
  channel: CommChannel;
  channelLabel: string;
  trigger: CommTrigger;
  triggerReason: string;
  recipients: string[];
  ticketId?: string;
  ts?: number;
  tsOffsetMin: number; // minutes ago
  preview: string;
  body: string;
  status: CommStatus;
}

export type EscSeverity = "low" | "med" | "high" | "critical";
export type EscStatus = "open" | "acknowledged" | "resolved";

export interface Escalation {
  id: string;
  ticketId: string;
  trigger: string;
  raisedBy: AgentId;
  severity: EscSeverity;
  routedTo: string; // human id from humans.ts
  status: EscStatus;
  openedMinAgo: number;
  ackMin?: number;
  resolvedMin?: number;
  summary: string;
}

export interface ScheduledComm {
  id: string;
  name: string;
  cadence: string;
  nextRunIso: string; // HH:MM UTC label
  audience: string[];
  agentId: AgentId;
  channel: CommChannel;
  channelLabel: string;
  preview: {
    title: string;
    sections: { heading: string; lines: string[] }[];
  };
}

export const COMMS: CommEntry[] = [
  {
    id: "c1", agentId: "ba", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "threshold", triggerReason: "spec.md artifact completed",
    recipients: ["#automarket-dev"], ticketId: "AM-142", tsOffsetMin: 8,
    preview: "spec.md ready for review on AM-142",
    body: "BA Agent finished spec.md v3 for AM-142 (Vehicle search with filters). 7 acceptance criteria · 4 open questions resolved. Awaiting Zlatko in Spec Review.",
    status: "acknowledged",
  },
  {
    id: "c2", agentId: "pm", channel: "dm", channelLabel: "DM → Zlatko",
    trigger: "scheduled", triggerReason: "daily digest · 09:00 UTC",
    recipients: ["Zlatko"], tsOffsetMin: 42,
    preview: "Daily digest · 4 shipped · 3 at gates · 1 escalation",
    body: "Yesterday: AM-136 shipped to prod, AM-149 merged. Pending: AM-138 design 26h, AM-142 spec 8m, AM-144 QA 18m. 1 open escalation. Overnight loops: 3 PRs, all green.",
    status: "replied",
  },
  {
    id: "c3", agentId: "sa", channel: "dm", channelLabel: "DM → Marin",
    trigger: "threshold", triggerReason: "design gate stale > 24h",
    recipients: ["Marin"], ticketId: "AM-138", tsOffsetMin: 26,
    preview: "Design gate on AM-138 stale 26h — needs review",
    body: "AM-138 (Buyer–seller messaging) design.md v2 has been waiting in Design Review for 26h. SLA is 24h. Blocking 2 downstream tickets. Please review or reassign.",
    status: "no-response",
  },
  {
    id: "c4", agentId: "pm", channel: "slack", channelLabel: "#automarket-leads",
    trigger: "scheduled", triggerReason: "weekly delivery report · Fri 16:00",
    recipients: ["#automarket-leads"], tsOffsetMin: 60 * 18,
    preview: "Weekly delivery report · 23 tickets · cycle 3.4d",
    body: "This week: 23 tickets closed (+12%). Avg cycle 3.4d (-6%). Cost $1,247 (-4%). Escape rate 1.8%. Top blocker: design reviews backed up Tue–Wed.",
    status: "acknowledged",
  },
  {
    id: "c5", agentId: "qa", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "threshold", triggerReason: "QA escape-rate > 3% on AM-131",
    recipients: ["#automarket-dev"], ticketId: "AM-131", tsOffsetMin: 14,
    preview: "AM-131 escape-rate spiked · 2 selectors drifted",
    body: "Playwright caught 2 selector drifts on AM-131 (Listing image upload). Healer auto-repaired 1, escalating the other. Re-running suite.",
    status: "acknowledged",
  },
  {
    id: "c6", agentId: "dev", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "scheduled", triggerReason: "overnight summary · 07:00 UTC",
    recipients: ["#automarket-dev"], tsOffsetMin: 60 * 4,
    preview: "Overnight: 3 PRs opened · all CI green",
    body: "Ralph Wiggum loop opened PRs #441 (AM-150), #442 (AM-147), #443 (AM-149-fix). CI green on all three. 28k tokens · $1.84.",
    status: "acknowledged",
  },
  {
    id: "c7", agentId: "curator", channel: "dm", channelLabel: "DM → Zlatko",
    trigger: "threshold", triggerReason: "source conflict detected",
    recipients: ["Zlatko"], ticketId: "AM-149", tsOffsetMin: 95,
    preview: "Source conflict on AM-149 escrow flow",
    body: "Curator found SOW v4 (signed 2025-04) contradicts Slack decision from #automarket-leads (2025-05). Synthesis picked the SOW. Confirm?",
    status: "replied",
  },
  {
    id: "c8", agentId: "review", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "threshold", triggerReason: "blocker found in review",
    recipients: ["#automarket-dev"], ticketId: "AM-149", tsOffsetMin: 70,
    preview: "review.md AM-149: 1 blocker (sql injection risk)",
    body: "Code Review flagged SQL injection risk in OfferRepository.findByStatus() on AM-149. 3 minor + 1 blocker. Returning to Dev.",
    status: "acknowledged",
  },
  {
    id: "c9", agentId: "ba", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "threshold", triggerReason: "spec ready",
    recipients: ["#automarket-dev"], ticketId: "AM-128", tsOffsetMin: 110,
    preview: "spec.md v2 ready for review on AM-128",
    body: "Search autocomplete spec v2 ready · 5 acceptance criteria · debounce + cache strategy documented.",
    status: "acknowledged",
  },
  {
    id: "c10", agentId: "pm", channel: "email", channelLabel: "stakeholders@automarket",
    trigger: "scheduled", triggerReason: "weekly stakeholder email · Mon 08:00",
    recipients: ["stakeholders@automarket"], tsOffsetMin: 60 * 30,
    preview: "Weekly stakeholder digest · 23 shipped · 1 risk",
    body: "Hi team, this week we shipped 23 tickets including the new listing detail page. One risk: design-review queue backed up. Mitigation in progress.",
    status: "replied",
  },
  {
    id: "c11", agentId: "tasklist", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "threshold", triggerReason: "tasks.json regenerated",
    recipients: ["#automarket-dev"], ticketId: "AM-145", tsOffsetMin: 130,
    preview: "tasks.json v2 for AM-145 · dependency graph updated",
    body: "Tasklist Agent rebuilt tasks.json for AM-145 (Push notifications). 14 sub-tasks · 3 newly blocked by AM-150.",
    status: "no-response",
  },
  {
    id: "c12", agentId: "qa", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "scheduled", triggerReason: "nightly regression summary · 06:00",
    recipients: ["#automarket-dev"], tsOffsetMin: 60 * 5 + 20,
    preview: "Nightly regression · 412/418 passing · 6 flaky",
    body: "Nightly regression suite: 412/418 passing. 6 flaky — Healer queued repairs for 4. 2 require human triage on AM-144.",
    status: "acknowledged",
  },
  {
    id: "c13", agentId: "sa", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "threshold", triggerReason: "design.md handoff",
    recipients: ["#automarket-dev"], ticketId: "AM-141", tsOffsetMin: 150,
    preview: "design.md v1 ready · price suggestion model",
    body: "SA Agent produced design.md v1 for AM-141. 4 endpoints · 2 tables · choice of PostGIS vs Elasticsearch flagged as open question.",
    status: "acknowledged",
  },
  {
    id: "c14", agentId: "dev", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "threshold", triggerReason: "build failure",
    recipients: ["#automarket-dev"], ticketId: "AM-131", tsOffsetMin: 22,
    preview: "Build failed on AM-131 · TS2345 · retrying",
    body: "Dev Agent: build failed on AM-131 with TS2345 on ListingCard.tsx. Retry 1/3 running.",
    status: "acknowledged",
  },
  {
    id: "c15", agentId: "pm", channel: "dm", channelLabel: "DM → Ana",
    trigger: "scheduled", triggerReason: "owner standup · 09:30",
    recipients: ["Ana"], tsOffsetMin: 60 * 6,
    preview: "Your queue: 3 pending approvals · 0 SLA breach",
    body: "Morning Ana — 3 specs pending your review (AM-142, AM-128, AM-141). All within SLA. Avg approval time this week: 14m.",
    status: "replied",
  },
  {
    id: "c16", agentId: "ba", channel: "teams", channelLabel: "Teams · Product channel",
    trigger: "scheduled", triggerReason: "spec cadence report · 17:00",
    recipients: ["Product channel"], tsOffsetMin: 60 * 8,
    preview: "Specs this week · 6 drafted · 4 approved",
    body: "BA Agent weekly summary: 6 specs drafted, 4 approved, 1 rejected (AM-140), 1 in review. Avg draft time 14m.",
    status: "no-response",
  },
  {
    id: "c17", agentId: "review", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "threshold", triggerReason: "LGTM",
    recipients: ["#automarket-dev"], ticketId: "AM-133", tsOffsetMin: 180,
    preview: "review.md AM-133 · 5 minor · LGTM",
    body: "Code Review on AM-133 (Payment intent callback): 5 minor suggestions, no blockers. Ready for human review.",
    status: "acknowledged",
  },
  {
    id: "c18", agentId: "curator", channel: "slack", channelLabel: "#automarket-dev",
    trigger: "scheduled", triggerReason: "weekly knowledge digest · Mon 09:00",
    recipients: ["#automarket-dev"], tsOffsetMin: 60 * 28,
    preview: "Knowledge digest · 12 docs indexed · 2 ADRs added",
    body: "Curator weekly: indexed 12 new docs from Drive, 2 ADRs, 4 Slack threads. 3 stale sources flagged (HubSpot sync amber).",
    status: "acknowledged",
  },
  {
    id: "c19", agentId: "pm", channel: "slack", channelLabel: "#automarket-leads",
    trigger: "threshold", triggerReason: "WIP > capacity",
    recipients: ["#automarket-leads"], tsOffsetMin: 240,
    preview: "WIP at 16 · over capacity (12) · rebalancing",
    body: "PM Supervisor: WIP exceeded soft cap (12). Pausing intake from backlog for 30m. Promoting AM-141 to P1.",
    status: "acknowledged",
  },
  {
    id: "c20", agentId: "qa", channel: "dm", channelLabel: "DM → Petra",
    trigger: "threshold", triggerReason: "manual triage required",
    recipients: ["Petra"], ticketId: "AM-144", tsOffsetMin: 35,
    preview: "AM-144 needs manual triage · 2 flaky tests",
    body: "QA Agent: 2 flaky tests on AM-144 (Seller KYC) Healer couldn't repair. Needs your eyes.",
    status: "no-response",
  },
];

export const ESCALATIONS: Escalation[] = [
  {
    id: "esc1", ticketId: "AM-138", trigger: "Design gate stale > 24h",
    raisedBy: "sa", severity: "high", routedTo: "marin",
    status: "open", openedMinAgo: 26 * 60,
    summary: "design.md v2 awaiting review · 2 downstream tickets blocked",
  },
  {
    id: "esc2", ticketId: "AM-149", trigger: "Quality gate failing 3x · sql-injection blocker",
    raisedBy: "review", severity: "critical", routedTo: "ivan",
    status: "acknowledged", openedMinAgo: 80, ackMin: 22,
    summary: "Code Review flagged SQL injection in OfferRepository · Dev needs guidance",
  },
  {
    id: "esc3", ticketId: "AM-149", trigger: "Source conflict (SOW vs Slack decision)",
    raisedBy: "curator", severity: "med", routedTo: "zlatko",
    status: "resolved", openedMinAgo: 180, ackMin: 12, resolvedMin: 95,
    summary: "Curator picked signed SOW · Zlatko confirmed · spec updated",
  },
  {
    id: "esc4", ticketId: "AM-131", trigger: "QA escape-rate spike (3.4%)",
    raisedBy: "qa", severity: "high", routedTo: "petra",
    status: "open", openedMinAgo: 14,
    summary: "Selector drift recurring · Healer failure rate up · needs triage",
  },
];

export const SCHEDULED: ScheduledComm[] = [
  {
    id: "s1", name: "Daily digest", cadence: "Every day · 09:00 UTC",
    nextRunIso: "09:00", agentId: "pm", channel: "dm", channelLabel: "Zlatko + #automarket-leads",
    audience: ["Zlatko", "#automarket-leads"],
    preview: {
      title: "Daily digest · " + new Date().toISOString().slice(0, 10),
      sections: [
        { heading: "Shipped last 24h", lines: ["AM-136 · Listing detail page", "AM-133 · Payment intent callback (PR merged)"] },
        { heading: "At gates", lines: ["Spec Review · AM-142 (8m), AM-128 (110m)", "Design Review · AM-138 (26h ⚠), AM-140 (55m)", "QA Review · AM-144 (18m)"] },
        { heading: "Blockers", lines: ["AM-138 design stale 26h → Marin", "AM-149 sql-injection blocker → Ivan"] },
        { heading: "Escalations raised", lines: ["2 open · 1 acknowledged · 1 resolved"] },
        { heading: "Overnight run", lines: ["3 PRs opened · all CI green · 28k tokens · $1.84"] },
      ],
    },
  },
  {
    id: "s2", name: "Weekly delivery report", cadence: "Every Fri · 16:00 UTC",
    nextRunIso: "Fri 16:00", agentId: "pm", channel: "slack", channelLabel: "#automarket-leads",
    audience: ["#automarket-leads", "stakeholders"],
    preview: {
      title: "Weekly delivery · W22",
      sections: [
        { heading: "Throughput", lines: ["23 tickets closed (+12% vs prev week)"] },
        { heading: "Cycle time", lines: ["Avg 3.4d (-6%) · p95 6.8d"] },
        { heading: "Cost", lines: ["$1,247 (-4%) · $54/ticket avg"] },
        { heading: "Escape rate", lines: ["1.8% · 2 bugs found post-merge"] },
        { heading: "Bottleneck", lines: ["Design Review queued Tue–Wed afternoons"] },
      ],
    },
  },
  {
    id: "s3", name: "Overnight run summary", cadence: "Every day · 07:00 UTC",
    nextRunIso: "07:00", agentId: "dev", channel: "slack", channelLabel: "#automarket-dev",
    audience: ["#automarket-dev"],
    preview: {
      title: "Overnight run · " + new Date().toISOString().slice(0, 10),
      sections: [
        { heading: "PRs opened", lines: ["#441 · AM-150 VIN decoder", "#442 · AM-147 Saved searches", "#443 · AM-149 fix"] },
        { heading: "CI status", lines: ["All green"] },
        { heading: "Tokens · cost", lines: ["28,412 tokens · $1.84 · 92% local"] },
      ],
    },
  },
  {
    id: "s4", name: "Owner standup DMs", cadence: "Every weekday · 09:30 UTC",
    nextRunIso: "09:30", agentId: "pm", channel: "dm", channelLabel: "DM → each owner",
    audience: ["Ana", "Marin", "Ivan", "Petra", "Zlatko"],
    preview: {
      title: "Per-owner queue snapshot",
      sections: [
        { heading: "Each owner gets", lines: ["Pending approvals", "SLA status", "Yesterday's throughput", "Today's expected load"] },
      ],
    },
  },
  {
    id: "s5", name: "Nightly regression", cadence: "Every day · 06:00 UTC",
    nextRunIso: "06:00", agentId: "qa", channel: "slack", channelLabel: "#automarket-dev",
    audience: ["#automarket-dev"],
    preview: {
      title: "Nightly regression",
      sections: [
        { heading: "Suite result", lines: ["412/418 passing · 6 flaky · 0 hard fail"] },
        { heading: "Healer", lines: ["4 selectors repaired · 2 require triage"] },
      ],
    },
  },
];

export const openEscalations = () => ESCALATIONS.filter((e) => e.status !== "resolved");
export const unackedOpen = () => ESCALATIONS.filter((e) => e.status === "open");

/** Minutes until next scheduled UTC time (HH:MM). Returns null on SSR. */
export function minutesUntilUtc(hhmm: string): number | null {
  if (typeof window === "undefined") return null;
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return Math.round((next.getTime() - now.getTime()) / 60000);
}

export function nextDailyDigest(): { name: string; minutes: number | null; iso: string } {
  const d = SCHEDULED.find((s) => s.id === "s1")!;
  return { name: d.name, minutes: minutesUntilUtc(d.nextRunIso), iso: d.nextRunIso };
}
