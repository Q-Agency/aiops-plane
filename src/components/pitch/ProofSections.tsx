/**
 * ProofSections (/pitch §5–§6) — THE MOAT and WHAT IS REAL TODAY.
 * Moat order is the product-owner framing (2026-06-10): the harness itself,
 * shared context (Knowledge Base agent), proactive agents in human-native
 * channels, provable accountability — with the deterministic validator floor
 * deliberately LAST on the list (still on the list). The honesty section
 * leads with the agent-fleet status line; copy is verbatim from the brief.
 */

import { P, PitchSection, tbl } from "./primitives";

export function MoatSection() {
  return (
    <PitchSection id="moat" kicker="05" title="The moat">
      <div className="space-y-4">
        <p className="break-inside-avoid text-[15px] leading-7 text-slate-700">
          <strong className="font-semibold text-slate-900">
            1 — The harness itself: modern SDLC pods under one roof.
          </strong>{" "}
          The moat is the operating model: human + AI pods running under the agency environment —
          orchestrated agents, accountable humans, unified gates, one ledger — with first-class
          AIOps under the hood (observability, incidents, recovery). Deployment answers the four
          fears enterprise buyers actually have. <em>Data privacy and sensitivity:</em> dedicated
          per-client tenancy (isolated infra and DB; GDPR-ready by construction — EU residency, a
          signed DPA, per-class retention windows, full data export) and{" "}
          <strong className="font-semibold text-slate-900">
            Q's own local AI infrastructure
          </strong>{" "}
          — local / self-hosted models for sensitive workloads, so client data can stay inside the
          tenant. <em>Cost:</em> self-hosted inference where it is cheaper, and a budget cap with
          projected run-rate on every pod. <em>Third-party lock-in:</em> curated agents are
          swappable by contract, the model plane is disclosed per agent (provider, pinned model,
          processing region, retention terms), and your artifacts and ledger are exportable.
          Competitors sell an agent or a suite; we sell the harness the whole pod runs in.
        </p>
        <p className="break-inside-avoid text-[15px] leading-7 text-slate-700">
          <strong className="font-semibold text-slate-900">
            2 — Shared context, held by an agent.
          </strong>{" "}
          The Knowledge Base agent is the cornerstone of shared context: it holds the project's
          truth — legal constraints, tasks, decisions, conflicts, domain sources — and every agent
          and human in the pod draws on the same context. It is pod-wide by design (a peer, not a
          pipeline stage), what it knows is visible in the product, and removal is audited
          ("Forget this" is on the record). It is operating today.
        </p>
        <p className="break-inside-avoid text-[15px] leading-7 text-slate-700">
          <strong className="font-semibold text-slate-900">
            3 — Proactive agents, in the channels humans already live in.
          </strong>{" "}
          Humans live in Slack, email, and Teamwork — so that is where the pod reaches them.
          Agents ask clarifications, deliver gates, and escalate proactively in those channels;
          the specialized dashboard is for when depth is needed, one deep link from the message to
          the exact decision. Nobody babysits a dashboard.
        </p>
        <p className="break-inside-avoid text-[15px] leading-7 text-slate-700">
          <strong className="font-semibold text-slate-900">
            4 — Accountability you can prove.
          </strong>{" "}
          One named human per agent — accepted, not assigned, via an audited handshake; coverage
          visible around the clock, with empty columns and time gaps rendered as risk. The
          append-only audit ledger is live in production and survives agent resets. Autonomy is
          earned on a ladder (L0 review-all → L3 auto-clear low-risk): proposed by the system on
          evidence — "47 consecutive 8/8 specs, 4% rejection rate" (staged demo data) — granted by
          the accountable human, written to the ledger. This is the answer to the top enterprise
          objection: <em>who is responsible when it's wrong?</em>
        </p>
        <p className="break-inside-avoid text-[15px] leading-7 text-slate-700">
          <strong className="font-semibold text-slate-900">
            5 — The deterministic floor (last on this list, deliberately).
          </strong>{" "}
          Underneath it all, the quality gate is checked in code, not vibes: 8 zero-LLM structural
          validators — EARS coverage, section parity, AC-ID parity, business-rule references, and
          peers — no model grades its own homework, and the product says so on the screen. This is
          structural quality, not semantic judgment; the human gate covers the rest, and the same
          pattern extends down the pipeline (build/lint/SAST for code, coverage for test,
          provenance for release) on the roadmap. Last here — but it is the floor the autonomy
          ladder stands on.
        </p>
      </div>
      <P>
        These compound. The pod constitution turns every gate decision into standing policy — your
        standards become the pod's standards, amended and ratified through the same gates, on the
        same ledger. The longer a pod runs, the harder it is to replace with a fresh agent and a
        prompt.
      </P>
    </PitchSection>
  );
}

