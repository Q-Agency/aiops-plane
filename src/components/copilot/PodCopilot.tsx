/**
 * PodCopilot (⌘J, P1-A1) — the second mode of the one-omnibox family:
 * ⌘K navigates, ⌘J asks/acts. Right-side sheet, mounted ONCE in AppShell
 * (standard mode only) beside <CommandPalette />; opened by Cmd/Ctrl-J or
 * the TopBar sparkle dispatching COPILOT_TOGGLE_EVENT.
 *
 * Ask-with-receipts: answers come from matchCopilot (zero-LLM, computed
 * from pod telemetry seeds) and every answer cites the record via
 * ReceiptChips deep-linking to /compliance#audit, /approvals/$gateId,
 * /governance. NL ops render as ProposedActionCards — nothing executes
 * unconfirmed; Confirm appends the previewed row to the session audit
 * ledger. Conversation history lives in component state for the session.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { CircleHelp, ShieldCheck, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePods } from "@/lib/pods/pod-store";
import { cn } from "@/lib/utils";
import {
  COPILOT_FALLBACK_LINE,
  COPILOT_HONESTY_BADGE,
  SUGGESTED_PROMPTS,
  type CopilotAnswer,
} from "@/mock/copilot";
import { ProposedActionCard } from "./ProposedActionCard";
import { ReceiptChip } from "./ReceiptChip";
import { useCopilotAnswers } from "./useCopilotAnswers";

/** Custom event the TopBar sparkle (or anything else) fires to toggle. */
export const COPILOT_TOGGLE_EVENT = "aiops:copilot-toggle";

export function togglePodCopilot() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(COPILOT_TOGGLE_EVENT));
}

/** Idle chips — the task-locked trio: ask, why-with-receipts, NL operation. */
const IDLE_PROMPTS = [SUGGESTED_PROMPTS[0], SUGGESTED_PROMPTS[1], SUGGESTED_PROMPTS[3]] as const;

export function PodCopilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { activePod } = usePods();
  const { items, ask, confirmAction, cancelAction } = useCopilotAnswers();

  // ⌘J + TopBar toggle event — registered client-side only (SSR-safe).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onToggle() {
      setOpen((o) => !o);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(COPILOT_TOGGLE_EVENT, onToggle);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COPILOT_TOGGLE_EVENT, onToggle);
    };
  }, []);

  // Keep the latest turn in view.
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items, open]);

  // Receipt deep-links close the sheet, then push (untyped — param routes).
  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.history.push(href);
    },
    [router],
  );

  const submit = (text: string) => {
    if (!text.trim()) return;
    ask(text);
    setInput("");
  };

  const handleConfirm = (itemId: number, reason: string) => {
    const written = confirmAction(itemId, reason);
    if (written?.intent === "open-gate") go(`/approvals/${written.target}`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
        className={cn(
          "w-full sm:w-[460px] sm:max-w-[460px] p-0 gap-0 flex flex-col",
          "bg-panel/95 backdrop-blur-xl border-l border-primary/30",
          "shadow-2xl shadow-primary/10",
        )}
      >
        {/* header (pr-10 clears the built-in sheet close X) */}
        <div className="h-14 shrink-0 border-b border-border px-4 pr-10 flex items-center gap-3">
          <div className="size-8 shrink-0 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="text-sm font-semibold leading-tight">Pod Copilot</SheetTitle>
            <SheetDescription className="text-[10px] font-mono text-muted-foreground leading-tight truncate">
              ⌘K navigate · ⌘J ask — every answer cites the record
            </SheetDescription>
          </div>
        </div>

        {/* omnibox input — same affordance as the ⌘K palette */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="shrink-0 border-b border-border"
        >
          <div className="flex items-center gap-2 px-4 border-b border-border/60">
            <Sparkles className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the pod, or tell it what to do…  ⌘J"
              className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* persistent honesty badge — the deterministic wall */}
          <div className="px-4 py-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-primary/30 bg-primary/5 px-2 py-1 text-[10px] font-mono text-muted-foreground">
              <ShieldCheck className="size-3 shrink-0 text-primary" />
              {COPILOT_HONESTY_BADGE}
            </span>
          </div>
        </form>

        {/* conversation */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 && <IdleState onPick={submit} />}
          {items.map((item) => {
            switch (item.kind) {
              case "user":
                return (
                  <div key={item.id} className="flex justify-end">
                    <div className="max-w-[88%] rounded-lg border border-border bg-white/10 px-3 py-2 text-sm break-words">
                      {item.text}
                    </div>
                  </div>
                );
              case "answer":
                return <AnswerBubble key={item.id} answer={item.answer} onNavigate={go} />;
              case "fallback":
                return (
                  <div key={item.id} className="flex justify-start">
                    <div className="max-w-[88%] rounded-lg border border-border/60 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
                      <CircleHelp className="size-3.5 shrink-0 mt-0.5" />
                      {COPILOT_FALLBACK_LINE}
                    </div>
                  </div>
                );
              case "action":
                return (
                  <ProposedActionCard
                    key={item.id}
                    action={item.action}
                    status={item.status}
                    ledgerId={item.ledgerId}
                    writtenDetail={item.writtenDetail}
                    onConfirm={(reason) => handleConfirm(item.id, reason)}
                    onCancel={() => cancelAction(item.id)}
                  />
                );
            }
          })}
          <div ref={endRef} />
        </div>

        {/* footer — omnibox-family hints + pod scope */}
        <div className="shrink-0 border-t border-border px-3 py-2 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span>↵ ask</span>
          <span>·</span>
          <span>esc close</span>
          <div className="flex-1" />
          <span className="truncate">asking {activePod?.name ?? "the pod"}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Idle state — suggested prompts                                       */
/* ------------------------------------------------------------------ */

function IdleState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="pt-2">
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        Ask why something shipped, what needs you — or tell the pod what to do. Answers cite
        ledger rows, gates, and validator reports.
      </p>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
        Try
      </div>
      <div className="flex flex-wrap gap-1.5">
        {IDLE_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className={cn(
              "text-[11px] px-2.5 py-1.5 rounded-md border text-left cursor-pointer transition-all",
              "border-primary/25 bg-primary/5 text-foreground/90",
              "hover:border-primary/60 hover:bg-primary/10",
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Answer bubble — short paragraph + receipt chips                      */
/* ------------------------------------------------------------------ */

function AnswerBubble({
  answer,
  onNavigate,
}: {
  answer: CopilotAnswer;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
        <div className="text-sm leading-relaxed break-words">{renderInline(answer.answerMd)}</div>
        {answer.receipts.length > 0 && (
          <div className="mt-2 pt-2 border-t border-primary/20 flex flex-wrap gap-1.5">
            {answer.receipts.map((r) => (
              <ReceiptChip key={`${r.kind}-${r.refId}`} receipt={r} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* Minimal inline markdown for answerMd: **bold** and *italic*. */
function renderInline(s: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1]) {
      parts.push(
        <strong key={k++} className="font-semibold text-foreground">
          {m[1]}
        </strong>,
      );
    } else if (m[2]) {
      parts.push(
        <em key={k++} className="text-muted-foreground">
          {m[2]}
        </em>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}
