/**
 * InviteDialog - invite-by-email mock for the Accountable People step.
 * Email + role → "Send invite" generates a mocked one-time link, copies it,
 * fires the "Invite sent" toast and hands the invited person back to the
 * roster (optionally auto-assigned to the column that opened the dialog).
 */

import { useEffect, useState } from "react";
import { Check, Copy, Link2, MailPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Roster card for someone invited during setup (mock - local to the step). */
export interface InvitedPerson {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  inviteLink: string;
}

export interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (person: InvitedPerson) => void;
}

/** Product-vision §3 roles. */
const INVITE_ROLES = ["Pod Admin", "Engineering Lead", "QA Lead", "Sponsor", "Viewer"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : local.slice(0, 2) || "??";
  return letters.toUpperCase();
}

function displayName(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export function InviteDialog({ open, onOpenChange, onInvite }: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(INVITE_ROLES[0]);
  const [error, setError] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setRole(INVITE_ROLES[0]);
    setError(null);
    setSentLink(null);
    setCopied(false);
  }, [open]);

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable - link is still visible to copy by hand */
    }
  };

  const handleSend = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email - couldn't generate invite link.");
      return;
    }
    setError(null);
    const link = `https://podops.app/invite/ix_${Math.random().toString(36).slice(2, 10)}`;
    const person: InvitedPerson = {
      id: `invite-${Date.now().toString(36)}`,
      name: displayName(email.trim()),
      email: email.trim(),
      role,
      initials: initialsFromEmail(email.trim()),
      inviteLink: link,
    };
    setSentLink(link);
    void copyLink(link);
    toast.success("Invite sent · one-time link copied", {
      description: `${person.email} · ${role}`,
    });
    onInvite(person);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailPlus className="size-4 text-primary" />
            Invite by email
          </DialogTitle>
          <DialogDescription>They&apos;ll get a one-time link to join this pod.</DialogDescription>
        </DialogHeader>

        {sentLink ? (
          <div className="space-y-3">
            <div className="rounded-md border border-status-done/40 bg-status-done/10 px-3 py-2.5 text-xs text-status-done flex items-center gap-2">
              <Check className="size-3.5 shrink-0" />
              Invitation sent - the link is active until they join.
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-white/[0.03] px-3 py-2">
              <Link2 className="size-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono text-[11px] text-muted-foreground truncate flex-1">
                {sentLink}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 shrink-0"
                onClick={() => void copyLink(sentLink)}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email" className="text-xs">
                Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@client.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="h-8 bg-white/5 border-border text-sm"
                autoFocus
              />
              {error && <p className="text-xs text-status-error">{error}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-8 bg-white/5 border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-sm">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          {sentLink ? (
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSend}>
                Send invite
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
