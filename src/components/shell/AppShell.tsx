import type { ReactNode } from "react";
import { LeftRail } from "./LeftRail";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { PodCopilot } from "@/components/copilot/PodCopilot";
import { DemoDirectorOverlay } from "@/components/demo/DemoDirectorOverlay";
import { LiveProvider } from "@/hooks/useLiveTicker";
import { PodProvider } from "@/lib/pods/pod-store";
import { isMock } from "@/lib/experience";
import type { AppUser } from "@/lib/auth/types";

export function AppShell({ children, user }: { children: ReactNode; user: AppUser }) {
  // EXPERIENCE GATE: ⌘K palette + ⌘J copilot are mock-fed overlays -
  // standard experience only; real mode gets zero mock chrome.
  const mock = isMock(user);
  return (
    <LiveProvider>
      <PodProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <LeftRail user={user} />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar user={user} />
            <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
          </div>
        </div>
        {/* ⌘K - mounted once for every route (C7) */}
        {mock && <CommandPalette />}
        {/* ⌘J - Pod Copilot overlay (wave 2, P1-A1) - the single in-app assistant */}
        {mock && <PodCopilot />}
        {/* ⌘⇧D - Demo Director presenter overlay (wave-2 COMPLETION); renders nothing until summoned */}
        {mock && <DemoDirectorOverlay />}
      </PodProvider>
    </LiveProvider>
  );
}
