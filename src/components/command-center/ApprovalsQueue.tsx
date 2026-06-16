import { useEffect, useState } from "react";
import { Check, X, FileText } from "lucide-react";
import { useLive } from "@/hooks/useLiveTicker";
import { cn } from "@/lib/utils";
import { humanByApprover } from "@/mock/humans";
import { HumanAvatar } from "@/components/people/PersonAvatar";

function ageMs(ts: number) {
  return Date.now() - ts;
}
function ageLabel(ms: number) {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
function ageColor(ms: number) {
  const h = ms / 3_600_000;
  if (h < 1) return "text-status-done border-status-done/40 bg-status-done/10";
  if (h < 6) return "text-status-waiting border-status-waiting/40 bg-status-waiting/10";
  return "text-status-error border-status-error/40 bg-status-error/10";
}

export function ApprovalsQueue() {
  const { approvals, approve, reject } = useLive();
  const [mounted, setMounted] = useState(false);
  const [, force] = useState(0);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass-panel p-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Human-in-the-loop</div>
          <div className="text-sm font-semibold">Pending approvals · <span className="font-mono">{approvals.length}</span></div>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">SLA · 1h / 6h</div>
      </div>

      <div className="space-y-2 overflow-y-auto scrollbar-thin pr-1 max-h-[360px]">
        {approvals.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6">All gates clear · nothing waiting on humans</div>
        )}
        {approvals.map((a) => {
          const age = ageMs(a.openedAt);
          return (
            <div key={a.id} className="border border-border rounded-md p-2.5 bg-white/3 hover:bg-white/5 transition-colors anim-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs text-foreground">{a.ticketId}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.gate}</span>
                </div>
                <span className={cn("text-[10px] font-mono border rounded px-1.5 py-0.5", mounted ? ageColor(age) : "text-muted-foreground border-border")}>
                  {mounted ? ageLabel(age) : "-"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <button className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">
                  <FileText className="size-3" />{a.artifact}
                </button>
                <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  →
                  {(() => {
                    const h = humanByApprover(a.approver);
                    return h ? <HumanAvatar human={h} size="xs" /> : null;
                  })()}
                  {a.approver}
                </div>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={() => approve(a.id)}
                  className="flex-1 h-7 rounded text-[11px] font-medium bg-status-done/15 text-status-done border border-status-done/30 hover:bg-status-done/25 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="size-3" /> Approve
                </button>
                <button
                  onClick={() => reject(a.id)}
                  className="flex-1 h-7 rounded text-[11px] font-medium bg-status-error/10 text-status-error border border-status-error/30 hover:bg-status-error/20 cursor-pointer flex items-center justify-center gap-1"
                >
                  <X className="size-3" /> Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