const FLEET: { name: string; status: string; tone: "live" | "build" | "prep" | "plan" }[] = [
  { name: "BA Autonomous Agent", status: "live in production — federated into Agency OS", tone: "live" },
  { name: "Knowledge Base agent", status: "operating today — dashboard federation next", tone: "live" },
  { name: "SA agent · Development agents", status: "under construction", tone: "build" },
  { name: "UI/UX · QA agents", status: "in preparation", tone: "prep" },
  { name: "DevOps / Release", status: "planned", tone: "plan" },
];

const FLEET_TONE: Record<(typeof FLEET)[number]["tone"], string> = {
  live: "border-emerald-300 bg-emerald-50 text-emerald-900",
  build: "border-amber-300 bg-amber-50 text-amber-900",
  prep: "border-slate-300 bg-slate-50 text-slate-700",
  plan: "border-slate-200 bg-white text-slate-500",
};

export function RealTodaySection() {
  return (
    <PitchSection id="real-today" kicker="06" title="What is real today">
      <P>We will not sell a demo as a product. Here is the line, exactly where it sits today.</P>

      <div className="break-inside-avoid">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
          The agent fleet
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {FLEET.map((f) => (
            <li
              key={f.name}
              className={`rounded-lg border px-3 py-1.5 text-[13px] leading-5 ${FLEET_TONE[f.tone]}`}
            >
              <span className="font-semibold">{f.name}</span>
              <span className="opacity-80"> — {f.status}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[15px] leading-7 text-slate-700">
          And one more asset already in daily use: the same flow ships today as{" "}
          <strong className="font-semibold text-slate-900">
            spec-first AI-driven SDLC
          </strong>{" "}
          — a step-by-step Cursor / Claude Code plugin workflow (in the spirit of GitHub's
          SpecKit). This platform is its productization: the same method, now with a harness,
          gates, and a ledger around it.
        </p>
      </div>

      <div className={tbl.wrap}>
        <table className={`${tbl.table} min-w-[640px]`}>
          <thead>
            <tr>
              <th scope="col" className={tbl.th}>
                Live / operating now
              </th>
              <th scope="col" className={tbl.th}>
                Staged in the demo
              </th>
              <th scope="col" className={tbl.th}>
                Roadmap
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tbl.td}>
                The <strong className="font-semibold text-slate-900">BA agent</strong>, federated
                over the versioned agent contract — real runs, real gates, real health; the{" "}
                <strong className="font-semibold text-slate-900">Knowledge Base agent</strong>{" "}
                operating alongside it
              </td>
              <td className={tbl.td}>
                Downstream agent surfaces render staged data until each agent goes live (SA &
                Development under construction; UI/UX & QA in preparation; DevOps planned)
              </td>
              <td className={tbl.td}>
                The 7-step build sequence (§8): identity, control plane, connector vault + real
                OAuth, per-pod federation, gate write-back, notification fanout, real economics
              </td>
            </tr>
            <tr>
              <td className={tbl.td}>
                The <strong className="font-semibold text-slate-900">append-only audit ledger</strong>{" "}
                (dashboard-owned, survives agent resets)
              </td>
              <td className={tbl.td}>
                Connectors (mock OAuth), economics figures, incidents, notifications, reports,
                billing, platform status/uptime, the guided-demo events
              </td>
              <td className={tbl.td}>Downstream deterministic gates (code/test/release checks)</td>
            </tr>
            <tr>
              <td className={tbl.td}>
                The <strong className="font-semibold text-slate-900">spec-first SDLC workflow</strong>{" "}
                as a Cursor / Claude Code plugin — and the{" "}
                <strong className="font-semibold text-slate-900">dashboard itself</strong>, the
                product shell both modes run in
              </td>
              <td className={tbl.td}>
                Staged data on{" "}
                <strong className="font-semibold text-slate-900">real product surfaces</strong> —
                every demo action lands in the same stores and ledger UI the product reads
              </td>
              <td className={tbl.td}>Managed dedicated runtime for downstream agents</td>
            </tr>
          </tbody>
        </table>
      </div>

      <P>
        The demo carries its own honesty rule: when a buyer asks "is this live?", the answer is
        scripted — <strong className="font-semibold text-slate-900">staged data, real product.</strong>{" "}
        The mock is the spec made tangible: the frontend reference implementation the real build is
        measured against.
      </P>
    </PitchSection>
  );
}
