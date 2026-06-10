# Agency OS — North-Star Vision

> **Mission control for governed agent–human software delivery.**
> Fire up a pod. Run it. Prove it.

*Status: North-Star Vision (experience-first, mock-first). This is the authoritative artifact a designer mocks from and an exec pitches from. Under-the-hood runtime decisions are deliberately deferred and named in §8, not silently dropped.*

---

## 1. Executive Summary — The Pitch

**What it is.** Agency OS is the operating system for **agent–human SDLC pods**: a curated team of AI agents (Business Analyst, Software Architect, UI/UX Designer, Developer, QA, DevOps/Release, Knowledge) paired with accountable people, delivering software through a **governed, gated, auditable pipeline**. A client-side Project Manager signs in, picks agents from a curated catalog, connects their tools (Jira, Drive, Email, Slack, GitHub, Teamwork), assigns accountable humans, wires Slack — and launches a working delivery pod in minutes.

**Who it's for.** The buyer and primary operator is a **client-side PM / delivery lead** at an organization that wants Q's SDLC agents working their backlog. Secondary stakeholders — an **engineering lead**, a **QA lead**, and a **client sponsor / exec** — consume the same pod through role-scoped surfaces. None of them are platform engineers; the product must be operable by a non-engineer 24/7.

**The wedge.** The 2026 field sells one of three things — and we are deliberately the third:

| Who | What they sell | The limit |
|---|---|---|
| **Suite teammates** — GitHub Agent HQ, Atlassian Rovo, ServiceNow AI Control Tower | Agents governed *inside one vendor's suite* | Governance stops at the suite boundary; built for that suite's users |
| **Autonomous coders** — Devin, Cursor agents | Trust-the-AI output, engineer-operated | Accountability is diffuse; a non-engineer cannot run or prove it |
| **Agency OS** | A **cross-tool agent–human pod**: one accountable human per agent, unified human-in-the-loop gates, a **deterministic (zero-LLM) spec-quality moat**, an audit ledger that survives a reset, and **provable per-delivery-unit economics** — **operable by a non-engineer** | — |

**Counter-position:** the suites chart their own agents; we govern the pod *across all of their tools* and keep the evidence — **the system of record for AI delivery governance**.

**The moat's second act — earned autonomy.** The zero-LLM validators are not only a quality gate; they are the **precondition machine for safe delegation**. Agents climb an autonomy ladder — **L0 review-all → L1 batch → L2 sample 1-in-5 → L3 auto-clear low-risk** — where promotion criteria are *deterministic validator streaks* ("BA eligible for L2: 47 consecutive 8/8 specs, 4% rejection"), proposed by the system, **granted by the accountable human, and written to the ledger**. Competitors' autonomy preconditions are vibes; ours are checked in code. Autonomy you can audit your way into.

**One-line positioning.** *Not an autonomous coder you must trust — a governed agent–human pipeline you can prove.*

**The regulatory tailwind.** For EU buyers the product is an almost literal **AI Act Article 26 deployer implementation**: the accountability matrix is assigned human oversight, the append-only ledger is log retention, incident reporting is built in — the gate decisions-with-reasons are oversight *evidence*, not paperwork bolted on later.

**The wow moment.** Not the DAG lighting up. The **ROI reveal**: on the MONITOR landing, a hero tile shows **human-hours freed**, **cost-per-merged-ticket**, and **cost-per-story-point** — the number the CFO asks for, staged honestly: the live tier is **cost-per-approved-spec + time-to-approved-spec** (badged Live); cost-per-merged lights up *as agents ship*. The defensible claim is not the chart — suite-native control planes chart agent spend too — it is **per-delivery-unit economics attributable to a named accountable human**. Generic platforms show autonomy; we answer *"what did this cost vs. a human team, and who's accountable for it?"* The second beat is the **accountability matrix** (one accountable human per agent; an empty column = uncovered risk) — the answer to the top enterprise objection: *who is responsible when it's wrong?*

