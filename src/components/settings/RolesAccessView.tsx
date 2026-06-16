/**
 * RolesAccessView - the /settings/roles screen (wave-2 COMPLETION,
 * screens-doc "Roles & Access"): the five role personas, their default
 * landings, capability checklists (switches checked-but-disabled - RBAC is
 * designed now, enforced when real sign-in lands), and member chips.
 * Empty roles carry the uncovered-risk amber hairline; the footer alert is
 * the auth-deferral honesty note. Standard (mock) experience only
 * (mockOnlyBeforeLoad on the route).
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, UserCog, Users2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { agents } from "@/mock/agents";
import {
  CAPABILITY_LABELS,
  memberHuman,
  membersOf,
  roles,
  sponsorMember,
  type Role,
  type RoleCapabilities,
} from "@/mock/roles";
import { PersonAvatar } from "@/components/people/PersonAvatar";
import { cn } from "@/lib/utils";

const DEFERRAL_TOOLTIP = "Roles are designed now; enforced when real sign-in lands.";

/* --------------------------- member chips ----------------------------- */

interface MemberChipData {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  color: string;
}

function resolveMemberChip(humanId: string): MemberChipData | null {
  const h = memberHuman(humanId);
  if (h) {
    const agent = agents.find((a) => a.id === h.primaryAgentId);
    return {
      id: h.id,
      name: h.name,
      initials: h.initials,
      avatarUrl: h.avatarUrl,
      color: agent ? `var(--${agent.color})` : "var(--muted-foreground)",
    };
  }
  if (humanId === sponsorMember.id) {
    return {
      id: sponsorMember.id,
      name: sponsorMember.name,
      initials: sponsorMember.initials,
      avatarUrl: sponsorMember.avatarUrl,
      color: "var(--muted-foreground)",
    };
  }
  return null;
}

function MemberChip({ m }: { m: MemberChipData }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/5 pl-0.5 pr-2 py-0.5">
      <PersonAvatar name={m.name} initials={m.initials} src={m.avatarUrl} color={m.color} size="xs" />
      <span className="text-[11px] text-foreground">{m.name}</span>
    </span>
  );
}

/* ------------------------------ role card ------------------------------ */

function RoleCard({ role }: { role: Role }) {
  const memberIds = membersOf(role.id);
  const members = memberIds
    .map(resolveMemberChip)
    .filter((m): m is MemberChipData => m !== null);
  const empty = members.length === 0;

  return (
    <div
      className={cn(
        "glass-panel p-4 space-y-3",
        empty && "border-status-waiting/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{role.label}</h3>
            {role.readOnly && (
              <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                Read-only
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
          {members.length} member{members.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Default landing */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Default landing
        </span>
        <Link
          to={role.defaultLanding as "/"}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-border bg-white/5 text-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          {role.defaultLanding}
        </Link>
      </div>

      {/* Capability checklist - checked-but-disabled (deferral tooltip) */}
      <TooltipProvider delayDuration={150}>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {(Object.keys(CAPABILITY_LABELS) as (keyof RoleCapabilities)[]).map((cap) => (
            <Tooltip key={cap}>
              <TooltipTrigger asChild>
                <li className="flex items-center justify-between gap-2 cursor-not-allowed">
                  <span
                    className={cn(
                      "text-xs",
                      role.capabilities[cap] ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {CAPABILITY_LABELS[cap]}
                  </span>
                  <Switch
                    checked={role.capabilities[cap]}
                    disabled
                    aria-label={`${CAPABILITY_LABELS[cap]} - locked, enforcement arrives with auth v2`}
                    className="scale-90"
                  />
                </li>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-60 text-xs">
                {DEFERRAL_TOOLTIP}
              </TooltipContent>
            </Tooltip>
          ))}
        </ul>
      </TooltipProvider>

      {/* Members */}
      <div className="border-t border-border/60 pt-3">
        {empty ? (
          <div className="flex items-center gap-2 rounded border border-status-waiting/50 bg-status-waiting/5 px-2.5 py-2 text-[11px] text-status-waiting">
            <Users2 className="size-3.5 shrink-0" />
            <span>
              No members yet -{" "}
              <Link to="/pod" className="underline underline-offset-2 hover:text-foreground">
                assign from People &amp; Roles
              </Link>
              .
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {members.map((m) => (
              <MemberChip key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- view --------------------------------- */

export function RolesAccessView() {
  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header strip */}
      <div className="glass-panel flex flex-wrap items-center gap-3 p-5">
        <div className="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <UserCog className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold">Roles &amp; Access</div>
          <div className="text-xs text-muted-foreground">
            Who sees what, and who can act. Enforcement arrives with sign-in (auth v2).
          </div>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to="/pod">
            Manage members
            <ArrowRight className="size-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {roles.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </div>

      {/* Auth-deferral honesty note */}
      <Alert className="border-status-waiting/40 bg-status-waiting/5">
        <ShieldAlert className="size-4 text-status-waiting" />
        <AlertTitle className="text-sm">Mocked RBAC</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          These roles shape every member&apos;s landing and gate attribution today; access is not
          yet enforced server-side.
        </AlertDescription>
      </Alert>
    </div>
  );
}
