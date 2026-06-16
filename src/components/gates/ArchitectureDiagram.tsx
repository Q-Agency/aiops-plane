/**
 * ArchitectureDiagram - the architecture artifact made visual on the SA gate
 * review. A layered system diagram (clients → FastAPI API → Postgres) derived
 * from the SAME designMd(ticket) data the document renders (endpoint + column
 * counts are live), plus the p95 latency budget that proves the NFR (AC-1) is
 * met. Gives a reviewer the shape of the system at a glance, not just prose.
 *
 * Theme-aware: all colors are CSS design tokens, so it works in day & night.
 */

import { designMd } from "@/mock/trace";
import { tickets } from "@/mock/tickets";

export const ARCH_DIAGRAM_BLOCK_ID = "architecture-diagram";

/** p95 budget decomposition (architecture.md "NFR budgets" - AC-1: < 200ms). */
const LATENCY = [
  { label: "edge", ms: 15 },
  { label: "API", ms: 25 },
  { label: "query", ms: 110 },
  { label: "serialize", ms: 30 },
];
const BOUND_MS = 200;

const TONE = ["var(--agent-ba)", "var(--agent-sa)", "var(--agent-dev)", "var(--agent-qa)"];

function Box({
  x,
  y,
  w,
  h,
  title,
  sub,
  accent,
  dashed,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
  accent?: string;
  dashed?: boolean;
}) {
  const stroke = accent ?? "var(--border)";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={accent ? `color-mix(in oklab, ${accent} 12%, var(--card))` : "var(--card)"}
        stroke={stroke}
        strokeWidth={accent ? 1.5 : 1}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 3 : y + h / 2 + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill="var(--foreground)"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {title}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 13}
          textAnchor="middle"
          fontSize="9.5"
          fill="var(--muted-foreground)"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  dashed,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed?: boolean;
}) {
  return (
    <g stroke="var(--muted-foreground)" strokeWidth={1.25} fill="var(--muted-foreground)">
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray={dashed ? "4 3" : undefined} />
      <polygon
        points={`${x2 - 4},${y2 - 6} ${x2 + 4},${y2 - 6} ${x2},${y2}`}
        stroke="none"
      />
    </g>
  );
}

export function ArchitectureDiagram({ ticketId }: { ticketId: string }) {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  const { endpoints, table } = designMd(ticket);
  const fkCol = table.find((c) => /FK/i.test(c.type));

  return (
    <section
      id={ARCH_DIAGRAM_BLOCK_ID}
      className="rounded-md border border-border bg-panel/40 backdrop-blur-md p-5 scroll-mt-24"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">Architecture · system diagram</h3>
        <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
          derived from the artifact
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Clients consume one typed REST contract; server-side filtering in FastAPI over a single
        indexed table. The same contract serves web and mobile - no fork.
      </p>

      {/* system diagram */}
      <svg
        viewBox="0 0 680 300"
        role="img"
        aria-label="System architecture: a web client (React Query) and a mobile client (Dio + BLoC) both call the search-api FastAPI service over a typed REST contract; search-api uses a query-builder and pagination-util and reads the listings table in PostgreSQL, which has a foreign key to users."
        className="mt-3 h-auto w-full min-w-[520px]"
      >
        {/* layer labels */}
        {[
          { y: 47, t: "CLIENTS" },
          { y: 150, t: "API" },
          { y: 253, t: "DATA" },
        ].map((l) => (
          <text
            key={l.t}
            x={8}
            y={l.y}
            fontSize="9"
            letterSpacing="1.5"
            fill="var(--muted-foreground)"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {l.t}
          </text>
        ))}

        {/* clients */}
        <Box x={120} y={22} w={190} h={48} title="Web" sub="React Query · useListingSearch" />
        <Box x={372} y={22} w={190} h={48} title="Mobile" sub="Dio + BLoC · ListingsBloc" />

        {/* arrows clients → api */}
        <Arrow x1={215} y1={70} x2={290} y2={122} />
        <Arrow x1={467} y1={70} x2={392} y2={122} />

        {/* api band */}
        <Box
          x={241}
          y={124}
          w={200}
          h={52}
          title="search-api · FastAPI"
          sub={`typed contract · ${endpoints.length} endpoints · 30 req/min`}
          accent="var(--agent-sa)"
        />
        <Box x={36} y={132} w={150} h={36} title="query-builder" />
        <Box x={494} y={132} w={150} h={36} title="pagination-util" />
        {/* api ↔ internal components */}
        <line x1={186} y1={150} x2={241} y2={150} stroke="var(--muted-foreground)" strokeWidth={1} />
        <line x1={441} y1={150} x2={494} y2={150} stroke="var(--muted-foreground)" strokeWidth={1} />

        {/* arrow api → data */}
        <Arrow x1={341} y1={176} x2={341} y2={226} />

        {/* data */}
        <Box
          x={241}
          y={228}
          w={200}
          h={52}
          title="PostgreSQL · listings"
          sub={`${table.length} columns · GIN + btree idx`}
          accent="var(--agent-dev)"
        />
        <Box x={494} y={236} w={150} h={36} title="users" dashed />
        {/* FK arrow */}
        <Arrow x1={441} y1={254} x2={490} y2={254} dashed />
        <text
          x={467}
          y={248}
          textAnchor="middle"
          fontSize="8.5"
          fill="var(--muted-foreground)"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          {fkCol ? `${fkCol.column} FK` : "FK"}
        </text>
      </svg>

      {/* p95 latency budget - proves the NFR (AC-1: < 200ms) */}
      <div className="mt-4 border-t border-border/60 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            p95 latency budget
          </span>
          <span className="text-[11px] font-mono">
            <span className="text-status-done font-semibold">180ms</span>
            <span className="text-muted-foreground"> / {BOUND_MS}ms bound · 20ms headroom</span>
          </span>
        </div>
        <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full border border-border/60">
          {LATENCY.map((seg, i) => (
            <div
              key={seg.label}
              title={`${seg.label}: ${seg.ms}ms`}
              style={{ width: `${(seg.ms / BOUND_MS) * 100}%`, background: TONE[i] }}
            />
          ))}
          {/* headroom */}
          <div style={{ width: `${((BOUND_MS - 180) / BOUND_MS) * 100}%` }} className="bg-white/5" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {LATENCY.map((seg, i) => (
            <span key={seg.label} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: TONE[i] }} />
              {seg.label} {seg.ms}ms
            </span>
          ))}
        </div>
      </div>

      {/* endpoint contract chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {endpoints.map((e) => (
          <span
            key={e.path}
            title={`auth: ${e.auth} · ${e.notes}`}
            className="inline-flex items-center gap-1.5 rounded border border-border bg-white/[0.03] px-2 py-0.5 font-mono text-[10px]"
          >
            <span
              className={
                e.method === "GET"
                  ? "text-status-done"
                  : "text-status-waiting"
              }
            >
              {e.method}
            </span>
            <span className="text-foreground/80">{e.path}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
