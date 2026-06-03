export type AgentId =
  | "curator"
  | "ba"
  | "sa"
  | "tasklist"
  | "dev"
  | "review"
  | "qa"
  | "pm";

export type AgentState = "idle" | "running" | "waiting" | "error";

export type Stage =
  | "backlog"
  | "ready-spec"
  | "spec-review"
  | "ready-design"
  | "design-review"
  | "ready-tasks"
  | "tasks-review"
  | "ready-dev"
  | "dev-review"
  | "ready-qa"
  | "qa-review"
  | "done";

export type Codebase = "backend" | "web" | "mobile";

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  color: string; // css var name token e.g. "agent-ba"
  engine: "LangGraph" | "Claude Code headless" | "local vLLM";
  state: AgentState;
  currentTicketId?: string;
  lastArtifact?: string;
  successRate: number; // 0-100
  latencyMs: number;
  tokenCostToday: number;
  sparkline: number[];
}

export interface Ticket {
  id: string; // AM-###
  title: string;
  stage: Stage;
  state: AgentState | "approved" | "rejected";
  approver: string;
  codebase: Codebase;
  priority: "P0" | "P1" | "P2" | "P3";
  overnightEligible: boolean;
  createdAt: number;
  updatedAt: number;
  rerunCount?: number;
}

export type EventKind =
  | "handoff"
  | "approval"
  | "reject"
  | "error"
  | "overnight"
  | "qa"
  | "comm"
  | "escalation";

export interface ActivityEvent {
  id: string;
  ts: number;
  agentId: AgentId | "human";
  ticketId?: string;
  kind: EventKind;
  message: string;
}

export interface Approval {
  id: string;
  ticketId: string;
  gate:
    | "Spec Review"
    | "Design Review"
    | "Tasks Review"
    | "Dev Review"
    | "QA Review";
  approver: string;
  artifact: string;
  openedAt: number;
}
