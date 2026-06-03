import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Sparkles, X, Send, MessageSquare } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SECTIONS, sectionFromPath, getSectionInsight, type SectionId } from "./insights";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
  sectionId: SectionId;
}

const AssistantCtx = createContext<Ctx | null>(null);

export function useAssistant() {
  const c = useContext(AssistantCtx);
  if (!c) throw new Error("useAssistant outside provider");
  return c;
}

export function SectionAssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sectionId = sectionFromPath(pathname);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [sectionId]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AssistantCtx.Provider value={{ open, setOpen, sectionId }}>
      {children}
      <SectionAssistantDrawer />
    </AssistantCtx.Provider>
  );
}

export function AssistantTriggerButton({ className }: { className?: string }) {
  const { open, setOpen } = useAssistant();
  return (
    <button
      onClick={() => setOpen(!open)}
      title="Section assistant"
      aria-label="Open section assistant"
      className={cn(
        "size-8 rounded-md border flex items-center justify-center transition-all cursor-pointer",
        "border-[#6c63ff]/40 bg-[#6c63ff]/10 text-[#6c63ff]",
        "hover:bg-[#6c63ff]/20 hover:border-[#6c63ff]/70 hover:shadow-[0_0_12px_rgba(108,99,255,0.4)]",
        className,
      )}
    >
      <Sparkles className="size-4" />
    </button>
  );
}

function SectionAssistantDrawer() {
  const { open, setOpen, sectionId } = useAssistant();
  const section = SECTIONS[sectionId];
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Seed insight on open / section change
  useEffect(() => {
    if (!open) return;
    setMessages([
      {
        id: "seed",
        role: "assistant",
        text: section.summary(),
      },
    ]);
    setInput("");
  }, [open, sectionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const run = (prompt: string) => {
    if (!prompt.trim() || busy) return;
    const userMsg: Msg = { id: `u${Date.now()}`, role: "user", text: prompt };
    const aId = `a${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: aId, role: "assistant", text: "", streaming: true }]);
    setInput("");
    setBusy(true);

    // TODO: replace with live LLM/RAG endpoint — stream tokens from server instead.
    const full = getSectionInsight(sectionId, prompt);
    let i = 0;
    const step = Math.max(2, Math.floor(full.length / 60));
    const tick = () => {
      i = Math.min(full.length, i + step);
      setMessages((m) => m.map((msg) => (msg.id === aId ? { ...msg, text: full.slice(0, i) } : msg)));
      if (i < full.length) {
        setTimeout(tick, 18);
      } else {
        setMessages((m) => m.map((msg) => (msg.id === aId ? { ...msg, streaming: false } : msg)));
        setBusy(false);
      }
    };
    setTimeout(tick, 80);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={`Assistant — ${section.name}`}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] flex flex-col",
          "bg-panel/95 backdrop-blur-xl border-l border-[#6c63ff]/30",
          "shadow-[0_0_60px_-10px_rgba(108,99,255,0.35)]",
          "animate-in slide-in-from-right duration-300",
        )}
      >
        {/* Header */}
        <div className="h-14 border-b border-border px-4 flex items-center gap-3 shrink-0">
          <div className="size-8 rounded-md bg-[#6c63ff]/15 border border-[#6c63ff]/40 flex items-center justify-center">
            <Sparkles className="size-4 text-[#6c63ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Assistant</div>
            <div className="text-sm font-semibold truncate">{section.name}</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="size-8 rounded-md border border-border bg-white/5 hover:border-[#6c63ff]/40 hover:text-[#6c63ff] text-muted-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Suggested prompts */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">Suggested</div>
          <div className="flex flex-wrap gap-1.5">
            {section.prompts.map((p) => (
              <button
                key={p}
                onClick={() => run(p)}
                disabled={busy}
                className={cn(
                  "text-[11px] px-2.5 py-1.5 rounded-md border text-left cursor-pointer transition-all",
                  "border-[#6c63ff]/25 bg-[#6c63ff]/5 text-foreground/90",
                  "hover:border-[#6c63ff]/60 hover:bg-[#6c63ff]/10",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3 min-h-0">
          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
          }}
          className="border-t border-border p-3 flex items-center gap-2 shrink-0"
        >
          <MessageSquare className="size-4 text-muted-foreground shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder={`Ask about ${section.name}…`}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className={cn(
              "size-8 rounded-md flex items-center justify-center transition-all cursor-pointer",
              "bg-[#6c63ff] text-white hover:bg-[#5a52e0]",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            aria-label="Send"
          >
            <Send className="size-3.5" />
          </button>
        </form>
      </aside>
    </>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isUser
            ? "bg-white/10 text-foreground border border-border"
            : "bg-[#6c63ff]/10 border border-[#6c63ff]/30 text-foreground",
        )}
      >
        <FormattedText text={msg.text} />
        {msg.streaming && <span className="inline-block w-1.5 h-3 ml-0.5 bg-[#6c63ff] animate-pulse align-middle" />}
      </div>
    </div>
  );
}

// Minimal markdown: **bold**, *italic*, line breaks
function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className={line.trim() === "" ? "h-1.5" : ""}>
          {renderInline(line)}
        </div>
      ))}
    </>
  );
}

function renderInline(s: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1]) parts.push(<strong key={k++} className="font-semibold text-[#a99fff]">{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={k++} className="text-muted-foreground">{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}
