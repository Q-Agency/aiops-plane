/**
 * CoverageStrip (/pod, P1-O1) — the 24h coverage timeline under the
 * Accountability matrix:
 *
 *  - one band per accountable human: working-hours block in their agent
 *    color, tz-labeled; the seeded OOO human (Marin) renders dashed amber
 *    with the deputy takeover note — accountability STAYS with the owner
 *  - saturation flag: a near-capacity human gets the amber "9/10 gates
 *    today" chip; tooltip names the throttle policy (intake pauses at cap)
 *  - merged "pod coverage" band: time windows with NO accountable human
 *    inside working hours get the same red treatment as an uncovered
 *    matrix column
 */

import { Clock3 } from "lucide-react";
import { agents as allAgents } from "@/mock/agents";
import {
  activeHumans, capacityInfo, coverageGaps, coverageWindow, delegateOf,
  hmToMin, THROTTLE_POLICY_LINE, type Human,
} from "@/mock/humans";
import type { AgentId } from "@/mock/types";
import { fmtDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const LABEL_W = "w-[230px]";

function agentColor(id: AgentId): string {
  const a = allAgents.find((x) => x.id === id);
  return a ? `var(--${a.color})` : "var(--muted-foreground)";
}

const pct = (min: number) => `${((min / 1440) * 100).toFixed(2)}%`;

/** "13 Jun" from an epoch — date part of fmtDateTime (fixed display tz). */
function fmtDay(at?: number): string {
  return at ? fmtDateTime(at).split(" · ")[0] : "—";
}

const UNCOVERED_STRIPES =
  "repeating-linear-gradient(135deg, color-mix(in oklab, var(--status-error) 26%, transparent) 0 5px, color-mix(in oklab, var(--status-error) 7%, transparent) 5px 10px)";

export function CoverageStrip() {
  const humans = activeHumans().filter((h) => h.workingHours);
  const gaps = coverageGaps();
  const win = coverageWindow();

  // Covered intervals = complement of the gap segments over [0, 1440).
  const segs = [...gaps].sort((a, b) => a.startMin - b.startMin);
  const covered: { startMin: number; endMin: number }[] = [];
  let cursor = 0;
  for (const g of segs) {
    if (g.startMin > cursor) covered.push({ startMin: cursor, endMin: g.startMin });
    cursor = Math.max(cursor, g.endMin);
  }
  if (cursor < 1440) covered.push({ startMin: cursor, endMin: 1440 });

  const ooo = humans.find((h) => h.status === "ooo");
  const oooDeputy = ooo ? delegateOf(ooo) : undefined;
  const wrapLabel = gaps[0]?.label;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock3 className="size-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          Coverage · 24h
        </span>
        <span className="text-[10px] text-muted-foreground/70 font-mono">
          · working hours {win.tz} · red = no accountable human inside working hours
        </span>
      </div>

      <div className="glass-panel overflow-x-auto">
        <div className="min-w-[680px] p-3 space-y-1.5">
          {/* hour scale */}
          <div className="flex items-center gap-2">
            <div className={cn(LABEL_W, "shrink-0")} />
            <div className="relative h-4 flex-1 text-[9px] font-mono text-muted-foreground/70">
              {[0, 6, 12, 18].map((h) => (
                <span key={h} className="absolute top-0" style={{ left: pct(h * 60) }}>
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
              <span className="absolute top-0 right-0">24:00</span>
            </div>
          </div>

          {/* one band per accountable human */}
          {humans.map((h) => (
            <HumanBand key={h.id} human={h} />
          ))}

          {/* merged pod band */}
          <div className="flex items-center gap-2 pt-1.5 border-t border-border/60">
            <div className={cn(LABEL_W, "shrink-0")}>
              <div className="text-[10px] uppercase tracking-wider font-mono text-foreground">
                Pod coverage
              </div>
              <div className="text-[9px] font-mono text-muted-foreground">
                staffed {win.start}–{win.end} {win.tz}
              </div>
            </div>
            <div className="relative h-6 flex-1 rounded bg-white/[0.03] overflow-hidden">
              <HourGrid />
              {covered.map((c) => (
                <div
                  key={`c-${c.startMin}`}
                  className="absolute inset-y-0.5 rounded-sm border border-status-done/40 bg-status-done/15"
                  style={{ left: pct(c.startMin), width: pct(c.endMin - c.startMin) }}
                  title={`Covered ${win.tz} — at least one accountable human inside working hours`}
                />
              ))}
              {segs.map((g) => (
                <div
                  key={`g-${g.startMin}`}
                  className="absolute inset-y-0.5 rounded-sm border border-status-error/40 grid place-items-center"
                  style={{
                    left: pct(g.startMin),
                    width: pct(g.endMin - g.startMin),
                    background: UNCOVERED_STRIPES,
                  }}
                  title={`Uncovered ${g.label} — no accountable human inside working hours (same risk treatment as an uncovered matrix column)`}
                >
                  {g.endMin - g.startMin >= 170 && (
                    <span className="text-[9px] font-mono text-status-error truncate px-1">
                      ⚠ uncovered {g.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground font-mono space-y-0.5">
        {wrapLabel && (
          <div>
            ⚠ Uncovered {wrapLabel} — gate SLAs on a coverage clock pause here instead of fake-breaching overnight.
          </div>
        )}
        {ooo && oooDeputy && (
          <div suppressHydrationWarning>
            {ooo.name.split(" ")[0]} OOO until {fmtDay(ooo.oooUntil)} → {oooDeputy.name.split(" ")[0]} covers
            · accountability stays with {ooo.name.split(" ")[0]}.
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                               */
/* ------------------------------------------------------------------ */

function HumanBand({ human: h }: { human: Human }) {
  const wh = h.workingHours!;
  const color = agentColor(h.primaryAgentId);
  const start = hmToMin(wh.start);
  const end = hmToMin(wh.end);
  const isOoo = h.status === "ooo";
  const deputy = delegateOf(h);
  const cap = capacityInfo(h);

  return (
    <div className="flex items-center gap-2">
      <div className={cn(LABEL_W, "shrink-0 flex items-center gap-2 min-w-0")}>
        <span
          className="size-5 shrink-0 rounded-full grid place-items-center text-[9px] font-mono font-semibold border"
          style={{
            color,
            borderColor: `color-mix(in oklab, ${color} 50%, transparent)`,
            background: `color-mix(in oklab, ${color} 12%, transparent)`,
          }}
        >
          {h.initials}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-medium truncate leading-tight">{h.name}</div>
          {isOoo && deputy ? (
            <span
              suppressHydrationWarning
              title={`${h.name} OOO until ${fmtDay(h.oooUntil)} → ${deputy.name} covers · accountability stays with ${h.name}`}
              className="inline-block max-w-full truncate text-[9px] font-mono px-1 py-px rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting"
            >
              OOO until {fmtDay(h.oooUntil)} · deputy {deputy.name.split(" ")[0]}
            </span>
          ) : cap?.near ? (
            <span
              title={`${h.name} near capacity — ${cap.used}/${cap.cap} gates today. ${THROTTLE_POLICY_LINE}`}
              className="inline-block max-w-full truncate text-[9px] font-mono px-1 py-px rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting"
            >
              near capacity · {cap.used}/{cap.cap} gates today
            </span>
          ) : (
            <div className="text-[9px] font-mono text-muted-foreground truncate leading-tight">
              {wh.start}–{wh.end} · {wh.days}
            </div>
          )}
        </div>
      </div>

      <div className="relative h-6 flex-1 rounded bg-white/[0.03] overflow-hidden">
        <HourGrid />
        {isOoo ? (
          <div
            suppressHydrationWarning
            className="absolute inset-y-0.5 rounded-sm border border-dashed border-status-waiting/70 bg-status-waiting/10 grid place-items-center"
            style={{ left: pct(start), width: pct(end - start) }}
            title={`${h.name} OOO until ${fmtDay(h.oooUntil)} → ${deputy?.name ?? "deputy"} covers · accountability stays with ${h.name}`}
          >
            <span className="text-[9px] font-mono text-status-waiting truncate px-1">
              OOO → {deputy?.name.split(" ")[0] ?? "deputy"} covers
            </span>
          </div>
        ) : (
          <div
            className="absolute inset-y-0.5 rounded-sm border"
            style={{
              left: pct(start),
              width: pct(end - start),
              color,
              borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
              background: `color-mix(in oklab, ${color} 18%, transparent)`,
            }}
            title={`${h.name} · ${wh.start}–${wh.end} ${wh.tz} · ${wh.days}`}
          />
        )}
      </div>
    </div>
  );
}

/** 6h gridlines shared by every band. */
function HourGrid() {
  return (
    <>
      {[360, 720, 1080].map((m) => (
        <span key={m} className="absolute inset-y-0 w-px bg-white/5" style={{ left: pct(m) }} />
      ))}
    </>
  );
}