**The 3-minute demo arc.**
- **0:00 FIRE UP** — From the Q catalog, pick BA + SA + UI/UX + Dev + QA — **five taps plus two one-click auto-fixes** (adding Dev inline-suggests **+ Add Tasklist**, adding QA suggests **+ Add Review**), completing a continuous 7-node wired chain with no gaps. Drag in accountable people across the agents (one human can cover several — the readiness check flags the loading), connect **Teamwork/Slack/GitHub** as Connect tiles — the presenter points at Jira's **Roadmap** badge as the honesty beat (Live-vs-Roadmap, never misled post-sale) — click **Launch pod**; the summary reads **7 agents · 4 accountable humans**. (The 30 seconds that does not exist yet — the highest-leverage thing to mock.)
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
| **Software Architect (SA)** | `spec` → `design` | Human-operated · SA agent next | Planned (SDK-ready) |
| **UI/UX Designer** | `design` → `uix-ui-spec` (UIX-UI-SPEC.md — Figma + visual specs) | Human-operated · agent roadmap | Planned |
| *Tasklist* (pipeline intermediate) | `uix-ui-spec` → `tasks` | Human-operated · agent roadmap | Planned |
| **Developer** | `tasks` → `code` | Human-operated · agent roadmap | Planned |
| *Review* (pipeline intermediate) | `code` → `review` | Human-operated · agent roadmap | Planned |
| **QA** | `code` + `review` → `test` | Human-operated · agent roadmap | Planned |
| **DevOps/Release** | `test` → `release` (DORA metrics) | Human-operated · agent roadmap | Planned |
| **Knowledge** | pod-wide peer (= the `curator`; `GenericFacet`) — curates project memory, runs pod-wide, not in the pipeline rail | Pod-wide · agent roadmap | Planned |

The catalog markets the **seven curated roles**; *Tasklist* and *Review* are pipeline intermediates rendered as spine sub-steps in the pipeline preview (still togglable cards), so the full wired chain is `spec → design → uix-ui-spec → tasks → code → review → test → release`, with Knowledge alongside it pod-wide.

For the mock, **BA and one downstream (SA) are fleshed out**; the rest appear in the catalog as installable cards with capability/cost/latency and a **contract-version + conformance badge**. This badge does double duty: it answers the lock-in objection — *curated for quality, swappable by contract* — without promising third-party BYO.

**Dedicated per client.** Each customer gets **isolated infra/DB** (not shared multi-tenant). This is a premium enterprise differentiator that is today **invisible in the UI**. We make it visible: a **tenancy/residency badge** in the TopBar and a data-handling statement in FIRE UP. The architecture split that resolves the "fire up in minutes" tension: **tenant stand-up is a one-time Q-operated provisioning event** (slow, deferred behind the mock); **pod fire-up is fast in-tenant configuration** (the thing we demo). The mock only shows the latter.

**Coexistence (brownfield by default).** Every 2026 sale lands inside an existing delivery org. The pod owns a **slice** of the backlog — scope rules picked at FIRE UP (project/label/component filter); everything else stays with the client's team, untouched. Status **write-back maps pod stages onto the client's existing workflow statuses**, so the pod's work shows up inside their Jira/Teamwork, not beside it. **Dual-track operation with the client's human BA is the expected mode**, not a transition failure — and the framing is always *freed/redeployed*, never *displaced*: the economics surfaces count hours given back to the client's team.

**The FIRE UP / RUN / MONITOR spine.** The three pillars *are* the information architecture, not three more tabs. Today's build is roughly **80% MONITOR, 15% RUN, 5% FIRE UP** — inverted versus the pitch, which *starts* the buyer at FIRE UP. The vision rebalances by **building the FIRE UP front door** and **reframing** the deep MONITOR telemetry behind a client-legible surface, demoting platform-engineer views into an Advanced drawer.

---

## 3. Personas & Jobs-to-be-Done

