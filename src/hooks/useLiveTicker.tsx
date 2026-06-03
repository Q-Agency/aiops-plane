import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActivityEvent, AgentId, Approval, Ticket } from "@/mock/types";
import { agents as seedAgents } from "@/mock/agents";
import { tickets as seedTickets } from "@/mock/tickets";
import { approvals as seedApprovals } from "@/mock/approvals";
import { seedActivity, makeEvent } from "@/mock/activity";

interface LiveCtx {
  agents: typeof seedAgents;
  tickets: Ticket[];
  approvals: Approval[];
  activity: ActivityEvent[];
  tokenSpend: number;
  gpuUtil: number;
  health: "green" | "amber" | "red";
  overnight: boolean;
  approve: (id: string) => void;
  reject: (id: string) => void;
  emit: (agentId: AgentId | "human", ticketId?: string) => void;
}

const Ctx = createContext<LiveCtx | null>(null);

export function LiveProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(seedTickets);
  const [approvals, setApprovals] = useState<Approval[]>(seedApprovals);
  const [activity, setActivity] = useState<ActivityEvent[]>(seedActivity);
  const [tokenSpend, setTokenSpend] = useState(187.42);
  const [gpuUtil, setGpuUtil] = useState(72);
  const tickRef = useRef<number | null>(null);

  const pushEvent = (ev: ActivityEvent) =>
    setActivity((a) => [ev, ...a].slice(0, 120));

  const emit: LiveCtx["emit"] = (agentId, ticketId) => {
    pushEvent(makeEvent(agentId, ticketId));
  };

  const approve = (id: string) => {
    setApprovals((a) => {
      const target = a.find((x) => x.id === id);
      if (target) pushEvent(makeEvent("human", target.ticketId));
      return a.filter((x) => x.id !== id);
    });
  };
  const reject = (id: string) => {
    setApprovals((a) => {
      const target = a.find((x) => x.id === id);
      if (target) {
        pushEvent({
          id: `ev-rej-${Date.now()}`,
          ts: Date.now(),
          agentId: "human",
          ticketId: target.ticketId,
          kind: "reject",
          message: `rejected ${target.artifact} → returned with feedback`,
        });
      }
      return a.filter((x) => x.id !== id);
    });
  };

  useEffect(() => {
    const schedule = () => {
      const delay = 3000 + Math.random() * 2000;
      tickRef.current = window.setTimeout(() => {
        // bump spend
        setTokenSpend((s) => +(s + Math.random() * 1.6).toFixed(2));
        setGpuUtil((g) => Math.max(35, Math.min(96, Math.round(g + (Math.random() - 0.5) * 8))));

        const r = Math.random();
        if (r < 0.55) {
          // emit a random agent event
          const ids: AgentId[] = ["ba", "sa", "tasklist", "dev", "review", "qa", "curator", "pm"];
          const agentId = ids[Math.floor(Math.random() * ids.length)];
          const t = tickets[Math.floor(Math.random() * tickets.length)];
          pushEvent(makeEvent(agentId, t?.id));
        } else if (r < 0.78) {
          // an approval lands
          const all = ["Zlatko", "Marin", "Iva", "Ana", "Petar"];
          const approver = all[Math.floor(Math.random() * all.length)];
          const t = tickets[Math.floor(Math.random() * tickets.length)];
          pushEvent({
            id: `ev-${Date.now()}`,
            ts: Date.now(),
            agentId: "human",
            ticketId: t?.id,
            kind: "approval",
            message: `${approver} approved → moved forward`,
          });
        } else {
          pushEvent({
            id: `ev-${Date.now()}`,
            ts: Date.now(),
            agentId: "dev",
            kind: "overnight",
            message: `Ralph Wiggum loop pushed commit · CI green`,
          });
        }
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (tickRef.current) window.clearTimeout(tickRef.current);
    };
  }, [tickets]);

  const value = useMemo<LiveCtx>(
    () => ({
      agents: seedAgents,
      tickets,
      approvals,
      activity,
      tokenSpend,
      gpuUtil,
      health: gpuUtil > 90 ? "amber" : "green",
      overnight: new Date().getUTCHours() >= 22 || new Date().getUTCHours() < 6,
      approve,
      reject,
      emit,
    }),
    [tickets, approvals, activity, tokenSpend, gpuUtil],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLive must be used inside <LiveProvider>");
  return v;
}
