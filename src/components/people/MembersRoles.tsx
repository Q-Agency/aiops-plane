/**
 * MembersRoles (/pod, C11) - the "Members & roles" panel on the People &
 * Roles surface:
 *
 *  - member rows: humans.ts ⋈ roles.ts (role Select, remove w/ confirm)
 *  - pending invites: reuses the LAUNCH InviteDialog → ghost "Invited" rows
 *  - read-only "What each role sees" capability matrix card
 *
 * Honesty: RBAC is mocked - roles shape attribution/landing config only;
 * NO per-role redirects ship in this slice, access is not enforced.
 * All mutations are in-memory (survive SPA navigation, not hard reloads).
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, MailPlus, ShieldAlert, UserMinus, Users2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InviteDialog, type InvitedPerson } from "@/components/fireup/InviteDialog";
import { agents as allAgents } from "@/mock/agents";
import { agentsOf } from "@/mock/humans";
import {
  CAPABILITY_LABELS, memberHuman, roleAssignments, roleById, roles,
  sponsorMember, type RoleCapabilities, type RoleId,
} from "@/mock/roles";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Local member resolution                                              */
/* ------------------------------------------------------------------ */

interface MemberDisplay {
  id: string;
  name: string;
  subtitle: string;
  initials: string;
  /** css color value for the avatar ring (agent color or muted). */
  color: string;
  external: boolean;
  agentCount: number;
}

function resolveMember(humanId: string): MemberDisplay | null {
  const h = memberHuman(humanId);
  if (h) {
    const agent = allAgents.find((a) => a.id === h.primaryAgentId);
    const owned = agentsOf(h.id);
    return {
      id: h.id,
      name: h.name,
      subtitle: h.role,
      initials: h.initials,
      color: agent ? `var(--${agent.color})` : "var(--muted-foreground)",
      external: false,
      agentCount: owned.length,
    };
  }
  if (humanId === sponsorMember.id) {
    return {
      id: sponsorMember.id,
      name: sponsorMember.name,
      subtitle: sponsorMember.role,
      initials: sponsorMember.initials,
      color: "var(--muted-foreground)",
      external: true,
      agentCount: 0,
    };
  }
  return null;
}

/** InviteDialog's role labels → roles.ts ids. */
const INVITE_LABEL_TO_ROLE: Record<string, RoleId> = {
  "Pod Admin": "pod_admin",
  "Engineering Lead": "eng_lead",
  "QA Lead": "qa_lead",
  Sponsor: "sponsor",
  Viewer: "viewer",
};

const CAPABILITY_KEYS = Object.keys(CAPABILITY_LABELS) as (keyof RoleCapabilities)[];

/* ------------------------------------------------------------------ */
/* Panel                                                                */
/* ------------------------------------------------------------------ */

