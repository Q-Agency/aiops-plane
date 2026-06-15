/**
 * ExperiencePanel (Settings) - the explicit Demo ↔ Live switch.
 *
 * Owner call (2026-06-12): the experience is a per-browser CHOICE, not a
 * property of who logged in - any account can present the demo or drop to
 * the live-connected surfaces. The override lives in an httpOnly cookie
 * (auth.ts setExperienceFn) and is resolved into the effective
 * `user.dataMode` by fetchUser, so every gate (route guards, nav, isMock)
 * follows automatically. Switching reloads the app at "/" so SSR context
 * and guards re-evaluate cleanly.
 *
 * Rendered in BOTH experiences (you must be able to switch back).
 */

import { useState } from "react";
import { useRouteContext } from "@tanstack/react-router";
import { MonitorPlay, Radio } from "lucide-react";

import { setExperienceFn } from "@/lib/auth/auth";
import type { DataMode } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

const MODE_COPY: Record<DataMode, { label: string; hint: string }> = {
  standard: {
    label: "Demo product",
    hint: "the full product on sample pods - Demo Director, seeded gates, intake & pipeline walkthroughs",
  },
  real: {
    label: "Live only",
    hint: "only surfaces connected to the real agent fleet (BA federation, audit ledger)",
  },
};

export function ExperiencePanel() {
  const { user } = useRouteContext({ from: "__root__" });
  const [switching, setSwitching] = useState<DataMode | null>(null);
  if (!user) return null;

  const current: DataMode = user.dataMode === "real" ? "real" : "standard";
  const accountDefault: DataMode | undefined = user.dataModeDefault;
  const overridden = accountDefault !== undefined && accountDefault !== current;

  const switchTo = async (mode: DataMode) => {
    if (mode === current || switching) return;
    setSwitching(mode);
    // Send null when returning to the account's own default - keeps the
    // cookie jar clean rather than pinning the default as an override.
    await setExperienceFn({ data: { mode: mode === accountDefault ? null : mode } });
    window.location.assign("/");
  };

  return (
    <section className="glass-panel p-5">
      <div className="mb-1 flex items-center gap-2">
        <MonitorPlay className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Experience</h2>
        {overridden && (
          <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
            switched this browser
          </span>
        )}
      </div>
      <p className="mb-3 max-w-2xl text-xs text-muted-foreground">
        Choose what this browser shows - independent of the account you logged in with.{" "}
        <span className="text-foreground/80">Demo product</span> is {MODE_COPY.standard.hint};{" "}
        <span className="text-foreground/80">Live only</span> shows {MODE_COPY.real.hint}.
      </p>

      <div
        className="inline-flex w-fit items-center rounded-md border border-border bg-white/5 p-0.5"
        role="group"
        aria-label="Experience"
      >
        {(["standard", "real"] as const).map((m) => (
          <button
            key={m}
            type="button"
            data-test={`experience-${m}`}
            aria-pressed={current === m}
            disabled={switching !== null}
            onClick={() => switchTo(m)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              current === m
                ? "border border-primary/50 bg-primary/15 text-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                : "border border-transparent text-muted-foreground hover:text-foreground cursor-pointer",
              switching !== null && "opacity-60",
            )}
          >
            {m === "standard" ? <MonitorPlay className="size-3.5" /> : <Radio className="size-3.5" />}
            {MODE_COPY[m].label}
            {switching === m && <span className="text-[10px]">…</span>}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {accountDefault !== undefined && (
          <>
            Account default: {MODE_COPY[accountDefault].label}.{" "}
          </>
        )}
        Switching reloads the app - session demo state (staged beats, this-session ledger rows)
        starts fresh.
      </p>
    </section>
  );
}
