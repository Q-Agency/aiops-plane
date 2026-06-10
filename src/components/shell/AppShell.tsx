import type { ReactNode } from "react";
import { LeftRail } from "./LeftRail";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { LiveProvider } from "@/hooks/useLiveTicker";
import { SectionAssistantProvider } from "@/components/assistant/SectionAssistant";
import { PodProvider } from "@/lib/pods/pod-store";
import type { AppUser } from "@/lib/auth/types";

export function AppShell({ children, user }: { children: ReactNode; user: AppUser }) {
  return (
    <LiveProvider>
      <SectionAssistantProvider>
        <PodProvider>
          <div className="flex h-screen w-full overflow-hidden">
            <LeftRail />
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar user={user} />
              <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
            </div>
          </div>
          {/* ⌘K — mounted once for every route (C7) */}
          <CommandPalette />
        </PodProvider>
      </SectionAssistantProvider>
    </LiveProvider>
  );
}
