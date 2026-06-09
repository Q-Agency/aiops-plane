/**
 * Pod Switcher — standard-mode top-bar control making the pod the top-level
 * scope object (multi-pod shell). Reads/writes the client-side pod store.
 * Real mode keeps using <ProjectSwitcher/> (untouched).
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { podSummaryLine, usePods, type LaunchedPod } from "@/lib/pods/pod-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_BADGE: Record<LaunchedPod["status"], { label: string; cls: string }> = {
  live: { label: "Live", cls: "border-status-done/40 bg-status-done/10 text-status-done" },
  setup: {
    label: "Setting up",
    cls: "border-status-waiting/40 bg-status-waiting/10 text-status-waiting",
  },
  paused: { label: "Paused", cls: "border-border bg-white/5 text-muted-foreground" },
};

function SampleChip() {
  return (
    <span className="px-1.5 py-px rounded border border-border bg-white/5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
      Sample
    </span>
  );
}

export function PodSwitcher() {
  const { pods, activePod, activePodId, setActivePod } = usePods();

  function switchTo(pod: LaunchedPod) {
    if (pod.id === activePodId) return;
    setActivePod(pod.id);
    toast(`Switched to ${pod.name}`, {
      description: "All views are now scoped to this pod.",
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 h-9 rounded-md bg-white/5 border border-border hover:border-primary/40 transition-colors cursor-pointer text-sm"
          aria-label="Switch pod"
        >
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
          <span className="font-medium truncate max-w-48">{activePod?.name ?? "No pod yet"}</span>
          {activePod?.sample && <SampleChip />}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          Your pods
        </DropdownMenuLabel>

        {pods.map((pod) => {
          const status = STATUS_BADGE[pod.status];
          const active = pod.id === activePodId;
          return (
            <DropdownMenuItem
              key={pod.id}
              onSelect={() => switchTo(pod)}
              className="gap-2 cursor-pointer items-start py-2"
            >
              <Check
                className={cn("size-3.5 mt-0.5 shrink-0 text-primary", !active && "opacity-0")}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{pod.name}</span>
                  {pod.sample && <SampleChip />}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {podSummaryLine(pod)}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 mt-0.5 px-1.5 py-px rounded border text-[10px] uppercase tracking-wider font-mono",
                  status.cls,
                )}
              >
                {status.label}
              </span>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/pods/new" className="flex items-center gap-2">
            <Plus className="size-3.5 text-primary" />
            <span className="font-medium">New Pod</span>
            <ArrowRight className="size-3.5 ml-auto text-muted-foreground" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
