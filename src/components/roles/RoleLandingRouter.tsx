/**
 * RoleLandingRouter — the role-scoped "/" switch (My Workspace, mock mode).
 *
 * Mounted at the TOP of the standard-mode Overview (RUN landing) (it wraps Row 0,
 * the RoiHeroRow slot — index.tsx itself is frozen this slice):
 *   pod_admin / eng_lead → the existing PM cockpit, untouched, plus a small
 *                          ghost "Switch view" row (a PM demo affordance);
 *   qa_lead              → ScopedGateLanding (QA gate queue + posture rail);
 *   sponsor / viewer     → ExecDigest (read-only weekly status).
 *
 * TAKEOVER MECHANISM: the cockpit's grid + sibling sections are hardcoded in
 * src/routes/index.tsx, which is forbidden to edit. Because this router
 * renders into the FIRST slot of the cockpit's main column, a non-PM landing
 * emits a `data-role-takeover` section plus three scoped CSS rules that
 * (1) hide every later sibling in the main column (FirstRunRibbon, FlowRiver,
 * KpiStrip, the Roster section), (2) hide the adjacent approvals/activity
 * <aside>, and (3) collapse the two-column grid to one column. Selectors are
 * anchored on direct-child `:has()` chains so nothing outside the frozen
 * cockpit layout can ever match. Removing the section restores the cockpit
 * byte-for-byte — zero regression for the PM view.
 */

import type { ReactNode } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { roles, type RoleId } from "@/mock/roles";
import { useViewRole, viewLandingFor } from "@/mock/view-role";
import { RoleRibbon } from "./RoleRibbon";
import { ExecDigest } from "./ExecDigest";
import { ScopedGateLanding } from "./ScopedGateLanding";

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

/** The PM-cockpit "Switch view" ghost row — cycles personas for demoing. */
function SwitchViewRow({ role, setRole }: { role: RoleId; setRole: (r: RoleId) => void }) {
  return (
    <div className="flex items-center justify-end gap-1 flex-wrap">
      <Eye className="size-3 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mr-1">
        Switch view
      </span>
      {roles.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => setRole(r.id)}
          title={`Preview the ${r.label} landing — demo affordance, no re-login`}
          className={cn(
            "text-[10px] font-mono rounded px-1.5 py-0.5 border transition-colors",
            role === r.id
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          {SHORT_LABEL[r.id]}
        </button>
      ))}
    </div>
  );
}

export function RoleLandingRouter({ children }: { children: ReactNode }) {
  const { role, setRole } = useViewRole();
  const landing = viewLandingFor(role);

  // PM cockpit (pod_admin; eng_lead previews the same operator cockpit) —
  // children render exactly as today, plus the Switch-view ghost row.
  if (landing === "cockpit") {
    return (
      <>
        <SwitchViewRow role={role} setRole={setRole} />
        {children}
      </>
    );
  }

  // Non-PM landing — takeover. The RoleRibbon always offers the way home,
  // so cycling personas can never strand the user.
  return (
    <section data-role-takeover className="min-w-0 space-y-4 lg:space-y-5">
      <style>{TAKEOVER_CSS}</style>
      <RoleRibbon role={role} onBack={() => setRole("pod_admin")} />
      {landing === "qa" ? <ScopedGateLanding /> : <ExecDigest role={role} />}
    </section>
  );
}
