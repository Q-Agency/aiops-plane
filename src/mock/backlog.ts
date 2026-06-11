/**
 * Client backlog — drives the Scope of Work sub-screen (Connect 3b).
 *
 * The visible list = the 16 pod tickets from tickets.ts (labeled/componented
 * here) + ~20 static "client backlog" rows, so the in/out split is visible.
 * BACKLOG_TOTAL mocks the full client board (the list is a sample of it).
 *
 * Seed scope: project "AutoMarket" + label `pod-owned` → 6 matching
 * (incl. AM-142) · 214 untouched.
 */

import { tickets } from "./tickets";
import type { Stage } from "./types";

export interface BacklogTicket {
  id: string;
  title: string;
  /** Client-board workflow status (Teamwork statuses). */
  status: string;
  /** "6h" / "3d" */
  ageLabel: string;
  project: string;
  labels: string[];
  component: string;
}

export interface BacklogRule {
  projectKey?: string;
  labels?: string[];
  components?: string[];
}

export const PROJECT_OPTIONS = ["AutoMarket", "Listr", "Kasa"];

export const LABEL_OPTIONS = [
  "pod-owned",
  "frontend",
  "backend-core",
  "bug",
  "tech-debt",
  "client-owned",
];

export const COMPONENT_OPTIONS = [
  "Search",
  "Listings",
  "Payments",
  "Messaging",
  "Onboarding",
  "Platform",
];

/** Mocked size of the full client board; the list below is a sample of it. */
export const BACKLOG_TOTAL = 220;

const STAGE_STATUS: Record<Stage, string> = {
  backlog: "Backlog",
  "ready-spec": "To Do — Refined",
  "spec-review": "To Do — Refined",
  "ready-design": "To Do — Refined",
  "design-review": "In Progress",
  "ready-tasks": "In Progress",
  "tasks-review": "In Progress",
  "ready-dev": "In Progress",
  "dev-review": "In Progress",
  "ready-qa": "QA",
  "qa-review": "QA",
  done: "Done",
};

/** Labels + component for the 16 existing pod tickets. */
const TICKET_META: Record<string, { labels: string[]; component: string }> = {
  "AM-142": { labels: ["pod-owned", "frontend"], component: "Search" },
  "AM-138": { labels: ["pod-owned"], component: "Messaging" },
  "AM-131": { labels: ["pod-owned", "frontend"], component: "Listings" },
  "AM-150": { labels: ["pod-owned", "backend-core"], component: "Listings" },
  "AM-149": { labels: ["client-owned"], component: "Payments" },
  "AM-147": { labels: ["pod-owned", "frontend"], component: "Search" },
  "AM-145": { labels: ["client-owned"], component: "Onboarding" },
  "AM-144": { labels: ["client-owned", "backend-core"], component: "Onboarding" },
  "AM-141": { labels: ["backend-core"], component: "Listings" },
  "AM-140": { labels: ["backend-core"], component: "Platform" },
  "AM-139": { labels: ["backend-core"], component: "Listings" },
  "AM-136": { labels: ["client-owned", "frontend"], component: "Listings" },
  "AM-135": { labels: ["client-owned"], component: "Onboarding" },
  "AM-133": { labels: ["client-owned", "backend-core"], component: "Payments" },
  "AM-130": { labels: ["client-owned", "frontend"], component: "Onboarding" },
  "AM-128": { labels: ["pod-owned", "frontend"], component: "Search" },
};

function ageLabel(createdAt: number): string {
  const hrs = Math.max(1, Math.round((Date.now() - createdAt) / 3_600_000));
  return hrs < 24 ? `${hrs}h` : `${Math.round(hrs / 24)}d`;
}

const fromTickets: BacklogTicket[] = tickets.map((t) => {
  const meta = TICKET_META[t.id] ?? { labels: ["client-owned"], component: "Platform" };
  return {
    id: t.id,
    title: t.title,
    status: STAGE_STATUS[t.stage],
    ageLabel: ageLabel(t.createdAt),
    project: "AutoMarket",
    labels: meta.labels,
    component: meta.component,
  };
});

