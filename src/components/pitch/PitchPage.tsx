/**
 * PitchPage (/pitch) — Agency OS product brief: a chrome-less, no-auth,
 * client-clean single-page document (sections §1–§11 of the final copy,
 * rendered verbatim). Reuses the .share-clean light scope from styles.css —
 * light-first, print-friendly, no neon/glow/scanline. The sticky bar and
 * the [DEMO] pills hide on print; the printed page is the approval pack.
 *
 * SSR-safe: pure markup + CSS, no window access at render time.
 */

import { ActsSection } from "./ActsSection";
import { AskSection, PilotSection, PitchFooter, RoadmapSection } from "./PlanSections";
import { PitchTopBar } from "./PitchTopBar";
import { MoatSection, RealTodaySection } from "./ProofSections";
import { P, PitchSection, StatChip, tbl } from "./primitives";

export function PitchPage() {
  return (
    <div className="share-clean min-h-screen w-full">
      <PitchTopBar />
      <article className="mx-auto w-full max-w-4xl px-4 pb-4 sm:px-6 print:max-w-none print:px-0">
        <Hero />
        <SummarySection />
        <WedgeSection />
        <ActsSection />
        <MoatSection />
        <RealTodaySection />
        <PilotSection />
        <RoadmapSection />
        <AskSection />
        <PitchFooter />
      </article>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* §1 HERO                                                              */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section id="hero" className="scroll-mt-28 pt-12 sm:pt-16">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
        Product brief
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Agency OS
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
        Mission control for governed agent–human software delivery.{" "}
        <em className="font-medium text-slate-800">Fire up a pod. Run it. Prove it.</em>
      </p>
      <p className="mt-5 max-w-3xl text-[15px] leading-7 text-slate-700">
        Agency OS is the operating system for agent–human delivery pods: a curated team of AI
        agents, one accountable human per agent, a gated pipeline, and a ledger that proves every
        decision.
      </p>
      <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-900">
        Not an autonomous coder you must trust — a governed agent–human pipeline you can prove.
      </p>
      <ul className="mt-7 flex flex-wrap gap-2.5">
        <StatChip>BA + Knowledge Base agents — operating today</StatChip>
        <StatChip>7-role curated SDLC catalog</StatChip>
        <StatChip>Append-only audit ledger — live in production</StatChip>
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* §2 EXECUTIVE SUMMARY                                                 */
/* ------------------------------------------------------------------ */

function SummarySection() {
  return (
    <PitchSection id="summary" kicker="02" title="Executive summary">
      <P>
        Agency OS turns Q's SDLC agents into a sellable platform: agent–human pods that deliver
        software through a governed, gated, auditable pipeline. A PM — client-side or Q-side, not
        an engineer — fires up a pod, runs it day-to-day, and proves what it cost and who approved
        what.
      </P>
      <P>
        <strong className="font-semibold text-slate-900">Why us:</strong> we already operate the
        hardest pieces. Our Business Analyst agent is live in production — federated over a
        versioned agent contract, with an append-only audit ledger that survives agent resets —
        and the Knowledge Base agent that anchors the pod's shared context is operating today. SA
        and Development agents are under construction; UI/UX and QA are in preparation. The method
        itself is proven in daily use: the same flow ships as a spec-first, step-by-step Cursor /
        Claude Code workflow. And the pull is real: increased interest from our clients in exactly
        this way of working is one of the biggest motives behind this brief.
      </P>
      <P>
        <strong className="font-semibold text-slate-900">Why now:</strong> the 2026 market sells
        suite-locked agents or trust-me autonomous coders, and EU AI Act deployer obligations apply
        from August 2026 — our gate-and-ledger model produces exactly the oversight evidence a
        deployer needs.
      </P>
      <P>
        <strong className="font-semibold text-slate-900">The arc:</strong> phase one productizes
        the harness for our SDLC agents — the biggest reach for Q, and the biggest value for
        clients who still need delivery done by our teams, now as agent–human pods with
        ultra-observability and governance. Phase two opens the same harness to generic agents and
        agentic systems beyond the SDLC.
      </P>
      <P>
        <strong className="font-semibold text-slate-900">Internal-first, sellable second:</strong>{" "}
        adoption starts on Q-led projects — a Q PM operating pods for client deliveries, with our
        way of work — and every such project doubles as a live reference. Client-managed teams
        follow as the product hardens. The floor is high: even if we never sell Agency OS as a
        product, it makes our own delivery more profitable and more optimal — and when a client
        sees their project run on it, the trust bump wins the next deal.
      </P>
      <P>
        <strong className="font-semibold text-slate-900">What exists today:</strong> the live BA
        federation, the operating Knowledge Base agent, the spec-first SDLC workflow in daily use,
        plus a complete frontend reference implementation of the full product — every screen in
        this brief is walkable in the demo behind it.
      </P>
      <P>
        <strong className="font-semibold text-slate-900">The ask:</strong> green-light a
        productization track, nominate the first pilot client, and fund the scoping workshop that
        turns the build sequence into a costed plan.
      </P>
    </PitchSection>
  );
}

/* ------------------------------------------------------------------ */
/* §3 WHY NOW / THE WEDGE                                               */
/* ------------------------------------------------------------------ */

function WedgeSection() {
  return (
    <PitchSection id="wedge" kicker="03" title="Why now / the wedge">
      <P>The 2026 field sells one of three things. We are deliberately the third.</P>

      <div className={tbl.wrap}>
        <table className={`${tbl.table} min-w-[640px]`}>
          <thead>
            <tr>
              <th scope="col" className={tbl.th}>
                Who
              </th>
              <th scope="col" className={tbl.th}>
                What they sell
              </th>
              <th scope="col" className={tbl.th}>
                The limit
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tbl.td}>
                <strong className="font-semibold text-slate-900">Suite teammates</strong> — GitHub
                Agent HQ, Atlassian Rovo, ServiceNow AI Control Tower
              </td>
              <td className={tbl.td}>Agents governed inside one vendor's suite</td>
              <td className={tbl.td}>
                Governance stops at the suite boundary; built for that suite's users
              </td>
            </tr>
            <tr>
              <td className={tbl.td}>
                <strong className="font-semibold text-slate-900">Autonomous coders</strong> —
                Devin, Cursor agents
              </td>
              <td className={tbl.td}>Trust-the-AI output, engineer-operated</td>
              <td className={tbl.td}>
                Accountability is diffuse; a non-engineer cannot run or prove it
              </td>
            </tr>
            <tr>
              <td className={tbl.td}>
                <strong className="font-semibold text-slate-900">Agency OS</strong>
              </td>
              <td className={tbl.td}>
                A cross-tool agent–human pod under one harness: one accountable human per agent,
                shared project context held by a Knowledge Base agent, agents that reach humans in
                Slack/email/Teamwork, unified human-in-the-loop gates, a deterministic quality
                floor, a ledger that survives a reset — operable by a non-engineer
              </td>
              <td className={tbl.td}>—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <P>
        The suites chart their own agents. We govern the pod across all of their tools and keep the
        evidence — the system of record for AI delivery governance.
      </P>

      <P>
        <strong className="font-semibold text-slate-900">The regulatory tailwind.</strong> From 2
        August 2026, EU organizations deploying AI systems carry Article 26 deployer obligations:
        assigned human oversight, log retention, incident reporting. Agency OS is built from those
        primitives. The accountability matrix maps to assigned oversight (Art. 26(2)); the
        append-only ledger to log retention (26(6)); the incident inbox to incident reporting
        (26(5)); and every gate decision carries an attributed, typed reason — oversight evidence
        produced as a by-product of operating the pod, not paperwork bolted on later. To be precise
        about what we sell:{" "}
        <strong className="font-semibold text-slate-900">deployer readiness</strong> — the evidence
        surfaces an EU deployer needs, designed against the articles. Not a certification, and
        never "compliance guaranteed." And this is not only a 2026 story: clients already send
        vendor questionnaires asking how AI use on their project is supervised — the
        accountability matrix and the ledger are the answer, demo-able in one click.
      </P>
    </PitchSection>
  );
}
