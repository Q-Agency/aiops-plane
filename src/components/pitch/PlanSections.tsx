/**
 * PlanSections (/pitch §7-§9) - ROADMAP (high-level build plan), TEAM & EFFORT,
 * THE ASK, and the footer. The former Pilot-plan section and the detailed
 * 7-deliverable table were removed by the product owner (2026-06-13): the
 * brief is now an internal productization plan - a four-step build over ~3
 * months, no launch/client/pilot program. The ROI story still lives in Act III
 * where the screens carry it.
 */

import { Bullet, Bullets, P, PitchSection, tbl } from "./primitives";

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-slate-900">{children}</strong>;
}

/* ------------------------------------------------------------------ */
/* §7 ROADMAP - the high-level build plan                              */
/* ------------------------------------------------------------------ */

const PLAN_STEPS: { n: string; phase: React.ReactNode; what: React.ReactNode; done?: boolean }[] = [
  {
    n: "0",
    phase: <B>Mocked stage</B>,
    what: (
      <>
        The walkable mock - 43 build-ready screens, the validated UX spec the build is measured
        against.
      </>
    ),
    done: true,
  },
  {
    n: "1",
    phase: <B>Architecture &amp; infrastructure design</B>,
    what: (
      <>
        The technical blueprint and the infra it runs on - dedicated tenancy, EU residency,
        self-hosted inference, the control plane.
      </>
    ),
  },
  {
    n: "2",
    phase: <B>SDLC-focused version</B>,
    what: (
      <>
        Build the working product on that foundation: the SDLC agent fleet plus the control plane
        that governs it, end to end.
      </>
    ),
  },
  {
    n: "3",
    phase: <B>Adopt on projects</B>,
    what: <>Put it to work on real projects and harden it from real use.</>,
  },
];