| Persona | Default landing | Jobs-to-be-done |
|---|---|---|
| **Pod Admin / PM** (buyer, primary operator) | Command Center | *"Fire up a pod, keep it running, clear gates, prove ROI to my sponsor."* Sets up the pod, answers clarifications, approves artifacts, handles incidents, exports the weekly client report. |
| **Engineering Lead** | Pipeline / Traceability | *"Is the work technically sound and flowing?"* Reviews design/code facets, spec→design→code lineage, unblocks technical gates. |
| **QA Lead** | Gates + QA facet | *"What needs my sign-off and what's the quality posture?"* Scoped gate queue, governance/structural validators, defect/coverage facets. |
| **Client Sponsor / Exec** (read-only) | Rolled-up status digest | *"What did my money buy this week?"* Shareable status report, ROI, SLA target-vs-actual. No operator dials. |
| **Viewer** (read-only) | Status digest | Observe without acting. |

RBAC is **mocked now, hardened in v2** (see §8). But the *role-scoped views* are designed now — because nearly every client surface (report scope, gate attribution, security visibility, notification routing) is meaningless without an identity/role model. We mock roles to make those experiences coherent; we defer the IdP.

---

## 4. The Product in Three Acts

Each act is a set of concrete, mockable screens. **[REUSE]** = extends an existing route/dataset; **[NEW]** = a surface to design from scratch; **[REFRAME]** = existing surface, client-legible framing.

### ACT I — FIRE UP (set up a pod)

The front door, and the single most load-bearing missing surface. Today `/connections` (`src/routes/connections.tsx`) is a developer probe form (paste an agent URL + optional API key into a throwaway cookie via `connections.functions.ts: probeAgentFn`) and `/pod` (`src/components/pod/PodView.tsx`) is a read-only matrix. Neither is a setup experience.

**Screen 1 — Pod Blueprints (the 60-second start).** **[NEW]** A blueprint picker: *Web App Delivery Pod*, *Mobile Pod*, *Maintenance Pod*. Each pre-selects agents, suggested connectors, default SLAs, and recommended accountable roles. Choosing one pre-fills the whole wizard; "Start from scratch" is the escape hatch. This turns "assemble agent-by-agent" into "pick and adjust."

**Screen 2 — Agent Catalog.** **[NEW, reuses `src/mock/agents.ts`]** Card grid of the seven curated agents — icon, role, what it produces/consumes, indicative cost/latency, and a **contract-version + conformance badge**. Add/remove toggles. The auto-wiring is shown: as you add agents, the produces↔consumes edges connect them into a pipeline preview (reuse the topology model behind `/orchestration`).

**Screen 3 — Connect Tools.** **[NEW, reframes `/connections`]** OAuth-style **Connect tiles** per tool (Jira, Google Drive, Email, Slack, GitHub, Teamwork), each with a mocked health/reachability check (extend `probeAgentFn`) and **shown permission scopes at connect-time**. Tiles are honestly badged **Live vs. Roadmap** (Teamwork/Slack/GitHub are real today; Jira/Drive/Email are roadmap) so a buyer is never misled post-sale. The connection-direction model in `src/mock/comms.ts` supplies the inbound/outbound semantics.

**Screen 4 — Accountable People.** **[NEW, reuses `src/mock/humans.ts` + PodView matrix]** Assign one accountable human per agent by drag-and-drop into the accountability matrix. **An empty column is flagged as uncovered risk** right here at setup — the accountability promise begins before the pod even runs. Invite-by-email flow for people not yet in the org (mocked invite + one-time link).

**Screen 5 — Wire Slack.** **[NEW]** Map pod events → Slack channels (clarification gates, approvals, escalations, daily brief). Pick the approver channel; this is real BA behavior (`slack_approver_ids`, Slack MCP) surfaced as configuration.

**Screen 6 — Readiness Checklist & Go Live.** **[NEW]** A checklist (agents added ✓, every agent has an accountable human ✓, required tools connected ✓, Slack wired ✓) with a **Launch pod** gate. Launch lands on the Command Center. Empty-states and progress are designed so the wizard itself is demoable end-to-end.