/** Static "client backlog" extension — work that stays with the client team. */
const clientRows: BacklogTicket[] = [
  {
    id: "AM-101",
    title: "Dealer bulk import (CSV)",
    status: "Backlog",
    ageLabel: "31d",
    project: "AutoMarket",
    labels: ["client-owned"],
    component: "Listings",
  },
  {
    id: "AM-102",
    title: "GDPR data-export endpoint",
    status: "Backlog",
    ageLabel: "28d",
    project: "AutoMarket",
    labels: ["client-owned", "backend-core"],
    component: "Platform",
  },
  {
    id: "AM-103",
    title: "Invoice PDF redesign",
    status: "Backlog",
    ageLabel: "26d",
    project: "AutoMarket",
    labels: ["client-owned"],
    component: "Payments",
  },
  {
    id: "AM-104",
    title: "Refactor session middleware",
    status: "Backlog",
    ageLabel: "24d",
    project: "AutoMarket",
    labels: ["tech-debt"],
    component: "Platform",
  },
  {
    id: "AM-105",
    title: "Saved-card vault migration",
    status: "To Do — Refined",
    ageLabel: "22d",
    project: "AutoMarket",
    labels: ["client-owned", "backend-core"],
    component: "Payments",
  },
  {
    id: "AM-106",
    title: "Dealer dashboard charts",
    status: "Backlog",
    ageLabel: "21d",
    project: "AutoMarket",
    labels: ["client-owned", "frontend"],
    component: "Listings",
  },
  {
    id: "AM-107",
    title: "Fix flaky listing-sync cron",
    status: "In Progress",
    ageLabel: "19d",
    project: "AutoMarket",
    labels: ["bug", "backend-core"],
    component: "Listings",
  },
  {
    id: "AM-108",
    title: "Email template dark-mode",
    status: "Backlog",
    ageLabel: "18d",
    project: "AutoMarket",
    labels: ["client-owned", "frontend"],
    component: "Onboarding",
  },
  {
    id: "AM-109",
    title: "Rate-limit public search API",
    status: "To Do — Refined",
    ageLabel: "17d",
    project: "AutoMarket",
    labels: ["client-owned", "backend-core"],
    component: "Search",
  },
  {
    id: "AM-110",
    title: "Legacy admin panel cleanup",
    status: "Backlog",
    ageLabel: "16d",
    project: "AutoMarket",
    labels: ["tech-debt"],
    component: "Platform",
  },
  {
    id: "AM-111",
    title: "Chat read-receipts bug",
    status: "To Do — Refined",
    ageLabel: "14d",
    project: "AutoMarket",
    labels: ["bug"],
    component: "Messaging",
  },
  {
    id: "AM-112",
    title: "Dealer KYB document upload",
    status: "Backlog",
    ageLabel: "13d",
    project: "AutoMarket",
    labels: ["client-owned"],
    component: "Onboarding",
  },
  {
    id: "AM-113",
    title: "Currency rounding fix (HRK→EUR)",
    status: "QA",
    ageLabel: "12d",
    project: "AutoMarket",
    labels: ["bug", "backend-core"],
    component: "Payments",
  },
  {
    id: "AM-114",
    title: "SEO landing pages per region",
    status: "To Do — Refined",
    ageLabel: "11d",
    project: "AutoMarket",
    labels: ["client-owned", "frontend"],
    component: "Search",
  },
  {
    id: "AM-115",
    title: "Upgrade Postgres to 16",
    status: "Backlog",
    ageLabel: "10d",
    project: "AutoMarket",
    labels: ["tech-debt", "backend-core"],
    component: "Platform",
  },
  {
    id: "AM-116",
    title: "Push opt-in prompt copy test",
    status: "To Do — Refined",
    ageLabel: "9d",
    project: "AutoMarket",
    labels: ["client-owned"],
    component: "Onboarding",
  },
  {
    id: "AM-117",
    title: "Image CDN cache headers",
    status: "Done",
    ageLabel: "8d",
    project: "AutoMarket",
    labels: ["tech-debt"],
    component: "Listings",
  },
  {
    id: "AM-118",
    title: "Escrow payout reconciliation",
    status: "In Progress",
    ageLabel: "6d",
    project: "AutoMarket",
    labels: ["client-owned", "backend-core"],
    component: "Payments",
  },
  {
    id: "AM-119",
    title: "Typeahead locale support",
    status: "To Do — Refined",
    ageLabel: "4d",
    project: "AutoMarket",
    labels: ["client-owned", "frontend"],
    component: "Search",
  },
  {
    id: "AM-120",
    title: "Broken deep-link on iOS share",
    status: "Blocked",
    ageLabel: "2d",
    project: "AutoMarket",
    labels: ["bug", "frontend"],
    component: "Messaging",
  },
];

export const BACKLOG: BacklogTicket[] = [...fromTickets, ...clientRows];

/** True once a project is picked — until then the pod takes nothing. */
export function hasScope(rule: BacklogRule | undefined | null): boolean {
  return Boolean(rule?.projectKey);
}

/** Project-only rule — the anti-swallow edge ("takes the whole backlog"). */
export function isWholeProject(rule: BacklogRule | undefined | null): boolean {
  return (
    hasScope(rule) && (rule?.labels?.length ?? 0) === 0 && (rule?.components?.length ?? 0) === 0
  );
}

export function matchesRule(t: BacklogTicket, rule: BacklogRule): boolean {
  if (!rule.projectKey || t.project !== rule.projectKey) return false;
  if (rule.labels?.length && !rule.labels.some((l) => t.labels.includes(l))) return false;
  if (rule.components?.length && !rule.components.includes(t.component)) return false;
  return true;
}

export function matchingTickets(rule: BacklogRule | undefined | null): BacklogTicket[] {
  if (!hasScope(rule)) return [];
  return BACKLOG.filter((t) => matchesRule(t, rule as BacklogRule));
}

/**
 * Count shown in the "{matching} of {total}" header. A whole-project rule
 * conceptually takes the entire board, so it reports BACKLOG_TOTAL.
 */
export function scopedCount(rule: BacklogRule | undefined | null): number {
  if (!hasScope(rule)) return 0;
  return isWholeProject(rule) ? BACKLOG_TOTAL : matchingTickets(rule).length;
}

export function untouchedCount(rule: BacklogRule | undefined | null): number {
  return BACKLOG_TOTAL - scopedCount(rule);
}

/** Plain-language sentence rendering of the slice rule. */
export function scopeSentence(rule: BacklogRule | undefined | null): string {
  if (!hasScope(rule)) return "No scope set — the pod will take nothing until you scope it.";
  const r = rule as BacklogRule;
  if (isWholeProject(r)) return `This pod owns: every ${r.projectKey} ticket.`;
  const labels = r.labels?.length ? ` labeled ${r.labels.map((l) => `\`${l}\``).join(", ")}` : "";
  const components = r.components?.length ? ` in components ${r.components.join(", ")}` : "";
  return `This pod owns: ${r.projectKey} tickets${labels}${components}.`;
}
