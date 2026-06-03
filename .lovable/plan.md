## Goal

Turn the current "6 boxes in a row" into the **command center's hero artifact**: one visualization that answers, in under a second:

1. Where is work piling up?
2. Is the wait there *agent compute* or *human review*?
3. How much volume is actually flowing through right now?

## The new component: `FlowRiver`

A horizontal Sankey-style ribbon flow across the same BA → SA → Tasklist → Dev → Review → QA spine, but the boxes are replaced by **stage columns**, and the arrows between them become **ribbons sized by ticket throughput** over the last 24h.

```text
 ┌─ BA ───┐     ┌─ SA ───┐     ┌─ TASKS ─┐     ┌─ DEV ──┐     ┌─ REVIEW ┐     ┌─ QA ───┐
 │▓▓▓░░░░░│════▶│▓▓▓▓▓▓▓░│════▶│▓▓░░░░░░│════▶│▓▓▓▓░░░░│════▶│▓▓▓▓▓▓▓▓│════▶│▓▓▓░░░░░│═══▶ DONE
 │ A 38%  │  9  │ A 22%  │ 14  │ A 71%  │  6  │ A 55%  │ 11  │ A 18%  │  4  │ A 44%  │
 │ H 62%  │     │ H 78% ⚠│     │ H 29%  │     │ H 45%  │     │ H 82% ⚠│     │ H 56%  │
 └────────┘     └────────┘     └─────────┘    └────────┘     └────────┘     └────────┘
   avg 2h        avg 9h ⚠       avg 45m        avg 4h         avg 11h ⚠       avg 3h
```

### Per-stage column (the diagnostic unit)

Each column is a **vertical stacked bar**, full height = total time-in-stage:
- **Green segment** = average agent compute time at this stage
- **Amber segment** = average human wait time at this stage
- Whichever dominates is immediately visible from across the room
- Stage label, ticket WIP count, accountable human avatar above
- Avg total time-in-stage below in monospace
- Glow ring + ⚠ marker when human wait > threshold (this is the bottleneck signal)

### Between-stage ribbons

- Ribbon **thickness** = number of tickets that moved through this handoff in the last 24h
- Ribbon **opacity/animation** = currently active dispatches (subtle flow animation when a handoff fires live)
- Stalled lanes (zero throughput in last 6h) render thin and dim

### Hero header strip (the one-sentence summary)

Above the river, a single bold readout that always answers "what should I look at?":

> **Bottleneck: Design Review** · 14 tickets waiting · avg 9h human wait · accountable: **MR**
> Speed this gate up by 50% → cycle time drops ~1.8d

(Pulled deterministically from existing flow.ts fixtures — biggest human-wait stage wins.)

### Side rail (right edge of the hero)

A compact vertical legend + live counters:
- Total WIP, in-flight agents, blocked-on-human count
- Next overnight batch countdown
- Toggle: **Accountability avatars** on/off (preserves current feature)
- Toggle: **24h** vs **7d** time window for the ribbons

### Footprint

Hero-sized: takes the full top row of the command center, roughly **2× the current height** (~280–320px). KpiStrip moves below it. Approvals/Activity rail unchanged.

## Interactions

- Hover a stage column → tooltip with full numbers (WIP, avg agent ms, avg human wait, p95, accountable human, SLA status)
- Hover a ribbon → "12 tickets handed off in last 24h · last: AM-150 at 14:22"
- Click a stage → deep-link to `/flow` (Flow Analytics) prefiltered to that gate
- Click the bottleneck readout → deep-link to the same, scrolled to the slowest gate
- Click an accountable avatar → `/pod` for that human

## Data sources (reuse, no new fixtures)

- Stage WIP: existing `tickets` + `stageToAgent` mapping (already in PipelineGraph)
- Agent compute vs human wait per stage: existing `src/mock/flow.ts` (the wait/work split is already modeled there for Part 12)
- Throughput ribbons: derive from `src/mock/activity.ts` handoff events grouped by from→to stage over the window
- Accountable humans: existing `accountableFor()` from `src/mock/humans.ts`
- Live pulse: existing `useLive()` ticker — when an agent flips to `running`, animate its incoming ribbon briefly

No new mock data needed. This is a presentational reshape of data the dashboard already owns.

## Technical notes

- New component: `src/components/command-center/FlowRiver.tsx`
- Render the ribbons with inline SVG (no new dependency). Each ribbon is a cubic Bézier path with thickness derived from throughput; use a linear gradient between the two adjacent agent colors so the eye still tracks agents.
- Stage column stacked bar = two divs with `flex-basis` proportional to agent/human ms — keep it CSS, not a chart lib, for crispness at hero size.
- Use existing semantic tokens: `--status-running` (green) for agent time, `--status-waiting` (amber) for human time, `--status-error` for over-SLA glow. Agent name colors stay on the column header per the cross-view consistency rule.
- Replace `<PipelineGraph />` in `src/routes/index.tsx` with `<FlowRiver />`. Delete `PipelineGraph.tsx` (it isn't used elsewhere — verified by the file listing).
- Keep the Accountability toggle behavior; reuse the `HumanAvatar` rendering pattern from PipelineGraph for the per-column avatars so the look stays consistent with the rest of the app.
- All numbers in monospace per the existing convention. Tooltips via the existing `ui/tooltip` primitive.
- SSR-safe: no `Date.now()` or `Math.random()` at render — derive "last 24h" window from a fixed `now` passed by `useLive()` (same pattern other views use). This also avoids the hydration class of bug currently visible in ActivityFeed.

## Out of scope

- No changes to `/flow` (Flow Analytics) itself — this is a hero glance, the deep view stays where it is.
- No changes to KpiStrip, AgentStatusGrid, Approvals, or Activity panels.
- No new routes, no new mock files, no backend.