### ACT II — RUN (operate it day-to-day)

**Command Center.** **[REUSE `src/routes/index.tsx`]** KPI strip, agent status grid (concurrent work + liveness-vs-activity split), human-gate queue, activity feed. **Promote the ROI number to a hero tile** here (not buried at nav item 8). Add a **Pause pod / Pause agent** control and a visible *paused/escalated* state — the control affordance a risk-evaluating buyer asks for.

**Pipeline Board.** **[REUSE `src/routes/pipeline.tsx`]** Kanban over the lifecycle (`backlog → in_progress → waiting → ready → approved → delivered`, plus `reset/blocked/error`). This is where work visibly flows during the demo.

**Approvals & Clarifications (unified gates).** **[REUSE `src/routes/approvals.tsx`]** One queue, two kinds (clarification + approval). The key upgrade: the **top 1–2 gates (spec approval) get a client-grade review surface inside Agency OS** — render the SPEC.md, the EARS criteria, the structural validator results, with Approve/Reject — a typed reason is **required on reject and override**; clean approvals offer **optional structured quick-reason chips** (no mandatory prose, so the ledger never fills with "Looks good" ×40). Deep-link to the agent's own tool (BA's flow-observer) only as a fallback. A paying client PM should not be dropped into internal tooling to do their core job.

**Comms & Escalations.** **[REUSE `src/routes/comms.tsx` + `src/mock/comms.ts`]** Agent-initiated Slack/Teamwork posts, escalations with severity/routedTo/SLA. Surfaces the *paused/escalated* state from the Command Center.

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
- **Code-side integration** — the Dev agent works in the client's repo under a **bot git identity** (signed commits, `Co-authored-by:` the accountable human); every PR carries the **PR contract** (spec link + gate id + validator summary in the description); and the **gate↔PR mirroring rule**: the code-review gate *is* the GitHub PR review — the webhook resolves the gate, the dashboard shows status and deep-links out — the deliberate inverse of the spec gate, justified per persona (engineers review code in GitHub; PMs review specs in Agency OS). *(Mock: `src/mock/code-integration.ts` with two seeded PRs + a FIRE UP readiness check "Bot collaborator invited · branch-protection compatible".)*
- **Economics & Billing** — ROI hero (human-hours freed, cost-per-merged, cost-per-story-point — live tier badged per §1); run-rate + budget cap; client-facing usage-vs-plan summary + budget alerts + monthly statement. *(Reframe `/economics`; new billing view.)*
- **Compliance & Audit** — append-only ledger surviving reset; human-decision attribution; data export/retention surface. *(Reuse `/compliance`; new export/retention.)*
- **DevOps** — DevOps/Release agent as a pipeline stage with DORA metrics (plan→approve→apply, strongest gates); platform LLMOps (version pinning, eval gates) **named, deferred** (§8).

---

## 6. Information Architecture & Navigation

Today: 16 flat left-rail items — *a tour, not a product*, reading as an internal engineering tool. The vision makes **the three pillars the navigation spine**, scoped per pod, inside a **multi-pod shell**.