export function RoadmapSection() {
  return (
    <PitchSection id="roadmap" kicker="07" title="Roadmap">
      <P>
        <B>Four steps, ~three months for the build.</B> Step 0 - the mock - is already shipped as
        the validated UX spec; steps 1-3 build the product underneath it. Two bigger questions sit
        deliberately <em>beyond</em> the build, taken up once it has proven out.
      </P>

      <div className={tbl.wrap}>
        <table className={`${tbl.table} min-w-[640px]`}>
          <thead>
            <tr>
              <th scope="col" className={tbl.th}>
                Step
              </th>
              <th scope="col" className={tbl.th}>
                Phase
              </th>
              <th scope="col" className={tbl.th}>
                What it means
              </th>
            </tr>
          </thead>
          <tbody>
            {PLAN_STEPS.map((s) => (
              <tr key={s.n}>
                <td className={`${tbl.td} whitespace-nowrap font-mono text-xs text-slate-500`}>
                  {s.n}
                  {s.done && (
                    <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      shipped
                    </span>
                  )}
                </td>
                <td className={`${tbl.td} whitespace-nowrap`}>{s.phase}</td>
                <td className={tbl.td}>{s.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
        Beyond the build
      </p>
      <Bullets>
        <Bullet>
          <B>Support for general agents</B> - open the same governed harness to any agent by its
          contract, beyond the SDLC (the registry surface is already mocked for it).
        </Bullet>
        <Bullet>
          <B>Decide whether - and how - to sell it</B> - taking Agency OS to clients as a product is
          a deliberate decision made once it has proven out internally, not an assumption baked in
          now.
        </Bullet>
      </Bullets>
    </PitchSection>
  );
}

/* ------------------------------------------------------------------ */
/* §8 TEAM & EFFORT                                                     */
/* ------------------------------------------------------------------ */

const TEAM_ROWS: { role: React.ReactNode; load: string; mandate: React.ReactNode }[] = [
  {
    role: <B>Project / Product Lead (PM)</B>,
    load: "Full-time",
    mandate: (
      <>
        Leads the build end-to-end; designs and validates the <B>PM (orchestrator) agent</B> - the
        role its human owner knows best
      </>
    ),
  },
  {
    role: <B>AI Engineering ×2</B>,
    load: "Full-time",
    mandate: (
      <>
        The agent fleet on the shared contract - harness, prompts, <B>eval suites</B> before any
        version ships, cost-aware model routing
      </>
    ),
  },
  {
    role: <B>DevOps / Platform</B>,
    load: "Full-time",
    mandate: (
      <>
        Sets up the infrastructure; co-authors the <B>technical blueprint</B>; designs and validates
        the DevOps / Release agent
      </>
    ),
  },
  {
    role: <B>Backend Engineer</B>,
    load: "Full-time",
    mandate: (
      <>
        Builds the <B>control plane</B> and the services under the dashboard - entities, federation,
        gate write-back, integrations
      </>
    ),
  },
  {
    role: <B>QA Engineer</B>,
    load: "Full-time",
    mandate: (
      <>
        QA across the build; designs and validates the <B>QA agent</B> as part of the fleet
      </>
    ),
  },
  {
    role: <B>Product Designer</B>,
    load: "Full-time",
    mandate: <>UX of the control plane and every product surface</>,
  },
];

export function TeamSection() {
  return (
    <PitchSection id="team" kicker="08" title="Team &amp; effort">
      <P>
        <B>The team is the thesis, staffed.</B> Agency OS sells one accountable human per agent - so
        we build it the same way: every agent is designed and validated by the person who does that
        job today. The PM who runs delivery shapes the orchestrator; the DevOps lead owns the
        DevOps agent; the QA engineer owns the QA agent. The platform dogfoods its own
        accountability model before it ever leaves the building.
      </P>

      <div className={tbl.wrap}>
        <table className={`${tbl.table} min-w-[640px]`}>
          <thead>
            <tr>
              <th scope="col" className={tbl.th}>
                Role
              </th>
              <th scope="col" className={tbl.th}>
                Load
              </th>
              <th scope="col" className={tbl.th}>
                Mandate
              </th>
            </tr>
          </thead>
          <tbody>
            {TEAM_ROWS.map((row, i) => (
              <tr key={i}>
                <td className={`${tbl.td} whitespace-nowrap`}>{row.role}</td>
                <td className={`${tbl.td} whitespace-nowrap`}>{row.load}</td>
                <td className={tbl.td}>{row.mandate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <P>
        <B>Effort - a seven-person core, full-time, over ~3 months.</B> Step 0 (the mock) is shipped;
        the three months cover steps 1-3. The two hardest tracks run in parallel without
        contention: the <B>control plane has a dedicated backend owner</B> and the agent fleet its
        own engineering pair.
      </P>
    </PitchSection>
  );
}

/* ------------------------------------------------------------------ */
/* §9 THE ASK                                                          */
/* ------------------------------------------------------------------ */

export function AskSection() {
  return (
    <PitchSection id="ask" kicker="09" title="The ask">
      <Bullets>
        <Bullet>
          <B>Approve the productization track</B> - Agency OS built as a product along the four-step
          plan above.
        </Bullet>
        <Bullet>
          <B>Resource the seven-person core team</B> - full-time for the ~3-month build.
        </Bullet>
        <Bullet>
          <B>Kick off step 1 now</B> - the architecture &amp; infrastructure design - so the build
          starts against a spec that already exists.
        </Bullet>
      </Bullets>

      <div className="break-inside-avoid rounded-xl border border-slate-300 bg-slate-50 p-5 sm:p-6">
        <p className="text-[15px] leading-7 text-slate-700">
          <B>See it for yourself.</B> The demo is the app behind this page - leave /pitch and
          you are in it. Log in with{" "}
          <span className="whitespace-nowrap rounded bg-white px-1.5 py-0.5 font-mono text-[13px] font-semibold text-slate-800 ring-1 ring-slate-200">
            qai@q.agency / demo
          </span>{" "}
          and take the <B>3-minute guided demo</B> (presenter shortcut: ⌘⇧D), or walk any [DEMO]
          link in this brief.
        </p>
        <a
          href="/"
          title="qai@q.agency · demo"
          className="mt-4 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-slate-700 print:hidden"
        >
          Open the demo →
        </a>
      </div>
    </PitchSection>
  );
}

/** §10 - provenance footer: stays visible in print (the approval pack). */
export function PitchFooter() {
  return (
    <footer
      id="footer"
      className="mt-12 scroll-mt-28 break-inside-avoid border-t border-slate-200 pb-12 pt-6"
    >
      <p className="text-[13px] leading-6 text-slate-500">
        Sources: the Agency OS product north-star (docs/product-vision.md) and the working mock, as
        of <strong className="font-semibold text-slate-700">2026-06-10</strong>. Nothing in this
        brief claims a capability that is not live today, walkable in the demo, or explicitly
        labeled roadmap / staged / hypothesis.{" "}
        <strong className="font-semibold text-slate-700">Confidential - internal.</strong>
      </p>
    </footer>
  );
}