export function MembersRoles() {
  const [members, setMembers] = useState(() => roleAssignments.map((a) => ({ ...a })));
  const [invites, setInvites] = useState<InvitedPerson[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const removeTarget = removeId ? resolveMember(removeId) : null;

  const setRole = (humanId: string, roleId: RoleId) => {
    setMembers((prev) => prev.map((m) => (m.humanId === humanId ? { ...m, roleId } : m)));
    const member = resolveMember(humanId);
    toast.success("Role updated", {
      description: `${member?.name ?? humanId} → ${roleById(roleId).label}`,
    });
  };

  const confirmRemove = () => {
    if (!removeId) return;
    const member = resolveMember(removeId);
    setMembers((prev) => prev.filter((m) => m.humanId !== removeId));
    setRemoveId(null);
    toast.success("Member removed", {
      description: `${member?.name ?? removeId} no longer has access to this pod.`,
    });
  };

  return (
    <section className="space-y-2">
      {/* section head */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users2 className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Members &amp; roles
          </span>
          <span className="text-[10px] text-muted-foreground/70 font-mono">
            · who&apos;s on the pod, what they can do
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/settings/roles"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Roles &amp; Access →
          </Link>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setInviteOpen(true)}>
            <MailPlus className="size-3.5" /> Invite
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 items-start">
        {/* member rows */}
        <div className="glass-panel xl:col-span-3 divide-y divide-border/60">
          {members.map(({ humanId, roleId }) => {
            const member = resolveMember(humanId);
            if (!member) return null;
            const role = roleById(roleId);
            return (
              <div key={humanId} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  className={cn(
                    "size-9 shrink-0 rounded-full grid place-items-center font-mono font-semibold text-xs border",
                    member.external && "border-dashed",
                  )}
                  style={{
                    color: member.color,
                    borderColor: `color-mix(in oklab, ${member.color} 50%, transparent)`,
                    background: `color-mix(in oklab, ${member.color} 12%, transparent)`,
                  }}
                >
                  {member.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{member.name}</span>
                    {member.external && (
                      <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-px rounded border border-border text-muted-foreground">
                        external
                      </span>
                    )}
                    {role.readOnly && (
                      <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-px rounded border border-status-waiting/40 bg-status-waiting/10 text-status-waiting">
                        read-only
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {member.subtitle}
                    {member.agentCount > 0 && (
                      <span className="text-muted-foreground/70">
                        {" "}· accountable for {member.agentCount} agent{member.agentCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <Select value={roleId} onValueChange={(v) => setRole(humanId, v as RoleId)}>
                  <SelectTrigger
                    className="h-7 w-[170px] shrink-0 bg-white/5 border-border text-xs"
                    aria-label={`Role for ${member.name}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 shrink-0 text-muted-foreground hover:text-status-error"
                  title={`Remove ${member.name}`}
                  onClick={() => setRemoveId(humanId)}
                >
                  <UserMinus className="size-3.5" />
                </Button>
              </div>
            );
          })}

          {/* pending invites - ghost rows */}
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5 opacity-80">
              <span className="size-9 shrink-0 rounded-full grid place-items-center font-mono font-semibold text-xs border border-dashed border-border text-muted-foreground">
                {inv.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate text-muted-foreground">{inv.name}</span>
                  <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-px rounded border border-primary/40 bg-primary/10 text-primary">
                    invited
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {inv.email} · {inv.role}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 shrink-0 text-muted-foreground"
                onClick={() => {
                  setInvites((prev) => prev.filter((i) => i.id !== inv.id));
                  toast.success("Invite revoked", { description: inv.email });
                }}
              >
                Revoke
              </Button>
            </div>
          ))}

          {members.length === 0 && invites.length === 0 && (
            <div className="px-3 py-8 text-center space-y-2">
              <div className="text-sm text-foreground">No people on this pod yet - invite your team.</div>
              <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
                <MailPlus className="size-3.5" /> Invite
              </Button>
            </div>
          )}
        </div>

        {/* capability matrix - read-only */}
        <div className="glass-panel xl:col-span-2 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            What each role sees
          </div>
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 pr-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  role
                </th>
                {CAPABILITY_KEYS.map((k) => (
                  <th
                    key={k}
                    className="py-1.5 px-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground text-center"
                    title={CAPABILITY_LABELS[k]}
                  >
                    {CAPABILITY_LABELS[k].split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/60 last:border-b-0"
                  title={`${r.description}\n\n${r.sees.map((s) => `· ${s}`).join("\n")}`}
                >
                  <td className="py-2 pr-2">
                    <div className="text-[11px] font-medium text-foreground">{r.label}</div>
                    {r.readOnly && (
                      <div className="text-[9px] font-mono uppercase tracking-wider text-status-waiting">
                        read-only
                      </div>
                    )}
                  </td>
                  {CAPABILITY_KEYS.map((k) => (
                    <td key={k} className="py-2 px-1 text-center">
                      {r.capabilities[k] ? (
                        <Check className="size-3.5 text-status-done inline" aria-label="yes" />
                      ) : (
                        <span className="text-muted-foreground/40" aria-label="no">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2.5 pt-2.5 border-t border-border flex items-start gap-1.5 text-[10px] text-muted-foreground font-mono">
            <ShieldAlert className="size-3 shrink-0 mt-px text-status-waiting" />
            Mocked RBAC - roles are designed now and shape gate attribution; access is enforced when
            sign-in lands (auth v2). No per-role redirects in this slice.
          </div>
        </div>
      </div>

      {/* invite dialog - reused from LAUNCH */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={(person) => {
          // normalize the dialog's display-label role onto roles.ts
          const roleId = INVITE_LABEL_TO_ROLE[person.role] ?? "viewer";
          setInvites((prev) => [...prev, { ...person, role: roleById(roleId).label }]);
        }}
      />

      {/* remove confirm */}
      <AlertDialog open={!!removeId} onOpenChange={(open) => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name ?? "member"} from this pod?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget && removeTarget.agentCount > 0 ? (
                <>
                  {removeTarget.name} is accountable for {removeTarget.agentCount} agent
                  {removeTarget.agentCount > 1 ? "s" : ""} - those columns become uncovered risk until
                  you assign a new owner.
                </>
              ) : (
                <>They lose access to this pod. You can re-invite them at any time.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-status-error text-white hover:bg-status-error/90"
              onClick={confirmRemove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