```
TopBar:  [Pod switcher ▼]   [Tenancy: Dedicated · EU-West · isolated DB 🛡]   [⌘K search]   [🔔 notifications]   [user/role]

Left rail (pillar-grouped):
  ── FIRE UP
       New Pod (wizard)              [NEW]
       Catalog                        [NEW]
       Connections                    [REFRAME /connections]
       People & Roles                 [REFRAME /pod + new roles]
  ── RUN
       Command Center                 [/index]
       Pipeline                       [/pipeline]
       Gates (Approvals + Clarif.)    [/approvals]
       Comms & Escalations            [/comms]
       Incidents & Recovery           [NEW]
  ── MONITOR
       Overview / ROI                 [REFRAME /economics hero]
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

Ordered to make the demo arc demoable earliest, highest-leverage first. **Status (2026-06-10): items #1–#12 are SHIPPED in the mock** (commits `f76ee4a` — pillar IA, multi-pod shell, New-Pod wizard at `/pods/new?step=…`; `69014e0` — gate review at `/approvals/$gateId`, incidents, notifications, reports, billing, intake); **#13 remains open**, plus the Wave 2 list below.

1. **IA reorg + multi-pod shell + pod switcher.** Regroup the existing 16 routes under FIRE UP / RUN / MONITOR / Advanced; add the pod-switcher TopBar and tenancy badge. Ship the route-to-pillar migration table. *(Reframes everything; unblocks the rest.)*
2. **FIRE UP wizard (the missing 30 seconds).** Blueprints → Catalog → Connect tiles → People matrix → Slack → Readiness → Launch. Reuse `agents.ts`, `humans.ts`, PodView, `comms.ts`; extend `probeAgentFn` for mocked health. *This is the top priority — it's the most-sold, least-built experience.*
3. **ROI hero on the MONITOR/Command Center landing.** Promote `economics.ts` numbers; add run-rate + budget cap. *(Cheapest path to the wow moment.)*
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

**Sales-engineering deliverable (alongside the mock):** the **competitive teardown one-pager** — suite teammates (GitHub Agent HQ, Atlassian Rovo, ServiceNow) vs. autonomous coders (Devin, Cursor) vs. Agency OS — promoted from §9's open questions to a committed build-order deliverable.

**Wave 2 (post-slice-2) — specced, not yet in the mock:** gate policies & autonomy UI · human capacity/coverage surfaces · `/welcome` (accountability handshake) · `/memory` (constitution & amendments; absorbs `/knowledge`) · Pod Copilot (TopBar + ⌘J) · `/pilot` · `/org` · `/share/$token` · `/artifacts` (deliverables library) · `/status` · Demo Director · role-scoped landings · responsive gates.

---

## 8. Deferred Under-the-Hood Decision Register

The mock-first mandate lets us defer the *how* — but nothing is dropped silently. Each parked decision, why it waits behind the mock, and when it must be answered.

| Decision | Parked stance | Why it can wait behind the mock | Must be answered when… |
|---|---|---|---|
| **Runtime / who runs the agents** | Flip the architecture stance for the product SKU: **managed dedicated runtime**, not "federate self-hosted." Keep envelope+facet as the internal interface. | The experience is identical whether Q hosts or federates; the mock shows configuration, not hosting. | Before first paying pilot runs real downstream agents (SA/Dev/QA) in production. *(Architecture-blocking — prepare a managed-dedicated-runtime roadmap line for the demo.)* |
| **Per-client provisioning & isolation** | **Tenant stand-up = one-time Q-operated** event; **pod fire-up = fast in-tenant config** (the only thing mocked). Dedicated DB/infra per client. | "Minutes to fire up" refers to pod config, not infra; provisioning is a sales/ops motion, invisible in the daily product. | Before self-serve sign-up, or before sales promises a same-day tenant. Provisioning automation is a named follow-on. |
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
| **Pod provisioning / config API** | The wizard writes a `PodAgentConfig`; a **Q-operated applier** pushes it to the agents; **launch records intent** — config application is the provisioning event, stated honestly in the Launch overlay. | FIRE UP demos configuration *capture*, not application; the agent's own backend keeps owning its config until the applier exists. | First pilot provisioning. |
| **Connector ownership split** | Today connectors are **agent-owned `SourceBinding`s — read-only federation** (declared on the agent card); later they become **vault-backed pod `Connection`s** the control plane owns. Connect tiles are badged accordingly. | The Connect-tile experience is identical either way; only ownership and credential custody differ behind it. | Before any pod-owned credential is stored (pairs with the vault row above). |
| **Regulatory mapping (EU AI Act)** | The `/compliance` "AI Act deployer readiness" panel maps controls→articles (matrix = Art 26(2) oversight, ledger = 26(6) logs, incidents = 26(5), gate reasons = oversight evidence) and exports a deployer evidence pack. This row is the line between **claims we mock now** and **certification work later**. | The screens *are* the evidence surfaces, re-labeled; the mapping is honest about being designed, not certified. | Before selling compliance claims to an EU deployer — Article 26 applies **2026-08-02**. |
| **Model-plane residency & subprocessor terms** | "Models & subprocessors" panel in Settings (per agent: provider, pinned model, processing region, retention terms) with Live/Roadmap honesty ("EU-region inference: Roadmap"); one line in the tenancy popover. | The surfaces are mocked now so the EU-West badge is substantiated by an inspectable claim; real provider terms are a procurement artifact, not a build. | Before the first EU client DPA. |
| **Human-capacity & coverage runtime** | The *model and surfaces* ship now (§5): `workingHours`/OOO/delegate/`capacityGatesPerDay` on `Human`, coverage timeline strip, intake throttle policy, coverage-hours SLA clocks, audited reassignment acceptance. The *runtime mechanism* — calendar sync, live intake throttling, delegate failover — is deferred. | Capacity surfaces and policy shapes demo fully on mock data; enforcement needs the control ops (v0.6) and real identity. | Before the first 24/7 pilot runs overnight against real SLA clocks — calendar-blind clocks would paint fake breach walls on the sponsor-facing SLA screen. |
| **Platform availability & DR** | Stated uptime target + ledger RPO; **degraded mode designed now**: agents continue working when the dashboard is down, gates remain answerable in Slack, the ledger backfills on reconnect — with an App Shell degraded-mode banner, **gap-marker rows** in Compliance ("sync gap 02:10–02:34" — the when-only honesty pattern), and a per-tenant `/status` page (component health, 90-day uptime) doubling as a procurement artifact. | The banner, gap markers, and status page are mockable surfaces; real SLOs and DR need real infra. | Before a platform SLA enters a contract — and before the ledger is sold as gap-free. |
| **Adversarial-input threat model** | The pod ingests untrusted third-party text by design (customer tickets, Slack, Drive) and holds write scopes. Mock now: an **input-provenance chip** on spec review ("Sources: 1 customer-submitted ticket · 2 internal docs — external content treated as untrusted") + a `suspicious-input` incident kind (one seed); validators + gates + provenance framed as the layered injection defense. SDK-side filters/canaries and per-connector write allowlists deferred. | Provenance cues and incident surfaces demo the posture; the real filters live SDK-side, not in the dashboard. | Before a pod holds write scopes on a real client tool. |
| **Work language & validator i18n** | `language` on blueprints/pod drafts with a FIRE UP select ("Working language — specs, reports, and gates are produced in this language"). Stance: **EARS keywords stay English as a structural convention, with localized body text** — defensible and demo-sayable; validator locale packs are the deferred alternative. | The language select and copy mock now; the 8 zero-LLM validators parse English EARS keywords today, so the stance must be stated, not implied. | Before the first non-English pilot. |

---

## 9. Risks, Tensions Resolved, and Open Questions

**Tensions resolved (decisions taken):**

- **Operator cockpit vs. client product.** *Resolved:* build the FIRE UP front door; reframe MONITOR for client legibility; demote platform-engineer views to an Advanced drawer. The three pillars become the IA.
- **"Not a runtime" vs. "the PM adds an agent."** *Resolved:* flip to **managed dedicated runtime** for the product SKU; keep envelope+facet internal. Register runtime as architecture-blocking with a prepared roadmap line.
- **Curated catalog vs. BYO pluggability.** *Resolved:* keep the contract as internal discipline (and a swappable-by-contract badge to defuse lock-in); **drop third-party BYO/TCK from the product story.** Saves scope.
- **Mock-first vs. trust-critical surfaces.** *Resolved:* mock security/billing/retention/human-decision-audit for the demo, but **name every one in §8** — they are buyer-trust and contractual concerns, not droppable.
- **Defer-the-runtime vs. failure UX.** *Resolved:* incidents/recovery and notifications are designed at the experience layer **now**, even with the runtime deferred — a 24/7 product is undemoable without an answer to "an agent failed."
- **Deep-link HITL vs. client-grade product.** *Resolved:* the top gates (spec approval) get a **client-grade review surface inside Agency OS**; deep-link to internal tooling is fallback only.
- **Drag-to-dispatch vs. "not a runtime."** *Resolved:* **drag-to-dispatch is cut.** The dashboard is not an orchestrator — pipeline cards advance only via real agent runs; drag is allowed only into review columns.
- **"Cover everything" vs. a sharp demo.** *Resolved:* the spine of the mock is **one pod, the 7-node BA→SA→UI/UX→Tasklist→Dev→Review→QA wired chain (five taps + two one-click auto-fixes), fire-up + run + monitor**, a catalog of seven with two fleshed out; everything else is *on the map, not in the mock*.
- **Audit `actor=null` vs. multi-actor product.** *Resolved:* identity is product-blocking (moved out of "v2 nicety"); design the attributed-decision record now, honestly show "when-only" until auth lands.

**Open questions (to answer during mock + first pilot):**
- Pricing/packaging for dedicated-per-client — **v0 hypothesis now stated in §9.5** (tenant platform fee + per-active-pod fee + outcome component in the ROI unit); the open question narrows to validating the levels and the outcome share in the first pilots.
- Time-to-first-value target: what is the credible "live in N minutes" promise for pod fire-up?
- How much of SA (and which downstream agent) must be real for the pilot, vs. mocked, to be credible?
- *(Competitive teardown — promoted from open question to a committed build-order deliverable, §7.)*
- **Change management & coexistence** with the client's existing delivery org: who negotiates the scope-of-work slice, how dual-track runs without turf war, and the scripted answer to *"what happens to our BA?"* — *nothing is taken away: the pod works the slice you give it, your BA reviews and ratifies its specs, and the hours freed are redeployed to the backlog you couldn't staff.*

**Top residual risk:** the demo opening (FIRE UP) is the unbuilt part, so build order item #2 is non-negotiable. The moat is *control*, but agent demos instinctively show *autonomy* — leading with control/ROI must be deliberately staged in every demo.

---

## 9.5 Pricing Hypothesis (v0) & Product Metrics

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
> **Mission control for governed agent–human software delivery — fire up a pod, run it, prove it.**

**Name candidates (test 1–2, don't over-invest):**
- **Agency OS** — incumbent; pairs with "mission control."
- **PodOps / Pod Control** — leans into the pod-as-unit-of-value and the operator persona.
- **Provenance** / **Ledger** — leans into the audit/accountability/provable moat.
- **Q Delivery Cloud** — leans into the dedicated-per-client, Q-curated framing.

**Pushbacks to pre-empt in every pitch:** *Trust* → surface zero-LLM validators. *Control* → pause/kill-pod affordance. *Data* → tenancy/residency badge. *Lock-in* → contract-version + conformance badge (swappable by contract). *Cost* → budget cap + projected run-rate. *Runtime* → managed-dedicated-runtime roadmap line, one sentence from the main flow. *Exit* → the **offboarding pack** (artifacts + constitution + complete ledger + decommission attestation): "here's what you keep if you fire us" — the anti-lock-in close.

*Lead with control and ROI, not autonomy.*

---

*Provenance: synthesized 2026-06-09 from a multi-agent vision pass (ground-truth map of both repos → 12 product dimensions → completeness / skeptic / buyer-demo critiques → synthesis). Companion to [`architecture.md`](./architecture.md) (internal-tool decisions) and [`agent-sdk-brief.md`](./agent-sdk-brief.md). This document records the **product** north-star; where it diverges from architecture.md's "internal, not productized" stance, this is the forward direction for the product SKU.*
