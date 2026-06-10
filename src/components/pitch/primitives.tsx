/**
 * /pitch primitives — building blocks for the client-clean product brief.
 *
 * Same client-clean approach as /share/$token (.share-clean scope in
 * styles.css): light-first, print-friendly, NO neon/glow/scanline, explicit
 * light colors only. This is a reading document — body copy ≥ 14px.
 * The printed page is the approval pack: demo pills hide on print, tables
 * and cards avoid page-breaks inside themselves.
 */

import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Document section                                                     */
/* ------------------------------------------------------------------ */

/** Anchored section block — ids come verbatim from the copy's SECTION NAV. */
export function PitchSection({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-28 border-t border-slate-200 pt-10">
      <header className="break-after-avoid">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
          {kicker}
        </p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      </header>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

/** Body paragraph — 15px on a 28px line; the document's reading size. */
export function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-7 text-slate-700">{children}</p>;
}

/** Bulleted list with a quiet dot marker (15px body). */
export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="space-y-2.5">{children}</ul>;
}

export function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-[11px] size-1.5 shrink-0 rounded-full bg-slate-300" />
      <p className="text-[15px] leading-7 text-slate-700">{children}</p>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Inline pills                                                         */
/* ------------------------------------------------------------------ */

/**
 * [DEMO: /route — label] marker → small inline "See it live →" pill.
 * Plain <a>: these cross the auth boundary intentionally — logged-out
 * viewers land on /login, which is correct. Hidden in print.
 */
export function DemoPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      title={`${label} — ${href}`}
      aria-label={`See it live: ${label} (${href})`}
      className="mx-1 inline-flex translate-y-[-1px] items-center gap-1 whitespace-nowrap rounded-full border border-slate-300 bg-white px-2 py-px font-mono text-[11px] font-medium text-slate-500 no-underline transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 print:hidden"
    >
      See it live <span aria-hidden>→</span>
    </a>
  );
}

/** Non-link pill for in-app shortcuts (the Copilot's ⌘J — no route to link). */
export function ShortcutPill({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span
      title={label}
      className="mx-1 inline-flex translate-y-[-1px] items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-slate-300 bg-slate-50 px-2 py-px font-mono text-[11px] font-medium text-slate-500 print:hidden"
    >
      {children}
    </span>
  );
}

/** Hero stat chip. */
export function StatChip({ children }: { children: ReactNode }) {
  return (
    <li className="break-inside-avoid rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-800 shadow-sm">
      {children}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Tables — clean, bordered, print-safe                                 */
/* ------------------------------------------------------------------ */

export const tbl = {
  /** Scrolls horizontally on a 375px screen instead of squeezing columns. */
  wrap: "break-inside-avoid overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm print:shadow-none",
  table: "w-full border-collapse text-left [&_tr:last-child_td]:border-b-0",
  th: "border-b border-slate-200 bg-slate-50 px-4 py-2.5 align-bottom text-[11px] font-semibold uppercase tracking-wider text-slate-500",
  td: "border-b border-slate-100 px-4 py-3 align-top text-sm leading-6 text-slate-700",
};
