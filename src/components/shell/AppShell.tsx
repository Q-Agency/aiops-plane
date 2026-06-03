import type { ReactNode } from "react";
import { LeftRail } from "./LeftRail";
import { TopBar } from "./TopBar";
import { LiveProvider } from "@/hooks/useLiveTicker";
import { SectionAssistantProvider } from "@/components/assistant/SectionAssistant";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LiveProvider>
      <SectionAssistantProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <LeftRail />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
          </div>
        </div>
      </SectionAssistantProvider>
    </LiveProvider>
  );
}
