import { useState } from "react";
import { ChevronDown, ChevronRight, X, Check, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRun, RunStep } from "@/mock/runs";

function fmtDur(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function OutcomePill({ outcome }: { outcome: AgentRun["outcome"] }) {
  const map = {
    approved: { i: Check, t: "text-status-done border-status-done/40 bg-status-done/10", l: "approved" },
    rejected: { i: X, t: "text-status-waiting border-status-waiting/40 bg-status-waiting/10", l: "rejected" },
    error:    { i: AlertOctagon, t: "text-status-error border-status-error/40 bg-status-error/10", l: "error" },
  } as const;
  const m = map[outcome];
  const I = m.i;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border", m.t)}>
      <I className="size-3" /> {m.l}
    </span>
  );
}

export function TraceDrawer({ run, agentColor, agentName, onClose }: { run: AgentRun; agentColor: string; agentName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] h-full glass-panel rounded-none border-l border-primary/30 overflow-y-auto scrollbar-thin anim-in"
      >
        <div className="p-5 border-b border-border sticky top-0 bg-panel/90 backdrop-blur z-10">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: agentColor }}>run trace · {agentName}</div>
              <div className="font-mono text-sm truncate">{run.id}</div>
            </div>
            <button onClick={onClose} className="size-8 rounded grid place-items-center hover:bg-white/5 cursor-pointer">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-mono">
            <span className="border border-border rounded px-1.5 py-0.5">ticket · <span className="text-foreground">{run.ticketId}</span></span>
            <span className="border border-border rounded px-1.5 py-0.5">duration · {fmtDur(run.durationMs)}</span>
            <span className="border border-border rounded px-1.5 py-0.5">{run.tokens.toLocaleString()} tokens</span>
            <span className="border border-border rounded px-1.5 py-0.5">{run.model}</span>
            <OutcomePill outcome={run.outcome} />
          </div>
        </div>
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">step tree</div>
          <div className="space-y-1.5">
            {run.trace.map((s) => <Step key={s.id} step={s} color={agentColor} depth={0} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ step, color, depth }: { step: RunStep; color: string; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasKids = !!step.children?.length;
  const Toggle = open ? ChevronDown : ChevronRight;
  return (
    <div className="border-l-2" style={{ borderColor: `color-mix(in oklab, ${color} 35%, transparent)`, paddingLeft: 10 }}>
      <button
        onClick={() => (hasKids || step.input || step.output) && setOpen(!open)}
        className="w-full text-left flex items-center gap-1.5 py-1.5 rounded hover:bg-white/[0.03] cursor-pointer"
      >
        <Toggle className="size-3 text-muted-foreground shrink-0" />
        <span className="text-[13px] text-foreground/90 truncate">{step.name}</span>
        {step.tool && <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1">{step.tool}</span>}
        <span className="ml-auto text-[10px] font-mono text-muted-foreground shrink-0">
          {fmtDur(step.durationMs)}{step.tokens ? ` · ${step.tokens.toLocaleString()}t` : ""}
        </span>
      </button>
      {open && (
        <div className="ml-2 mb-1.5 space-y-1">
          {step.input && (
            <div className="text-[11px] font-mono bg-white/[0.02] border border-border rounded p-2">
              <div className="text-muted-foreground mb-0.5">input</div>
              <div className="text-foreground/80 whitespace-pre-wrap">{step.input}</div>
            </div>
          )}
          {step.output && (
            <div className="text-[11px] font-mono bg-white/[0.02] border border-border rounded p-2">
              <div className="text-muted-foreground mb-0.5">output</div>
              <div className="text-foreground/80 whitespace-pre-wrap">{step.output}</div>
            </div>
          )}
          {hasKids && (
            <div className="space-y-1.5 mt-1.5">
              {step.children!.map((c) => <Step key={c.id} step={c} color={color} depth={depth + 1} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { fmtDur };
