/**
 * SpecDocument — the center pane of the gate review (C4): the artifact
 * markdown split into `## ` sections, each rendered via the shared
 * MarkdownLite (TraceabilityView) and anchored with a DOM id so the
 * left-rail outline can scroll to it.
 */

import { MarkdownLite } from "@/components/traceability/TraceabilityView";

export interface SpecSection {
  /** DOM anchor id, e.g. "spec-acceptance-criteria". */
  id: string;
  title: string;
  body: string;
}

export function sectionAnchor(title: string): string {
  return `spec-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

/** Split a markdown body on `## ` headings; lines before the first heading are the intro. */
export function splitSections(md: string): { intro: string; sections: SpecSection[] } {
  const lines = md.split("\n");
  const sections: SpecSection[] = [];
  const intro: string[] = [];
  let current: { title: string; body: string[] } | null = null;
  for (const ln of lines) {
    if (ln.startsWith("## ")) {
      if (current) {
        sections.push({
          id: sectionAnchor(current.title),
          title: current.title,
          body: current.body.join("\n"),
        });
      }
      current = { title: ln.slice(3).trim(), body: [] };
    } else if (current) {
      current.body.push(ln);
    } else {
      intro.push(ln);
    }
  }
  if (current) {
    sections.push({
      id: sectionAnchor(current.title),
      title: current.title,
      body: current.body.join("\n"),
    });
  }
  return { intro: intro.join("\n"), sections };
}

export function SpecDocument({ markdown }: { markdown: string }) {
  const { intro, sections } = splitSections(markdown);
  return (
    <article className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-5 space-y-1">
      {intro.trim() && <MarkdownLite text={intro} />}
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="scroll-mt-24 pt-2">
          <MarkdownLite text={`## ${s.title}\n${s.body}`} />
        </section>
      ))}
    </article>
  );
}
