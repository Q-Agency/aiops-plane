import { useNavigate, useRouter } from "@tanstack/react-router";
import { MoonStar, Sun, LogOut, Search, Sparkles } from "lucide-react";
import { useLive } from "@/hooks/useLiveTicker";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { logoutFn } from "@/lib/auth/auth";
import type { AppUser } from "@/lib/auth/types";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { PodSwitcher } from "./PodSwitcher";
import { TenancyBadge } from "./TenancyBadge";
import { NotificationBell } from "./NotificationBell";
import { openCommandPalette } from "./CommandPalette";

export function TopBar({ user }: { user: AppUser }) {
  const router = useRouter();
  const navigate = useNavigate();
  const { health, tokenSpend } = useLive();
  const { theme, toggle, mounted } = useTheme();

  async function handleLogout() {
    await logoutFn();
    await router.invalidate();
    await navigate({ to: "/login" });
  }

  const isReal = user.dataMode === "real";
  const healthColor =
    health === "green"
      ? "bg-status-done"
      : health === "amber"
        ? "bg-status-waiting"
        : "bg-status-error";

  return (
    <header className="h-14 border-b border-border bg-panel/40 backdrop-blur-md flex items-center px-4 gap-4">
      {isReal ? (
        <ProjectSwitcher />
      ) : (
        <>
          <PodSwitcher />
          <TenancyBadge />
        </>
      )}

      <div className="flex-1" />

      {/* ----- Mock-fed chrome (⌘K search, system health, Spend·24h ticker,
             notification bell, Pod Copilot) — standard experience ONLY. Real
             mode renders none of it until each surface is live-connected. ----- */}
      {!isReal && (
        <>
          <button
            type="button"
            onClick={openCommandPalette}
            title="Search everything (⌘K)"
            className="hidden md:flex items-center gap-2 px-2.5 h-8 rounded-md border border-border bg-white/5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Search className="size-3.5" />
            <span>Search</span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 rounded border border-border bg-white/5">
              ⌘K
            </kbd>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-2.5 h-8 rounded-md border border-border bg-white/5">
            <span className={cn("size-2 rounded-full dot-pulse", healthColor)} />
            <span className="text-xs text-muted-foreground">SYSTEM</span>
            <span className="text-xs font-medium uppercase">
              {health === "green" ? "Healthy" : health}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2.5 h-8 rounded-md border border-border bg-white/5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Spend·24h
            </span>
            <span className="font-mono text-sm text-foreground">${tokenSpend.toFixed(2)}</span>
          </div>

          <NotificationBell />

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("aiops:copilot-toggle"))}
            title="Pod Copilot · ⌘J"
            aria-label="Open Pod Copilot"
            className="size-8 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/70 hover:shadow-[0_0_12px_var(--primary)] transition-all flex items-center justify-center cursor-pointer"
          >
            <Sparkles className="size-3.5" />
          </button>
        </>
      )}

      <button
        onClick={toggle}
        title={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} theme` : "Theme"}
        className="size-8 rounded-md border border-border bg-white/5 hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center text-muted-foreground"
        aria-label="Toggle theme"
      >
        {mounted && theme === "light" ? (
          <Sun className="size-3.5" />
        ) : (
          <MoonStar className="size-3.5" />
        )}
      </button>

      <div className="mx-1 h-6 w-px bg-border" />

      {isReal && (
        <div
          className="hidden sm:flex items-center h-8 px-2.5 rounded-md border border-status-waiting/50 bg-status-waiting/10 text-status-waiting text-[10px] font-semibold uppercase tracking-wider"
          title="Production workspace — live agent data not connected yet"
        >
          Live · not connected
        </div>
      )}

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
