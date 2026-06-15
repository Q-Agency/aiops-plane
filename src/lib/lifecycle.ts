import type { LifecycleStage, Run } from "@/contract";

/** Map an agent's session/work-item status string onto the shared SDLC lifecycle stage.
 *  Client-safe (pure) so both the gateway adapter and the React tables can use it. */
export function lifecycleStage(status?: string): LifecycleStage | undefined {
  switch (status) {
    case "active":
    case "in_progress":
    case "running":
      return "in_progress";
    case "waiting_for_input":
      return "waiting";
    case "spec_ready":
      return "ready";
    case "approved":
      return "approved";
    case "delivered":
      return "delivered";
    case "reset":
      return "reset"; // spec cleared - a fresh run is needed
    case "blocked":
      return "blocked";
    case "error":
    case "failed":
      return "error";
    case "pending":
      return "backlog";
    default:
      return undefined;
  }
}

/** Per-stage chip styling + short label - shared by the Overview work-items table and the
 *  per-agent recent-runs table so an artifact reads the same stage everywhere. Keyed by
 *  LifecycleStage, plus a "done" terminal for a finished run with no richer stage. */
export const STAGE_META: Record<string, { label: string; cls: string }> = {
  backlog: { label: "backlog", cls: "text-muted-foreground border-border bg-white/5" },
  in_progress: {
    label: "in progress",
    cls: "text-status-running border-status-running/40 bg-status-running/10",
  },
  waiting: {
    label: "waiting · input",
    cls: "text-status-waiting border-status-waiting/40 bg-status-waiting/10",
  },
  ready: {
    label: "ready · review",
    cls: "text-status-waiting border-status-waiting/40 bg-status-waiting/10",
  },
  approved: {
    label: "approved",
    cls: "text-status-done border-status-done/40 bg-status-done/10",
  },
  delivered: {
    label: "delivered",
    cls: "text-status-done border-status-done/40 bg-status-done/10",
  },
  reset: { label: "reset", cls: "text-muted-foreground border-border bg-white/5" },
  blocked: {
    label: "blocked",
    cls: "text-status-error border-status-error/40 bg-status-error/10",
  },
  done: { label: "done", cls: "text-muted-foreground border-border bg-white/5" },
  error: { label: "error", cls: "text-status-error border-status-error/40 bg-status-error/10" },
};

/** The lifecycle stage of a single run/turn - prefer the agent's real session status
 *  (carried in `metadata.session_status`), else fall back to the run's execution status.
 *  Returns a key into {@link STAGE_META}. */
export function runStage(run: Run): string {
  const raw = run.metadata?.session_status;
  const fromSession = lifecycleStage(typeof raw === "string" ? raw : undefined);
  if (fromSession) return fromSession;
  if (run.status === "running") return "in_progress";
  if (run.status === "failed") return "error";
  return "done";
}
