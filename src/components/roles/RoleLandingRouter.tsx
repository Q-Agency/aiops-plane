/**
 * RoleLandingRouter - the role-scoped "/" switch (My Workspace, mock mode).
 *
 * Mounted at the TOP of the standard-mode Overview (RUN landing) - it wraps Row
 * 0 (the RoiHeroRow slot; index.tsx itself is frozen this slice). Each persona
 * lands on a view scoped to what it actually does (see view-role.ts):
 *   pod_admin → the full operator cockpit (children, untouched);
 *   eng_lead  → EngLeadLanding   (architecture/code gates + flow bottlenecks);
 *   qa_lead   → ScopedGateLanding (QA gate queue + quality posture);
 *   sponsor   → ExecDigest        ("what did my money buy" - ROI $, SLA, report);
 *   viewer    → ViewerStatus      (read-only status board, deliberately non-$).
 *
 * The persona switcher (SwitchViewBar) is ALWAYS rendered first, so a presenter
 * can hop between roles from any landing and watch the scope change - the demo's
 * payoff. It sits BEFORE the takeover section, so the takeover CSS never hides it.
 *
 * TAKEOVER MECHANISM: the cockpit's grid + sibling sections are hardcoded in
 * src/routes/index.tsx (forbidden to edit). A non-PM landing emits a
 * `data-role-takeover` section plus three scoped CSS rules that (1) hide every
 * LATER sibling in the main column (FirstRunRibbon, FlowRiver, KpiStrip, Roster),
 * (2) hide the adjacent approvals/activity <aside>, and (3) collapse the
 * two-column grid to one. Selectors anchor on direct-child `:has()` chains so
 * nothing outside the frozen cockpit can match. The switcher precedes the
 * section (general-sibling `~` only matches what FOLLOWS), so it survives.
 */

import type { ReactNode } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { roles, roleById, type RoleId } from "@/mock/roles";
import { useViewRole, viewLandingFor } from "@/mock/view-role";
import { ExecDigest } from "./ExecDigest";
import { ScopedGateLanding } from "./ScopedGateLanding";
import { EngLeadLanding } from "./EngLeadLanding";
import { ViewerStatus } from "./ViewerStatus";

const SHORT_LABEL: Record<RoleId, string> = {
  pod_admin: "Pod Admin",
  eng_lead: "Eng Lead",
  qa_lead: "QA Lead",
  sponsor: "Sponsor",
  viewer: "Viewer",
};

const TAKEOVER_CSS = `
[data-role-takeover] ~ * { display: none !important; }
div:has(> [data-role-takeover]) + aside { display: none !important; }
div:has(> div > [data-role-takeover]) { display: block !important; }
`;

/**
 * The persona switcher - a PM demo affordance (never authenticates anything).
 * A labelled segmented control with the active role's scope line, so switching
 * narrates itself: "Engineering Lead - owns Dev/Review agents…".
 */
function SwitchViewBar({ role, setRole }: { role: RoleId; setRole: (r: RoleId) => void }) {
  const active = roleById(role);
  return (
    <div className="glass-panel px-3 py-2 flex items-center gap-x-3 gap-y-1.5 flex-wrap">
      <div className="flex items-center gap-1.5 shrink-0">
        <Eye className="size-3.5 text-primary" />
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          Viewing as
        </span>
      </div>
      <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-white/[0.02] p-0.5">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRole(r.id)}
            title={`${r.label} - ${r.description}`}
            className={cn(
              "text-[11px] font-medium rounded-md px-2.5 py-1 transition-colors whitespace-nowrap",
              role === r.id
                ? "border border-primary/40 bg-primary/15 text-primary"
                : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
          >
            {SHORT_LABEL[r.id]}
          </button>
        ))}
      </div>
      {active.readOnly && (
        <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground shrink-0">
          read-only
        </span>
      )}
      <span className="text-[11px] text-muted-foreground min-w-0 truncate hidden md:block ml-auto">
        {active.description}
      </span>
    </div>
  );
}

function ScopedLanding({ role }: { role: RoleId }) {
  switch (viewLandingFor(role)) {
    case "eng":
      return <EngLeadLanding />;
    case "qa":
      return <ScopedGateLanding />;
    case "exec":
      return <ExecDigest role={role} />;
    default:
      return <ViewerStatus />;
  }
}

export function RoleLandingRouter({ children }: { children: ReactNode }) {
  const { role, setRole } = useViewRole();
  const landing = viewLandingFor(role);

  return (
    <>
      {/* always-visible persona switcher - the demo's hop-between-roles control */}
      <SwitchViewBar role={role} setRole={setRole} />

      {landing === "cockpit" ? (
        // PM cockpit - children render exactly as today.
        children
      ) : (
        // Non-PM landing - takeover. The switcher above always offers the way
        // home (the Pod Admin pill), so cycling personas can never strand the user.
        <section data-role-takeover className="min-w-0 space-y-4 lg:space-y-5">
          <style>{TAKEOVER_CSS}</style>
          <ScopedLanding role={role} />
        </section>
      )}
    </>
  );
}
