/**
 * RolesAccessSummary - the Settings "Roles & Access" tab: an inline
 * five-role summary (member counts + read-only badges) that links out to
 * the full /settings/roles screen. Standard (mock) experience only.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { membersOf, roles } from "@/mock/roles";

export function RolesAccessSummary() {
  return (
    <section id="roles" className="glass-panel p-5 space-y-4 scroll-mt-24">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <UserCog className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Roles &amp; Access</h2>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to="/settings/roles">
            Open Roles &amp; Access
            <ArrowRight className="size-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground max-w-3xl">
        Who sees what, and who can act - the five role personas that shape every member&apos;s
        landing and gate attribution. Enforcement arrives with sign-in (auth v2).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {roles.map((role) => {
          const count = membersOf(role.id).length;
          return (
            <div key={role.id} className="rounded border border-border bg-white/[0.02] p-3">
              <div className="text-xs font-semibold">{role.label}</div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {count} member{count === 1 ? "" : "s"}
                </span>
                {role.readOnly && (
                  <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-0.5 rounded border border-border text-muted-foreground">
                    Read-only
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Mocked RBAC - roles are designed now; access is not yet enforced server-side.
      </p>
    </section>
  );
}
