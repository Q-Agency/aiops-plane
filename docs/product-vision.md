# Agency OS — North-Star Vision

> **Mission control for governed agent–human software delivery.**
> Launch a pod. Run it. Prove it.

*Status: North-Star Vision (experience-first, mock-first). This is the authoritative artifact a designer mocks from and an exec pitches from. Under-the-hood runtime decisions are deliberately deferred and named in §8, not silently dropped.*

---

## 1. Executive Summary — The Pitch

**What it is.** Agency OS is the operating system for **agent–human SDLC pods**: a curated team of AI agents (Business Analyst, Software Architect, UI/UX Designer, Developer, QA, DevOps/Release, Knowledge) paired with accountable people, delivering software through a **governed, gated, auditable pipeline**. A client-side Project Manager signs in, picks agents from a curated catalog, connects their tools (Jira, Drive, Email, Slack, GitHub, Teamwork), assigns accountable humans, wires Slack — and launches a working delivery pod in minutes.

**Who it's for.** The primary operator is a **PM / delivery lead** — **client-side, or Q-side** (on Q-led projects, per the internal-first adoption track below) — at work on a backlog Q's SDLC agents are delivering. Secondary stakeholders — an **engineering lead**, a **QA lead**, and a **client sponsor / exec** — consume the same pod through role-scoped surfaces. None of them are platform engineers; the product must be operable by a non-engineer 24/7.

**Internal-first, sellable second (product-owner call, 2026-06-10).** Adoption starts on **Q-led projects** — a Q PM operating pods for client deliveries, with our way of work — and every such project doubles as a live reference; **client-managed teams follow** as the product hardens. The floor is high: even if Agency OS is never sold as a product, it makes Q's own delivery **more profitable and more optimal**, and the trust bump when a client sees their project run on it **wins new SDLC deals** with existing and new clients. Client pull is real and growing — increased client interest in exactly this way of working is one of the biggest motives behind the product track. The build also **compounds internally: it shares many elements with Q's IRI Estimation tool**, so the overlapping work and deliverables benefit both efforts.

**The wedge.** The 2026 field sells one of four things — and we are deliberately the fourth:

| Who | What they sell | The limit |
|---|---|---|
| **Suite teammates** — GitHub Agent HQ, Atlassian Rovo, ServiceNow AI Control Tower | Agents governed *inside one vendor's suite* | Governance stops at the suite boundary; built for that suite's users |
| **Autonomous coders** — Devin, Cursor agents | Trust-the-AI output, engineer-operated | Accountability is diffuse; a non-engineer cannot run or prove it |
| **Frontier-lab enterprise deals** — model + agentic-tooling agreements with large enterprises | Capability and tools for the client's own engineering organization | The buyer still runs it, governs it, staffs it, and answers for it — built for orgs with a big in-house engineering team, not for buyers who need delivery |
| **Agency OS** | A **cross-tool agent–human pod under one harness**: one accountable human per agent, **shared project context held by a Knowledge Base agent**, **agents that reach humans in Slack/email/Teamwork**, unified human-in-the-loop gates, a deterministic (zero-LLM) quality floor, an audit ledger that survives a reset, and **provable per-delivery-unit economics** — **operable by a non-engineer** | — |

**Counter-position:** the suites chart their own agents; we govern the pod *across all of their tools* and keep the evidence — **the system of record for AI delivery governance**.

**The frontier labs are our suppliers, not our competitors (owner framing, 2026-06-12).** Agency OS is model-agnostic by design — agents swappable by contract, per-agent model-plane disclosure, local models in-tenant — so every frontier-model improvement makes our pods better and cheaper, and we never fund the capability race. The headline lab-enterprise SDLC deals are **market validation, not threat**: the giants are teaching buyers that agent-driven delivery is real — for organizations with large in-house engineering teams. The agency-served mid-market, where Q lives, needs the same thing **delivered, not licensed** — named accountable humans, a vendor who signs the SOW, EU data posture, and proof. *The labs sell the engine; we show up with the car, the driver, and the insurance — and we buy engines from whoever makes the best one.* The real race is **between agencies**: the labs are commoditizing the agent, and the harness + governance + evidence layer is what separates the agency that wins from the ones that don't. (Honest boundary: a buyer with a 500-engineer org who wants their own teams faster is a lab deal, not ours — we don't chase it. The aikido play: companies that bought capability and ended up with ungoverned chaos are our cleanup market — "we govern the pod across all your tools and keep the evidence.")

