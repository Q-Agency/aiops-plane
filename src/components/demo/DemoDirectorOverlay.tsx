/**
 * DemoDirectorOverlay (wave-2 COMPLETION) — the hidden ⌘⇧D presenter
 * overlay: a compact draggable corner-pinned card whose step list mirrors
 * the 3-minute demo script. Each step dispatches staged mutations into the
 * EXISTING mock stores (demoDirector.ts) — the product surfaces just react.
 *
 * Footprint rules:
 *  - renders NOTHING until the first ⌘⇧D (the keydown listener is the only
 *    footprint); never appears in any nav, rail, or ⌘K index.
 *  - after first summon it stays mounted (hidden via CSS on toggle-off) so
 *    a running script keeps firing while the presenter roams routes.
 *  - mounted standard-mode-only in AppShell beside <PodCopilot />.
 */

import { useEffect, useRef, useState } from "react";
import { Clapperboard, Pause, Play, RotateCcw, StepForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { CHECKPOINTS, DEMO_SCRIPT_NAME } from "@/mock/demoDirector";
import { DemoStepRow } from "./DemoStepRow";
import { useDemoScript, type DemoAdvanceMode } from "./useDemoScript";

export function DemoDirectorOverlay() {
  // summoned = has ever been opened (we keep it mounted after that so the
  // script clock survives toggling); open = currently visible.
  const [summoned, setSummoned] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [checkpointId, setCheckpointId] = useState<string>(CHECKPOINTS[0].id);
  const dragState = useRef<{ px: number; py: number; bx: number; by: number } | null>(null);
  const script = useDemoScript();

  // ⌘⇧D / Ctrl⇧D — registered client-side only (SSR-safe), never in ⌘K.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setSummoned(true);
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!summoned) return null;

  function onHeaderPointerDown(e: React.PointerEvent) {
    dragState.current = { px: e.clientX, py: e.clientY, bx: pos.x, by: pos.y };
    function onMove(ev: PointerEvent) {
      const d = dragState.current;
      if (!d) return;
      setPos({ x: d.bx + (ev.clientX - d.px), y: d.by + (ev.clientY - d.py) });
    }
    function onUp() {
      dragState.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const manual = script.mode === "manual";

  return (
    <div
      className={cn("fixed bottom-6 right-6 z-[200] w-80", !open && "hidden")}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      aria-label="Demo Director"
    >
      <Card className="bg-panel/80 backdrop-blur-xl border-border/60 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header — drag handle + script name + elapsed timer */}
        <div
          onPointerDown={onHeaderPointerDown}
          className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60 cursor-grab active:cursor-grabbing select-none touch-none"
        >
          <Clapperboard className="size-3.5 text-primary shrink-0" />
          <span className="text-sm font-semibold leading-none">Demo Director</span>
          <span className="text-[10px] text-muted-foreground truncate">{DEMO_SCRIPT_NAME}</span>
          <div className="flex-1" />
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              script.running ? "text-primary" : "text-muted-foreground",
            )}
          >
            {script.elapsedLabel}
          </span>
          <button
            type="button"
            aria-label="Hide Demo Director (⌘⇧D)"
            title="Hide (⌘⇧D)"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Advance mode — Auto-advance / On my cue */}
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Advance
          </span>
          <ToggleGroup
            type="single"
            value={script.mode}
            onValueChange={(v) => {
              if (v) script.setMode(v as DemoAdvanceMode);
            }}
            className="gap-0.5"
          >
            <ToggleGroupItem value="auto" className="h-6 px-2 text-[11px]">
              Auto-advance
            </ToggleGroupItem>
            <ToggleGroupItem value="manual" className="h-6 px-2 text-[11px]">
              On my cue
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Step list — mirrors the 3-minute script verbatim */}
        <ScrollArea className="max-h-60">
          <div className="px-2 py-2 space-y-0.5">
            {script.steps.map((s) => (
              <DemoStepRow key={s.id} step={s} status={script.statusFor(s.id)} />
            ))}
          </div>
        </ScrollArea>

        <Separator className="bg-border/60" />

        {/* Transport — Run / Pause / Step → */}
        <div className="flex items-center gap-1.5 px-3 py-2">
          {script.running ? (
            <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs" onClick={script.pause}>
              <Pause className="size-3" /> Pause
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={script.run}
              disabled={script.allFired || manual}
              title={manual ? "On my cue — use Step →" : undefined}
            >
              <Play className="size-3" /> Run
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={script.stepNext}
            disabled={!script.nextStep}
          >
            <StepForward className="size-3" /> Step →
          </Button>
          {script.allFired && (
            <span className="ml-auto text-[10px] font-mono text-status-done">script done</span>
          )}
        </div>

        {/* Reset to checkpoint */}
        <div className="flex items-center gap-1.5 px-3 pb-2">
          <Select value={checkpointId} onValueChange={setCheckpointId}>
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue placeholder="Checkpoint" />
            </SelectTrigger>
            <SelectContent>
              {script.checkpoints.map((cp) => (
                <SelectItem key={cp.id} value={cp.id} className="text-xs">
                  {cp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={() => script.resetTo(checkpointId)}
            title="Reset to checkpoint"
          >
            <RotateCcw className="size-3" /> Reset
          </Button>
        </div>

        <p className="px-3 pb-2.5 text-[10px] leading-snug text-muted-foreground">
          Staged data · mutations land in the same mock stores the product reads.
        </p>
      </Card>
    </div>
  );
}
