/**
 * PitchTopBar (/pitch) - slim sticky bar over the product brief: brand
 * (→ #hero), the section anchor nav from the copy's SECTION NAV, and the
 * primary "Open the demo →" CTA with the mono credentials hint.
 * Plain <a> anchors (it's a single document) - hidden entirely in print.
 */

const NAV: { id: string; label: string }[] = [
  { id: "summary", label: "Executive summary" },
  { id: "wedge", label: "Why now" },
  { id: "acts", label: "The product in three acts" },
  { id: "moat", label: "The moat" },
  { id: "real-today", label: "What is real today" },
  { id: "roadmap", label: "Roadmap" },
  { id: "team", label: "Team & effort" },
  { id: "ask", label: "The ask" },
  { id: "footer", label: "Sources" },
];

export function PitchTopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 pt-2.5 sm:px-6">
        <a
          href="#hero"
          className="truncate text-sm font-semibold tracking-tight text-slate-900 no-underline hover:text-slate-600"
        >
          Agency OS - Product Brief
        </a>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <a
            href="/"
            title="qai@q.agency · demo"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white no-underline transition-colors hover:bg-slate-700"
          >
            Open the demo →
          </a>
          <span className="font-mono text-[10px] text-slate-400">qai@q.agency · demo</span>
        </div>
      </div>
      <nav aria-label="Sections" className="mx-auto w-full max-w-4xl overflow-x-auto px-4 sm:px-6">
        <ul className="flex gap-x-4 whitespace-nowrap py-2 text-xs text-slate-500">
          {NAV.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="no-underline transition-colors hover:text-slate-900"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
