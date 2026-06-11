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
            Delivery, Mobile, Maintenance; pick one, adjust, go
            <DemoPill href="/pods/new?step=blueprint" label="New-Pod wizard" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Curated agent catalog</strong> — 7
            roles with capability, cost band, and a contract-version + conformance badge (curated
            for quality, swappable by contract)
            <DemoPill href="/catalog" label="Agent catalog" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Auto-wired pipeline preview</strong> —
            adding Dev suggests <em>+ Add Tasklist</em>, adding QA suggests <em>+ Add Review</em>;
            the chain closes with no gaps
            <DemoPill href="/catalog" label="Pipeline preview" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Connect tiles</strong> — OAuth-style
            tool connections with permission scopes shown and honest availability badges per tool
            — first wave Teamwork/Slack/GitHub, Jira/Drive flagged roadmap (OAuth is simulated in
            the demo; the real connector vault is build step 3)
            <DemoPill href="/pods/new?step=connect" label="wizard, step 3" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Accountability matrix at setup</strong>{" "}
            — one accountable human per agent; an empty column is flagged as uncovered risk before
            the pod ever runs
            <DemoPill href="/pods/new?step=people" label="wizard, step 4" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">
              Slack wiring, readiness checklist, and the Launch gate
            </strong>{" "}
            — gates reach humans where they work
            <DemoPill href="/pods/new?step=slack" label="wizard, steps 5–6" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Accountability handshake</strong> —
            coverage is accepted, not assigned; the acceptance is on the record
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
            approvals + clarifications, one queue, SLA-sorted, policy chips visible
            <DemoPill href="/approvals" label="Gates queue" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Client-grade spec review</strong> —
            the SPEC.md, EARS criteria, and all 8 validator results on one decision screen
            <DemoPill href="/approvals/appr-AM-142" label="Spec review" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Decision canon</strong> — typed reason
            required on reject and override; optional quick-reason chips on approve; every decision
            lands on the ledger
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Pipeline board</strong> — kanban over
            the delivery lifecycle, backlog to delivered
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
            action is audited
            <DemoPill href="/incidents" label="Incidents" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Pod Copilot</strong> —
            ask-with-receipts answers and confirm-first actions, currently canned and badged no-LLM
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
            cost per shipped ticket, cost per story point, with projected run-rate and a budget cap
            <DemoPill href="/economics" label="ROI" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Governance moat panel</strong> — the 8
            zero-LLM structural validators, visually walled from any LLM signal
            <DemoPill href="/governance" label="Governance" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Compliance &amp; audit</strong> — the
            append-only ledger plus the AI Act deployer-readiness panel and one-click evidence-pack
            export
            <DemoPill href="/compliance" label="Audit ledger" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">SLA &amp; client reports</strong> —
            target-vs-actual per stage, a weekly sponsor report, and a chrome-less share link
            <DemoPill href="/reports" label="Client reports" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Usage &amp; billing</strong> —
            consumption vs plan, budget alerts, and a pricing simulator (all figures
            hypothesis-labeled)
            <DemoPill href="/billing" label="Billing" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Pod memory &amp; constitution</strong>
            <DemoPill href="/memory" label="Constitution" />
            and the deliverables shelf with rejected-iteration diffs
            <DemoPill href="/artifacts" label="Deliverables" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">Pilot scorecard</strong>
            <DemoPill href="/pilot" label="Pilot scorecard" />
            and the multi-pod portfolio rollup
            <DemoPill href="/org" label="Portfolio" />
          </Bullet>
          <Bullet>
            <strong className="font-semibold text-slate-900">
              Gate policies &amp; the autonomy ladder
            </strong>
            <DemoPill href="/settings#gates" label="Autonomy" />
            and platform status with 90-day uptime (staged demo data)
            <DemoPill href="/status" label="Status" />
          </Bullet>
        </Bullets>
      </ActCard>
    </PitchSection>
  );
}
