/**
 * TicketComposer — the "Paste a ticket" tab of Work Intake (C10).
 *
 * Minimal composer (title, description — markdown ok, priority, label chips)
 * with the live routing preview beside it. "Pull into pod" is disabled until
 * the title is non-empty ("A one-line title is enough — the BA asks for the
 * rest."). Creates the ticket via composeTicket() — lands at the top of the
 * Pipeline Backlog, fires a bell notification. A pod is never dead-ended.
 */

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { composeTicket } from "@/mock/intake";
import type { Ticket } from "@/mock/types";
import { RoutingPreview, useBaAccountable } from "./RoutingPreview";

const PRIORITIES: Ticket["priority"][] = ["P0", "P1", "P2", "P3"];
const LABEL_CHIPS = ["pod-owned", "frontend", "backend-core", "bug", "tech-debt"];

export function TicketComposer() {
  const navigate = useNavigate();
  const { firstName } = useBaAccountable();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Ticket["priority"]>("P2");
  const [labels, setLabels] = useState<Set<string>>(new Set());
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  const canPull = title.trim().length > 0;

  function toggleLabel(l: string) {
    setLabels((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  }

  function pull() {
    if (!canPull) return;
    const t = composeTicket({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      labels: [...labels],
    });
    setLastCreated(t.id);
    setTitle("");
    setDescription("");
    setPriority("P2");
    setLabels(new Set());
    toast.success(`${t.id} pulled — routing to BA Agent`, {
      description: `“${t.title}” landed at the top of the Pipeline Backlog.`,
      action: {
        label: "View in Pipeline",
        onClick: () => navigate({ to: "/pipeline", search: { ticket: t.id } }),
      },
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
      {/* composer card */}
      <section className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardPaste className="size-4 text-primary" />
          Paste a ticket
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="intake-title" className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Title
          </Label>
          <Input
            id="intake-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Dealer trade-in price estimate"
            className="bg-white/5 border-border text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            A one-line title is enough — the BA asks for the rest.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="intake-desc" className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Description <span className="normal-case">(optional · markdown ok)</span>
          </Label>
          <Textarea
            id="intake-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder={"Paste the ticket body — context, links, acceptance criteria…"}
            className="bg-white/5 border-border text-xs resize-y"
          />
        </div>

        <div className="flex items-start gap-4 flex-wrap">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Priority
            </Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Ticket["priority"])}>
              <SelectTrigger className="h-8 w-[88px] text-xs bg-white/5 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Labels <span className="normal-case">(optional)</span>
            </Label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {LABEL_CHIPS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLabel(l)}
                  className={cn(
                    "px-2 py-1 rounded border text-[10px] font-mono transition-colors cursor-pointer",
                    labels.has(l)
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-white/5 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-1 flex items-center gap-3">
          <button
            type="button"
            disabled={!canPull}
            onClick={pull}
            className={cn(
              "h-9 px-4 rounded-md border text-xs font-semibold uppercase tracking-wider transition-colors",
              canPull
                ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer shadow-[0_0_12px_-4px_var(--primary)]"
                : "border-border bg-white/5 text-muted-foreground opacity-50",
            )}
          >
            Pull into pod
          </button>
          {lastCreated && (
            <span className="inline-flex items-center gap-1.5 text-xs text-status-done anim-in">
              <CheckCircle2 className="size-3.5" />
              {lastCreated} added to Backlog
              <Link
                to="/pipeline"
                search={{ ticket: lastCreated }}
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                View in Pipeline <ArrowRight className="size-3" />
              </Link>
            </span>
          )}
        </div>
      </section>

      {/* live routing preview rail */}
      <aside className="space-y-3">
        <div className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Routing preview
          </div>
          <RoutingPreview pendingLabel={title.trim() ? "New ticket" : "—"} />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            What happens next: the BA Agent drafts <span className="font-mono">spec.md</span> from
            your ticket; the first human gate is Spec Review — {firstName} is accountable. You see
            where work lands before committing.
          </p>
        </div>
      </aside>
    </div>
  );
}