**The moat, ordered (product-owner framing, 2026-06-10).** Five pillars, in this order: **(1) the harness itself** — modern SDLC human+AI pods under the agency environment (orchestrated agents, accountable humans, unified gates, one ledger) with **first-class AgentOps under the hood** (evals before any agent version ships, run tracing, agent versioning + rollback, cost-aware model routing, guardrails — "AgentOps is how we run the fleet; governance is how the client sees it"), and a deployment posture that answers the four enterprise fears: *data privacy & sensitivity* (dedicated per-client tenancy, isolated infra/DB; GDPR-ready by construction — EU residency, DPA, per-class retention windows, full data export — and **Q's own local AI infrastructure**: local/self-hosted models so sensitive data can stay inside the tenant), *cost* (self-hosted inference where cheaper; budget cap + run-rate per pod), and *third-party lock-in* (agents swappable by contract, per-agent model-plane disclosure, exportable artifacts + ledger); **(2) shared context, held by an agent** — the **Knowledge Base agent** is the cornerstone: it holds the project's truth (legal constraints, tasks, decisions, conflicts, domain sources) and every agent and human draws on the same context, visibly and auditably — *operating today*, and **mandatory in every pod** (owner call, 2026-06-12: every blueprint includes it and the wizard's toggle is locked — the cornerstone is not an option); one concrete delivery consequence: **the SOW lives in the shared context as the source of truth — produced work is checked against it and deviations are flagged**, so "bug or change request?" becomes a lookup, not a negotiation; **(3) proactive agents in human-native channels** — humans live in Slack/email/Teamwork and the pod reaches them there; **Slack is the first-class channel** (Teams and others follow), and people answer the agent the way they answer a colleague — our agents reach out to them, not the other way around; the dashboard is optional depth, one deep link from message to decision; **(4) provable accountability** — the audited handshake, around-the-clock coverage, the autonomy ladder, the append-only ledger; **(5) the deterministic validator floor** — *last on this list, deliberately, but still on it*: the zero-LLM structural gate is the floor the autonomy ladder stands on.

**The moat's second act — earned autonomy.** The zero-LLM validators are not only a quality gate; they are the **precondition machine for safe delegation**. Agents climb an autonomy ladder — **L0 review-all → L1 batch → L2 sample 1-in-5 → L3 auto-clear low-risk** — where promotion criteria are *deterministic validator streaks* ("BA eligible for L2: 47 consecutive 8/8 specs, 4% rejection"), proposed by the system, **granted by the accountable human, and written to the ledger**. Competitors' autonomy preconditions are vibes; ours are checked in code. Autonomy you can audit your way into.

**One-line positioning.** *Not an autonomous coder you must trust — a governed agent–human pipeline you can prove.*

**The regulatory tailwind.** For EU buyers the product is an almost literal **AI Act Article 26 deployer implementation**: the accountability matrix is assigned human oversight, the append-only ledger is log retention, incident reporting is built in — the gate decisions-with-reasons are oversight *evidence*, not paperwork bolted on later. And it is not only a 2026 story: clients **already send vendor questionnaires** asking how AI use on their project is supervised — the matrix and the ledger are the answer, demo-able in one click.

**The wow moment.** Not the DAG lighting up. The **ROI reveal**: on the MONITOR landing, a hero tile shows **human-hours freed**, **cost-per-merged-ticket**, and **cost-per-story-point** — the number the CFO asks for, staged honestly: the live tier is **cost-per-approved-spec + time-to-approved-spec** (badged Live); cost-per-merged lights up *as agents ship*. The defensible claim is not the chart — suite-native control planes chart agent spend too — it is **per-delivery-unit economics attributable to a named accountable human**. Generic platforms show autonomy; we answer *"what did this cost vs. a human team, and who's accountable for it?"* The second beat is the **accountability matrix** (one accountable human per agent; an empty column = uncovered risk) — the answer to the top enterprise objection: *who is responsible when it's wrong?*

**The 3-minute demo arc.**
- **0:00 LAUNCH** — From the Q catalog, pick BA + SA + UI/UX + Dev + QA — **five taps plus two one-click auto-fixes** (adding Dev inline-suggests **+ Add Tasklist**, adding QA suggests **+ Add Review**), completing a continuous 7-node wired chain with no gaps. Drag in accountable people across the agents (one human can cover several — the readiness check flags the loading), connect **Teamwork/Slack/GitHub** as Connect tiles — the presenter points at Jira's **Roadmap** badge as the honesty beat (Live-vs-Roadmap, never misled post-sale) — click **Launch pod**; the summary reads **7 agents · 4 accountable humans**. (The 30 seconds that does not exist yet — the highest-leverage thing to mock.)
- **0:30 RUN** — A Teamwork/Jira ticket flows in; BA produces a SPEC.md; a Slack clarification gate fires; the PM answers; the spec advances to *ready*; an approval gate appears in the unified queue; the PM approves on a **client-grade review surface inside Agency OS**.
- **1:45 MONITOR** — The `/economics` ROI reveal, then `/pod` accountability, then `/compliance` append-only audit trail that outlives the agent.
- **2:45 Close** — Governance: the zero-LLM structural validators, checked *deterministically*, not graded by another model — the hardest-to-copy moat.

---

## 2. The Operating Model

**Agent–human pods.** The unit of value is a **pod**: a configured set of catalog agents + connected tools + accountable people + Slack routing, scoped to one client project. A pod is what a PM "fires up." It is the noun the whole product organizes around — and it replaces today's read-only `/pod` accountability matrix as a first-class, *configurable* object.

**The curated Q SDLC catalog — and the agentification ladder.** Not arbitrary BYO agents — a **curated set of seven roles**, each adopting the same internal contract so they are pluggable *by construction* but presented to the buyer as a vetted team. The same table is the **agentification ladder**: a client's pipeline starts mostly human-operated and agentifies stage-by-stage — every stage has a named operator today (agent or human), and each upgrade is proven with the client's own before/after data:

| Agent | Consumes → Produces | Stage operator (today) | Status today |
|---|---|---|---|
| **Business Analyst (BA)** | — → `spec` (SPEC.md, EARS criteria) | **Agent — live** | **Live**, federated |
| **Software Architect (SA)** | `spec` → `design` | Human-operated · SA agent next | **Under construction** (2026-06-10) |
| **UI/UX Designer** | `design` → `uix-ui-spec` (UIX-UI-SPEC.md — Figma + visual specs) | Human-operated · agent roadmap | **In preparation** (2026-06-10) |
| *Tasklist* (pipeline intermediate) | `uix-ui-spec` → `tasks` | Human-operated · agent roadmap | Planned |
| **Developer** | `tasks` → `code` | Human-operated · agent roadmap | **Under construction** (2026-06-10) |
| *Review* (pipeline intermediate) | `code` → `review` | Human-operated · agent roadmap | Planned |
| **QA** | `code` + `review` → `test` | Human-operated · agent roadmap | **In preparation** (2026-06-10) |
| **DevOps/Release** | `test` → `release` (DORA metrics) | Human-operated · agent roadmap | Planned |
| **Knowledge** | pod-wide peer (= the `curator`; `GenericFacet`) — curates project memory, **the cornerstone of shared context** (legal, tasks, conflicts, truth), runs pod-wide, not in the pipeline rail | **Agent — operating** | **Operating today** — dashboard federation next |

The catalog markets the **seven curated roles**; *Tasklist* and *Review* are pipeline intermediates rendered as spine sub-steps in the pipeline preview (still togglable cards), so the full wired chain is `spec → design → uix-ui-spec → tasks → code → review → test → release`, with Knowledge alongside it pod-wide.

**The method is already proven in daily use:** the same flow ships today as **spec-first AI-driven SDLC** — a step-by-step Cursor / Claude Code plugin workflow (in the spirit of GitHub's SpecKit). Agency OS is its productization: the same method, with a harness, gates, and a ledger around it. **The product arc:** phase one productizes the harness for **our SDLC agents** — the biggest reach for Q and the biggest value for clients who still need delivery done by our teams, now as agent–human pods with ultra-observability and governance; phase two opens the same harness to **generic agents and agentic systems** beyond the SDLC (registered in §8).

For the mock, **BA and one downstream (SA) are fleshed out**; the rest appear in the catalog as installable cards with capability/cost/latency and a **contract-version + conformance badge**. This badge does double duty: it answers the lock-in objection — *curated for quality, swappable by contract* — without promising third-party BYO.

**The tracker boundary (Jira/Teamwork ↔ Agency OS; owner-ratified 2026-06-11).** *The board is the doorbell; Agency OS is the house.* (1) **Tickets live in the tracker** — Agency OS never creates/edits/comments/closes tickets; dragging a scoped ticket into the agreed column/status **is the ONLY start signal — in both modes** (owner-clarified 2026-06-11: a single doorbell; Agency OS never originates activation). The pod config is a **start policy**, not a second start button: *confirm-first* (each board arrival waits for the operator's confirmation in `/intake` — a safety catch on the single doorbell; the default for early Q-led pods) or *auto-start* (the drag starts the chain immediately) — the same earn-automation family as the autonomy ladder. (2) **Agent-to-agent activation is ALWAYS Agency OS** — gates + autonomy policy drive the chain; the client board never grows agent columns. (3) **Write-back, never ask twice** — a per-pod status mapping posts plain status + artifact links back to the ticket (In Progress on first pickup, Done on release); clarifications land in the ticket thread / Slack, so every conversation stays single-homed. Edge rules from day one: **echo-loop prevention** (our write-backs are tagged; our listener ignores its own moves) and **drag-back semantics** (ticket pulled out mid-run → park the run + notify — never silently burn tokens). And the rule that keeps the ledger meaningful — **no freeform stage moves anywhere** (owner-ratified 2026-06-11): board columns move only in the tracker (by humans) or as tagged write-back (by Agency OS); execution stages move only as **consequences of audited decisions** — gate approve, gate reject with a typed reason, recovery actions — never a drag. A stage change without a recorded *why* would bypass the gate model the whole audit story stands on.

**Decline-the-start — confirm-first's "no" (owner-ratified 2026-06-11).** A not-actionable arrival (no description, out of scope, duplicate) is **declined with a typed reason**: the card is returned to **To-Do on the board** via tagged write-back, with the reason posted as a ticket comment ("[AgencyOS] Returned: … — add detail and drag to Ready again"), and the decision lands on the ledger. The distinction is canon: **decline = wrong ticket; clarification = unclear ticket** — a real-but-ambiguous arrival is confirmed and the BA asks its clarification in Slack (that is the BA's job, not intake's). In auto-start mode, a **deterministic pre-flight** (description present · in scope · not a duplicate) applies the same decline path before any tokens burn. And **ticket creation happens on the board, full stop** (owner call, 2026-06-11 — the intake "draft a ticket" composer was REMOVED): writing tickets is work definition, which is the tracker's domain and the client PO's ritual; Agency OS originates nothing. The one kernel worth keeping is registered, not built: if an in-app "draft to board" convenience ever returns, it writes the ticket INTO the tracker's To-Do (attributed, via the connector write API) and follows the normal doorbell — never a ticket beside the board. Per-persona result: client PO/devs stay in Jira/Teamwork + Slack; the pod PM lives in Agency OS; **nobody runs two tools for one job**. `/pipeline` is the pod's *execution* view, never a second kanban — the litmus test for any future feature: *"would a user reasonably do this in Jira?" → write-back or deep-link, not a new surface.*

**Where the chain starts — and how rework travels it (owner-ratified 2026-06-11).** Two invariants keep the artifact chain gap-free. (1) **Entry is always the chain's first node** — a BA-class agent: every confirmed start lands at Backlog and the BA runs first, so every downstream artifact traces back to a spec (no mid-chain entry holes). Variety is absorbed without breaking this: **the BA right-sizes the artifact by ticket type** (a `bug` gets a thin bug-brief spec, and gate policy can auto-approve that tier on the autonomy ladder), **blueprints define different chains** (a Maintenance pod's chain can be shorter — BA-triage → Dev → QA — entry is still node #1 *of that chain*), and a ticket arriving with an existing client spec means the BA **adopts** it (ingests, runs the validators, conforms or flags gaps) — author becomes inspector, still BA-first. (2) **Rework follows the artifact chain.** When a gate finds a defect born upstream (QA fails because the SA's design is wrong), the reject **targets the root-cause stage**, not just one step back: the gate's reject dialog picks any upstream agent stage, the finding becomes that agent's added context, and — because the consumes-graph *is* the dependency graph — **everything downstream of the corrected artifact is stale by definition and re-runs forward** (no human has to remember what's invalidated; this is a selling point vs. human teams, where corrected designs quietly coexist with code built on the old one). The agent's own failure report proposes the target via traceability (failing criterion → artifact it traces to); the human confirms or overrides — decision canon as usual, typed reason, ledger row (`gate.rejected "{gate} → {target}: {reason} · downstream re-runs forward"`). **Rework is costed and escalates:** rerun count is visible on the card, rework cost is attributed to the causing stage in economics, and repeated bounces (rerun ≥ 2) notify the accountable human via Slack — incident-class, never a silent loop. The tracker stays calm throughout: internal bounces never leak as status churn — the ticket simply stays "In Progress."

**Slack-first communication (owner call, 2026-06-11).** Humans talk with agents through the tools they already use to talk with other humans. **Slack is the first-class channel** (Teams and others follow): clarifications, gates, and escalations arrive **proactively from the agents**, and people answer in-channel the way they answer a colleague. The dashboard is optional depth — one deep link from the message to the exact decision — never a required habit.

**The reference board (what the "perfect Teamwork kanban" looks like).** The client's board needs only **six plain columns** — anything more starts mirroring the pipeline, which is the two-tools trap. *Client-moved:* **Backlog** (ideas, unrefined — invisible to the pod) → **To Do** (refined by the client PO, acceptance sketched — the pod sees these as "on the board" in `/intake`: visible, not actionable) → **Ready** (THE doorbell — dragging a scoped card here is the start signal; a declined card comes back to To Do with the [AgencyOS] reason comment). *Agency-OS-written (tagged write-back, never moved by hand):* **In Progress** (the chain is running — all internal stages collapse into this one column) → **In Review** (a human gate is open; the Slack ping does the real work, the column just reflects it) → **Done** (shipped, with artifact links in the comment). Rules that make it perfect: the doorbell column's name/meaning is agreed at LAUNCH and written into the SOW; scope is explicit (label `pod-owned` or client-flagged) so not every card in Ready belongs to the pod; **no agent/stage columns ever appear on the client board** (Spec/Design/QA columns in Teamwork = the litmus-test failure); card hygiene is minimal by design (a one-line title is enough — the BA asks for the rest); drag-back out of In Progress = park + notify; optional **Blocked/On hold** column is fine — it maps to the parked state.

**Dedicated per client.** Each customer gets **isolated infra/DB** (not shared multi-tenant). This is a premium enterprise differentiator that is today **invisible in the UI**. We make it visible: a **tenancy/residency badge** in the TopBar and a data-handling statement in LAUNCH. The architecture split that resolves the "launch in minutes" tension: **tenant stand-up is a one-time Q-operated provisioning event** (slow, deferred behind the mock); **pod launch is fast in-tenant configuration** (the thing we demo). The mock only shows the latter.

**Coexistence (brownfield by default).** Every 2026 sale lands inside an existing delivery org. The pod owns a **slice** of the backlog — scope rules picked at LAUNCH (project/label/component filter); everything else stays with the client's team, untouched. Status **write-back maps pod stages onto the client's existing workflow statuses**, so the pod's work shows up inside their Jira/Teamwork, not beside it. **Dual-track operation with the client's human BA is the expected mode**, not a transition failure — and the framing is always *freed/redeployed*, never *displaced*: the economics surfaces count hours given back to the client's team.

**The LAUNCH / RUN / MONITOR spine.** The three pillars *are* the information architecture, not three more tabs. Today's build is roughly **80% MONITOR, 15% RUN, 5% LAUNCH** — inverted versus the pitch, which *starts* the buyer at LAUNCH. The vision rebalances by **building the LAUNCH front door** and **reframing** the deep MONITOR telemetry behind a client-legible surface, demoting platform-engineer views into an Advanced drawer.

---

## 3. Personas & Jobs-to-be-Done

| Persona | Default landing | Jobs-to-be-done |
|---|---|---|
| **Pod Admin / PM** (buyer, primary operator) | Overview | *"Launch a pod, keep it running, clear gates, prove ROI to my sponsor."* Sets up the pod, answers clarifications, approves artifacts, handles incidents, exports the weekly client report. |
| **Engineering Lead** | Pipeline / Traceability | *"Is the work technically sound and flowing?"* Reviews design/code facets, spec→design→code lineage, unblocks technical gates. |
| **QA Lead** | Gates + QA facet | *"What needs my sign-off and what's the quality posture?"* Scoped gate queue, governance/structural validators, defect/coverage facets. |
| **Client Sponsor / Exec** (read-only) | Rolled-up status digest | *"What did my money buy this week?"* Shareable status report, ROI, SLA target-vs-actual. No operator dials. |
| **Viewer** (read-only) | Status digest | Observe without acting. |

RBAC is **mocked now, hardened in v2** (see §8). But the *role-scoped views* are designed now — because nearly every client surface (report scope, gate attribution, security visibility, notification routing) is meaningless without an identity/role model. We mock roles to make those experiences coherent; we defer the IdP.

---

## 4. The Product in Three Acts

Each act is a set of concrete, mockable screens. **[REUSE]** = extends an existing route/dataset; **[NEW]** = a surface to design from scratch; **[REFRAME]** = existing surface, client-legible framing.

### ACT I — LAUNCH (set up a pod)

The front door, and the single most load-bearing missing surface. Today `/connections` (`src/routes/connections.tsx`) is a developer probe form (paste an agent URL + optional API key into a throwaway cookie via `connections.functions.ts: probeAgentFn`) and `/pod` (`src/components/pod/PodView.tsx`) is a read-only matrix. Neither is a setup experience.

**Screen 1 — Pod Blueprints (the 60-second start).** **[NEW]** A blueprint picker: *Web App Delivery Pod*, *Mobile Pod*, *Maintenance Pod*. Each pre-selects agents, suggested connectors, default SLAs, and recommended accountable roles. Choosing one pre-fills the whole wizard; "Start from scratch" is the escape hatch. This turns "assemble agent-by-agent" into "pick and adjust."

**Screen 2 — Agent Catalog.** **[NEW, reuses `src/mock/agents.ts`]** Card grid of the seven curated agents — icon, role, what it produces/consumes, indicative cost/latency, and a **contract-version + conformance badge**. Add/remove toggles. The auto-wiring is shown: as you add agents, the produces↔consumes edges connect them into a pipeline preview (reuse the topology model behind `/orchestration`).

**Screen 3 — Connect Tools.** **[NEW, reframes `/connections`]** OAuth-style **Connect tiles** per tool (Jira, Google Drive, Email, Slack, GitHub, Teamwork), each with a mocked health/reachability check (extend `probeAgentFn`) and **shown permission scopes at connect-time**. Tiles are honestly badged **Live vs. Roadmap** (Teamwork/Slack/GitHub are real today; Jira/Drive/Email are roadmap) so a buyer is never misled post-sale. The connection-direction model in `src/mock/comms.ts` supplies the inbound/outbound semantics.

**Screen 4 — Accountable People.** **[NEW, reuses `src/mock/humans.ts` + PodView matrix]** Assign one accountable human per agent by drag-and-drop into the accountability matrix. **An empty column is flagged as uncovered risk** right here at setup — the accountability promise begins before the pod even runs. Invite-by-email flow for people not yet in the org (mocked invite + one-time link).

**Screen 5 — Wire Slack.** **[NEW]** Map pod events → Slack channels (clarification gates, approvals, escalations, daily brief). Pick the approver channel; this is real BA behavior (`slack_approver_ids`, Slack MCP) surfaced as configuration.

**Screen 6 — Readiness Checklist & Go Live.** **[NEW]** A checklist (agents added ✓, every agent has an accountable human ✓, required tools connected ✓, Slack wired ✓) with a **Launch pod** gate. Launch lands on the Overview. Empty-states and progress are designed so the wizard itself is demoable end-to-end.

### ACT II — RUN (operate it day-to-day)

**Overview.** **[REUSE `src/routes/index.tsx`]** KPI strip, agent status grid (concurrent work + liveness-vs-activity split), human-gate queue, activity feed. **Promote the ROI number to a hero tile** here (not buried at nav item 8). Add a **Pause pod / Pause agent** control and a visible *paused/escalated* state — the control affordance a risk-evaluating buyer asks for.

**Pipeline Board.** **[REUSE `src/routes/pipeline.tsx`]** Kanban over the lifecycle (`backlog → in_progress → waiting → ready → approved → delivered`, plus `reset/blocked/error`). This is where work visibly flows during the demo.

**Approvals & Clarifications (unified gates).** **[REUSE `src/routes/approvals.tsx`]** One queue, two kinds (clarification + approval). The key upgrade: the **top 1–2 gates (spec approval) get a client-grade review surface inside Agency OS** — render the SPEC.md, the EARS criteria, the structural validator results, with Approve/Reject — a typed reason is **required on reject and override**; clean approvals offer **optional structured quick-reason chips** (no mandatory prose, so the ledger never fills with "Looks good" ×40). Deep-link to the agent's own tool (BA's flow-observer) only as a fallback. A paying client PM should not be dropped into internal tooling to do their core job.

**Comms & Escalations.** **[REUSE `src/routes/comms.tsx` + `src/mock/comms.ts`]** Agent-initiated Slack/Teamwork posts, escalations with severity/routedTo/SLA. Surfaces the *paused/escalated* state from the Overview.

**Incidents & Recovery.** **[NEW]** A non-engineer operating a pod 24/7 needs an answer to *"agent X failed — what now?"* An **incident inbox** (agent-down, run-failed, gate-overdue, tool-disconnected, sync-stale) with a per-incident timeline, a suggested action, and **explicit recovery controls**: retry/resume run, re-auth a disconnected tool, reassign the accountable human, pause/restart an agent. Every recovery action is written to the audit ledger. This is the difference between a demo and an operable product.

**Notifications & Alerts.** **[NEW]** Today only transient `sonner` toasts exist. We add a per-user **notification inbox + preferences** (which events, which channel: in-app / email / Slack / push), **alert rules tied to SLAs and incidents**, stakeholder digests, and a **mobile-friendly "my gates / my approvals" view** so a PM or QA lead can clear a gate from their phone. This closes the loop on the entire HITL value proposition — the gate is worthless if it never reaches the human.

### ACT III — MONITOR (observe, govern, report, prove)

**MONITOR landing / ROI hero.** **[REFRAME `src/routes/economics.tsx` + `src/mock/economics.ts`]** Lead with `humanHoursDisplaced` (displayed as *human-hours freed*), `costPerMerged`, `costPerStoryPoint`. Add **projected monthly run-rate** and a **budget cap** to answer the unbounded-cost fear — not just historical spend. Reframed from operator cost-debugging to **client consumption transparency**.

**Governance (the moat).** **[REUSE `src/routes/governance.tsx` + `src/mock/governance.ts`]** Spec quality: 6-dimension completeness, EARS coverage, structural readiness. The critical UX fix: **visually separate and badge the deterministic, zero-LLM structural validators** (EARS coverage, section parity, AC-ID parity, business-rule references, etc. — checked in code, no model in the loop) from any LLM-judge signal. The skeptical buyer's reflex is *"the AI is grading its own homework."* The badge — *"validated deterministically, no LLM in the loop"* — is the hardest-to-copy headline claim. We also fix the oversell: it is **structural quality, not semantic** — the language must say so (resolving gap B1/B4). And the moat is pipeline-wide by claim, not one-seventh: a **deterministic gate matrix** names the zero-LLM checks per artifact kind — **design:** section parity + ADR presence; **code:** build/lint/SAST/license; **test:** coverage/mutation; **release:** SLSA provenance + DORA — and the same deterministic streaks are the promotion evidence for the autonomy ladder (§1, §5).

**Accountability.** **[REFRAME `/pod` read-only matrix]** The setup-time matrix, now showing live workload, SLA status, and gate ownership. Empty column = uncovered risk.

**SLA & Client Reporting.** **[NEW, sources Economics + Governance + lifecycle]** Today SLAs are only a raw `slaBreaches` counter in `humans.ts`. We add **SLA definitions per stage/pod** (response time, gate-clearance time, delivery cadence) with **target-vs-actual + breach history**, and a **shareable/exportable weekly client status report** (items delivered, gates cleared, cycle time, cost) framed for a sponsor — not operator dials.

**Compliance & Audit.** **[REUSE `src/routes/compliance.tsx`, dashboard-owned Supabase audit ledger]** Append-only `audit_log` of state-changing actions (reset/approve) that **outlives agent data** (BA's reset deletes the spec). The upgrade: **human-decision audit** — when a human clears/rejects a gate, capture *actor + timestamp + decision + reason* (typed reason on reject/override; structured quick-reason chips on approve), render it on the artifact and in the trail. This depends on real identity, so the **null `actor`** is honestly shown as *"when-only"* until auth v2 (§8); the record shape is designed now.

**Advanced / Platform drawer.** **[REUSE, demoted]** Observability (`/observability`, health + log tail + infra telemetry), Orchestration (`/orchestration`, topology DAG + queue), Flow Analytics (`/flow`), Traceability (`/traceability`). These are credibility for a technical buyer but over-built for the PM persona — **demote, don't delete**, behind an Advanced section for technical users.

---

## 5. Capability Map

- **Agents & Catalog** — curated seven-role Q catalog; install/remove per pod; contract-version + conformance badge; capability/cost/latency cards. *(New catalog UI over `src/mock/agents.ts`.)*
- **Topology & Pipeline** — auto-wired produces↔consumes edges; lifecycle stages; kanban board. *(Reuse `/pipeline`, `/orchestration` topology.)*
- **Connectors** — per-pod tool connections with shown scopes, health checks, Live-vs-Roadmap honesty; reframed `/connections`. **Credential vault deferred** (§8).
- **People / RBAC / Pods** — pod as configurable object; accountable-human matrix; role personas + invites + role-scoped landings. Humans carry **capacity and calendar**: `workingHours`, `status` (available/OOO), a named `delegateId`, and `capacityGatesPerDay` — agents run 24/7, humans don't, and the model says so. *(Reuse `humans.ts`, PodView; new roles layer.)*
- **HITL & Accountability** — unified gates queue; client-grade spec-approval surface; typed reason **required on reject/override**, optional quick-reason chips on approve; one accountable human per agent; recovery controls. Coverage is **accepted, not assigned**: reassignment requires a one-tap **audited acceptance**; the matrix gains a **coverage timeline strip** (time-gaps get the same red "uncovered" treatment) and optional deputy chips (one **A** stays the invariant); a **throttle policy** pauses upstream intake when a human's open gates exceed capacity (amber pod state); SLA clocks support a coverage-hours mode ("clock paused outside coverage"); **"Escalate to Q"** is a first-class audited recovery action, with a **"Q-managed start"** blueprint option (Q staff hold accountable roles weeks 1–4, then hand over). *(Reuse `/approvals`; new review surface + incidents.)*
- **Governance** — 6-dimension completeness; **badged zero-LLM structural validators**; honest structural-vs-semantic language; the **autonomy ladder** (L0 review-all → L1 batch → L2 sample 1-in-5 → L3 auto-low-risk; promotion on deterministic validator streaks, granted by the accountable human, written to the ledger); the **deterministic gate matrix** per artifact kind (design: section parity + ADR presence; code: build/lint/SAST/license; test: coverage/mutation; release: SLSA provenance + DORA — all zero-LLM). *(Reuse `/governance`.)*
- **Code-side integration** — the Dev agent works in the client's repo under a **bot git identity** (signed commits, `Co-authored-by:` the accountable human); every PR carries the **PR contract** (spec link + gate id + validator summary in the description); and the **gate↔PR mirroring rule**: the code-review gate *is* the GitHub PR review — the webhook resolves the gate, the dashboard shows status and deep-links out — the deliberate inverse of the spec gate, justified per persona (engineers review code in GitHub; PMs review specs in Agency OS). *(Mock: `src/mock/code-integration.ts` with two seeded PRs + a LAUNCH readiness check "Bot collaborator invited · branch-protection compatible".)*
- **Economics & Billing** — ROI hero (human-hours freed, cost-per-merged, cost-per-story-point — live tier badged per §1); run-rate + budget cap; client-facing usage-vs-plan summary + budget alerts + monthly statement. *(Reframe `/economics`; new billing view.)*
- **Compliance & Audit** — append-only ledger surviving reset; human-decision attribution; data export/retention surface. *(Reuse `/compliance`; new export/retention.)*
- **DevOps** — DevOps/Release agent as a pipeline stage with DORA metrics (plan→approve→apply, strongest gates); platform LLMOps (version pinning, eval gates) **named, deferred** (§8).

---

## 6. Information Architecture & Navigation

Today: 16 flat left-rail items — *a tour, not a product*, reading as an internal engineering tool. The vision makes **the three pillars the navigation spine**, scoped per pod, inside a **multi-pod shell**.

```
TopBar:  [Pod switcher ▼]   [Tenancy: Dedicated · EU-West · isolated DB 🛡]   [⌘K search]   [🔔 notifications]   [user/role]

Left rail (pillar-grouped):
  ── LAUNCH
       New Pod (wizard)              [NEW]
       Catalog                        [NEW]
       Connections                    [REFRAME /connections]
       People & Roles                 [REFRAME /pod + new roles]
  ── RUN
       Overview                 [/index]
       Pipeline                       [/pipeline]
       Gates (Approvals + Clarif.)    [/approvals]
       Comms & Escalations            [/comms]
       Incidents & Recovery           [NEW]
  ── MONITOR
       ROI & Economics                 [REFRAME /economics hero]
       Governance                     [/governance]
       Accountability                 [REFRAME /pod]
       SLA & Reports                  [NEW]
       Compliance & Audit             [/compliance]
       Usage & Billing                [NEW]
  ── ADVANCED (technical users)
       Observability · Orchestration · Flow · Traceability · Agents (/agents)   [demoted]
  ── Settings (incl. tenancy/security posture, data export & retention)
```

A **multi-pod shell** means the pod switcher is top-level: a client org may run several pods. A **global ⌘K command palette** **[NEW]** spans runs/artifacts/gates/incidents/people/connections with deep-links, plus list-filtering on high-volume views (pipeline, gates, compliance). The shell carries the **tenancy/residency badge** and the **notification bell**.

A **route-to-pillar migration table** (every existing route → its pillar destination, REUSE/REFRAME/NEW) is the first deliverable for whoever reorganizes the IA — this is a *reorg*, not additive screens.

---

## 7. Mock-First Build Order

Ordered to make the demo arc demoable earliest, highest-leverage first. **Status (2026-06-10): items #1–#12 are SHIPPED in the mock** (commits `f76ee4a` — pillar IA, multi-pod shell, New-Pod wizard at `/pods/new?step=…`; `69014e0` — gate review at `/approvals/$gateId`, incidents, notifications, reports, billing, intake), **the Wave-2 slice is SHIPPED** (the eight surfaces + the per-user experience gate, commit `30a5330`), **and the Wave-2 COMPLETION slice is SHIPPED** (gate policies & autonomy UI, capacity/coverage, Demo Director, role-scoped landings, responsive gates — see the register below). **#13 is largely shipped** via the Settings trust surface (tenancy/security posture, models & subprocessors, data export & retention); its remaining tail = in-product help/coach-marks beyond `/welcome` and an accessibility pass on client-facing surfaces.

1. **IA reorg + multi-pod shell + pod switcher.** Regroup the existing 16 routes under LAUNCH / RUN / MONITOR / Advanced; add the pod-switcher TopBar and tenancy badge. Ship the route-to-pillar migration table. *(Reframes everything; unblocks the rest.)*
2. **LAUNCH wizard (the missing 30 seconds).** Blueprints → Catalog → Connect tiles → People matrix → Slack → Readiness → Launch. Reuse `agents.ts`, `humans.ts`, PodView, `comms.ts`; extend `probeAgentFn` for mocked health. *This is the top priority — it's the most-sold, least-built experience.*
3. **ROI hero on the MONITOR/Overview landing.** Promote `economics.ts` numbers; add run-rate + budget cap. *(Cheapest path to the wow moment.)*
4. **Governance moat badge.** Separate + badge zero-LLM structural validators; fix structural-vs-semantic language. *(The closing differentiator; cheap, high-trust.)*
5. **Client-grade gate review surface** on `/approvals` (as-built: `/approvals/$gateId`, `GateReviewShell`) — typed reason required on reject/override, optional quick-reason chips on approve. *(Core RUN demo beat; sets up human-decision audit.)*
6. **Incidents & Recovery inbox** with recovery controls wired to the audit ledger. *(Makes the product operable, not just observable.)*
7. **Notifications inbox + preferences + mobile "my gates" view.** *(Closes the HITL loop.)*
8. **SLA definitions + shareable weekly client report.** *(The sponsor-facing artifact.)*
9. **Roles & membership + role-scoped landings** (exec digest, QA queue, PM cockpit) + invite flow. *(Makes multi-stakeholder coherent.)*
10. **Usage & Billing view** (consumption vs. plan, budget alerts, statement). *(Commercial fundamentals.)*
11. **Sandbox / demo pod with seed data** — a one-click pre-loaded pod (in-flight specs, gates, an incident, a delivered item) badged *Sample*, plus non-blank empty-states for real pods. *(Maps onto rich existing `src/mock/*`; the cheapest evaluation asset.)*
12. **Global ⌘K search + list filters.** *(Daily-driver polish.)*
13. **Data export & retention + security/access posture in Settings; in-product help/coach-marks; accessibility pass on client-facing surfaces.** *(Trust + usability tail.)*

**Sales-engineering deliverable (alongside the mock):** the **competitive teardown one-pager** — suite teammates (GitHub Agent HQ, Atlassian Rovo, ServiceNow) vs. autonomous coders (Devin, Cursor) vs. Agency OS — promoted from §9's open questions to a committed build-order deliverable. **→ SHIPPED as `/pitch` (2026-06-10):** the no-auth, chrome-less, print-to-PDF **management buy-in brief** served by the app itself (`src/routes/pitch.tsx` + `src/components/pitch/*`; the `__root` escape renders it shell-less like `/share/*`). Ten sections — executive summary (incl. the two-phase arc), the wedge (the teardown lives here), the product in three acts with 23 "See it live →" deep links into the demo, the moat (product-owner ordering: harness → shared context → proactive agents → accountability → deterministic floor last), the **"What is real today"** honesty section (agent-fleet status chips + live/staged/roadmap table + the spec-first Cursor/Claude Code workflow), the pilot plan, **roadmap & initial deliverables** (the mock framed as deliverable #0; the §README build sequence as the post-greenlight deliverable list; a scoping workshop as the first scheduled deliverable), and the ask. Copy passed a CFO/CTO/copy-editor skeptic review (one Live-label overclaim caught and fixed before ship). **Economics & pricing was pulled from the brief to the backlog (product-owner call, 2026-06-10)** — the hypothesis itself stays in §9.5; the ROI story stays in Act III where the screens carry it.

**Wave 2 — SHIPPED (2026-06-10 slice):** `/welcome` (accountability handshake) · `/memory` (constitution & amendments; absorbs `/knowledge`, which now redirects) · Pod Copilot (TopBar sparkle + ⌘J; canned ask-with-receipts + confirm-first actions, badged no-LLM) · `/pilot` · `/org` · `/share/$token` (chrome-less, no-auth client report viewer) · `/artifacts` (deliverables shelf with rejected-iteration diffs) · `/status` — plus the **per-user experience gate**: the standard login (qai) renders the full mock product while the real-mode login renders ONLY live-connected surfaces (`src/lib/experience.ts`; mock routes redirect real-mode to `/`, mock TopBar chrome unmounts), and a **session audit overlay** (`src/mock/audit-bridge.ts`) makes every wave-2 action land visibly in Compliance under a "this session" divider. Supporting datasets shipped: `gate-policies.ts` (per-agent SLA + autonomy ladder seed), `memory.ts`, `pilot.ts`, `artifacts.ts`, `status.ts`, `copilot.ts`, `share.ts`.

**Wave 2 COMPLETION — SHIPPED (2026-06-10, second slice):** the **gate policies & autonomy UI** (Settings → Gate policies & autonomy: per-ArtifactKind policy table with review modes full/batch/auto-with-sampling, the per-agent **autonomy ladder** L0→L3 with system-proposed/human-granted promotions on validator-streak evidence, the "would have auto-cleared 14 of 22 gates, saving ~9h" preview, every change → `policy.changed`; policy chips on the gates queue + review header) · **human capacity & coverage** (working hours/OOO/deputy/capacity on `humans.ts`, the 24h coverage strip + saturation chip + audited reassignment on `/pod`, SLA `clockMode` with "clock paused outside coverage") · **Demo Director** (⌘⇧D hidden presenter overlay staging the 3-minute script into the live mock stores — idempotent beats, checkpoint restore) · **role-scoped landings** (view-as personas: Exec Digest for Sponsor/Viewer with zero operator controls + read-only rail, QA gate queue, `/settings/roles`) · **responsive gates** (the `/m/gates` fork resolved as breakpoints on the unified `/approvals` surfaces). **All Wave-2 items are now in the mock** — what remains beyond it: the #13 tail (coach-marks, accessibility pass) and the deep-dive P2 backlog.

---

## 8. Deferred Under-the-Hood Decision Register

The mock-first mandate lets us defer the *how* — but nothing is dropped silently. Each parked decision, why it waits behind the mock, and when it must be answered.

| Decision | Parked stance | Why it can wait behind the mock | Must be answered when… |
|---|---|---|---|
| **Runtime / who runs the agents** | Flip the architecture stance for the product SKU: **managed dedicated runtime**, not "federate self-hosted." Keep envelope+facet as the internal interface. | The experience is identical whether Q hosts or federates; the mock shows configuration, not hosting. | Before first paying pilot runs real downstream agents (SA/Dev/QA) in production. *(Architecture-blocking — prepare a managed-dedicated-runtime roadmap line for the demo.)* |
| **Per-client provisioning & isolation** | **Tenant stand-up = one-time Q-operated** event; **pod launch = fast in-tenant config** (the only thing mocked). Dedicated DB/infra per client. | "Minutes to launch" refers to pod config, not infra; provisioning is a sales/ops motion, invisible in the daily product. | Before self-serve sign-up, or before sales promises a same-day tenant. Provisioning automation is a named follow-on. |
| **Secrets / OAuth credential vault** | First-class deferred subsystem. `/connections` is reframed as pod-tool-connections; sources stay declared on the agent card. | Connect tiles + mocked health demo the *experience*; raw keys live in a cookie only in the prototype. | Before any real client tool (Jira/Drive/GitHub) is connected with live creds. **No production connect without a vault.** |
| **Identity / Auth / RBAC** | **Product-blocking, not a v2 nicety.** Today: 2 hardcoded users, unsigned email cookie, `actor=null` in the audit ledger. Mock roles now; harden with Supabase Auth + per-tenant users. | Role-scoped *views* and decision-audit *record shapes* can be designed against mocked identities. | Before multi-stakeholder pods ship, before audit attribution is sold, before any external user signs in. *Dedicated tenancy simplifies this.* |
| **Security & compliance posture** | Mock the surfaces (connected-tool scopes, posture summary, tenancy badge, data-handling statement). | Buyer-trust surfaces can be shown before the controls are fully implemented. | Before contracts requiring SOC2/GDPR; before real client data is processed. |
| **Billing / metering** | Mock client-facing usage-vs-plan + budget alerts + statement over `economics.ts`. | Dedicated-per-client implies high-ACV enterprise deals; metering can follow the first hand-priced pilots. | Before usage-based pricing or self-serve plans; right after the ROI reveal in a real sales motion. |
| **Durable data / event store** | Event bus is in-memory; audit ledger is the one durable store (dashboard-owned Supabase). | The demo replays mock/seed data; durability matters only for real 24/7 capture. | When real pods must survive restarts and provide gap-free audit history. |
| **Mock→real binding** | BA is real (gateway adapter); SA/UI-UX/Dev/QA/DevOps are mocked. Per-agent adapters route by `system.kind`. | The vision is demoable entirely on mock + BA-real; downstream agents bind incrementally. | As each catalog agent ships; the adapter pattern (`adapterFor()` in `fleet.functions.ts`) is the extension seam. |
| **Knowledge ingestion control** | Mock connect/scope/redact for knowledge sources; surface ingestion errors as incidents. | Today it's read-only freshness telemetry; client-operated curation is a buyer concern, not a demo blocker. | When a client connects their own Drive/email and asks "what does it know, and can I remove this?" |
| **Accessibility & i18n** | **Named in the register.** WCAG-oriented contrast/keyboard/SR on client-facing surfaces (reports, gates, wizard); i18n (dates, currency, locale) flagged. | The neon operator aesthetic can ship for internal views; client surfaces need a pass before GA. | Before GA to client orgs, especially across regions or with exec/sponsor users. |
| **Control-plane data model** | The screens appendix's net-new mock files are an implicit data model (Pod, Connection, SLA, Incident, Notification, Role…), documented as **`docs/control-plane-data-model.md`** — the appendix mock shapes are **draft v0 of that model** (per entity: durable vs. derived, and its home). | The mock binds to the draft-v0 shapes directly; naming the model costs a doc, not a build. | Before the first durable control-plane store beyond the audit ledger (v2 control-plane Postgres). |
| **Contract v0.6 control surface** | In-app gate resolve (with CAS/idempotency — the "resolved elsewhere" state requires it), pause/resume control ops, config push, artifact content read. Today's contract (v0.5) is read-only GETs; in-app approval is mocked against local stores. | The demo approves against mock stores; deep-link to the agent's own tool remains the live fallback until the write ops land. | First real in-app approval (pilot). |
| **Pod provisioning / config API** | The wizard writes a `PodAgentConfig`; a **Q-operated applier** pushes it to the agents; **launch records intent** — config application is the provisioning event, stated honestly in the Launch overlay. | LAUNCH demos configuration *capture*, not application; the agent's own backend keeps owning its config until the applier exists. | First pilot provisioning. |
| **Connector ownership split** | Today connectors are **agent-owned `SourceBinding`s — read-only federation** (declared on the agent card); later they become **vault-backed pod `Connection`s** the control plane owns. Connect tiles are badged accordingly. | The Connect-tile experience is identical either way; only ownership and credential custody differ behind it. | Before any pod-owned credential is stored (pairs with the vault row above). |
| **Regulatory mapping (EU AI Act)** | The `/compliance` "AI Act deployer readiness" panel maps controls→articles (matrix = Art 26(2) oversight, ledger = 26(6) logs, incidents = 26(5), gate reasons = oversight evidence) and exports a deployer evidence pack. This row is the line between **claims we mock now** and **certification work later**. | The screens *are* the evidence surfaces, re-labeled; the mapping is honest about being designed, not certified. | Before selling compliance claims to an EU deployer — Article 26 applies **2026-08-02**. |
| **Model-plane residency & subprocessor terms** | "Models & subprocessors" panel in Settings (per agent: provider, pinned model, processing region, retention terms) with Live/Roadmap honesty ("EU-region inference: Roadmap"); one line in the tenancy popover. | The surfaces are mocked now so the EU-West badge is substantiated by an inspectable claim; real provider terms are a procurement artifact, not a build. | Before the first EU client DPA. |
| **Human-capacity & coverage runtime** | The *model and surfaces* ship now (§5): `workingHours`/OOO/delegate/`capacityGatesPerDay` on `Human`, coverage timeline strip, intake throttle policy, coverage-hours SLA clocks, audited reassignment acceptance. The *runtime mechanism* — calendar sync, live intake throttling, delegate failover — is deferred. | Capacity surfaces and policy shapes demo fully on mock data; enforcement needs the control ops (v0.6) and real identity. | Before the first 24/7 pilot runs overnight against real SLA clocks — calendar-blind clocks would paint fake breach walls on the sponsor-facing SLA screen. |
| **Platform availability & DR** | Stated uptime target + ledger RPO; **degraded mode designed now**: agents continue working when the dashboard is down, gates remain answerable in Slack, the ledger backfills on reconnect — with an App Shell degraded-mode banner, **gap-marker rows** in Compliance ("sync gap 02:10–02:34" — the when-only honesty pattern), and a per-tenant `/status` page (component health, 90-day uptime) doubling as a procurement artifact. | The banner, gap markers, and status page are mockable surfaces; real SLOs and DR need real infra. | Before a platform SLA enters a contract — and before the ledger is sold as gap-free. |
| **Tracker trigger & write-back mechanics** | Principle ratified (§2 tracker boundary): the board drag is the ONLY start signal; per-pod **trigger rule** + **start policy** (confirm-first / auto-start — a confirmation step, never a second start button), chain activation Agency-OS-only, per-pod **status mapping** write-back, echo-loop tagging, drag-back = park + notify. The demo ships both policies on `/intake` (confirm-first default; auto-start with the simulated drag). | The boundary is a design decision provable on mock surfaces; the webhook listener + mapping UI need real connectors. | With build step 3 (connector vault + real OAuth) — before the first auto-start pod goes live. |
| **AgentOps depth (MLOps/LLMOps question)** | **Internal-first, productize only the proof surfaces** (owner call, 2026-06-11). We do NOT sell MLOps/LLMOps (wrong buyer, commoditizing market — naming those words invites a LangSmith benchmark and kills the wedge). We MUST solve **AgentOps** to operate the fleet: agent **version registry + rollout/rollback**, **eval suites per role** before any version ships (the BA's 8 validators + e2e scenarios are the embryo — generalize the pattern), **run tracing**, **cost/latency routing** (local vLLM vs API — the local-AI story depends on it), **guardrails**, **drift monitors → incidents**. Client-facing = proof, not tooling: autonomy-ladder promotion evidence IS eval data; model-plane disclosure IS AgentOps made visible. First product-surface candidate parked to P2: **"Agent quality & versions"** panel (per-agent version, eval pass rate, last promotion, rollback — Q-side/ADVANCED, not client nav). | The fleet runs on it regardless; only the *productization* is deferred. The proof surfaces (/governance, /status, model plane, economics) already ship. | **Phase 2 graduation:** when third-party/generic agents arrive, AgentOps becomes the sellable layer — catalog entry = passing the eval harness (conformance reborn as evals). Revisit at the first external-agent candidate. |
| **Generic agents & agentic systems (phase 2)** | **SDLC first, deliberately** (product-owner call, 2026-06-10): the SDLC agentic system has the biggest reach for Q and the biggest client value — clients still need delivery done by our teams, now as agent–human pods with ultra-observability/governance. The harness (contract, gates, ledger, accountability, autonomy ladder) is designed to be agent-generic; opening it to non-SDLC agents and third-party agentic systems is phase 2. | Nothing in the harness is SDLC-specific by construction (envelope+facet, GenericFacet exists); phase 1 proves the operating model where we have distribution. | When phase-1 pods are live with paying clients and a non-SDLC agent candidate (internal or client-driven) has a concrete pod to join. |
| **Adversarial-input threat model** | The pod ingests untrusted third-party text by design (customer tickets, Slack, Drive) and holds write scopes. Mock now: an **input-provenance chip** on spec review ("Sources: 1 customer-submitted ticket · 2 internal docs — external content treated as untrusted") + a `suspicious-input` incident kind (one seed); validators + gates + provenance framed as the layered injection defense. SDK-side filters/canaries and per-connector write allowlists deferred. | Provenance cues and incident surfaces demo the posture; the real filters live SDK-side, not in the dashboard. | Before a pod holds write scopes on a real client tool. |
| **Work language & validator i18n** | `language` on blueprints/pod drafts with a LAUNCH select ("Working language — specs, reports, and gates are produced in this language"). Stance: **EARS keywords stay English as a structural convention, with localized body text** — defensible and demo-sayable; validator locale packs are the deferred alternative. | The language select and copy mock now; the 8 zero-LLM validators parse English EARS keywords today, so the stance must be stated, not implied. | Before the first non-English pilot. |

---

## 9. Risks, Tensions Resolved, and Open Questions

**Tensions resolved (decisions taken):**

- **Operator cockpit vs. client product.** *Resolved:* build the LAUNCH front door; reframe MONITOR for client legibility; demote platform-engineer views to an Advanced drawer. The three pillars become the IA.
- **"Not a runtime" vs. "the PM adds an agent."** *Resolved:* flip to **managed dedicated runtime** for the product SKU; keep envelope+facet internal. Register runtime as architecture-blocking with a prepared roadmap line.
- **Curated catalog vs. BYO pluggability.** *Resolved:* keep the contract as internal discipline (and a swappable-by-contract badge to defuse lock-in); **drop third-party BYO/TCK from the product story.** Saves scope.
- **Mock-first vs. trust-critical surfaces.** *Resolved:* mock security/billing/retention/human-decision-audit for the demo, but **name every one in §8** — they are buyer-trust and contractual concerns, not droppable.
- **Defer-the-runtime vs. failure UX.** *Resolved:* incidents/recovery and notifications are designed at the experience layer **now**, even with the runtime deferred — a 24/7 product is undemoable without an answer to "an agent failed."
- **Deep-link HITL vs. client-grade product.** *Resolved:* the top gates (spec approval) get a **client-grade review surface inside Agency OS**; deep-link to internal tooling is fallback only.
- **Drag-to-dispatch vs. "not a runtime."** *Resolved:* **drag-to-dispatch is cut.** The dashboard is not an orchestrator — pipeline cards advance only via real agent runs. *(Superseded 2026-06-11: ALL drag removed per §2 "no freeform stage moves" — approve lives on `/approvals`, reject via the typed-reason dialog.)*
- **"Cover everything" vs. a sharp demo.** *Resolved:* the spine of the mock is **one pod, the 7-node BA→SA→UI/UX→Tasklist→Dev→Review→QA wired chain (five taps + two one-click auto-fixes), launch + run + monitor**, a catalog of seven with two fleshed out; everything else is *on the map, not in the mock*.
- **Audit `actor=null` vs. multi-actor product.** *Resolved:* identity is product-blocking (moved out of "v2 nicety"); design the attributed-decision record now, honestly show "when-only" until auth lands.
- **RUN landing naming: Command Center vs. Overview.** *Resolved (owner, 2026-06-12):* renamed to **Overview** (the route title already said it; plainer for the PM persona). To keep the rail unambiguous, the MONITOR economics label became **"ROI & Economics"** in the same pass. The Overview also gained the doorbell KPI ("In Ready · awaiting you" → `/intake`) replacing the off-persona GPU tile.
- **Pillar naming: FIRE UP vs. DEPLOY vs. LAUNCH.** *Resolved (owner, 2026-06-12):* the first pillar is **LAUNCH** (renamed from FIRE UP — plainer English, and the wizard already used the verb: "Launch a pod", the Launch gate). **DEPLOY was considered and rejected**: it collides with two existing meanings (the DevOps agent deploying releases inside the pipeline, and tenant stand-up — the real infra deployment, deliberately kept distinct from fast in-tenant pod launch), and it signals engineer vocabulary where the persona story is "a PM launches a pod without an engineer." The reasoning is stated in the pitch (Act I intro) in plain terms. The pillar arc is now **LAUNCH / RUN / MONITOR** everywhere; the only sanctioned legacy token is the internal component directory `src/components/fireup/` (a path, not copy).

**Open questions (to answer during mock + first pilot):**
- Pricing/packaging for dedicated-per-client — **v0 hypothesis now stated in §9.5** (tenant platform fee + per-active-pod fee + outcome component in the ROI unit); the open question narrows to validating the levels and the outcome share in the first pilots.
- Time-to-first-value target: what is the credible "live in N minutes" promise for pod launch?
- How much of SA (and which downstream agent) must be real for the pilot, vs. mocked, to be credible?
- *(Competitive teardown — promoted from open question to a committed build-order deliverable, §7.)*
- **Change management & coexistence** with the client's existing delivery org: who negotiates the scope-of-work slice, how dual-track runs without turf war, and the scripted answer to *"what happens to our BA?"* — *nothing is taken away: the pod works the slice you give it, your BA reviews and ratifies its specs, and the hours freed are redeployed to the backlog you couldn't staff.*

**Top residual risk:** the demo opening (LAUNCH) is the unbuilt part, so build order item #2 is non-negotiable. The moat is *control*, but agent demos instinctively show *autonomy* — leading with control/ROI must be deliberately staged in every demo.

---

## 9.5 Pricing Hypothesis (v0) & Product Metrics

> **Parked from the buy-in brief (2026-06-10):** the Economics & pricing section was deliberately pulled from `/pitch` into the backlog — pricing is not part of the management ask until pilot data exists to price against. The hypothesis below is retained here as the working draft.

**Pricing hypothesis (v0).** A working hypothesis to be validated against the first pilots — *not* a rate card, and it replaces the accidental mock-copy price ("delivery units" are killed everywhere). Three components, all metered by surfaces the product already has:

- **Tenant platform fee** — **$3–5k/mo** *(hypothesis)* for the dedicated tenant: isolated infra/DB, the ledger, compliance surfaces.
- **Per-active-pod fee** — **$2–4k/mo** *(hypothesis)* per running pod.
- **Outcome component** — priced **in the same unit the ROI screen measures**: per **approved artifact** now, per **merged ticket** as agents ship; defensible at **10–25% of demonstrated savings** *(hypothesis)*. The audit ledger is the meter — every line item links to a gate a human cleared.
- **Pilot** — fixed-fee, credited to year one on conversion.

The billing surface's pricing-simulator card models exactly these three components against the current month's actuals.

**Product metrics.**

- **North star: approved artifacts per pod-week.**
- **Activation: time-to-first-approved-artifact (TTFAA) < 24h** — surfaced as a timer chip on the post-launch ribbon.
- Supporting: gate-clearance latency, pods per client, pilot→annual conversion.

---

## 10. Naming & Positioning Options

**Working name:** *Agency OS* — fine internally, generic in a crowded "agent OS / AI platform" market.

**Positioning anchor (recommended one-liner):**
> **Mission control for governed agent–human software delivery — launch a pod, run it, prove it.**

**Name candidates (test 1–2, don't over-invest):**
- **Agency OS** — incumbent; pairs with "mission control."
- **PodOps / Pod Control** — leans into the pod-as-unit-of-value and the operator persona.
- **Provenance** / **Ledger** — leans into the audit/accountability/provable moat.
- **Q Delivery Cloud** — leans into the dedicated-per-client, Q-curated framing.

**Pushbacks to pre-empt in every pitch:** *Trust* → surface zero-LLM validators. *Control* → pause/kill-pod affordance. *Data* → tenancy/residency badge. *Lock-in* → contract-version + conformance badge (swappable by contract). *Cost* → budget cap + projected run-rate. *Runtime* → managed-dedicated-runtime roadmap line, one sentence from the main flow. *Exit* → the **offboarding pack** (artifacts + constitution + complete ledger + decommission attestation): "here's what you keep if you fire us" — the anti-lock-in close.

*Lead with control and ROI, not autonomy.*

---

*Provenance: synthesized 2026-06-09 from a multi-agent vision pass (ground-truth map of both repos → 12 product dimensions → completeness / skeptic / buyer-demo critiques → synthesis). Companion to [`architecture.md`](./architecture.md) (internal-tool decisions) and [`agent-sdk-brief.md`](./agent-sdk-brief.md). This document records the **product** north-star; where it diverges from architecture.md's "internal, not productized" stance, this is the forward direction for the product SKU.*
