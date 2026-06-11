/**
 * ActsSection (/pitch §4) — THE PRODUCT IN THREE ACTS: FIRE UP / RUN /
 * MONITOR, each act a bordered card with its [DEMO] pills, plus the
 * artifact-chain SVG figure. Copy is verbatim from the brief.
 */

import type { ReactNode } from "react";
import { ChainSvg } from "./ChainSvg";
import { TicketJourneySvg } from "./TicketJourneySvg";
import { Bullet, Bullets, DemoPill, PitchSection, ShortcutPill } from "./primitives";

function ActCard({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:shadow-none sm:p-6">
      <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 text-[15px] leading-7 text-slate-700">{intro}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function ActsSection() {
  return (
    <PitchSection id="acts" kicker="04" title="The product in three acts">
      {/* The artifact chain — one pipeline, knowledge pod-wide */}
      <figure className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:shadow-none sm:p-5">
        <div className="overflow-x-auto">
          <ChainSvg />
        </div>
        <figcaption className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
          The artifact chain: each stage consumes the artifact before it, and the chain closes with
          no gaps. <span className="font-medium text-emerald-700">spec</span> is produced by the
          live BA agent today and <span className="font-medium text-emerald-700">knowledge</span>{" "}
          — the pod-wide shared-context peer, never a pipeline node — is operating alongside it;
          design (SA) and code (Dev) are under construction, uix-ui-spec (UI/UX) and test (QA) in
          preparation. Every stage renders staged data in the demo until its agent goes live.
        </figcaption>
      </figure>

      <ActCard
        title="ACT I — FIRE UP (launch a pod in minutes)"
        intro="A PM — client-side or Q-side — assembles a working pod without an engineer: pick a blueprint, adjust the agent team, connect tools, assign accountable people, launch. Tenant infrastructure is a one-time Q-operated event; what the operator experiences is fast in-tenant configuration. Everything below is built and walkable in the demo."
      >
        <Bullets>
          <Bullet>
            <strong className="font-semibold text-slate-900">Pod blueprints</strong> — Web App
            Delivery, Mobile, Maintenance; pick one, adjust, go. Each blueprint pre-selects the
            agent team, gate defaults and suggested tools, so you adjust a working setup instead
            of assembling one from zero
            <DemoPill href="/pods/new?step=blueprint" label="New-Pod wizard" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Curated agent catalog</strong> — 7
            roles with capability, cost band, and a contract-version + conformance badge (curated
            for quality, swappable by contract). The same catalog backs the wizard's team step —
            open any card for what the agent consumes, what it produces, and what it costs to run
            <DemoPill href="/catalog" label="Agent catalog" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Auto-wired pipeline preview</strong> —
            adding Dev suggests <em>+ Add Tasklist</em>, adding QA suggests <em>+ Add Review</em>;
            the chain closes with no gaps. The preview re-renders as you add or remove roles, so a
            broken handoff is visible before launch, not after
            <DemoPill href="/catalog" label="Pipeline preview" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Connect tiles</strong> — OAuth-style
            tool connections across the stack: Teamwork, Jira and Linear (trackers), Slack and
            email (channels), GitHub and GitLab (code), Drive, Notion and Figma (context). All
            connectable in the demo's simulated OAuth — the real connector vault is build step 3,
            with Teamwork/Slack/GitHub as the production first wave; Microsoft Teams deliberately
            sits behind "request access" (Slack is first-class, Teams follows). Every tile lists
            the exact scopes it asks for, each with a plain-language reason — the client sees
            what we touch and why before granting anything
            <DemoPill href="/pods/new?step=connect" label="wizard, step 3" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Accountability matrix at setup</strong>{" "}
            — one accountable human per agent; an empty column is flagged as uncovered risk before
            the pod ever runs. The same per-agent coverage rule you later monitor is enforced here
            at setup — accountability is wired in at launch, not retrofitted
            <DemoPill href="/pods/new?step=people" label="wizard, step 4" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">
              Slack wiring, readiness checklist, and the Launch gate
            </strong>{" "}
            — gates reach humans where they work. Channel routing is picked per event type, and
            the readiness checklist shows what's green (tools, scope, coverage) before Launch arms
            <DemoPill href="/pods/new?step=slack" label="wizard, steps 5–6" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Accountability handshake</strong> —
            coverage is accepted, not assigned; the acceptance is on the record. Each named human
            sees what they're accountable for and confirms it — the confirmation lands on the
            ledger, which is what makes the matrix provable rather than aspirational
            <DemoPill href="/welcome" label="Accountability handshake" />
          </Bullet>
        </Bullets>
      </ActCard>

      <ActCard
        title="ACT II — RUN (operate it day-to-day)"
        intro="Work flows in, agents produce, humans decide. Your tracker stays your tracker: dragging a ticket to Ready in Jira/Teamwork is the doorbell — the pod picks it up, runs the chain inside Agency OS, and writes plain status + links back to the ticket. Nobody works in two tools for the same job. The conversation is Slack-first: agents reach out to humans in the tools they already use with each other — clarifications, gates, and escalations arrive in Slack (Teams and others follow) — and the dashboard is there whenever someone wants to go deeper. When something fails, there is an incident with a recovery action — operable 24/7 by a non-engineer."
      >
        <figure className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
          <div className="overflow-x-auto">
            <TicketJourneySvg />
          </div>
          <figcaption className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
            One ticket's journey. <span className="font-medium text-slate-700">1 —</span> the drag
            to Ready on <em>your board</em> is the doorbell: the pod picks the ticket up, nobody
            opens a new tool. <span className="font-medium text-slate-700">2 —</span> the chain
            runs <em>inside Agency OS</em>: each agent ships its <em>own</em> artifact (the BA's
            SPEC.md, the SA's design, and so on down the chain), humans clear gates, everything
            lands on the ledger. <span className="font-medium text-slate-700">3 —</span> questions
            and approvals arrive in <em>your channels</em> and are answered there — and the pod is
            proactive on its own schedule too: daily digests, daily preparations, weekly reports,
            and escalations are pushed to Slack and email, while plain status + artifact links
            flow back to the ticket. The dashboard stays optional depth.
          </figcaption>
        </figure>
        <Bullets>
          <Bullet>
            <strong className="font-semibold text-slate-900">Unified gates queue</strong> —
            approvals + clarifications, one queue, SLA-sorted, policy chips visible. Every
            decision waiting on a human in one place, oldest-risk first; each row click-throughs
            to the full decision context, so nobody hunts across tools to answer "what needs me?"
            <DemoPill href="/approvals" label="Gates queue" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Client-grade spec review</strong> —
            the SPEC.md, EARS criteria, and all 8 validator results on one decision screen.
            Readable by a non-engineer: the spec renders as a document with the structural checks
            pinned beside it, so a sponsor can approve with confidence, not on faith
            <DemoPill href="/approvals/appr-AM-142" label="Spec review" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Decision canon</strong> — typed reason
            required on reject and override; optional quick-reason chips on approve; every decision
            lands on the ledger.{" "}
            <strong className="font-semibold text-slate-900">
              Rework follows the artifact chain:
            </strong>{" "}
            a reject targets the root-cause stage (QA finds a design flaw → it goes back to the
            SA, not just one step), everything downstream is invalidated automatically and re-runs
            forward, and repeated bounces escalate to the accountable human — rework is visible
            and costed, never a silent loop
            <DemoPill href="/pipeline" label="Reject dialog" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Pipeline board</strong> — kanban over
            the delivery lifecycle, backlog to delivered. Agent columns vs human-gate columns are
            visually distinct, each card shows who's accountable and what wrote back to the
            tracker, and cards move only as runs finish and gates clear — execution view, not a
            second backlog
            <DemoPill href="/pipeline" label="Pipeline board" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Work intake</strong> — what the board
            sent, routing previewed per ticket.{" "}
            <strong className="font-semibold text-slate-900">
              Activation lives on the board — always:
            </strong>{" "}
            the drag to Ready is the only start signal. Per pod you choose the start policy:
            confirm-first (each arrival waits for the operator's OK — the right start for new
            pods) or auto-start (the drag starts the chain immediately). A wrong ticket is
            declined with a typed reason and returned to the board, on the record. Agency OS
            never originates work, and agent-to-agent activation stays inside it
            <DemoPill href="/intake" label="Work intake" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Incidents &amp; recovery</strong> —
            agent-down, run-failed, gate-overdue, each with a suggested action; every recovery
            action is audited. Open one and the next step is already proposed — designed so a
            non-engineer on the evening shift can recover the pod without paging anyone
            <DemoPill href="/incidents" label="Incidents" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Pod Copilot</strong> —
            ask-with-receipts answers and confirm-first actions, currently canned and badged
            no-LLM. Ask "why is AM-142 waiting?" and the answer cites its receipts — chips that
            deep-link to the exact gate, run or ledger row it drew from
            <ShortcutPill label="Pod Copilot">⌘J inside the app</ShortcutPill>
          </Bullet>
        </Bullets>
      </ActCard>

      <ActCard
        title="ACT III — MONITOR (observe, govern, prove)"
        intro="The wow moment is not the pipeline lighting up — it is the ROI reveal, the accountability matrix, and an audit trail that outlives the agent. This is the pillar the CFO and the client sponsor actually consume."
      >
        <Bullets>
          <Bullet>
            <strong className="font-semibold text-slate-900">ROI hero</strong> — human-hours freed,
            cost per shipped ticket, cost per story point, with projected run-rate and a budget
            cap. The assumptions behind the math (hourly rate, baseline) are editable in the open
            — a CFO can challenge the inputs instead of distrusting the output
            <DemoPill href="/economics" label="ROI" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Governance moat panel</strong> — the 8
            zero-LLM structural validators, visually walled from any LLM signal. The wall is the
            point: deterministic checks that run identically every time, shown apart from anything
            model-generated, so "the AI checked itself" is never the answer
            <DemoPill href="/governance" label="Governance" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Compliance &amp; audit</strong> — the
            append-only ledger plus the AI Act deployer-readiness panel and one-click evidence-pack
            export. Every entry names actor, action and reason; the ledger outlives any agent's
            own data — built for the question "prove who decided what, and when"
            <DemoPill href="/compliance" label="Audit ledger" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">SLA &amp; client reports</strong> —
            target-vs-actual per stage, a weekly sponsor report, and a chrome-less share link. The
            sponsor report reads without a login or a dashboard tour — send the link, the client
            sees their week
            <DemoPill href="/reports" label="Client reports" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Usage &amp; billing</strong> —
            consumption vs plan, budget alerts, and a pricing simulator (all figures
            hypothesis-labeled). Alerts fire as the budget approaches its cap — cost surprises are
            an incident class here, not an invoice surprise
            <DemoPill href="/billing" label="Billing" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Pod memory &amp; constitution</strong>
            <DemoPill href="/memory" label="Constitution" />
            and the deliverables shelf with rejected-iteration diffs
            <DemoPill href="/artifacts" label="Deliverables" />
            — the rules the pod must obey and the knowledge it carries between tickets are
            inspectable, not buried in a prompt; the shelf keeps every artifact version including
            the rejected ones, diffable
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Pilot scorecard</strong>
            <DemoPill href="/pilot" label="Pilot scorecard" />
            and the multi-pod portfolio rollup
            <DemoPill href="/org" label="Portfolio" />
            — the agreed pilot metrics tracked against targets (the artifact the go/no-go
            decision reads from), and the same health/ROI view rolled up across every pod once
            there is more than one
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">
              Gate policies &amp; the autonomy ladder
            </strong>
            <DemoPill href="/settings#gates" label="Autonomy" />
            and platform status with 90-day uptime (staged demo data)
            <DemoPill href="/status" label="Status" />
            — autonomy is earned per agent on a visible ladder (each loosening is a recorded
            policy change with the track record that justified it), and the platform publishes
            its own uptime because the control plane is a system under observation too
          </Bullet>
        </Bullets>
      </ActCard>
    </PitchSection>
  );
}
