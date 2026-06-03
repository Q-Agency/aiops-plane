import { useEffect, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronDown, MoonStar, Moon, Sun, AlertTriangle, Clock, LogOut } from "lucide-react";
import { useLive } from "@/hooks/useLiveTicker";
import { useTheme } from "@/hooks/useTheme";
import { projects, project } from "@/mock/project";
import { unackedOpen, nextDailyDigest } from "@/mock/comms";
import { cn } from "@/lib/utils";
import { AssistantTriggerButton } from "@/components/assistant/SectionAssistant";
import { logoutFn } from "@/lib/auth/auth";
import type { AppUser } from "@/lib/auth/types";

function useUtcClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return "--:--:-- UTC";
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
}

export function TopBar({ user }: { user: AppUser }) {
  const clock = useUtcClock();
  const router = useRouter();
  const navigate = useNavigate();
  const { health, overnight, tokenSpend } = useLive();
  const { theme, toggle, mounted } = useTheme();

  async function handleLogout() {
    await logoutFn();
    await router.invalidate();
    await navigate({ to: "/login" });
  }

  const isReal = user.dataMode === "real";
  const healthColor =
    health === "green" ? "bg-status-done" : health === "amber" ? "bg-status-waiting" : "bg-status-error";

  const openEsc = unackedOpen().length;
  const digest = nextDailyDigest();
  const digestLabel =
    mounted && digest.minutes !== null
      ? digest.minutes < 60
        ? `${digest.minutes}m`
        : `${Math.floor(digest.minutes / 60)}h ${digest.minutes % 60}m`
      : digest.iso;

  return (
    <header className="h-14 border-b border-border bg-panel/40 backdrop-blur-md flex items-center px-4 gap-4">

      <button className="flex items-center gap-2 px-3 h-9 rounded-md bg-white/5 border border-border hover:border-primary/40 transition-colors cursor-pointer text-sm">
        <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
        <span className="font-medium">{project.name}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-mono">
        {projects.length} projects · 3 codebases
      </div>

      <div className="flex-1" />

      <div className="hidden sm:flex items-center gap-2 px-2.5 h-8 rounded-md border border-border bg-white/5">
        <span className={cn("size-2 rounded-full dot-pulse", healthColor)} />
        <span className="text-xs text-muted-foreground">SYSTEM</span>
        <span className="text-xs font-medium uppercase">{health === "green" ? "Healthy" : health}</span>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 px-2.5 h-8 rounded-md border text-xs font-medium",
          overnight
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-white/5 text-muted-foreground",
        )}
        title={overnight ? "Overnight autonomous run active" : "Daytime mode"}
      >
        {overnight ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
        {overnight ? "OVERNIGHT" : "DAY"}
      </div>

      <Link
        to="/comms"
        title={openEsc > 0 ? `${openEsc} unacknowledged escalation(s)` : "No open escalations"}
        className={cn(
          "hidden sm:flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-xs font-medium transition-colors",
          openEsc > 0
            ? "border-status-error/50 bg-status-error/10 text-status-error animate-pulse"
            : "border-border bg-white/5 text-muted-foreground hover:text-foreground",
        )}
      >
        <AlertTriangle className="size-3.5" />
        <span className="font-mono tabular-nums">{openEsc}</span>
        <span className="text-[10px] uppercase tracking-wider">ESC</span>
      </Link>

      <Link
        to="/comms"
        title="Next scheduled digest"
        className="hidden md:flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-border bg-white/5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        suppressHydrationWarning
      >
        <Clock className="size-3.5" />
        <span className="text-[10px] uppercase tracking-wider">Next digest</span>
        <span className="font-mono text-foreground tabular-nums" suppressHydrationWarning>{digestLabel}</span>
      </Link>

      <div className="hidden sm:flex items-center gap-2 px-2.5 h-8 rounded-md border border-border bg-white/5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Spend·24h</span>
        <span className="font-mono text-sm text-foreground">${tokenSpend.toFixed(2)}</span>
      </div>


      <AssistantTriggerButton />

      <button
        onClick={toggle}
        title={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} theme` : "Theme"}
        className="size-8 rounded-md border border-border bg-white/5 hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center text-muted-foreground"
        aria-label="Toggle theme"
      >
        {mounted && theme === "light" ? <Sun className="size-3.5" /> : <MoonStar className="size-3.5" />}
      </button>

      <div className="px-3 h-8 rounded-md border border-border bg-white/5 flex items-center font-mono text-xs text-muted-foreground">
        {clock}
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <div
        className={cn(
          "hidden sm:flex items-center h-8 px-2.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider",
          isReal
            ? "border-status-waiting/50 bg-status-waiting/10 text-status-waiting"
            : "border-primary/40 bg-primary/10 text-primary",
        )}
        title={
          isReal
            ? "Production workspace — live agent data not connected yet (showing mock)"
            : "Demo workspace — mock data"
        }
      >
        {isReal ? "Live · not connected" : "Demo data"}
      </div>

      <div className="flex items-center gap-2 pl-0.5">
        <div className="hidden md:flex flex-col items-end leading-tight">
          <span className="text-xs font-medium text-foreground">{user.name}</span>
          <span className="text-[10px] text-muted-foreground">{user.email}</span>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          aria-label="Sign out"
          className="size-8 rounded-md border border-border bg-white/5 hover:border-status-error/50 hover:text-status-error transition-colors flex items-center justify-center text-muted-foreground"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </header>
  );
}
