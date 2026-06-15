/**
 * ClientCleanTheme (/share/$token) - the client-clean wall: a light-first,
 * chrome-less full-page wrapper for account-less viewers. No neon, no glow,
 * no scanlines - explicit light colors only (vision §6 client-clean mode),
 * even though the app shell around every other route is dark. The page
 * styles live under `.share-clean` in styles.css so nothing leaks either way.
 *
 * SSR-safe: pure markup + CSS, no window access at render time.
 */

import type { ReactNode } from "react";

export function ClientCleanTheme({ children }: { children: ReactNode }) {
  return (
    <div className="share-clean min-h-screen w-full px-4 py-8 sm:py-12 print:p-0">
      <div className="mx-auto w-full max-w-[920px]">{children}</div>
    </div>
  );
}
