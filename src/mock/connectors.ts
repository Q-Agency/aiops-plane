/**
 * Connector catalog for FIRE UP step 3 (Connect Tools) and the
 * standalone /connections hub. Honesty rule (D6): teamwork/slack/github
 * are Live; jira/gdrive/email are Roadmap (request-access only).
 */

export type ConnectorId = "teamwork" | "slack" | "github" | "jira" | "gdrive" | "email";
export type ConnectorAvailability = "live" | "roadmap";
export type ConnectorCategory = "ticketing" | "comms" | "scm" | "storage" | "pm";
export type ConnectorDirection = "inbound" | "outbound" | "bidirectional";

export interface ConnectorScope {
  id: string;
  label: string;
  access: "read" | "write";
  /** Plain-language reason shown in the ConnectDialog scope list. */
  reason: string;
}

export interface Connector {
  id: ConnectorId;
  name: string;
  /** lucide-react icon name hint. */
  icon: string;
  category: ConnectorCategory;
  availability: ConnectorAvailability;
  direction: ConnectorDirection;
  description: string;
  scopes: ConnectorScope[];
}

export const CONNECTORS: Connector[] = [
  {
    id: "teamwork",
    name: "Teamwork",
    icon: "KanbanSquare",
    category: "ticketing",
    availability: "live",
    direction: "inbound",
    description: "Pulls scoped tickets from your Teamwork board — it stays the source of truth.",
    scopes: [
      {
        id: "tw-read-projects",
        label: "Read projects & task lists",
        access: "read",
        reason: "Find the tickets inside the pod's scope",
      },
      {
        id: "tw-read-tasks",
        label: "Read task details & comments",
        access: "read",
        reason: "Give agents the full ticket context",
      },
      {
        id: "tw-write-status",
        label: "Write status & comments",
        access: "write",
        reason: "Post progress back into your workflow",
      },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    icon: "MessageSquare",
    category: "comms",
    availability: "live",
    direction: "outbound",
    description:
      "Posts clarification gates, approvals, escalations and the daily brief to your channels.",
    scopes: [
      {
        id: "sl-read-channels",
        label: "Read channel list",
        access: "read",
        reason: "Let you pick routing channels per event",
      },
      {
        id: "sl-post-messages",
        label: "Post messages as AgencyOS",
        access: "write",
        reason: "Deliver gates, escalations and briefs",
      },
      {
        id: "sl-interactive",
        label: "Receive button actions",
        access: "write",
        reason: "Let approvers act on gates from Slack",
      },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    icon: "GitBranch",
    category: "scm",
    availability: "live",
    direction: "bidirectional",
    description: "Branches, PRs and checks — where the Dev, Review and QA agents do their work.",
    scopes: [
      {
        id: "gh-read-repo",
        label: "Read repository contents",
        access: "read",
        reason: "Let agents read the codebase they work on",
      },
      {
        id: "gh-write-branches",
        label: "Create branches & pull requests",
        access: "write",
        reason: "Ship each ticket as a reviewable PR",
      },
      {
        id: "gh-read-checks",
        label: "Read CI checks & statuses",
        access: "read",
        reason: "Gate handoffs on green builds",
      },
      {
        id: "gh-write-comments",
        label: "Comment on pull requests",
        access: "write",
        reason: "Post review findings inline",
      },
    ],
  },
  {
    id: "jira",
    name: "Jira",
    icon: "SquareKanban",
    category: "ticketing",
    availability: "roadmap",
    direction: "inbound",
    description: "Jira board intake with status write-back — on our roadmap.",
    scopes: [
      {
        id: "ji-read-issues",
        label: "Read issues & sprints",
        access: "read",
        reason: "Find the tickets inside the pod's scope",
      },
      {
        id: "ji-read-workflow",
        label: "Read workflow statuses",
        access: "read",
        reason: "Map pod stages onto your board columns",
      },
      {
        id: "ji-write-transitions",
        label: "Transition issues & comment",
        access: "write",
        reason: "Write status back into your workflow",
      },
    ],
  },
  {
    id: "gdrive",
    name: "Google Drive",
    icon: "FolderOpen",
    category: "storage",
    availability: "roadmap",
    direction: "inbound",
    description: "Project docs as knowledge sources for the pod — on our roadmap.",
    scopes: [
      {
        id: "gd-read-files",
        label: "Read selected folders",
        access: "read",
        reason: "Feed project docs into pod knowledge",
      },
      {
        id: "gd-read-meta",
        label: "Read file metadata",
        access: "read",
        reason: "Track source freshness",
      },
      {
        id: "gd-read-comments",
        label: "Read doc comments",
        access: "read",
        reason: "Capture decisions made in docs",
      },
    ],
  },
  {
    id: "email",
    name: "Email",
    icon: "Mail",
    category: "comms",
    availability: "roadmap",
    direction: "outbound",
    description: "Stakeholder digests and reports by email — on our roadmap.",
    scopes: [
      {
        id: "em-send-digest",
        label: "Send digest emails",
        access: "write",
        reason: "Deliver the weekly client report",
      },
      {
        id: "em-read-replies",
        label: "Read replies to pod threads",
        access: "read",
        reason: "Capture stakeholder answers",
      },
      {
        id: "em-manage-lists",
        label: "Manage recipient lists",
        access: "write",
        reason: "Keep sponsors on the right digests",
      },
    ],
  },
];

export function connectorById(id: ConnectorId): Connector {
  const c = CONNECTORS.find((x) => x.id === id);
  if (!c) throw new Error(`connector missing: ${id}`);
  return c;
}

export const LIVE_CONNECTOR_IDS: ConnectorId[] = CONNECTORS.filter(
  (c) => c.availability === "live",
).map((c) => c.id);

/* ------------------------------------------------------------------ */
/* Status write-back mapping (ticketing connectors — ConnectDialog)    */
/* ------------------------------------------------------------------ */

export interface StatusMapRow {
  podStage: string;
  clientStatus: string;
}

/** Default pod-stage → client-workflow-status mapping, per ticketing connector. */
export const STATUS_MAP_DEFAULT: Partial<Record<ConnectorId, StatusMapRow[]>> = {
  teamwork: [
    { podStage: "Spec approved", clientStatus: "To Do — Refined" },
    { podStage: "In design", clientStatus: "In Progress" },
    { podStage: "In development", clientStatus: "In Progress" },
    { podStage: "In review/QA", clientStatus: "QA" },
    { podStage: "Done/merged", clientStatus: "Done" },
  ],
  jira: [
    { podStage: "Spec approved", clientStatus: "Selected for Development" },
    { podStage: "In design", clientStatus: "In Progress" },
    { podStage: "In development", clientStatus: "In Progress" },
    { podStage: "In review/QA", clientStatus: "In Review" },
    { podStage: "Done/merged", clientStatus: "Done" },
  ],
};

/** Mocked list of the client's existing workflow statuses (the select options). */
export const CLIENT_STATUS_OPTIONS: Partial<Record<ConnectorId, string[]>> = {
  teamwork: ["Backlog", "To Do — Refined", "In Progress", "QA", "Blocked", "Done"],
  jira: ["Backlog", "Selected for Development", "In Progress", "In Review", "Blocked", "Done"],
};
