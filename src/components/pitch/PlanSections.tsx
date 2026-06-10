/**
 * PlanSections (/pitch §7–§10) — PILOT PLAN, ROADMAP & INITIAL DELIVERABLES,
 * THE ASK, and the footer. Copy is verbatim. The former Economics & pricing
 * hypothesis section was pulled to the backlog by the product owner
 * (2026-06-10) — the pricing hypothesis itself lives on in the vision §9.5;
 * the ROI story stays in Act III where the screens carry it.
 */

import { Bullet, Bullets, P, PitchSection, tbl } from "./primitives";

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-slate-900">{children}</strong>;
}

export function PilotSection() {
  return (
    <PitchSection id="pilot" kicker="07" title="Pilot plan">
      <P>A 6-week pilot, instrumented from minute one.</P>
      <Bullets>
        <Bullet>
          <B>Targets are set at FIRE UP</B>, with the client: TTFAA under 24h, approved artifacts
          per pod-week, gate-clearance p50, validator pass-rate, and a hard spend cap.
        </Bullet>
        <Bullet>
          <B>Week 1:</B> fire up the pod against a slice of the client's real backlog; the TTFAA
          clock starts at launch.
        </Bullet>
        <Bullet>
          <B>Weeks 2–5:</B> operate. Gates, incidents, weekly sponsor reports — target-vs-actual
          every week, misses shown, not smoothed.
        </Bullet>
        <Bullet>
          <B>Week 6:</B> conversion review. The scorecard is the deciding artifact.
        </Bullet>
        <Bullet>
          <B>Measured on /pilot, from the pod's own ledger</B> — the same append-only record the
          client can audit. We do not grade our own pilot; the ledger does.
        </Bullet>
        <Bullet>
          The <B>conversion sheet is pre-filled</B> from pilot actuals, and the pilot fee is
          credited to year one on conversion <em>(pricing hypothesis)</em>.
        </Bullet>
      </Bullets>

      <P>
        <B>What we measure ourselves on.</B> North star: <B>approved artifacts per pod-week</B>.
        Activation: <B>time-to-first-approved-artifact under 24 hours</B>, surfaced as a timer on
        the post-launch screen. Supporting: gate-clearance latency, pods per client,
        pilot-to-annual conversion. Commercial packaging and pricing are deliberately out of this
        brief — parked to the backlog until pilot data exists to price against.
      </P>
    </PitchSection>
  );
}

const ROADMAP_ROWS: { n: string; deliverable: React.ReactNode; unlocks: string; deps: string }[] = [
  {
    n: "1",
    deliverable: (
      <>
        <B>Tenant shell + identity</B> — auth, the role model, audit actor stamping
      </>
    ),
    unlocks:
      "Attributed decisions on the ledger; multi-stakeholder pods. Identity is product-blocking, not a nicety",
    deps: "Green-light",
  },
  {
    n: "2",
    deliverable: (
      <>
        <B>Control plane v1</B> — durable entities (Pod, Connection, SLA, Member…)
      </>
    ),
    unlocks: "The wizard writes real pod drafts; state survives restarts",
    deps: "1",
  },
  {
    n: "3",
    deliverable: (
      <>
        <B>FIRE UP real</B> — connector vault + real OAuth (Teamwork/Slack/GitHub first),
        Q-operated provisioning
      </>
    ),
    unlocks: "Real client onboarding; no production connection without a vault",
    deps: "2",
  },
  {
    n: "4",
    deliverable: (
      <>
        <B>Federate BA per-pod</B> — scope the live agent to each pod's backlog slice
      </>
    ),
    unlocks: "The RUN pillar on live data; the pilot's working core",
    deps: "2",
  },
  {
    n: "5",
    deliverable: (
      <>
        <B>Gate resolve write-back</B> — contract v0.6 control ops
      </>
    ),
    unlocks: "In-app approvals go live; decisions land with actor + typed reason",
    deps: "1, 4",
  },
  {
    n: "6",
    deliverable: (
      <>
        <B>Incidents + notifications fanout</B> — derived from federated signals, persisted
        control-plane-side
      </>
    ),
    unlocks: "24/7 operability; gates reliably reach humans",
    deps: "2, 4",
  },
  {
    n: "7",
    deliverable: (
      <>
        <B>MONITOR money</B> — real economics from federated runs, SLA engine, reports, billing
      </>
    ),
    unlocks: "The CFO surface on real data; metered pricing",
    deps: "4–6 + pricing decision",
  },
];

export function RoadmapSection() {
  return (
    <PitchSection id="roadmap" kicker="08" title="Roadmap & initial deliverables">
      <P>
        <B>The mock is deliverable #0 — already shipped.</B> It is the validated UX spec: 43
        build-ready screen specs, walkable end-to-end, the acceptance spec the real build is
        measured against. The sequence below builds the product underneath it. No dates and no cost
        figures here — that is the scoping workshop's job.
      </P>

      <div className={tbl.wrap}>
        <table className={`${tbl.table} min-w-[680px]`}>
          <thead>
            <tr>
              <th scope="col" className={tbl.th}>
                #
              </th>
              <th scope="col" className={tbl.th}>
                Deliverable
              </th>
              <th scope="col" className={tbl.th}>
                What it unlocks
              </th>
              <th scope="col" className={tbl.th}>
                Depends on
              </th>
            </tr>
          </thead>
          <tbody>
            {ROADMAP_ROWS.map((row) => (
              <tr key={row.n}>
                <td className={`${tbl.td} font-mono text-xs text-slate-500`}>{row.n}</td>
                <td className={tbl.td}>{row.deliverable}</td>
                <td className={tbl.td}>{row.unlocks}</td>
                <td className={`${tbl.td} whitespace-nowrap`}>{row.deps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[15px] font-semibold leading-7 text-slate-900">
        First scheduled deliverable on green-light: a scoping workshop that turns this sequence
        into a costed plan.
      </p>
    </PitchSection>
  );
}

export function AskSection() {
  return (
    <PitchSection id="ask" kicker="09" title="The ask">
      <Bullets>
        <Bullet>
          <B>Approve the productization track</B> — Agency OS as a sellable platform, built along
          the sequence above.
        </Bullet>
        <Bullet>
          <B>Nominate the first pilot client and an internal sponsor</B> — one pod, one backlog
          slice, six weeks, measured on the ledger.
        </Bullet>
        <Bullet>
          <B>Fund the scoping workshop</B> — the team that turns deliverables 1–7 into a costed,
          scheduled plan.
        </Bullet>
      </Bullets>

      <div className="break-inside-avoid rounded-xl border border-slate-300 bg-slate-50 p-5 sm:p-6">
        <p className="text-[15px] leading-7 text-slate-700">
          <B>See it for yourself.</B> The demo is the app behind this page — leave /pitch and
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

/** §11 — provenance footer: stays visible in print (the approval pack). */
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
        <strong className="font-semibold text-slate-700">Confidential — internal.</strong>
      </p>
    </footer>
  );
}
