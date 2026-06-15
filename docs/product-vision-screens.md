# Agency OS — Mockable Screen Specs

> **Build-ready companion to [`product-vision.md`](./product-vision.md).** Every screen below is specced for direct mocking: layout, concrete shadcn/existing components, every state (empty/loading/populated/error), the exact `src/mock/*` data that drives it, interactions, and copy.

**How to read.** Tags on each screen: **NEW** (build from scratch) · **REFRAME** (existing surface, re-framed for the product) · **REUSE** (existing component, minor change). Screens are grouped by the LAUNCH / RUN / MONITOR pillars (the agreed nav spine in `product-vision.md` §6). The **build sequence** is in `product-vision.md` §7 — start with the IA reorg + app shell, then the LAUNCH wizard. The consolidated list of every **new mock dataset/shape** to add is in the appendix at the end.

> **Note on route naming — RESOLVED as-built:** the historical wizard-route fork (`/fire-up/*` vs `/new-pod/*` vs `/pods/new`) is settled. The canonical wizard route is **`/pods/new?step=blueprint|agents|connect|people|slack|golive`** (as-built: `src/routes/pods.new.tsx`; step bodies in `src/components/fireup/`). Every wizard reference below uses this form; the Coverage & consistency review's item #2 records the resolution.


---

## SHELL & NAVIGATION


### App Shell — `(wraps all routes)`  (REFRAME)
- **Purpose:** The productized chrome that frames every pillar surface: left rail + top bar + scrollable main, with pod scope and section assistant providers already in place.
- **Persona & entry:** Every signed-in persona lands inside this on every authenticated route. It is the first thing rendered after `/login`.
- **Layout:** Unchanged outer skeleton from `AppShell.tsx` — a full-height flex row: `<LeftRail/>` (fixed width, collapsible) on the left, then a `min-w-0` column containing `<TopBar/>` (h-14) over `<main class="flex-1 overflow-auto scrollbar-thin">`. Keep both providers (`LiveProvider`, `SectionAssistantProvider`) wrapping the tree.
- **Components:** REUSE `AppShell` shell, `LiveProvider`, `SectionAssistantProvider`, `AssistantTriggerButton`. The change is entirely inside `LeftRail` and `TopBar` (specced below). No new shell wrapper needed.
- **States:** *Loading* — SSR renders shell immediately; main shows the route's own skeleton. *Error* — route-level error boundary fills `main`; shell + nav stay interactive so the user can navigate away. *No-pod edge-case* — if the active pod is null (org with zero pods), `main` renders a global empty-state CTA ("Launch your first pod") and RUN/MONITOR rail groups render disabled (see LeftRail states). *Degraded mode (platform honesty — Blind spot 5)* — when the control plane can't reach the gateway/ledger, a full-width amber **degraded-mode banner** renders under the TopBar: **"Agency OS is degraded — your agents continue working; gates remain answerable in Slack; the ledger backfills on reconnect."** A "details →" link opens `/status`; any sync outage is later surfaced as a gap-marker row in Compliance — the when-only honesty pattern extended to the platform itself.
- **Mock data:** none new at this level; consumes `project`/`projects` (`src/mock/project.ts`) via children. Pod scope handled by `PodSwitcher` below.
- **Interactions:** `⌘B` toggles rail collapse (already wired in `sidebar.tsx`; mirror the shortcut into `LeftRail`). `⌘K` opens the command palette (new, specced below). Nothing else changes at the shell frame.
- **Copy:** frame itself n/a. Degraded-mode banner: "**Agency OS is degraded** — your agents continue working; gates remain answerable in Slack; the ledger backfills on reconnect. Details →" (links `/status`).
- **Demo note:** This is the persistent frame for the whole 3-min arc; the demo never leaves it.
- **As-built (wave 2) — the per-user experience gate:** the mock product and the live cockpit are separated **by login**, not by deploy. `dataMode: "standard"` (qai) renders the full mock product; `dataMode: "real"` (Zlatko) renders ONLY live-connected surfaces: the rail filters to `live: true` nav items (Overview, Agents, Economics, Governance, Compliance, Flow, Observability, Connections, Settings), every mock-fed TopBar chip (⌘K, system pill, overnight/day, ESC, digest, spend, bell, assistant, copilot) renders standard-only, and every mock-only route carries `mockOnlyBeforeLoad` (`src/lib/experience.ts`) redirecting real-mode to `/`. Wave-2 mutations land on a session audit overlay (`src/mock/audit-bridge.ts`, `appendAuditMock`/`useSessionAudit`) merged into the standard ComplianceView under a "this session" divider — so every demoable action visibly reaches the ledger UI.

---

### Left Rail (pillar-grouped nav) — `(global)`  (REFRAME)
- **Purpose:** Replace the flat 16-item `items[]` list in `LeftRail.tsx` with the four-pillar spine (LAUNCH / RUN / MONITOR / ADVANCED) + Settings, scoped to the active pod — the IA reorg that unblocks everything (build-order #1).
- **Persona & entry:** All personas; persistent on the left. Role gates which groups are emphasized (a Sponsor/Viewer sees MONITOR expanded, RUN/LAUNCH collapsed; see Interactions).
- **Layout:** Same `<aside>` as today (`w-56` expanded / `w-14` collapsed, `bg-panel/40 backdrop-blur-md`, brand header h-14, collapse button pinned at the bottom). Inside `<nav>`, render **grouped sections** instead of a flat map: a small uppercase group label (`text-[10px] tracking-wider text-muted-foreground px-2.5 pt-3 pb-1`) then that group's links. ADVANCED is a `Collapsible` (default collapsed) so platform views are demoted, not deleted. Keep the active-item neon left-bar (`absolute left-0 … bg-primary shadow`).
- **Components:** REUSE the existing `Link`/`useRouterState` active-detection pattern and per-item icon render. Build NEW: a `NavGroup` sub-component (label + children) and wrap ADVANCED in `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` (shadcn). Keep collapse toggle button. When `collapsed`, hide group labels and render items as icon-only with shadcn `Tooltip` showing the label (today there is no tooltip in collapsed mode — add it).
- **States:** *Populated* — full grouped tree (see Copy for the exact item→route map). *Collapsed* — icons only, group labels hidden, dividers (`Separator`) between groups, tooltips on hover. *Active* — neon left-bar + `bg-primary/15`. *Locked/no-pod edge-case* — when there is no active pod, LAUNCH shows only "New Pod" (enabled); RUN + MONITOR items render `aria-disabled`, muted, non-navigable, with tooltip "Launch a pod to enable." *Role-scoped* — items the active role cannot access are hidden (not greyed): e.g. Viewer sees no LAUNCH group. *Badge edge-case* — Gates and Incidents items show a count badge (shadcn `Badge`, neon for >0) sourced from open gates / open incidents.
- **Mock data:** Drive the structure from a NEW static config array `NAV: { pillar: "LAUNCH"|"RUN"|"MONITOR"|"ADVANCED"; items: { to; label; icon; minRole?: Role; badgeKey?: "gates"|"incidents" }[] }[]`. Badge counts come from existing mock (`approvals` open count; a NEW `incidents` dataset owned by that cluster — here just read its open count). Role from `AppUser` (extend with `role`, see Pod Switcher spec). *(As-built: the Gates badge derives from `openGateCount()` in `src/mock/approvals.ts` — both kinds, approvals + clarifications, minus session-resolved; the Incidents badge is a load-time snapshot, see `src/components/shell/nav.ts`.)*
- **Interactions:** Click → navigate (TanStack `Link`). Group labels are non-interactive except ADVANCED (click toggles the collapsible). Collapse button + `⌘B` toggle rail width and persist via the `sidebar_state` cookie pattern. Badge counts live-update via `useLive`.
- **Copy — the exact rail (route → pillar migration baked in):**
  - **LAUNCH** *(trimmed 2026-06-12, owner call — the wizard owns the launch ritual)* — `New Pod` → `/pods/new` (NEW). In the DEMO this is the pillar's only item: `Catalog` was dropped from the rail (redundant with the wizard's team step; the `/catalog` route stays for pitch deep-links), `Connections` is live-only (`NavItem.mockHidden` — pod creation handles tool-connecting in the demo), and `People & Roles` was deleted as a duplicate of MONITOR · Accountability (one home for `/pod`). Also same-day: toasts moved to top-right (bottom-right covered the wizard's footer CTA), and the LAUNCH footer gained the demo-only "Product brief" anchor (→ `/pitch`, new tab).
  - **RUN** — `Overview` → `/` · `Agents` → `/agents` *(PROMOTED from ADVANCED 2026-06-12 — the roster is the product's central object, not a technical deep-dive; the drill-in `/agents/$agentId` was REVAMPED the same day from telemetry-only into the PM-operable **agent profile**: an Operate band — switch the model from a 5-engine cross-vendor catalog incl. self-hosted in-tenant vLLM, scope its connector tools [required ones locked], reassign the accountable owner, move it on the autonomy ladder [downgrade free; upgrade only on a system proposal — L3 click without a streak politely refuses] — plus the "Quality & versions" AgentOps panel [eval bars per version, one-click rollback; ba/sa/qa versions = their validator-family versions]. Every knob writes policy.changed / human.reassigned / agent.rolled_back to the session ledger via `src/mock/agent-config.ts`; the langfuse-style telemetry+trace drawer kept below; mock view extracted to `src/components/agents/AgentProfile.tsx` so the real branch stays untouched)* · `Pipeline` → `/pipeline` · `Work Intake` → `/intake` · `Gates` → `/approvals` (badge: open gates) · `Comms & Escalations` → `/comms` (badge: unacked escalations) · `Incidents & Recovery` → `/incidents` (badge: open incidents).
  - **MONITOR** *(clustered by sub-theme 2026-06-12 so the 12 items stay scannable)* — **prove-ROI:** `ROI & Economics` → `/economics` (REFRAME hero) · `Usage & Billing` → `/billing` · `Pilot` → `/pilot` · `Portfolio` → `/org`. **govern:** `Governance` → `/governance` · `Memory & Rules` → `/memory`. **delivery-health:** `Accountability` → `/pod` (shared route with People & Roles; same matrix, MONITOR framing) · `SLA & Reports` → `/reports` · `Flow` → `/flow` *(demoted from ADVANCED — human-bottleneck analytics for a delivery lead, not SRE telemetry)*. **audit & output:** `Compliance & Audit` → `/compliance` · `Deliverables` → `/artifacts` · `Traceability` → `/traceability` *(from ADVANCED — the client-facing "end-to-end traceability" selling point)*.
  - **ADVANCED** (collapsed by default — a platform/SRE drawer) — `Agent Registry` → `/registry` *(NEW 2026-06-12 — the agent-agnostic surface: browse domain packs + register/govern ANY agent by its A2A Agent Card, not just SDLC; the documented phase-2 "generic agents" capability (§8) made demoable as a mock. Same-day addition: **configure-on-register** — a validated card opens a "configure before it joins" step [tools it may touch, seeded per domain; inference = agent-managed vs routed via the Q model plane; accountable owner; autonomy locked at L0 "earned, never granted at the door"], and registering writes `agent.registered` with the full config to the session ledger)* · `Observability` → `/observability` · `Orchestration` → `/orchestration` · `Platform status` → `/status`. *(Agents/Flow/Traceability were re-placed to RUN/MONITOR on 2026-06-12 — see above.)*
  - **Settings** → `/settings` (pinned below ADVANCED, above the collapse button).
  - Brand header keeps "Agency OS" + `v0.4.2`. ADVANCED trigger label: "ADVANCED · technical".
- **Demo note:** The reorganized rail is the visual proof that the product is LAUNCH → RUN → MONITOR, not a 16-tab engineering tour. The presenter reads top-to-bottom to narrate the arc before clicking anything.

> **Route-to-pillar migration note (placements current as of 2026-06-12):** `observability/orchestration/status` + `registry` (NEW — agent-agnostic registry) → ADVANCED (platform/SRE drawer). `index→Overview`, `agents` (+ `agents.$agentId` deep-dive), `pipeline`, `intake→Work Intake`, `approvals→Gates`, `comms`, `incidents` → RUN. `economics→ROI`, `billing`, `pilot`, `org→Portfolio`, `governance`, `memory`, `pod→Accountability`, `reports→SLA`, `flow`, `compliance`, `artifacts→Deliverables`, `traceability` → MONITOR. `connections` → LAUNCH (live-only; demo-hidden). `pod` is intentionally referenced from two framings (People & Roles at setup, Accountability in MONITOR) — same component, no route duplication. **Reorg 2026-06-12 (owner call):** `agents` moved ADVANCED→RUN (central object, daily check); `flow` + `traceability` moved ADVANCED→MONITOR (PM-facing — bottleneck analytics + the traceability selling point — not platform-engineer views).

---

### Top Bar — `(global)`  (REFRAME)
- **Purpose:** Carry the productized global controls per the agreed IA: **Pod switcher · Tenancy/residency badge · ⌘K search · notifications bell · user/role menu**, while preserving the existing operator telemetry chips (system health, day/overnight, escalations, digest, spend, clock, theme) as a secondary cluster.
- **Persona & entry:** All personas, every screen. The pod switcher and bell are the cross-cutting controls; the tenancy badge is the always-on enterprise-trust signal.
- **Layout:** Same `<header class="h-14 border-b … flex items-center px-4 gap-4">`. Left cluster: `<PodSwitcher/>` then the **tenancy badge** (NEW). Then `flex-1` spacer. Right cluster, in order: **⌘K search trigger** (NEW) · existing telemetry chips (SYSTEM health, DAY/OVERNIGHT, ESC, Next digest, Spend·24h) · `AssistantTriggerButton` · theme toggle · UTC clock · separator · **notification bell** (NEW, replaces nothing — added) · **user/role menu** (REFRAME of the current name+logout block into a `DropdownMenu`).
- **Components:** REUSE the telemetry chips, `useLive`, `useUtcClock`, `useTheme`, `AssistantTriggerButton`, the `Live · not connected` badge logic. Build/replace: `PodSwitcher` (NEW, see below — supersedes the standard-mode static button and reuses the real-mode `ProjectSwitcher` styling). NEW `TenancyBadge`. NEW `CommandTrigger` (button that opens the palette; shadcn `Button` + `⌘K` kbd hint). NEW `NotificationBell` (shadcn `Popover` + `Badge` count). REFRAME user block into shadcn `DropdownMenu` (`Avatar` + name/email + role) with items: Profile, Switch role (mock), Sign out (calls existing `logoutFn`).
- **States:** *Loading* — pod switcher shows a skeleton until pods resolve; clock shows `--:--:-- UTC` (already handled). *Populated* — all chips live. *Bell empty* — bell icon, no badge, popover empty-state. *Bell populated* — neon `Badge` with unread count; popover lists recent notifications. *Escalation edge-case* — keep the pulsing red ESC chip when `unackedOpen()>0`. *Real-but-unconnected* — keep the amber `Live · not connected` badge. *Density edge-case* — below `md`, collapse telemetry chips (already gated by `hidden md:flex`); keep pod switcher, tenancy badge, ⌘K, bell, user menu always visible.
- **Mock data:** Tenancy badge from a NEW field block on the active pod: `tenancy: { mode: "Dedicated"; region: "EU-West"; isolatedDb: true; residencyNote: string }` (add to pod mock — see Pod Switcher). *(Shape superseded — see Appendix `tenancy.ts`, the single source; the badge reads a subset.)* Notifications from a NEW lightweight `notifications` mock: `{ id; kind: "gate"|"incident"|"escalation"|"digest"|"system"; title; ts; read: boolean; deepLink: string }` (the Notifications cluster owns the full inbox; the bell just reads the latest N + unread count). Spend/health/digest from existing `useLive`/`comms` as today.
- **Interactions:** ⌘K (and clicking the trigger) opens the command palette. Bell click → popover with last ~6 notifications + "View all" → `/notifications`; clicking a row deep-links via `deepLink` and marks read. User menu → role switch re-scopes the rail and default landing (mock); Sign out runs `logoutFn` → invalidate → `/login` (existing flow). Tenancy badge click → `Popover` showing the data-handling statement (region, isolated DB, retention summary, model plane) and a link to Settings → Security posture.
- **Copy:** Tenancy badge: `Dedicated · EU-West · Isolated DB` with a shield glyph; popover heading "Your data stays yours" + line "Dedicated infrastructure and an isolated database for {pod.client}. Data residency: EU-West." + one model-plane line: "Content is processed by each agent's pinned model provider under zero-retention terms; storage, memory, and the ledger stay in your EU-West tenant. EU-region inference: Roadmap." (links to Settings → Tenancy & Security → Models & subprocessors). ⌘K trigger placeholder: "Search runs, gates, people…  ⌘K". Bell empty-state: "You're all caught up." User menu role line: "Pod Admin · {pod.name}".
- **Demo note:** Opening beat — the presenter points at the tenancy badge ("dedicated, isolated, EU-West") to pre-empt the data objection before touching LAUNCH; the bell + ⌘K establish this as an operable product, not a dashboard.

---

### Pod Switcher — `(top bar control)`  (REFRAME)
- **Purpose:** Make the **pod** the top-level scope object (multi-pod shell): switch the entire workspace between the client org's pods, and offer "New pod" as the inline create entry.
- **Persona & entry:** PM/Admin primarily (others switch among pods they're a member of). Top-left of every screen.
- **Layout:** A trigger button styled like today's standard-mode pod button (neon dot + name + chevron) that opens a shadcn `DropdownMenu` (or `Command` for search when many pods). Each row: pod name, client, a small `Badge` for status (`Live` / `Setting up` / `Paused`), and the agent-count. Footer row: `+ New pod` → `/pods/new`. Real mode reuses `ProjectSwitcher`'s cookie-scoping mechanics (`aiops_project` cookie + `router.invalidate()`); standard mode reads the mock pod list.
- **Components:** REUSE `ProjectSwitcher` selection/cookie/invalidate logic (generalize its `<select>` into the dropdown). Build NEW `PodSwitcher` wrapping both modes. shadcn `DropdownMenu`/`Command`, `Badge`, `Separator`.
- **States:** *Single pod* — render as a static label (no chevron affordance beyond "New pod"). *Multi-pod* — full dropdown. *Setting-up pod* — row shows amber `Setting up` badge; selecting it lands on the wizard at its last step. *Paused pod* — row shows muted `Paused` badge. *Empty* — no pods: trigger reads "No pod yet" → click goes straight to `/pods/new`. *Loading* — skeleton trigger.
- **Mock data:** NEW `pods` dataset (extends `src/mock/project.ts`): `Pod { id; name; client; status: "live"|"setup"|"paused"; region: string; isolatedDb: boolean; agentCount: number; tenancy: { mode; region; isolatedDb; residencyNote } }`. Seed 2–3: e.g. `AutoMarket — Car Selling Platform` (live, EU-West), `Listr — Property Marketplace` (live), `Kasa — POS Suite` (setup). Reuse the existing `projects` names as seeds. Active pod id stored in the `aiops_project` cookie (reuse).
- **Interactions:** Select a pod → write cookie → `router.invalidate()` → all loaders re-scope; rail badges, KPIs, gates, tenancy badge all refresh to that pod. `+ New pod` → `/pods/new`. Selecting a `setup` pod → resume wizard.
- **Copy:** Trigger: `{pod.name}`. Dropdown header: "Your pods". Status badges: `Live` / `Setting up` / `Paused`. Footer CTA: `+ New pod`.
- **Demo note:** Establishes "a client org runs several pods" in one glance; the presenter switches from a live pod to the freshly-launched demo pod right after the LAUNCH Launch step, proving the switch re-scopes everything.

---

### Command Palette (⌘K) — `(global overlay)`  (NEW)
- **Purpose:** Global search/jump across runs, artifacts, gates, incidents, people, connections, and pods — plus quick actions (New pod, Pause pod) — the daily-driver navigation accelerator (build-order #12, but shell-owned).
- **Persona & entry:** All personas. Opened by `⌘K` (and `Ctrl+K`) or the top-bar search trigger, from anywhere.
- **Layout:** shadcn `CommandDialog` (modal `Command` in a `Dialog`). Sections: **Quick actions** (New pod, Pause pod, Go to Gates), **Navigation** (every rail destination), **Runs**, **Gates**, **Incidents**, **People**, **Connections**, **Pods**. Each result row: icon + primary label + dim secondary (id/status) + the pillar it lives in.
- **Components:** REUSE shadcn `command` (`Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty`, `CommandSeparator`) wrapped in `Dialog`. Wire the global `⌘K` listener in `AppShell` (mirror the `sidebar.tsx` keydown pattern).
- **States:** *Empty input* — show Quick actions + recent destinations. *Typing* — fuzzy-filtered grouped results. *No match* — `CommandEmpty`: "No results. Try a run id, gate, or person." *Loading* — skeleton rows (mock resolves instantly). *Scope* — results are scoped to the active pod; a footer hint reads "Searching {pod.name}".
- **Mock data:** Aggregate from existing mock: `runs`, `approvals` (gates), `humans` (people), `connections`/`comms` (connections), plus the NEW `incidents` and `pods` datasets. Each entry normalized to `{ id; type; label; sublabel; deepLink; pillar }`. No new dataset required beyond this projection.
- **Interactions:** Type to filter; `↑/↓` + `Enter` navigates via `deepLink`; `Esc` closes. Quick actions trigger flows (New pod → `/pods/new`; Pause pod → confirm `alert-dialog` then toast). Selecting a gate deep-links into `/approvals` with that gate focused.
- **Copy:** Input placeholder: "Search runs, gates, people, incidents…". Group headers as above. Footer: "↵ to open · esc to close · searching {pod.name}".
- **Demo note:** Optional flourish — hit `⌘K`, type a ticket id, jump straight to its spec gate, showing the product is navigable at operator speed.

---

### Per-Role Default Landing — `(redirect logic)`  (NEW)
- **Purpose:** Route each persona to their job-to-be-done surface on sign-in (and on pod switch), per product-vision §3 — so the product greets each role with the right cockpit instead of a generic dashboard.
- **Persona & entry:** Triggered post-`/login` and on pod change; resolves the index redirect.
- **Layout:** No UI of its own — a route guard / redirect resolver at `/` (and wherever the role lands). Implemented in the root/index loader using the active role.
- **Components:** NEW `defaultLandingFor(role): route` helper; consumed by the index route loader. No visual component.
- **States:** *Pod Admin/PM* → `/` (Overview). *Engineering Lead* → `/pipeline`. *QA Lead* → `/approvals` (Gates). *Client Sponsor/Exec (read-only)* → `/economics` (Overview/ROI digest). *Viewer* → `/economics` (status digest, read-only). *No-pod edge-case* → `/pods/new` regardless of role (except Viewer → a "no pod" empty state).
- **Mock data:** Reuse the extended `AppUser` with `role: "admin"|"eng_lead"|"qa_lead"|"sponsor"|"viewer"` (mock; auth deferred per §8). Map lives next to the NAV config.
- **Interactions:** On login/pod-switch, redirect to the role's landing. The top-bar user menu "Switch role" (mock) re-runs this resolver so a demo can show each persona's front door without separate accounts.
- **Copy:** n/a (redirect). If a role hits a surface it can't access, render the rail-level "not available for your role" empty state rather than a hard 403.
- **Demo note:** Switch role → Sponsor lands on the ROI hero (the wow number), reinforcing "what did my money buy?"; switch back to Admin lands on the Overview cockpit.

---

**Files referenced (all absolute):** `/Users/zlatko.matokanovic/Documents/Development/aiops_dashboard/AI Ops Hub/src/components/shell/AppShell.tsx`, `/TopBar.tsx`, `/LeftRail.tsx`, `/ProjectSwitcher.tsx`, `/src/components/ui/sidebar.tsx`, `/src/mock/project.ts`, `/src/mock/comms.ts`, `/src/lib/auth/types.ts`, `/docs/product-vision.md`.

**NEW mock to add** (owned by this cluster): `src/mock/pods.ts` (`Pod` shape with `tenancy`), `role` field on `AppUser`, the `NAV` pillar config + `defaultLandingFor` map; the bell's `notifications` projection and `incidents` open-count are consumed here but owned by the Notifications / Incidents clusters.


---

## LAUNCH


### New-Pod Wizard Shell — `/pods/new` (steps via `?step=blueprint|agents|connect|people|slack|golive`) (NEW)
- **Purpose:** The container that frames the entire 6-step pod launch flow — a persistent stepper, progress, save/resume, and back/next navigation — into which every step screen renders.
- **Normative — chrome ownership:** `WizardShell` owns ALL chrome (header, stepper, footer nav, autosave; LeftRail unchanged); step specs define body content ONLY — any step-local chrome described in the step specs below is superseded. Canonical step labels: **Blueprint · Agents · Connect · People · Slack · Go live**. **Steps flag, Readiness blocks** — steps surface problems as amber flags rather than hard-blocking navigation; the Readiness step is the single hard launch gate.
- **Persona & entry:** Pod Admin / PM (buyer, primary operator). Entered from the left-rail LAUNCH → "New Pod" item, from a global "+ New Pod" button in the TopBar pod switcher dropdown, or from an empty-state CTA ("You have no pods yet — fire one up"). Engineering/QA leads can open it read-only but only the PM role can Launch.
- **Layout:** Takes over the `<main>` region inside the existing `AppShell` (TopBar + LeftRail stay; tenancy badge stays visible — launch happens *inside* an already-provisioned tenant, per vision §2). Three-row content grid:
  - **Wizard header (row 1, sticky):** left = title "Launch a new pod" + working pod name (inline-editable, defaults "Untitled Pod"); right = "Save & exit" (ghost) + auto-save indicator ("Saved · 2s ago").
  - **Stepper (row 2, sticky):** horizontal 6-segment stepper with a top `Progress` bar (value = completed/6 × 100). Each segment: number-in-circle (done = check, current = filled neon ring, future = muted, error = amber dot), step label, and a one-word status. Segments for already-valid steps are clickable to jump back.
  - **Step body (row 3, scrollable):** a centered max-w-5xl column where the active step screen mounts. Below it a sticky footer bar: left "← Back", right "Save draft" (ghost) + "Continue →" (primary, disabled until the step's min-valid predicate passes). On the final step the primary becomes "Launch pod".
- **Components:**
  - REUSE shadcn: `progress` (top progress bar), `button` (footer nav, save/exit), `tooltip` (per-step status + disabled-Continue reason), `input` (inline pod-name edit), `badge` (per-step status pills), `alert-dialog` (confirm "Save & exit" / "Discard draft"), `sonner` (autosave + resume toasts), `separator`.
  - REUSE existing: `AppShell`, `TopBar`, `LeftRail` (unchanged); `SectionAssistant` (the wizard exposes a context-aware "Help me set this up" assistant panel).
  - NEW components: `fire-up/WizardShell` (layout + state machine), `fire-up/WizardStepper` (the 6-segment indicator), `fire-up/WizardFooterNav` (back/continue/launch), `fire-up/useWizardDraft` (hook: holds draft state, derives per-step validity, persists to a cookie/localStorage so refresh/resume works without a DB — same throwaway-persistence pattern as `probeAgentFn`). *(As-built: the component home is `src/components/fireup/` — `WizardShell.tsx` + step bodies `StepBlueprint/StepAgents/StepConnect/StepScope/StepPeople/StepSlack/StepGoLive`; step registry in `steps.ts`.)*
- **States:**
  - *Empty / fresh start:* step 1 (Blueprints) active, all others muted; Continue disabled until a blueprint or "Start from scratch" is chosen.
  - *Loading / resume:* on mount, if a saved draft exists, show a top `alert` banner "Resume your draft pod 'AutoMarket Web Pod'? — last edited 14m ago [Resume] [Start fresh]" before rendering the step.
  - *Populated mid-flow:* completed steps show check + green pill; current shows neon ring; the Continue button enabled once the step predicate passes.
  - *Step-invalid:* segment shows amber dot + "Needs attention"; Continue disabled with tooltip naming the missing item (e.g. "Add at least one agent").
  - *Error (autosave fail):* autosave indicator flips to "Couldn't save — retrying" (amber) and Save buttons stay enabled.
  - *Edge — final step not ready:* "Launch pod" rendered disabled with a tooltip listing the unmet readiness items, deep-linking back to the offending step.
- **Mock data:** Drives off a NEW in-memory draft object `PodDraft`. *(Shape superseded — see Appendix `fireup.ts PodDraft`, the canonical aggregator; no separate `podDraft.ts`. As-built: draft + pod state live in `src/lib/pods/pod-store.tsx`, persisted to localStorage `aiops_pods_v1`.)* Fields: `id`, `name`, `blueprintId: string | null` ("web-app" | "mobile" | "maintenance" | "scratch"), `agentIds: AgentId[]`, `connectionIds: string[]`, `accountability: Record<AgentId, string | null>` (humanId), `slackConfig: { approverChannel: string | null; eventChannels: Record<string,string> }`, `slas: { responseMin: number; gateClearMin: number; deliveryCadence: string }`, `stepStatus: Record<1|2|3|4|5|6, "todo"|"current"|"done"|"error">`, `updatedAt: number`. Step-screens (Catalog/People/etc., other clusters) read+mutate this same object; the shell owns `name`, `stepStatus`, `updatedAt`, `blueprintId`.
- **Interactions:**
  - Choosing a blueprint or "Start from scratch" on step 1 enables Continue and (for a blueprint) pre-fills `agentIds`/`connectionIds`/`slas`/recommended roles into the draft, then advances to step 2.
  - Continue advances + marks the step `done`; Back returns without losing state; clicking a completed stepper segment jumps to it.
  - "Save & exit" persists the draft, toasts "Draft saved — resume from New Pod", and routes to the pod switcher / Overview.
  - On the final step, "Launch pod" is the gate (owned by the Readiness cluster) — it transitions the draft to a live pod and routes to `/` (Overview) with a success toast.
- **Copy:** Header "Launch a new pod". Step labels: "1 Blueprint · 2 Agents · 3 Connect · 4 People · 5 Slack · 6 Go live". Autosave "Saved · {n}s ago". Disabled-Continue tooltip "Finish this step to continue". Save&exit confirm "Your draft is saved — you can resume any time from LAUNCH → New Pod." Resume banner "Pick up where you left off?".
- **Demo note:** This is the frame for the 0:00–0:30 LAUNCH beat — the "30 seconds that does not exist yet." The stepper visibly fills as the presenter clicks through Blueprint → Agents → Connect → People → Slack → Go live, making the "launch a pod in minutes" claim legible on screen.

---

### Step 1 — Pod Blueprints — `/pods/new?step=blueprint` (NEW)
- **Blueprint catalog expanded + Knowledge Base mandatory (owner ask, 2026-06-12) — AS-BUILT:** the grid now offers SIX cards — Web App Delivery · Mobile · **Full-Stack Product Pod** ("Web, mobile and backend in ONE pod — one spec, three codebases, one ledger"; Layers icon; adds Figma to the suggested connectors) · **AI Agentic Development Pod** ("Build agentic systems — agents, tools and MCP integrations, with evals as the quality gate"; Bot icon; adds Notion; SLA line carries a weekly eval report — the AgentOps tie-in) · Maintenance · Start from scratch. And the **Knowledge Base agent is MANDATORY in every pod**: `catalog.MANDATORY_ROLE_IDS` — every blueprint's `agentIds` includes `knowledge`, the agent-step card renders a locked "Mandatory" chip instead of a switch (tooltip: the shared context every agent and human draws on), the shared toggle choke-point refuses removal with an explanatory toast (covers /catalog sandbox too), and a wizard normalization effect re-adds it to scratch/legacy drafts.
- **Purpose:** The 60-second start: pick a delivery-pod blueprint (Web App / Mobile / Maintenance) that pre-fills the entire wizard, or "Start from scratch" as the escape hatch.
- **Persona & entry:** Pod Admin / PM, landing as the first body of the wizard shell (above). It is the default active step.
- **Layout:** Inside the wizard step body. Single column:
  - **Intro line** ("Start from a blueprint — pick a proven pod shape and adjust, or build from scratch.").
  - **Blueprint card grid:** responsive `grid md:grid-cols-2 xl:grid-cols-4` of four selectable cards — three blueprints + the "Start from scratch" card. Each blueprint card is a large radio-style selectable `Card` (selected = neon ring + check badge top-right) with: icon, blueprint name, one-line outcome, a **"what's included" stack** (agent role chips, suggested-connector chips, default-SLA line, recommended-roles line), and an indicative "fires up ~7 agents · 5 connectors" meta row (matches the web-app seed).
  - **Selected detail panel (optional, below grid):** when a blueprint is selected, a thin `Card` expands showing the full pre-fill preview as three labeled `Tabs` ("Agents", "Connectors", "SLAs & roles") so the PM sees exactly what will be pre-filled before continuing.
- **Components:**
  - REUSE shadcn: `card` (blueprint cards + detail panel), `badge` (role/connector chips, "Recommended" / "Most popular" / "Live vs Roadmap" tags), `tabs` (the pre-fill preview), `button`, `tooltip`, `radio-group` (semantic single-select wiring under the cards for a11y), `separator`, `aspect-ratio` (consistent card art).
  - REUSE existing data: `src/mock/agents.ts` (`coreAgents` for the agent chips per blueprint), `src/mock/humans.ts` (`OWNERSHIP` for recommended-role suggestions), `src/mock/project.ts` (`codebases` to ground Web/Mobile/Maintenance framing).
  - NEW components: `fire-up/BlueprintGrid`, `fire-up/BlueprintCard` (selectable card), `fire-up/BlueprintPreview` (the tabbed pre-fill panel).
- **States:**
  - *Empty / initial:* four cards rendered, none selected, no detail panel, Continue disabled.
  - *Loading:* `skeleton` cards (rare — data is local mock).
  - *Selected (blueprint):* one card ringed + checked, detail preview panel expands, Continue enabled; re-selecting another card swaps the preview.
  - *Selected (Start from scratch):* the scratch card highlights, no preview panel, Continue enabled (advances to an empty Catalog step).
  - *Edge — switching after pre-fill:* if the PM already advanced and comes back to change blueprint, show an `alert-dialog` "Switching blueprint will replace your current agent/connector selections. Keep going?" to protect downstream edits.
- **Mock data:** NEW dataset `src/mock/blueprints.ts` exporting `blueprints: PodBlueprint[]`. `PodBlueprint` fields: `id` ("web-app" | "mobile" | "maintenance"), `name`, `tagline` (one-line outcome), `icon` (lucide name), `popular?: boolean`, `agentIds: AgentId[]` (pre-selected agents), `suggestedConnectorIds: string[]` (e.g. "jira","slack","github","drive","email","teamwork" — matching the Connect-tiles cluster), `defaultSlas: { responseMin: number; gateClearMin: number; deliveryCadence: string }`, `recommendedRoles: { agentId: AgentId; roleLabel: string }[]`, `language: string` (default working language, e.g. `"en"` — see the working-language select below; Blind spot 7). Seed three:
  - **web-app** — "Ship features on a web codebase" — agents `[ba, sa, uiux, tasklist, dev, review, qa]`, connectors `[teamwork, slack, github, jira, drive]`, SLAs `{responseMin:30, gateClearMin:240, deliveryCadence:"weekly"}`, `popular:true`.
  - **mobile** — "Deliver mobile releases (Flutter)" — agents `[ba, sa, dev, qa]`, connectors `[teamwork, github, slack]`, SLAs `{60, 480, "biweekly"}`.
  - **maintenance** — "Keep a live product healthy" — agents `[ba, dev, review, qa]`, connectors `[slack, teamwork, jira, email]`, SLAs `{15, 120, "continuous"}`. The "Start from scratch" card is hard-coded in the component, not in the dataset.
  - **Connector-honesty ordering (load-bearing):** `suggestedConnectorIds` are ordered **live-first** (Teamwork / Slack / GitHub), with Roadmap connectors (Jira / Drive / Email) trailing and rendered as **Optional · Roadmap** chips — a blueprint never leads with a connector the buyer can't connect today.
- **Interactions:** Clicking a blueprint card selects it (radio semantics), expands its preview tabs, and enables Continue. A **working-language `select`** sits under the grid (defaults from the blueprint's `language`; written to `PodDraft.language`): "Working language — specs, reports, and gates are produced in this language." EARS keywords stay **English as a structural convention** with localized body text — the stated validator-i18n stance (Blind spot 7), so the deterministic checks keep working in any working language. Continue writes the blueprint's `agentIds`/`suggestedConnectorIds`/`defaultSlas`/`recommendedRoles` (+ `language`) into `PodDraft` and advances to step 2 (Catalog) with those agents pre-toggled. "Start from scratch" sets `blueprintId="scratch"`, leaves draft arrays empty, advances to an empty Catalog. Hovering a connector chip shows a `tooltip` with its Live-vs-Roadmap honesty badge (consistent with the Connect-tiles cluster).
- **Copy:** Heading "Choose a pod blueprint". Sub "Pick a proven shape and adjust later — nothing here is locked in." Card CTAs are the cards themselves; selected card shows "Selected ✓". Scratch card: title "Start from scratch", body "Hand-pick every agent, tool and person.", tag "Full control". Preview tab labels "Agents · Connectors · SLAs & roles". Working-language select label "Working language" · helper "Specs, reports, and gates are produced in this language. EARS keywords stay English — a structural convention the validators check; body text is localized." Continue "Continue →". Switch-warning dialog "Replace current selections?".
- **Demo note:** Opens the 0:00 LAUNCH beat — the presenter clicks **"Web App Delivery Pod"**, the preview shows the full chain — BA, SA, UI/UX, Tasklist, Dev, Review, QA — already wired with Teamwork/Slack/GitHub (Jira shown honestly as Optional · Roadmap), and one click pre-fills the whole wizard. This is the visible payoff of "launch a pod in minutes" and the single most load-bearing new surface in the demo.


### Agent Catalog — `/catalog`  (NEW)
- **Purpose:** Pick the curated Q SDLC agents for this pod from a card grid, see what each produces/consumes + indicative cost/latency + contract conformance, and watch a live produces→consumes pipeline preview assemble as agents are added.
- **Persona & entry:** Pod Admin / PM, in the LAUNCH flow. Entered as **wizard step 2** (`/pods/new?step=agents`) from Pod Blueprints (a blueprint pre-selects a set of agents), or directly from the left rail `Catalog` item (the standalone `/catalog` route). Exits forward to step 3 (Connect Tools).
- **Layout:** Chrome: provided by WizardShell (see Wizard Shell spec); this spec defines body content only. Body is a **two-column resizable split** (`resizable`): LEFT (≈64%) = the catalog card grid (responsive `grid` 1/2/3 cols, `scroll-area`); RIGHT (≈36%, sticky) = the **Pipeline Preview** panel (see its own spec below). A thin summary bar sits above the grid: `{n} agents · {m} of 8 pipeline stages wired · included in plan · ~Ym latency` with a `Reset to blueprint` ghost link (the summary bar never shows raw per-ticket COGS — consumption detail lives in MONITOR → Usage & Billing).
- **Components:**
  - shadcn: `card` (one per agent), `badge` (role/contract/conformance/Live-Roadmap), `switch` (add/remove toggle on each card), `dialog` (agent detail card — see below), `button`, `breadcrumb`, `resizable`, `scroll-area`, `separator`, `tooltip` (explain conformance badge), `hover-card` (quick produces/consumes peek on the contract badge), `sonner` (toast on add/remove).
  - Reuse: agent color tokens (`agent-*` css vars) and the sparkline render approach from `command-center/KpiTile`/`AgentStatusGrid`; the topology edge model concept from `flow.ts` (`GATE_AGENT` ordering gives the BA→SA→UI/UX→Tasklist→Dev→Review→QA chain — add the `uix` gate/agent pair to the reused `GATES`/`GATE_AGENT` mapping). Reuse `AppShell`, `TopBar`, `LeftRail`.
  - NEW: `catalog/CatalogGrid`, `catalog/AgentCard`, `catalog/AgentDetailDialog`, `catalog/PipelinePreview`, `catalog/ContractBadge`. (No step-local `WizardStepHeader` — chrome comes from `WizardShell`.)
- **States:**
  - **Empty (nothing added):** all nine togglable cards (the 8 pipeline stages + Knowledge) show their `+ Add` switch off; pipeline preview panel shows a dashed placeholder rail "Add an agent to start building the pipeline" with the BA slot ghosted as the recommended first step; `Next` button disabled.
  - **Loading:** skeleton cards (`skeleton`) in the grid (6 placeholders), preview panel shows a single skeleton rail. (Mock loads instantly; skeleton exists for fidelity.)
  - **Populated:** added agents render with a neon-accented border in their `agent-*` color, switch on, and appear wired in the preview. Summary bar updates live.
  - **Edge — gap in the chain:** if a consumer is added without its producer (e.g. SA added but BA off), its card and its preview node show an amber `Needs: spec from BA` badge (`badge` variant warning) + a `Add BA` inline fix button. `Next` stays enabled (gaps are allowed, flagged not blocked) but the summary bar shows `1 input gap` in amber.
  - **Edge — planned agent:** SA/Dev/QA/DevOps/Knowledge cards carry a `Roadmap` badge and a muted "Planned" ribbon; they're still addable (mock-first) but tagged so the buyer is never misled. BA carries a `Live` badge.
  - **Error:** if the (mocked) catalog fetch fails, grid shows an `alert` (destructive) "Couldn't load the agent catalog" + `Retry`.
- **Mock data:** Drives off `src/mock/agents.ts` (the eight agents; the seven-role curated set is `coreAgents` + `pm`/`curator` as system/peer roles). The existing `Agent` shape lacks catalog fields — **extend `agents.ts` (or add `src/mock/catalog.ts`) with a `CatalogFacet` keyed by `AgentId`**:
  - `produces: ArtifactKind` and `consumes: ArtifactKind[]` where `ArtifactKind = "spec" | "design" | "uix-ui-spec" | "tasks" | "code" | "review" | "test" | "release" | "knowledge"` (BA produces `spec`/consumes `[]`; SA consumes `["spec"]` produces `design`; UI/UX consumes `["design"]` produces `uix-ui-spec`; Tasklist consumes `["uix-ui-spec"]` produces `tasks`; Dev consumes `["tasks"]` produces `code`; Review consumes `["code"]` produces `review`; QA consumes `["code","review"]` produces `test`; DevOps consumes `["test"]` produces `release`; Knowledge is a pod-wide peer).
  - **Single source of truth:** the chain itself lives in ONE module — `src/mock/chain.ts` (roles, artifact kinds, edges). `catalogFacets`, the blueprint agent seeds, and the Pipeline Preview ordering all derive from it; no spec re-declares the chain.
  - `availability: "live" | "roadmap"` (BA = `live`; rest = `roadmap`).
  - `contractVersion: string` (e.g. `"contract v0.5"`).
  - `conformance: "certified" | "partial" | "untested"` (BA `certified`; SA `certified`; Dev/QA `partial`; etc.).
  - `costPerTicketUsd: number` and `latencyP50Min: number` (indicative; derive display from existing `tokenCostToday`/`latencyMs` or hand-set, e.g. BA ~$1.20/ticket, ~12m).
  - `recommended: boolean` (true for the BA→SA→UI/UX→Dev→QA happy-path spine).
  - `summary: string` (one-sentence "what it does," richer than the terse `role`).
  - `capabilities: string[]` (3–5 bullets for the detail dialog, e.g. BA: "EARS acceptance criteria", "Structural spec validation", "Slack clarification gates").
  - Reuse existing `Agent.color`, `Agent.engine`, `Agent.successRate`, `Agent.sparkline` for the card body.
- **Interactions:**
  - Toggle the `switch` on a card → adds/removes the agent; toast `BA Agent added to pod`; the preview panel animates the new node + its produces→consumes edge into the rail; summary bar recomputes latency (the cost slot stays "included in plan"). Removing an agent that others consume from re-flags downstream gaps.
  - Click anywhere on a card body (not the switch) → opens `AgentDetailDialog` (the detail card spec below).
  - Click the contract badge → `hover-card`/`tooltip` explains "Curated for quality, swappable by contract — conforms to contract v0.5."
  - Inline `Add BA` fix button on a gap badge → toggles the missing producer on.
  - **Inline auto-suggest (chain closure):** adding **Dev** immediately offers an inline `+ Add Tasklist` chip (Dev consumes `tasks`); adding **QA** offers `+ Add Review` (QA consumes `code`+`review`) — the same one-click gap-fix pattern as `Add BA`. Accepting wires the intermediate spine step and clears the dashed-amber gap.
  - `Reset to blueprint` → restores the blueprint's default selection.
  - `Next: Connect tools →` → advances to wizard step 3 (Connect), carrying the selected-agent set. (The standalone `/connections` hub is the post-launch home, not a wizard exit.)
- **Copy:** Step title `Choose your agents`. Sub `Your curated Q delivery team — add what this pod needs.` Switch labels `Add` / `Added`. Empty preview `Add an agent to start building the pipeline.` Gap badge `Needs: spec from BA`. Contract tooltip `Curated for quality, swappable by contract.` Live/Roadmap badges `Live` / `Roadmap`. CTA `Next: Connect tools →`. Summary bar `{n} agents · {m} of 8 pipeline stages wired · included in plan · ~{lat} per item`.
- **Demo note:** This is **0:00–0:30 LAUNCH**, beat 1 of 3. The presenter adds **BA + SA + UI/UX + Dev + QA** with five switch taps; adding Dev surfaces the inline `+ Add Tasklist` auto-suggest and adding QA surfaces `+ Add Review` — **five taps + two one-click auto-fixes** complete the continuous 7-node wired chain (no dashed-amber gaps) — the "assemble a delivery team in 30 seconds" moment. The `Live`/`Roadmap` honesty and the contract badge pre-empt the lock-in pushback inline.

---

### Agent Detail Card — `/catalog` (dialog over route, `?agent=<id>`)  (NEW)
- **Purpose:** The expanded card for one agent: role, produces/consumes contract, indicative cost/latency, contract-version + conformance badge (the anti-lock-in signal), capabilities, and a primary add/remove action — the decision surface before committing an agent to the pod.
- **Persona & entry:** Pod Admin / PM, from clicking an `AgentCard` in the grid. URL-addressable via `?agent=<agentId>` so it's deep-linkable from ⌘K and demoable directly.
- **Layout:** `dialog` (centered, ~640px). Header: agent avatar/icon tinted in `agent-*` color, name, `engine` chip, and the `Live`/`Roadmap` badge top-right. Body in two stacked sections: (1) **Contract row** — a `produces → consumes` visual (this agent's `produces` chip on the left, its `consumes` chips on the right, with a directional arrow), plus `contractVersion` + `conformance` badges with the deterministic-conformance tooltip. (2) **Stats row** — three `KpiTile`-style mini-tiles: `~$/ticket`, `~latency`, `success rate` (with the agent's `sparkline`). Below: **Capabilities** list (`capabilities[]` as a checkmarked list) and a one-paragraph `summary`. Footer: a prominent `switch`-backed primary `button` — `Add to pod` / `Remove from pod`.
- **Components:** shadcn `dialog`, `badge`, `switch`, `button`, `separator`, `avatar`, `tooltip`, `chart`/sparkline. Reuse `command-center/KpiTile` for the three stat tiles and the sparkline renderer from `AgentStatusGrid`. NEW: `catalog/AgentDetailDialog`, reuses `catalog/ContractBadge`.
- **States:**
  - **Populated (not added):** primary CTA reads `Add to pod` (neon, agent-color accent).
  - **Added:** CTA reads `Remove from pod` (ghost/destructive-subtle), header shows an `Added` badge.
  - **Roadmap agent:** a muted info `alert` strip: "Planned — available in the catalog now, runs when this agent ships." Add still allowed (mock).
  - **Gap context:** if added but its producer is missing, an amber line under the contract row: `This agent consumes spec — add BA to feed it.` with an inline `Add BA`.
  - **Loading / error:** opening with an unknown `?agent=` id → `alert` "Agent not found" + close.
- **Mock data:** Same extended `CatalogFacet` from the grid spec (`produces`, `consumes`, `availability`, `contractVersion`, `conformance`, `costPerTicketUsd`, `latencyP50Min`, `capabilities`, `summary`) joined with the base `Agent` record from `src/mock/agents.ts` (`name`, `color`, `engine`, `successRate`, `latencyMs`, `sparkline`).
- **Interactions:** Footer `switch`/`button` adds-or-removes (same effect + toast as the card toggle; the underlying grid card and preview update live behind the dialog). Conformance badge → tooltip. `Add BA` inline fix toggles the producer. Closing returns to the grid; selection persists.
- **Copy:** Contract row `Produces` / `Consumes`. Conformance tooltip `Validated deterministically against contract v0.5 — no LLM in the loop.` Roadmap strip `Planned — in the catalog now, runs when this agent ships.` CTA `Add to pod` / `Remove from pod`. Gap line `Consumes spec — add BA to feed it.`
- **Demo note:** Optional deep-dive beat — if a skeptic asks "how do I know these agents are interchangeable / not lock-in," open SA's card and point at `contract v0.5 · Certified` with the deterministic-conformance tooltip. Otherwise the demo stays on the grid.

---

### Pipeline Preview (produces→consumes) — `/catalog` (right panel, not a route)  (NEW)
- **Purpose:** Live, auto-wiring visualization of the pod's pipeline as agents are added — each agent is a node, each `produces`→`consumes` match is an edge — proving the catalog assembles into a coherent BA→SA→UI/UX→Tasklist→Dev→Review→QA chain (and surfacing gaps).
- **Persona & entry:** Pod Admin / PM, always visible in the right pane of `/catalog` (step 2). Not separately routed.
- **Layout:** Sticky right panel inside the `resizable` split. A vertical (top-to-bottom) flow rail: ordered nodes following the contract order (BA → SA → UI/UX → Tasklist → Dev → Review → QA), each node a compact pill (agent color, name, `produces` chip). Directional connectors between consecutive added nodes are solid neon when the upstream artifact satisfies the downstream `consumes`, dashed amber when a required input is missing. A header shows `Pipeline preview` + a small legend (`wired` / `input gap`). A footer mini-summary repeats `included in plan · ~latency end-to-end` (latency only — no raw per-ticket COGS in LAUNCH).
- **Components:** shadcn `card` (panel frame), `badge` (node artifact chips + gap badges), `separator`, `tooltip` (on an edge: "BA produces spec → SA consumes spec"), `scroll-area`. Reuse the river/edge visual language and color tokens from `command-center/FlowRiver` (adapt its node+connector rendering for this smaller vertical rail). NEW: `catalog/PipelinePreview`, `catalog/PipelineNode`, `catalog/PipelineEdge`.
- **States:**
  - **Empty:** ghosted dashed rail, "Add an agent to start building the pipeline," BA slot highlighted as recommended start.
  - **Partial:** only added agents render as solid nodes; not-yet-added recommended agents render as faint ghost slots in their chain position (so the buyer sees where SA/Dev/QA would slot in).
  - **Wired (happy path):** BA→SA→UI/UX→Tasklist→Dev→Review→QA shown as a continuous solid neon 7-node chain; footer shows "included in plan" + end-to-end est. latency (summed from selected `latencyP50Min`).
  - **Gap:** a consumer with no upstream producer shows a dashed amber inbound edge + a `no spec input` chip; tooltip explains the missing artifact. When the fix is an intermediate spine step, the inline `+ Add Tasklist` / `+ Add Review` auto-suggest chip renders on the gap (mirrors the grid's auto-suggest).
  - **Loading:** single skeleton rail.
- **Mock data:** Derived entirely from the selected-agent set + the `CatalogFacet.produces`/`consumes` graph (no new dataset — it's computed). Edge resolution: an edge from A→B exists when `A.produces ∈ B.consumes`. End-to-end cost/latency summed from `costPerTicketUsd`/`latencyP50Min` of selected agents.
- **Interactions:** Hovering a node → highlights its in/out edges + tooltip with its produces/consumes. Hovering an edge → "X produces spec → Y consumes spec." Clicking a node → opens that agent's `AgentDetailDialog`. The panel re-renders on every add/remove from the grid or detail dialog — this is the visible payoff of the toggle.
- **Copy:** Header `Pipeline preview`. Legend `wired` / `input gap`. Empty `Add an agent to start building the pipeline.` Gap chip `no spec input`. Footer `included in plan · ~{lat} end-to-end`.
- **Demo note:** The motion engine of the LAUNCH beat. Every switch tap in the grid extends this rail one node; **five taps + two one-click auto-fixes** (Dev suggests `+ Add Tasklist`, QA suggests `+ Add Review`) complete a continuous 7-node BA→SA→UI/UX→Tasklist→Dev→Review→QA chain — the visual "you just built a delivery pipeline" moment that hands off naturally to step 3 (Connect Tools).

---

**Two small notes for the mock-builder (load-bearing, not in template):**
- The seven "curated roles" in the vision map to mock ids as: BA=`ba`, SA=`sa`, UI/UX=`uiux`, Developer=`dev`, QA=`qa`, DevOps/Release=`devops`, Knowledge=`curator`, plus `tasklist` and `review` as the spine's intermediate steps (pipeline intermediates rendered as spine sub-steps — still togglable cards). **Knowledge = the existing `curator` agent**, rendered as an **installable catalog card** carrying a "runs pod-wide, not in the pipeline rail" note (pod-wide peer, `GenericFacet` — never a pipeline node). `pm` (PM Supervisor) is the **only always-on/non-togglable** role — render it in a separate "Always-on" subsection of the grid. Togglable set = the 8 pipeline stages (BA, SA, UI/UX, Tasklist, Dev, Review, QA, DevOps) + Knowledge. `uiux` sits between `sa` and `tasklist` (`design → uix-ui-spec → tasks`).
- UI/UX and DevOps/Release appear in the vision's seven-role table but have **no record in `agents.ts`** — add two `Agent`+`CatalogFacet` stubs (`uiux` consumes `["design"]`/produces `uix-ui-spec`; `devops` produces `release`/consumes `["test"]`). Knowledge needs **no stub** — it is the existing `curator` record surfaced as an installable card (see above). Recommend adding the two stubs so the catalog visibly shows all seven SDLC roles the pitch promises.


### Connect Tools — `/pods/new?step=connect` (wizard step 3) — NEW (reframes `/connections`)
- **Purpose:** Connect the pod's external tools (Jira, Drive, Email, Slack, GitHub, Teamwork) via OAuth-style Connect tiles with mocked reachability/health, scopes shown at connect-time, and honest Live-vs-Roadmap badges.
- **Persona & entry:** Pod Admin / PM, mid-wizard. Lands here from LAUNCH step 2 (Catalog) "Next → Connect tools", or via the left rail "Connections" item (which renders the same component standalone, see Connections Hub spec below). The set of tiles shown is filtered/sorted by the agents picked in step 2 (e.g. picking Dev surfaces GitHub as *required*).
- **Layout:** Chrome: provided by WizardShell (see Wizard Shell spec); this spec defines body content only. Main region under the app shell `max-w-5xl`:
  - **Data-handling banner** (one `alert`, info variant) at top: tenancy/residency reassurance.
  - **Required vs Optional split:** a "Required for your agents" section (tiles the picked agents need) then an "Optional" section. Each is a responsive `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` of Connect tiles.
  - A right-aligned **readiness chip** in the section header: "2 / 3 required connected".
- **Components:**
  - REUSE shadcn: `card` (tile), `badge` (Live/Roadmap + status), `dialog` (connect modal), `alert` (data-handling banner + roadmap notice), `button`, `tooltip`, `separator`, `checkbox` (scope grants), `skeleton` (probing state), `sonner` (connected toast), `switch` (inbound/outbound direction toggle, read-only display).
  - REUSE existing: `StatusDot` + `ProbeLine` patterns lifted from `connections.tsx` (the reachability dot + line), `probeAgentFn` from `connections.functions.ts` (extended — see Mock data).
  - NEW components: **`ConnectorTile`** (the card), **`ConnectDialog`** (the OAuth-style modal with scope list), **`LiveRoadmapBadge`** (badge wrapper), **`ConnectorScopeList`** (checkbox list of permission scopes), **`ConnectorHealthLine`** (reachability/latency/last-sync line). Build under `src/components/connectors/`.
- **States:**
  - **empty / not-connected:** tile shows connector icon, name, one-line description, Live/Roadmap badge, an idle status dot, and a primary `Connect` button (Roadmap tiles show a muted `Request access` ghost button + "On the roadmap" caption).
  - **loading / probing:** on Connect click (or initial health check), status dot → spinner, `ConnectorHealthLine` → `skeleton`; button disabled with "Checking…".
  - **connected / healthy:** green `CheckCircle2` dot, badge `Connected`, health line "reachable · 142 ms · synced 2m ago", a `Manage`/`Disconnect` affordance, and inbound/outbound direction chips.
  - **degraded (amber):** badge `Degraded`, health line "reachable · sync stale 3h" — connected but flagged; used to seed an Incidents item later.
  - **error / unreachable:** red `XCircle` dot, badge `Unreachable`, health line "HTTP 503 · last ok 2h ago", button → `Retry`.
  - **roadmap:** badge `Roadmap` (outline, muted), tile body dimmed, no live health, `Request access` only.
  - **edge — required-but-unconnected:** tile gets a `ring-1 ring-status-warn/40` and a "Required" badge; the wizard Next button is enabled but shows a confirm ("3 required tools aren't connected — connect later from Incidents?").
- **Mock data:** NEW dataset `src/mock/connectors.ts` exporting `CONNECTORS: Connector[]`. Field shape:
  - `Connector`: `id` ("jira"|"gdrive"|"email"|"slack"|"github"|"teamwork"), `name`, `vendor`, `icon` (lucide name or asset key), `description` (one line), `category` ("ticketing"|"storage"|"comms"|"scm"|"pm"), `availability` ("live"|"roadmap"), `direction` ("inbound"|"outbound"|"bidirectional") — semantics borrowed from `comms.ts` (Teamwork/Jira inbound ticket source; Slack outbound posts; GitHub bidirectional), `requiredByAgents` (`AgentId[]`, drives Required section), `scopes` (`{ id, label, access: "read"|"write", reason }[]` — shown at connect-time), `health` (`{ state: "healthy"|"degraded"|"unreachable"|"unknown", latencyMs?, lastSyncMin?, error? }` — the *mocked* outcome), `docsUrl`.
  - Connected state persisted to the **same `aiops_systems` cookie** pattern already in `connections.tsx` (extend `StoredSystem` with `connectorId`, `scopesGranted: string[]`, `connectedAt`), so it survives reload without a DB.
  - Extend `probeAgentFn` → add a sibling `probeConnectorFn({ connectorId })` that, for `live` connectors with a real base URL, does the existing card/health probe; for `roadmap` or no-URL connectors, returns the mocked `health` from `CONNECTORS` after a short delay (so the demo always shows motion). Seed values: Teamwork/Slack/GitHub → `healthy`; Jira → `roadmap`; Drive → `roadmap`; Email → `roadmap`; one (Slack) deliberately `degraded` is available as an alternate seed for the Incidents demo.
- **Interactions:**
  - Click **Connect** on a Live tile → opens `ConnectDialog`: header "Connect {name} to this pod", a `LiveRoadmapBadge`, the **scope list** (`ConnectorScopeList` — each scope a pre-checked `checkbox` with label + plain-language `reason`, write scopes flagged with an amber dot; user can uncheck optional scopes), a direction line ("Agency OS will: read tickets ← {name} · post updates → {name}"), and an `alert` "Mock connect — no real credentials are stored (vault deferred)." Primary `Authorize & connect` button.
  - **Status write-back mapping (ticketing connectors only — Jira/Teamwork):** the `ConnectDialog` for a ticketing connector gains a second step, a 5-row **mapping editor** (pod stage → client workflow status): `Spec approved → {select}`, `In design → {select}`, `In development → {select}`, `In review/QA → {select}`, `Done/merged → {select}` — each right side a `select` of the client's existing workflow statuses (mocked list per connector), pre-filled from blueprint defaults. Helper copy: "The pod writes status back into *your* workflow — your board stays the source of truth for your team." Stored as `statusMap` on the `ConnectionDraft`.
  - `Authorize & connect` → dialog shows a 1.2s "Redirecting to {vendor}…" → "Granted" mini-flow (mocked OAuth), closes, tile flips to **probing** then **connected**, fires `sonner` toast "GitHub connected · 5 scopes granted", increments the readiness chip, writes the cookie.
  - **Retry** on an error tile → re-runs `probeConnectorFn`.
  - **Manage** on connected tile → reopens `ConnectDialog` in "manage" mode (scopes editable, `Disconnect` destructive button → `alert-dialog` confirm).
  - **Request access** on a Roadmap tile → toast "Logged — we'll notify you when {name} is live" (no modal).
  - Footer **Next** → step 4 People (with the required-unconnected confirm above); **Connect later** → skips to next, leaving required tiles flagged.
- **Copy:**
  - Banner: "Dedicated tenancy · EU-West · isolated DB. Tools connect into this pod only. Credentials are vaulted per client (mocked in this prototype)."
  - Section headers: "Required for your agents", "Optional integrations".
  - Live badge: "Live". Roadmap badge: "Roadmap". Status badges: "Connected" / "Degraded" / "Unreachable".
  - Tile CTAs: "Connect" / "Retry" / "Manage" / "Request access".
  - Roadmap caption: "On our roadmap — request access to be notified."
  - Dialog: "Connect {name} to this pod" · "{name} is asking to:" · "Mock connect — no real credentials are stored." · "Authorize & connect".
  - Empty-readiness confirm: "3 required tools aren't connected. You can connect them later from Incidents & Recovery. Continue?"
- **Demo note:** This is **0:00–0:30 LAUNCH**, the highest-leverage missing 30 seconds. Demo arc: catalog → "connect Teamwork/Slack/GitHub as Connect tiles" → click **Connect** on GitHub, the scope list and the honest **Live** badge appear, Authorize → tile goes green with "reachable · 142 ms". Then point at the **Jira** tile's **Roadmap** badge — the honesty beat ("we don't oversell post-sale"). Then **Launch pod** (step 6).

---

### Scope of Work (Connect sub-screen 3b) — `/pods/new?step=connect&sub=scope`  (NEW)
- **Design note (2026-06-11, tracker boundary) → ✅ AS-BUILT (same day; single-doorbell clarification applied):** `StepScope` gained the **"Trigger rule · what starts the pod"** panel — inert column Select seeded "Ready" (Roadmap-badged; column editing isn't live), the **start-policy default** RadioGroup ("Confirm-first — you approve each arrival", marked *recommended for new pods*, vs "Auto-start — the drag starts the chain"; the board is the only start signal in both) wired to the **shared trigger store** that `/intake` reflects, and the read-only write-back mapping rows. See vision §2 "The tracker boundary" + the §8 mechanics row.
- **Purpose:** The brownfield coexistence surface — pick which **slice** of the client's existing backlog the pod owns, so the pod neither swallows the whole board nor starves. A sub-screen of the Connect step (3b): the canonical six step labels (Blueprint · Agents · Connect · People · Slack · Go live) are unchanged.
- **Persona & entry:** Pod Admin / PM, surfaced inside wizard step 3 the moment a ticketing connector (Teamwork or Jira) is connected — an inline "Scope the work →" card under the connected tile expands into this sub-screen. Re-editable post-launch from the Connections Hub ("Edit scope" on the ticketing tile).
- **Layout:** Chrome: provided by WizardShell; this spec defines body content only. Two-column split: LEFT = the **slice picker** — a stacked filter builder: `Project` (`select`, e.g. "AutoMarket"), `Labels` (multi-select chips, e.g. `pod-owned`), `Components` (multi-select, e.g. "Search", "Listings"), combined with AND semantics and a plain-language sentence rendering of the rule below the controls. RIGHT = the **live preview** — a scrollable list of the matching tickets (id, title, status, age) with a count header "{matching} of {total} tickets in scope", re-filtering live as the rule changes. A full-width reassurance `alert` (info) sits under both columns.
- **Components:** shadcn: `select`, `badge` (label/component chips), `card`, `scroll-area` (preview list), `alert` (reassurance banner), `tooltip`, `button`, `skeleton`. REUSE: ticket-row rendering from the Pipeline Board's `TicketCard` (compact variant); connector identity from `connectors.ts`. NEW: `ScopeOfWorkStep`, `SliceRuleBuilder`, `ScopePreviewList`.
- **States:**
  - *empty (no rule yet):* preview shows the client's full backlog greyed with header "No scope set — the pod will take nothing until you scope it"; Continue allowed (steps flag — Readiness shows an advisory "No work scope set").
  - *loading:* preview `skeleton` rows while the (mocked) ticket fetch resolves.
  - *populated:* rule set, preview shows matching tickets highlighted, non-matching count stated ("214 tickets stay with your team").
  - *edge — rule matches zero tickets:* amber inline note "This slice matches nothing — the pod will sit idle. Widen the filter?"
  - *edge — rule matches everything:* amber note "This scope takes the whole backlog — confirm that's intended" (the anti-swallow guard).
- **Mock data:** `scopeRule` on `PodDraft` (see appendix `fireup.ts`): `{ connectorId; projectKey?; labels?; components? }` + a derived preview count. Matching tickets mocked from `tickets.ts` + a static "client backlog" extension (~20 extra rows) so the in/out split is visible. Seed: AutoMarket project, label `pod-owned` → ~6 matching (incl. AM-142), ~214 untouched.
- **Interactions:** Each filter change re-renders the preview + the sentence ("This pod owns: AutoMarket tickets labeled `pod-owned` in components Search, Listings."). "Use whole project" shortcut sets project-only scope (triggers the anti-swallow note). Continue writes `scopeRule` to the draft and returns to the Connect tile grid; the ticketing tile gains a "Scoped · {n} tickets" chip.
- **Copy:** Title "Scope of work". Sub "Pick the slice of your backlog this pod owns. You can widen it any time." Reassurance banner: **"Everything else stays with your team, untouched."** Preview header "{matching} of {total} tickets in scope". Zero-match note "This slice matches nothing — widen the filter?" Whole-backlog note "This scope takes the whole backlog — confirm that's intended."
- **Demo note:** The brownfield beat inside LAUNCH — the presenter scopes the pod to the `pod-owned` label, the preview narrows live to 6 tickets, and the banner lands the coexistence line: "everything else stays with your team, untouched." Pre-empts the "will it eat our board?" objection before Launch.

---

### Connections Hub (standalone) — `/connections` — REFRAME
- **Purpose:** The same connector catalog as a **standing left-rail page** for an already-launched pod — manage/repair connections outside the wizard. Replaces the throwaway "paste an agent URL" probe form.
- **Persona & entry:** Pod Admin / PM, from left rail LAUNCH → "Connections", or deep-linked from an Incidents "tool-disconnected" item, or from a degraded health badge anywhere.
- **Layout:** No stepper/footer. Page header "Connections" + subtitle + a small summary strip ("5 connected · 1 degraded · 3 on roadmap"). Below: the **same Required/Optional tile grids** as the wizard step (the `ConnectorTile` grid is the shared body). A collapsible **`accordion` "Advanced: register a raw agent URL"** preserves the old `probeAgentFn` developer form (URL + optional API key) for technical users — demoted, not deleted.
- **Components:** REUSE everything from the wizard step (`ConnectorTile`, `ConnectDialog`, `LiveRoadmapBadge`, etc.) + `accordion` (advanced raw-URL section wrapping the existing `connections.tsx` form) + `breadcrumb` (Pod › Connections). The existing raw-URL `<form>` and `StatusDot`/`ProbeLine` move *inside* the accordion verbatim.
- **States:** Same tile states as the wizard. Plus a **summary strip** that turns amber when any required connector is `degraded`/`unreachable`, with a "View in Incidents" link. Empty state (brand-new pod, nothing connected): "No tools connected yet. Connect your first integration to start pulling work in." + a primary "Connect a tool" that scrolls to the grid.
- **Mock data:** Same `src/mock/connectors.ts` + `aiops_systems` cookie. The Advanced accordion keeps reading/writing the legacy `StoredSystem[]` shape so old probe entries still render.
- **Interactions:** Identical tile interactions. The **degraded/unreachable** tiles here expose a "Re-authorize" action that opens `ConnectDialog` in manage mode; on success it clears the linked Incidents item (audit-ledger write — "tool reconnected"). The Advanced accordion's "Add agent" behaves exactly as today (`onAdd` → `probeAgentFn` → cookie).
- **Copy:** Header "Connections" · subtitle "Tools wired into this pod. Disconnect or re-authorize anytime." · Summary strip "5 connected · 1 degraded · 3 on roadmap". Accordion title "Advanced: register a raw agent URL" · helper "For technical users — federate an agent by URL. Stored in this browser only." · Empty "No tools connected yet."
- **Demo note:** Not in the core 3-min arc, but it's the **persistent home** of the Connect experience and the target of the Incidents "tool-disconnected → re-authorize" recovery loop; show only if the incident-recovery beat is demoed.


### Accountable People — `/pods/new?step=people` (wizard step 4)  (NEW)
- **Purpose:** Assign exactly one accountable human per agent before the pod can launch; flag any uncovered agent as a setup-time risk.
- **Persona & entry:** Pod Admin / PM, arriving from wizard step 3 (Connect Tools) via the "Next" CTA or the WizardShell stepper; can also deep-link from the Readiness Checklist when "every agent has an accountable human" is unchecked.
- **Layout:** Chrome: provided by WizardShell (see Wizard Shell spec; LeftRail unchanged); this spec defines body content only. Body is a two-region split:
  - **Left (≈30%): "People" roster rail** — invited/org humans as draggable cards, plus an "Invite by email" affordance pinned at top.
  - **Right (≈70%): Accountability matrix** — the reframed `PodView` matrix as the drop target: rows = *humans actually assigned*, columns = the agents added in step 2. Above the matrix: a **coverage banner** (`Alert`) summarizing uncovered count. Below: legend + "uncovered = risk" caption.
  - Footer: WizardShell-owned; the coverage chip renders beside the shell's Continue control.
- **Components:**
  - REUSE: the matrix table markup + `agentMeta`/avatar-chip styling from `pod/PodView.tsx` (lift into a shared `AccountabilityMatrix`); `SectionHead`/`Metric` helpers.
  - shadcn: `table` (matrix), `avatar` (roster + cells), `command` (the searchable people-picker inside the assign-cell popover and the invite dialog's existing-person search), `select` (per-column "Assign accountable →" fallback for no-drag/a11y), `dialog` (Invite by email), `input`+`label`+`form` (invite form), `alert` (coverage banner), `badge` (role/SLA/"Invited" pills), `tooltip` (cell hover "X accountable for Y"), `button`, `separator`, `sonner` (invite-sent toast).
  - NEW: `AccountablePeopleStep` (orchestration), `PersonCard` (draggable roster card w/ HTML5 drag or dnd-kit; carries **capacity hints** — working-hours chip, `capacityGatesPerDay`, availability dot from the P1-O1 `humans.ts` fields), `AssignCell` (drop target + click-to-assign popover), `InviteByEmailDialog`, `CoverageBanner`.
- **States:**
  - *Empty (fresh pod):* every agent column shows the `⚠ uncovered` header treatment from PodView (red-tinted `bg-status-error/10`); coverage banner reads "0 of N agents covered". Roster shows the 5 org humans from `humans.ts` as draggable cards.
  - *Loading:* matrix + roster `skeleton` rows.
  - *Partially covered:* covered columns lose the warning tint and show the assignee avatar in the column header; banner is amber with "M of N covered · K uncovered".
  - *Fully covered:* banner turns green ("All N agents have an accountable human"); the amber uncovered chip clears; subtle glow on footer chip.
  - *Invited-but-unaccepted:* person card shows an "Invited · link active" `badge`; can still be assigned (mock allows pre-acceptance assignment).
  - *Error (invite fails):* inline `form` error "Couldn't generate invite link — try again"; nothing assigned.
  - *Edge — drag onto already-covered column:* replaces the accountable human (single-owner invariant), prior owner returns to roster availability; toast "Reassigned {agent} to {name}".
  - *Edge — saturated human (P1-O1):* assigning one human past their capacity shows an amber hint on their card — "Ana covers 3 agents · est. ~9 gates/day vs capacity 10" — warn-not-block (Readiness carries the coverage advisory); a human marked OOO shows a muted "OOO — gates route to {delegate}" chip.
- **Mock data:** Drives off `src/mock/humans.ts` (`humans`, `OWNERSHIP`, `agentsOf`, `activeHumans`) and the agent set from `src/mock/agents.ts` (columns = agents added in step 2; default to `coreAgents`). NEW mock additions:
  - Extend `Human` with optional invite fields: `email?: string`, `status?: "org" | "invited" | "active"`, `invitedAtIso?: string`, `inviteLink?: string` (mock one-time URL like `https://agencyos.app/invite/ix_8fa3…`).
  - Capacity & coverage fields (P1-O1, appendix `humans.ts`): `workingHours`, `availability: "available" | "ooo"`, `delegateId`, `capacityGatesPerDay` — drive the roster-card capacity hints and the saturation warn.
  - NEW `src/mock/pod-setup.ts`: `assignments: Record<AgentId, string | null>` (working draft, initialized empty for a fresh pod, or from `OWNERSHIP` for the sample pod); helper `uncoveredAgents(assignments, agentIds): AgentId[]`; `pendingInvites: Invite[]` where `Invite = { id; email; role; inviteLink; invitedAtIso; assignedAgentId?: AgentId }`.
- **Interactions:**
  - Drag a `PersonCard` onto an `AssignCell`/column header → writes `assignments[agentId] = humanId`, column de-flags, banner recomputes.
  - Click a column header's "Assign accountable →" → `command` popover lists roster (search by name/role) + "Invite someone new…" → opens dialog.
  - **Invite by email:** dialog with `email` input + `role` `select` (Pod Admin / Engineering Lead / QA Lead / Sponsor / Viewer — from product-vision §3) → "Send invite" generates a mocked one-time link, shows it with a copy button, toast "Invite sent · one-time link copied", adds an `invited` card to the roster, optionally auto-assigns to the column that opened the dialog.
  - Click an assigned cell's avatar → small popover with "Reassign" / "Clear".
  - `Next` is **always enabled** (steps flag, Readiness blocks): while `uncoveredAgents().length > 0`, an amber chip beside Next reads "{n} uncovered — you'll be blocked at launch". The Readiness step remains the single hard gate.
- **Copy:** Title "Who's accountable?" · sub "Assign one human per agent. An empty column is an uncovered risk — every agent needs an owner before launch." · Coverage banner (empty) "No agents covered yet — drag a person onto each agent." · (done) "Every agent has an accountable human. ✓" · Invite dialog title "Invite by email" / helper "They'll get a one-time link to join this pod." / CTA "Send invite" · Uncovered chip "{n} uncovered — you'll be blocked at launch." · Column warning "⚠ uncovered" · Capacity hint "{name} covers {n} agents · est. ~{g} gates/day vs capacity {cap}" · OOO chip "OOO — gates route to {delegate}".
- **Demo note:** The 0:00–0:30 LAUNCH beat. After connecting tools, the presenter **drags two accountable people** (Ana → BA, Marin → SA) into the matrix; the red "uncovered" columns flip green live — this is the **accountability-matrix wow beat** (product-vision §1: "an empty column = uncovered risk"). Keep the drag deliberately visible.

---

### Wire Slack — `/pods/new?step=slack` (wizard step 5)  (NEW)
- **Purpose:** Map pod events to Slack channels (clarification gates, approvals, escalations, daily brief) and pick the single approver channel — surfacing real BA behavior (`slack_approver_ids`, Slack MCP) as plain configuration.
- **Persona & entry:** Pod Admin / PM, from step 4 ("Next: Wire Slack"); reachable from Readiness Checklist "Slack wired" row. Slack tile must be connected in step 3 — if not, this step shows a connect-first gate.
- **Layout:** Chrome: provided by `WizardShell` (see Wizard Shell spec — header, stepper, footer nav); this spec defines body content only. Body is a single-column stack of **event-routing rows** plus a right-side (or below) **live message preview**:
  - **Header strip:** connected Slack workspace badge ("Connected · Q-Agency workspace · 7 channels") + Live/Roadmap honesty badge (Slack = Live).
  - **Routing card** with 4 event rows, each: `[event icon + label + description]` … `[channel Select v]`. Events: **Clarification gates**, **Approvals**, **Escalations**, **Daily brief**.
  - **Approver channel** row, visually separated (`separator` + accent), with helper "Approvals announced here are **deep-link-only** — the link opens the gate review (My Gates) behind sign-in, role check, and the decision-reason path, routed to the gate's **accountable human or their delegate**." (P1-G2: an in-channel Approve button would bypass every control MONITOR sells.) Behind the deep link an emergency **"act on behalf of {name}"** path exists — recorded as `gate.override` with a required typed reason. **Clarifications stay anyone-can-answer in-channel** — the asymmetry is deliberate and stated in copy. Maps to `slack_approver_ids` — note: **BA's real `slack_approver_ids` behavior (anyone-in-list actions approvals in-channel) must converge to this deep-link model before any compliance claim is sold.**
  - **Right rail / preview panel:** a mocked Slack message card showing what the selected event will look like in the chosen channel (reuses `comms.ts` `body`/`preview` copy).
- **Components:**
  - shadcn: `select` (channel pickers — one per event row + approver), `card` (routing card + preview), `badge` (Live/connected/channel-type pills), `label`, `switch` (per-event "Enabled" toggle so an event can be muted), `separator`, `avatar` (Slack workspace/bot avatar in preview), `command` (searchable channel picker if channel count is high — wrap in a `popover`/`dialog`), `alert` (connect-first gate), `tooltip`, `button`, `sonner` (toast on save).
  - REUSE: `ScheduledComm.preview` rendering shape from `comms.ts` for the "Daily brief" preview; channel labels/`CommChannel` semantics from `comms.ts`.
  - NEW: `WireSlackStep`, `EventRoutingRow`, `SlackMessagePreview`, `ApproverChannelPicker`.
- **States:**
  - *Slack not connected (gate):* `alert` "Connect Slack first" with a `button` "← Connect Slack" linking back to step 3; routing rows disabled/greyed.
  - *Loading channels:* `select` triggers show `skeleton`/"Loading channels…".
  - *Empty/unconfigured:* each row defaults to a smart suggestion (e.g. all → `#automarket-dev`, brief → `#automarket-leads`) shown as a placeholder "Suggested: #automarket-dev"; nothing hard-required except approver channel.
  - *Configured:* preview panel renders the message for the focused/last-changed row; approver channel shows a green "Approver" `badge`.
  - *Event muted:* row `switch` off → channel `select` disabled, preview shows "This event won't be posted to Slack."
  - *Error (no approver chosen):* `Next` allowed but Readiness "Slack wired" stays partial; inline hint "Pick an approver channel so approval announcements reach the accountable human."
  - *Edge — same channel for everything:* allowed; small info note "All events route to #automarket-dev — consider splitting escalations."
- **Mock data:** NEW `src/mock/slack-wiring.ts` *(shape superseded for the routing draft — the canonical draft state is Appendix `fireup.ts SlackWiring`; `slack-wiring.ts` keeps only channel/workspace content)*:
  - `slackWorkspace = { name: "Q-Agency", connected: true, botName: "AgencyOS", avatarColor }`.
  - `slackChannels: { id: string; name: string; type: "public" | "private"; memberCount: number }[]` — seed `#automarket-dev`, `#automarket-leads`, `#automarket-qa`, `#automarket-escalations`, `DM → Zlatko` (reuse the channel labels already in `comms.ts`).
  - `eventRouting: { event: "clarification" | "approval" | "escalation" | "daily_brief"; label; description; enabled: boolean; channelId: string | null; defaultChannelId }[]`.
  - `approverChannelId: string | null` (the `slack_approver_ids` analogue).
  - Reuse `SCHEDULED` (`s1` Daily digest) and a `COMMS` exemplar per event for the preview bodies (e.g. clarification → `c7`/`c3`, approval → `c1`, escalation → `esc`-style).
- **Interactions:**
  - Change a row's channel `select` → updates `eventRouting[i].channelId`, re-renders `SlackMessagePreview` with that event's mock body in that channel header.
  - Toggle a row `switch` → enable/disable posting for that event.
  - Pick **Approver channel** → sets `approverChannelId`, badges the row; if it differs from the Approvals routing channel, show note "Approvals announce in {X}; the gate deep link posts to {approver} for the accountable human."
  - `Next` (WizardShell footer, canonical label "Next: Go live") → persists wiring into `pod-setup` draft, toast "Slack wired · 4 events routed", advances to step 6 **Go live** (the Readiness checklist, out of this cluster).
- **Copy:** Title "Wire Slack" · sub "Tell the pod where to talk. Route each event to a channel, and pick where approvals get actioned." · Event labels/descriptions: **Clarification gates** — "When an agent needs an answer to keep going." · **Approvals** — "When an artifact needs human sign-off." · **Escalations** — "When something's stuck, failing, or breaching SLA." · **Daily brief** — "A once-a-day digest of what shipped, what's at gates, what's blocked." · Approver row label "Approver channel" / helper "Approvals announced here are deep-link-only — the link opens the gate review for the accountable human (or their delegate); acting for someone else is recorded as an override. Clarifications can be answered by anyone in the channel." · Connect-gate "Connect Slack to wire your pod's notifications." · CTA "Next: Go live" (WizardShell footer). · Save toast "Slack wired · 4 events routed".
- **Demo note:** Tail of the LAUNCH beat (≈0:25). Presenter sets **Clarification gates → #automarket-dev** and **Approver channel → #automarket-leads** in two clicks; the live preview shows the exact Slack clarification card that will fire in the 0:30 RUN beat — visually pre-wiring the clarification gate the PM answers moments later. Establishes that the Slack clarification in RUN is configured here, not magic.


### Readiness Checklist & Launch — `/pods/new?step=golive` (wizard step 6)  (NEW)
- **Purpose:** The final wizard step — a one-glance gate that proves the pod is launch-ready (agents added, every agent has an accountable human, required tools connected, Slack wired, budget cap set, SLA targets confirmed) and exposes a single **Launch pod** action that is disabled until all blockers clear. Also hosts the **Targets & budget** sub-screen (6a) — the surface that actually sets SLAs and bounds spend before launch (P1-C4).
- **Persona & entry:** Pod Admin / PM, arriving as step 6/6 from the LAUNCH wizard (after Wire Slack). Also re-enterable later from the left rail **LAUNCH › New Pod** to relaunch a paused/draft pod. Back/Next stepper at top; "Back" returns to Wire Slack.
- **Layout:** Chrome: provided by WizardShell (see Wizard Shell spec); this spec defines body content only. Two-column on `xl`, stacked on smaller. Left column (`flex-1`): the **Targets & budget panel (sub-screen 6a)** stacked ABOVE the **Readiness checklist** card — one row per check, each expandable. Right column (`xl:w-[380px]`, `xl:sticky xl:top-4`): the **Launch panel** — a circular/linear readiness gauge, the pod summary, and the **Launch pod** CTA. A persistent **blocker banner** (`Alert`) sits above the checklist when anything is red.
  - **Sub-screen 6a — Targets & budget (panel above the checklist; the six wizard labels are unchanged):** (1) **SLA targets** — the blueprint's `defaultSlas` expanded into editable `SlaDefinition` rows (metric · target · unit; `clockMode` defaults to `coverage_hours`); (2) **Monthly budget cap** — a cap `input` with a projected-consumption preview line and an `onCapReached` policy `select`: **alert · pause-new-work · hard-pause**; (3) a **plan summary chip** (plan name + platform/pod fee line, labeled *pricing hypothesis*); (4) **pilot criteria** rows, rendered only when the tenant is `mode: "pilot"`. Confirming the panel satisfies the two new Readiness checks ("Budget cap set", "SLA targets confirmed").
- **Components:**
  - shadcn: `Card`/`CardHeader`/`CardContent`/`CardFooter` (checklist + launch panel), `Progress` (readiness % bar), `Button` (Launch pod / Fix / Back), `Alert` + `AlertTitle` + `AlertDescription` (blocker banner), `Accordion` or `Collapsible` (expand a check to see its sub-items), `Badge` (per-check status pill, Live/Roadmap on tool rows), `Tooltip` (why a check is blocked), `Avatar` (accountable-human chips), `Separator`, `alert-dialog` (launch confirm — only when overrideable warnings exist).
  - Reuse existing view components: the accountability mini-matrix can reuse the chip/cell rendering pattern from `PodView.tsx` (agent-colored "A" cells, ⚠ uncovered column) as a compact read-only strip inside the "Every agent has an accountable human" check. Reuse `lucide-react` icons already in the codebase (`CheckCircle2`, `AlertTriangle`, `Clock`, `Shield`, `Users`, `PlugZap`, `Activity`).
  - NEW components to build: `ReadinessChecklist` (maps over checks), `ReadinessRow` (icon + label + status pill + detail/CTA), `LaunchPanel` (gauge + summary + CTA), `ReadinessGauge` (ring built from the same conic-gradient pattern as `Ring` in `RealCommandCenter.tsx`, or just `Progress` ring-styled), `LaunchOverlay` (the launching transition — see next screen), `TargetsBudgetPanel` (the 6a sub-screen: `SlaTargetRow` editable rows + `BudgetCapField` with the `onCapReached` select + plan chip + pilot-criteria rows).
- **States:**
  - **Loading:** checklist rows render as `Skeleton` bars (4–6 rows); gauge shows an indeterminate `Progress`.
  - **Blocked (the "not yet" state):** at least one check is `blocked` — reachable in the continuous walkthrough because the steps flag rather than block (step 4 warns; Readiness is the single hard gate). Blocker `Alert` (variant `destructive`) at top: "2 things to fix before launch." Each failing row shows a red status pill, a one-line reason, and a **Fix** button that deep-links back into the offending wizard step (Catalog / People / Connections / Slack). The **Launch pod** CTA is `disabled` (opacity-50) with a tooltip "Resolve all required checks to launch." Gauge shows e.g. `66%` in amber.
  - **Warn (overrideable):** all *required* checks pass but an *advisory* check is amber (e.g. "No Knowledge sources connected", "1 agent shares an accountable human with 3 others", "No coverage 22:00–06:00 — overnight gates queue until morning" — the P1-O1 coverage advisory derived from `humans.ts workingHours`). Launch is **enabled** but a warning `Alert` (default variant, amber accent) lists advisories; clicking Launch opens an `alert-dialog` "Launch with 1 warning?" → Launch anyway / Review.
  - **All-green (the money state):** every required check passes, gauge at `100%` glowing primary/green, header micro-copy "Pod is ready to launch." Launch CTA is solid primary, full-width, slightly glowing (`glow-pulse`-style). A green success `Alert` "All systems go — 7 agents, 4 accountable humans (one human can cover several agents), 3 tools connected, Slack wired."
  - **Launching:** clicking Launch swaps the panel/overlay to the transition screen (below).
  - **Edge cases:** *zero agents* → checklist collapses to a single primary blocker "Add at least one agent" linking to Catalog, all other checks greyed/`pending`. *Tool disconnected after passing* (health re-probe failed) → that row flips back to blocked and the gauge drops; surfaced honestly. *Roadmap tool selected as "required"* → row badge "Roadmap" with note "mocked connection — Live at GA," counts as satisfied for the demo but visibly flagged.
- **Mock data:** NEW dataset `src/mock/fireup.ts` (shared across the whole LAUNCH wizard cluster; this screen is its consumer/aggregator). Shape:
  - `PodDraft`: `{ id, name, blueprintId, tenancy: { mode: "dedicated", region: "EU-West", isolatedDb: true }, agentIds: AgentId[], connections: ConnectionDraft[], accountability: Record<AgentId, string | null> /* humanId or null */, slack: SlackWiring, budget: { monthlyCapUsd: number; onCapReached: "alert" | "pause-new-work" | "hard-pause" } /* set by the 6a panel */, status: "draft" | "launching" | "live" }`.
  - `ConnectionDraft`: `{ tool: "jira"|"drive"|"email"|"slack"|"github"|"teamwork", label, availability: "live"|"roadmap", health: "connected"|"unreachable"|"unconfigured", scopes: string[], required: boolean }`.
  - `SlackWiring`: `{ approverChannel: string | null, mappings: { event: "clarification"|"approval"|"escalation"|"daily-brief"; channel: string }[] }`.
  - `ReadinessCheck` (derived, computed by a `computeReadiness(draft)` selector — not stored): `{ id: "agents"|"accountability"|"tools"|"slack"|"budget"|"sla_targets"|"coverage"|"code_integration"|"knowledge"; label, status: "pass"|"blocked"|"warn"|"pending", severity: "required"|"advisory", detail: string, fixRoute: string, items?: { label, ok: boolean }[] }` (`budget`/`sla_targets` = the two new required checks satisfied by the 6a panel; `coverage` = the P1-O1 advisory; `code_integration` = the Blind-spot-3 advisory — "Bot collaborator invited · branch-protection compatible", rendered only when GitHub is connected, reading `src/mock/code-integration.ts`). Pull agent identities from `src/mock/agents.ts` (`coreAgents`), humans from `src/mock/humans.ts` (`humans`, `OWNERSHIP` as the default accountability seed), and Slack/channel labels from `src/mock/comms.ts` (`SCHEDULED`/channel strings). `computeReadiness` returns `{ checks, requiredAllPass: boolean, anyWarn: boolean, pct: number }` where `pct = passed required ÷ total required × 100`.
  - Seed a **happy-path "all green" draft** (the AutoMarket pod: the 7-agent chain BA+SA+UI/UX+Tasklist+Dev+Review+QA, covered by Ana/Marin/Ivan/Petra — one human covers several agents; Teamwork+Slack+GitHub connected, Slack wired) **and a "blocked" draft** (QA has no accountable human → accountability blocked; GitHub `unconfigured` → tools blocked) so both demo states are one prop away.
- **Interactions:**
  - Click a check row → `Collapsible`/`Accordion` expands its `items[]` (e.g. per-agent accountable-human list with ⚠ on the empty one; per-tool health with scopes).
  - **Fix** on a blocked row → router `navigate(check.fixRoute)` back into that wizard step; on return, `computeReadiness` re-runs and the row updates live.
  - **Launch pod** (enabled) → if `anyWarn` open the confirm `alert-dialog`, else go straight to launching. On confirm: set `draft.status = "launching"`, mount `LaunchOverlay`, write a mock `pod.launched` entry to the audit ledger (`actor` null per §8 — "when-only"), then route to `/` (Overview) on completion.
  - Editing the **6a panel** writes `slas`/`budget` to the draft; confirming flips the **"Budget cap set"** and **"SLA targets confirmed"** checks to pass — the demo gains a "we bound the spend before launch" beat.
  - **Back** → previous wizard step. A `sonner` toast confirms autosave of the draft ("Draft saved").
- **Copy:**
  - Header: "Readiness" · sub "Step 6 of 6 — confirm the pod is ready, then go live."
  - Check labels: "Agents added", "Every agent has an accountable human", "Required tools connected", "Slack wired", "Budget cap set", "SLA targets confirmed", "Coverage hours (advisory)", "Bot collaborator invited · branch-protection compatible (advisory, when GitHub is connected)", "Knowledge sources (optional)".
  - 6a panel: title "Targets & budget" · sub "Bound the spend and confirm targets before you go live." · cap policy labels "Alert only / Pause new work / Hard pause" · plan chip "Growth · pricing hypothesis" · confirm "Targets confirmed ✓".
  - Blocked banner: "**2 things to fix before launch** — resolve the required checks below to enable launch."
  - All-green banner: "**All systems go.** 7 agents · 4 accountable humans (one human can cover several) · 3 tools connected · Slack wired."
  - CTA: "**Launch pod**" (primary) / disabled tooltip "Resolve all required checks to launch." / Fix-row buttons: "Fix in Catalog", "Assign owner", "Connect tool", "Wire Slack."
  - Warning dialog: "Launch with 1 warning? — No Knowledge sources are connected. The pod will run, but agents won't draw on project memory yet." → "Launch anyway" / "Review."
  - Empty/zero-agents: "Add at least one agent to begin. Your pod needs a team."
- **Demo note:** This is the **0:00–0:30 LAUNCH payoff** — the presenter shows the **blocked** state first (one red row: "QA has no accountable human" — the accountability promise enforced *before* launch), clicks **Assign owner**, returns to an **all-green 100% gauge**, and clicks the glowing **Launch pod**. It is the single click that "does not exist yet" in the product and the highest-leverage moment to mock.

---

### Launching / Transition — `/pods/new?step=golive` (launch overlay state)  (NEW)
- **Purpose:** The brief, confidence-building transition between clicking **Launch pod** and landing on the Overview — proves the pod "stood up" without faking real infra (per §8, this is fast in-tenant config, not provisioning).
- **Persona & entry:** Same PM, immediately after clicking Launch on the all-green readiness gate. No nav; this is a modal-style overlay that owns the screen.
- **Layout:** Full-bleed centered overlay (a `Card` ~max-w-md on a dimmed backdrop, or a full-screen glass panel) over the dimmed wizard. Centered: pod name, an animated **launch sequence list** (3–5 steps), and an overall `Progress` bar. No left rail interaction during launch (rail dimmed).
- **Components:** `Card` + `CardContent`; `Progress` (overall, animates 0→100); a vertical **step list** where each line transitions `pending → in-progress (spinner) → done (CheckCircle2)`; reuse the `dot-pulse`/`glow-pulse` theme classes; `Button` only as a hidden "Cancel" affordance (ghost, appears after 4s if stuck). NEW component `LaunchOverlay` (drives the sequence on a timer). No new shadcn primitive needed.
- **States:**
  - **Sequencing (default):** steps tick through on a mocked timer (~400–700ms each): "Registering agents…" → "Verifying tool connections…" → "Wiring Slack routing…" → "Initializing pipeline…" → "Pod live." Progress fills alongside.
  - **Done:** all steps `done`, brief "Pod is live" flash with a green check, then auto-route to `/`.
  - **Error (edge):** if a mocked step "fails" (e.g. a tool went unreachable mid-launch), the step turns red, the sequence halts, and the overlay shows an `Alert` (destructive) "Launch halted — GitHub connection dropped" with **Retry** and **Back to readiness** buttons. This keeps the launch honest and reuses the incidents/recovery framing.
- **Mock data:** Drives off the same `PodDraft` (status flips `draft → launching → live`). Step list is a static array `LAUNCH_STEPS: { id, label, ms }[]` in `src/mock/fireup.ts`. No server call — a `setTimeout`/`requestAnimationFrame` sequence in `LaunchOverlay`. On completion, optionally seed/flag the pod as the active pod for the Overview (mock: set `aiops_project`-style active-pod cookie or context).
- **Interactions:** Auto-advancing; on final step, `navigate({ to: "/" })`. A `sonner` toast fires on landing: "AutoMarket pod is live." The mock `pod.launched` audit entry is written here.
- **Copy:** Title "Launching **AutoMarket** pod…" · steps as above · final "**Pod is live.** Taking you to Overview…" · error "Launch halted — {reason}. Nothing was lost; your draft is saved."
- **Demo note:** The ~2-second satisfying beat that bridges LAUNCH → RUN. Keep it short — it must not steal time from the RUN/MONITOR acts. The presenter clicks Launch and is on the Overview within ~2s.

---

### Post-Launch Landing (Overview, first-run framing) — `/`  (REFRAME)
- **Purpose:** Where the freshly launched pod lands — the existing Overview, but with a **first-run welcome ribbon** so the PM sees "your pod is live, here's what it's doing" instead of a cold dashboard. Closes the LAUNCH→RUN loop.
- **Persona & entry:** PM, auto-routed here the instant launch completes. Also the default landing on every subsequent visit (without the ribbon).
- **Layout:** Unchanged `RealCommandCenter` grid (KPI strip / lifecycle flow / agent status / work items, with the approvals+activity aside). The **only addition** is a dismissible **first-run ribbon** rendered above the KPI section on first visit after launch: a thin `Card`/banner spanning the main column.
- **Components:** Reuse `RealCommandCenter` wholesale (`KpiStrip`/`KpiTile`, `AgentStatusGrid`, `FlowRiver`/`LifecycleFlow`, `ActivityFeed`, `ApprovalsQueue`, `HumanGate`). NEW: `FirstRunRibbon` — a `Card` with a `CheckCircle2`, pod name, a 3-stat inline summary, a **dismiss** `Button` (ghost ×), and one CTA. No new primitive.
- **States:**
  - **First-run (just launched):** ribbon visible — "**AutoMarket pod is live.**" Because real runtime is deferred, the fleet/runs come from the existing mock/BA-real data so the dashboard is **populated, not empty**; if a genuinely empty pod, the KPI tiles show `—`/`0` and the lifecycle flow shows zeros with copy "Your agents are warming up — work will appear here as tickets flow in." This avoids the cold-blank trap (build-order item #11).
  - **Returning visit:** ribbon absent (dismissed flag persisted, e.g. cookie/localStorage keyed by pod id); standard Overview.
  - **Loading / error / populated:** inherited from `RealCommandCenter` (its `EmptyFleet`, polling, `LiveBadge`) — no new states.
- **Mock data:** Inherits the Overview's existing data path (`getCommandCenterFn`, mock fleet/runs/approvals). The ribbon reads pod name + the just-launched summary counts from the `PodDraft` in `src/mock/fireup.ts` (agents/humans/tools/slack counts). The "warming up" empty path uses the existing `LifecycleFlow` zero-state.
- **Interactions:** Dismiss × hides the ribbon and sets the seen-flag. Ribbon CTA "View pipeline" → `/pipeline` (so the presenter can walk into the RUN act). Ribbon stat chips are non-interactive (or each deep-links: agents→`/pod`, tools→`/connections`).
- **Copy:** Ribbon title "**AutoMarket pod is live**" · sub "7 agents working your backlog · 4 accountable humans (one human can cover several) · Slack wired to #automarket-dev" · CTA "View pipeline →" · dismiss tooltip "Dismiss." · warming-up empty: "Your agents are warming up — work appears here as tickets flow in."
- **Demo note:** The seam where the demo crosses from **LAUNCH into RUN (0:30)**. The ribbon makes the cut feel intentional — "you just built this pod, now watch it work" — and the presenter clicks **View pipeline** (or lets the first clarification gate appear in the approvals aside) to begin Act II.
- **Demo data binding (`seedInflow`):** the freshly-launched pod's data identity is resolved explicitly — it lands **empty** (the "warming up" state above) for ~5 seconds, then `seedInflow(podId)` (exported from `src/mock/demoDirector.ts`, also fired by the Demo Director's step 2) stages adoption: **AM-142 visibly arrives** in the Pipeline Backlog (bell pulses, ActivityFeed logs "Ticket AM-142 pulled from Teamwork — in scope: label `pod-owned`"), and the **BA run begins** (running shimmer in Ready for Spec). The other pods (Listr, Kasa) keep **distinct mini-datasets**, so switching pods after launch proves scoping is real re-scoping, not the sample pod's data wearing a new name. Manual fallback: the presenter pulls AM-142 by hand via **Work Intake** (`/intake`) for the same beat without the director.

---

**New mock file to add (shared by the whole LAUNCH cluster):** `/Users/zlatko.matokanovic/Documents/Development/aiops_dashboard/AI Ops Hub/src/mock/fireup.ts` — `PodDraft`, `ConnectionDraft`, `SlackWiring`, `ReadinessCheck`, `LAUNCH_STEPS`, plus `computeReadiness(draft)` selector and two seed drafts (all-green + blocked). It reuses identities from `src/mock/agents.ts` (`coreAgents`), `src/mock/humans.ts` (`humans`, `OWNERSHIP`), and channel labels from `src/mock/comms.ts`. *(As-built: the wizard is ONE route — `src/routes/pods.new.tsx` at `/pods/new?step=…` — with step bodies in `src/components/fireup/`; the launch overlay is a state within the `golive` step; draft/pod state lives in `src/lib/pods/pod-store.tsx` (localStorage `aiops_pods_v1`), and the post-launch landing reuses the existing `/` (`src/routes/index.tsx`) with the added `FirstRunRibbon`.)*


---

### Welcome & Accountability Handshake — `/welcome`  (NEW)
- **Status:** ✅ in the mock (wave 2) — route `src/routes/welcome.tsx`, components `src/components/welcome/*` + `gates/GatePolicyChip` (policy line from the new `src/mock/gate-policies.ts`). As-built: the first-gate walkthrough is a framed read-only gate pane (spec → the 8 validators → decision canon → ledger row) with coach-mark steps rather than a full `GateReviewShell` embed; the Accept CTA unlocks only after the walkthrough opens; acceptance persists in localStorage (`aiops_welcome_accepted_v1`), writes `accountability.accepted` via `audit-bridge`, then routes to `/`; demo variants (single / multi-agent / deputy / expired invite) switch via footer links; `/pod`'s matrix renders the amber assigned-not-accepted cell until accepted.
- **Purpose:** The accountable human's first session (P1-O2): a role **charter**, a guided **first-gate walkthrough**, and an explicit, audited **"Accept accountability"** action. Coverage isn't assigned, it's accepted — and provable.
- **Persona & entry:** Any invited human (PM / Eng Lead / QA Lead / deputy) following their one-time invite link, or deep-linked from an amber "assigned — not yet accepted" matrix cell on `/pod`. Renders inside the AppShell; rail de-emphasized until acceptance.
- **Layout:** Single centered column (`max-w-3xl`), three stacked stages with slim progress dots: (1) **Charter card** — "You're accountable for the **BA Agent**" + what it produces, the gate-clearance SLA and policy chip (from `gate-policies.ts`), and what rejecting does ("your note becomes the agent's added context"); (2) **First-gate walkthrough** — `GateReviewShell` in read-only coach-mark mode over a Sample-pod gate (4 marks: read the spec → check the validators → the decision panel → where the decision lands in the ledger); (3) **Accept accountability** — a duties summary + the primary CTA.
- **Components:** shadcn `card`, `button`, `badge`, `progress`, `alert-dialog` (accept confirm), `tooltip`, `avatar`, `separator`. REUSE `GateReviewShell` (read-only sample mode), `GatePolicyChip`, agent color tokens, `humans.ts`/`OWNERSHIP`. NEW: `WelcomeFlow`, `CharterCard`, `FirstGateWalkthrough` (coach-mark overlay), `AcceptAccountabilityPanel`.
- **States:** *fresh (invited, unaccepted):* full three-stage flow; CTA enables once the walkthrough has been opened. *already-accepted:* collapses to a read-only charter + "Accepted · {date}" stamp with the ledger pointer. *multiple agents:* one charter card per covered agent; a single Accept covers all, listed explicitly in the confirm. *deputy variant:* the covers-not-owns charter ("you cover when {name} is OOO; accountability stays with {name}"). *error (invalid/expired invite):* "This invite link has expired — ask your Pod Admin to re-send it."
- **Mock data:** No new dataset — joins `humans.ts` (invite fields + assignments), `gate-policies.ts` (the charter's policy line), and a Sample-pod gate from `gate-detail.ts`. Accept writes **`accountability.accepted`** via `appendAuditMock` (audit-bridge); the `/pod` matrix renders assigned-but-unaccepted cells amber until then.
- **Interactions:** Stage CTAs advance; coach-marks step through the sample gate; **Accept accountability** → `alert-dialog` ("This is recorded in the audit ledger") → writes `accountability.accepted`, flips the matrix cell from amber to the solid "A", routes to the role's landing. "This isn't me / wrong role" → notifies the Pod Admin (mock toast).
- **Copy:** Title "Welcome — you're the accountable human." Charter: "You're accountable for the **BA Agent** — it produces SPEC.md; you clear its gates within {sla}; rejecting returns work with your note as the agent's added context." CTA "**Accept accountability**". Confirm body "Acceptance is written to the audit ledger. Coverage is accepted, not assigned." Accepted stamp "Accepted · {date} · ledger #{n}". Expired: "This invite link has expired — ask your Pod Admin to re-send it."
- **Demo note:** Optional LAUNCH epilogue — flip to Ana's invite, accept on screen, and point at the matrix cell turning solid plus the `accountability.accepted` ledger row: the accountability story is end-to-end provable, not an org chart.


---

## RUN


### Overview (reframed) — `/index`  (REFRAME)
- **ROI baseline provenance (owner, 2026-06-12 — "clients rarely give us that info"):** the assumptions store's default provenance is now **"industry-standard"** (renamed from "Q-default"; flips to **"client-agreed"** on any edit — was "client-provided"), and the baseline got a Settings home: **Settings → ROI baseline** (`#roi`) — the rate + baseline-note editor (same `useRoiAssumptions` store as the /economics dialog, live-sync) plus the **"How ROI is measured" three-bucket explainer** (measured ledger facts · agreed inputs · arithmetic). Every save/reset writes `policy.changed "roi.baseline: $95/h (industry standard) → $110/h (client-agreed)"` — a baseline change changes reported ROI, so it's a recorded decision. The pitch ROI bullet states the policy in one line.
- **Rename (owner, 2026-06-12): "Command Center" → "Overview"** — the route head already said "Overview · Agency OS", so the nav label now matches; to avoid two "Overview" rail entries, the MONITOR economics label was renamed in the same pass ("Overview · ROI" → **"ROI & Economics"**). Internal directory `src/components/command-center/` stays (path, not copy). **Doorbell KPI (same day):** the KpiStrip leads with **"In Ready · awaiting you"** — the board-sent arrivals awaiting confirmation (confirm-first), linking to `/intake`, demo-reactive via the demo-bus tick; it replaced the off-persona "GPU util %" tile (infra metrics belong to ADVANCED · Observability). "Human intervents·24h" relabeled "Interventions · 24h".
- **Purpose:** The RUN landing — the live cockpit where a PM keeps a pod running: see what the board sent, see ROI at a glance, scan agent liveness-vs-activity, clear human gates, watch the stream, and *take control* (pause pod / pause agent) when something looks wrong.
- **Persona & entry:** Pod Admin / PM (primary). Lands here by default on sign-in and after **Launch pod** from the LAUNCH wizard. Engineering/QA leads pass through on the way to Pipeline/Gates. The TopBar pod-switcher scopes everything on this page to one pod.
- **Layout:** Reuses `AppShell` (TopBar + pillar-grouped LeftRail). Inside, a two-column grid mirroring today's `RealCommandCenter`: `xl:grid-cols-[1fr_360px]`.
  - **Row 0 — Pod control banner (NEW):** full-width strip above everything. Renders only when the pod or any agent is paused/escalated; otherwise collapses to a single-line "Pod running" status with the pause control on the right.
  - **Row 1 — ROI hero + KPI strip (REFRAME):** promote a wide **ROI hero tile** to the top-left, spanning ~2 columns of the KPI grid, with the remaining operational KPIs (Active artifacts, Success, Throughput, Median run, Connected) beside/below it. The hero is visually dominant (larger value, accent glow) — it's the wow number.
  - **Row 2 — Artifact lifecycle flow:** keep the existing `LifecycleFlow` band (in_progress → waiting → ready).
  - **Row 3 — Agent status grid:** keep the `AgentCard` grid (liveness-vs-activity split), now with a per-card pause affordance and paused styling.
  - **Row 4 — Work items table:** unchanged fleet work-items table.
  - **Right rail (sticky):** `ApprovalsQueue` (unified human gates) over `ActivityFeed`. Add an **Escalations** mini-panel above the activity feed when any escalation is open.
- **Components:**
  - *Reuse (real surface):* `RealCommandCenter` shell/grid, its `Kpi`/`Sparkline`/`Delta`, `LifecycleFlow`, `AgentCard`/`Ring`/`Stat`, `WorkItemsTable`, inner `ApprovalsQueue`, `ActivityFeed`, `HelpTip`, `LiveBadge`.
  - *Reuse (shadcn):* `alert` + `alert-dialog` (pause confirmation), `dialog`/`sheet` (escalation detail), `button`, `badge`, `tooltip`, `switch` or `toggle` (pause toggle), `dropdown-menu` (per-agent actions), `sonner` (toast on pause/resume), `separator`.
  - *NEW components:*
    - `RoiHeroTile` — the promoted hero (the canonical metric trio: `humanHoursDisplaced` + `costPerMerged` + `costPerStoryPoint`, with run-rate + budget-cap line). Metrics are tier-badged: cost-per-approved-spec and time-to-approved-spec carry **Live**; cost-per-merged and cost-per-story-point carry **"as agents ship."** The hero also exposes an **"Edit assumptions"** affordance (opens the `roiAssumptions` editor — blended rate, baseline, source — *your numbers, not ours*); ROI is computed **net of plan fees** (`pricePaidUsd`), never on raw compute cost.
    - `PodControlBar` — the Row-0 banner: pod run-state pill, Pause/Resume pod button (guarded by `alert-dialog`), and a live count of paused agents / open escalations.
    - `PausedOverlay` — a small reusable badge/scrim applied to a paused `AgentCard` and to the lifecycle band.
    - `AgentActionsMenu` — per-card `dropdown-menu` (Pause agent / Resume / Open agent / Escalate).
    - `EscalationsPanel` — right-rail mini list of open escalations with severity + routedTo (sources `ESCALATIONS` from `comms.ts`).
- **States:**
  - *Empty fleet:* keep `EmptyFleet` ("No agents connected") — but reframe copy to point at **New Pod (wizard)** instead of the dev Connections page.
  - *Loading:* SSR seeds populated first paint (as today via `initialData`); on cold client, `skeleton` placeholders for hero + KPI + agent cards.
  - *Populated / running:* Row-0 collapses to a slim green "Pod running" bar; all KPIs + hero live; agent dots show running/waiting/idle/error.
  - *Paused (pod):* Row-0 expands to an amber `alert` banner — "Pod paused by {actor} · {since}"; hero + KPIs dim to muted; every `AgentCard` gets `PausedOverlay`; `ActivityFeed` shows a "pod paused" lifecycle entry; the live poll badge reads "Paused" (greyed, no pulse).
  - *Paused (single agent):* only that `AgentCard` gets the overlay + amber border; Row-0 shows "1 agent paused" with a link that scrolls to it.
  - *Escalated:* Row-0 turns red-accented, shows open-escalation count; `EscalationsPanel` appears in the right rail above Activity.
  - *Edge — over-budget:* if projected run-rate > budget cap, the ROI hero's budget line turns red ("Projected $X / cap $Y — over") and Row-0 surfaces a budget escalation.
  - *Error:* an unreachable agent renders its existing `error` dot + "unreachable"; a failed poll keeps last-good data with a stale `LiveBadge`.
- **Mock data:**
  - *Liveness/activity grid + work items:* existing — `getCommandCenterFn()` (`fleet`, `runs`, `approvals`, `events`) for the real surface; the demo/mock variant uses `coreAgents` + `useLive()` (`src/mock/agents.ts`, the ticker). Agent state enum `running|waiting|idle|error` already drives dots.
  - *Activity + escalations:* `src/mock/activity.ts` (`seedActivity`) and `src/mock/comms.ts` (`ESCALATIONS`: `raisedBy`, `ticketId`, `trigger`, `routedTo`, `openedMinAgo`, severity).
  - *ROI hero:* source from `src/mock/economics.ts` `aggregates` (already holds `humanHoursDisplaced`, `costPerMerged`, `costPerStoryPoint` — note: `humanHoursEquivalent` exists only **per-ticket** in `economics.ts`; the aggregate field is `humanHoursDisplaced`). **ADD** if absent: `projectedMonthlyRunRate: number`, `budgetCapMonthly: number` (superseded by the appendix `budget` object), plus the appendix `roiAssumptions` block and `aggregates.pricePaidUsd`.
  - *NEW mock — pod run-state.* Add `src/mock/podControl.ts` exporting a `PodControlState`:
    - `podId: string`
    - `podState: "running" | "paused" | "escalated"`
    - `pausedBy?: string` (actor name; honestly null/`"—"` until auth — mirror the audit "when-only" stance)
    - `pausedAt?: string` (ISO)
    - `pausedReason?: string`
    - `agentOverrides: Record<AgentId, { state: "running" | "paused"; pausedBy?: string; pausedAt?: string }>` (only paused agents listed)
    - `openEscalations: number` (derived from `ESCALATIONS`)
    - A mutable in-memory store + `pausePod()/resumePod()/pauseAgent(id)/resumeAgent(id)` helpers (mirror the `useLive` approve/reject mutation pattern) so the demo toggles state client-side. Each call pushes an entry the `ActivityFeed`/audit can read.
- **Interactions:**
  - **Pause pod:** click "Pause pod" in `PodControlBar` → `alert-dialog` ("Pause this pod? In-flight runs finish their current turn; no new work starts. This is logged.") with an optional reason field → confirm → `pausePod(reason)` flips `podState`, dims the surface, toasts "Pod paused", writes an audit-shaped entry. Button swaps to **Resume pod**.
  - **Pause agent:** `AgentActionsMenu` (⋯ on each `AgentCard`) → "Pause agent" → same confirm pattern → only that card overlays; Row-0 reflects the count. "Resume" reverses it.
  - **Escalate:** menu "Escalate" opens a `dialog` to pick severity + routedTo (channel/person) → adds to `EscalationsPanel` and the comms stream; Row-0 goes escalated.
  - **ROI hero click:** deep-links to **ROI & Economics** (`/economics`) — the MONITOR landing — preserving the demo's "promoted here, full story there" framing.
  - **Gate click (right rail):** an item in `ApprovalsQueue` deep-links to **Gates** (`/approvals`) for the client-grade review surface.
  - **Agent card click:** unchanged — to `/agents/$agentId`.
  - **Live poll:** unchanged 4s poll; pauses with tab hidden. When `podState === "paused"`, suppress the pulse and label the badge "Paused".
- **Copy:**
  - Pod control bar (running): "Pod running · {n} agents · {n} gates open" + button "Pause pod".
  - Pod control bar (paused): "Pod paused — no new work is starting. {pausedBy ?? 'when-only'} · {since}" + button "Resume pod".
  - Pause dialog title: "Pause this pod?" Body: "In-flight runs finish their current turn; no new work is picked up. You can resume any time. This action is recorded in the audit log." Confirm: "Pause pod". Cancel: "Keep running".
  - Reason field placeholder: "Why are you pausing? (optional, appears in the audit trail)".
  - ROI hero label: "Return on investment" · primary value `humanHoursDisplaced` ("≈ {n} human-hours freed for higher-value work") · live-tier chips "{$}/approved spec" + "{h}h to approved spec" badged **Live** · secondary chips "{$}/merged ticket" and "{$}/story point" badged **as agents ship** · footer "Projected {$}/mo · cap {$}/mo · net of plan fees" · edit affordance "Edit assumptions — your numbers, not ours".
  - Over-budget footer: "Projected {$}/mo over the {$}/mo cap — review".
  - Escalations panel header: "Escalations ({n})"; empty: "No open escalations."
  - Agent paused overlay: "Paused".
  - Resume toast: "Pod resumed — agents will pick up new work."
  - Empty fleet (reframed): "No pod running yet — launch your first pod." CTA button: "New Pod" → wizard.
- **Demo note:** This is the **0:30 RUN** beat and the pivot to **1:45 MONITOR**. The ROI hero at the very top *is* the wow-moment teaser (full reveal lives on `/economics`), staging "lead with ROI, not autonomy." The **Pause pod** control is the explicit answer to the buyer's *"can I stop it?"* control objection from product-vision §10 — demo it live: click Pause, the whole cockpit visibly dims to the amber paused state, then Resume. The paused/escalated state and `EscalationsPanel` set up the handoff to **Comms & Escalations** and **Incidents & Recovery**.

---

Files read to ground this spec (all absolute):
- `/Users/zlatko.matokanovic/Documents/Development/aiops_dashboard/AI Ops Hub/docs/product-vision.md`
- `/Users/zlatko.matokanovic/Documents/Development/aiops_dashboard/AI Ops Hub/src/components/command-center/{RealCommandCenter,KpiStrip,KpiTile,AgentStatusGrid,FlowRiver,ActivityFeed,ApprovalsQueue,HumanGate}.tsx`
- `/Users/zlatko.matokanovic/Documents/Development/aiops_dashboard/AI Ops Hub/src/mock/{activity,runs,agents}.ts`

Two load-bearing facts for the mock-builder: (1) the live surface is `RealCommandCenter.tsx` wired to `/index` via `getCommandCenterFn()`, while `KpiStrip/AgentStatusGrid/FlowRiver/ActivityFeed/ApprovalsQueue/HumanGate` are the older `useLive()`-driven mock variant — the reframe targets the Real surface but the demo state machine (pause/escalate) should live in a new `src/mock/podControl.ts` store that mutates like `useLive`'s `approve/reject`. (2) the aggregate ROI fields in `src/mock/economics.ts` are `humanHoursDisplaced`, `costPerMerged`, `costPerStoryPoint` (`humanHoursEquivalent` is per-ticket only — do not read it as an aggregate); net-new are the `budget` object (which absorbs `projectedMonthlyRunRate`/`budgetCapMonthly`), `roiAssumptions`, and `aggregates.pricePaidUsd`.


### Pipeline Board — `/pipeline`  (REFRAME)
- **Tracker-boundary as-built (2026-06-11):** the board is explicitly the **execution view** — header subline "Execution view — your tracker stays the system of record. Plain status + artifact links write back automatically." + a "tracker: Teamwork · write-back on" mono chip; each card carries a quiet "↩ wrote back: In Progress / In Review / Done + artifact links" footer derived from `WRITE_BACK_MAPPING` (tooltip = full mapping). Deliberately NO ticket-CRUD affordances (the litmus rule: anything you'd do in Jira doesn't belong here). The previously-flagged canon gap is **FIXED (2026-06-11)**: the reject back-arrow now opens a decision dialog — typed reason required (min 10 chars, same floor as the gate surfaces), written to the session ledger as `gate.rejected` ("{from} → {to}: {reason}") with the "your note becomes the agent's added context" framing. **Drag-and-drop REMOVED (same day, owner call)** — the board now fully obeys the no-freeform-moves rule (vision §2): cards move only when agents finish / gates clear (demo-bus + live ticker) or via the audited reject; review cards carry a "gate →" link to the canonical `/approvals` surface (where approve lives); the header subline states it ("Cards move as agents finish and gates clear — no dragging"). The old drag-to-approve confirm dialog is gone.
- **Purpose:** A kanban over the lifecycle where work visibly flows agent→human→agent; the live "the pod is working" surface during the demo.
- **Persona & entry:** Pod Admin/PM and Engineering Lead. Entry: RUN section of the left rail, from the Overview pipeline KPI tile, or a Cmd-K deep-link to a ticket.
- **Layout:** Reuses the existing AppShell. Header row (project label + title + helper line, plus Day/Night toggle) over a horizontally-scrolling 14-column board: `Backlog → Ready for Spec → Spec Review → Ready for Design → Design Review → Ready for UI/UX → UIX Review → Ready for Tasks → Tasks Review → Ready for Dev → Dev Review → Ready for QA → QA Review → Done`. (DevOps/Release rides post-QA: a `Ready for Release → Release Review` pair appears before `Done` when the DevOps agent is added — the default board mirrors the 7-node demo pod.) Agent columns are agent-tinted; review columns are amber and show the accountable human; queue/done are neutral. Keep the existing 260px column width and per-card progress bar.
- **Components:**
  - REUSE: `src/components/pipeline/PipelineBoard.tsx` (the whole board + `TicketCard`), `accountableFor` from `humans.ts`, `useLive` ticker. Extend the reused `GATES`/`GATE_AGENT` mapping with the `uix` gate/agent pair so the new `Ready for UI/UX → UIX Review` column pair renders.
  - shadcn primitives to fold in (currently hand-rolled — swap for consistency): `tooltip` (the reject back-arrow hint, age chips), `scroll-area` (the board horizontal scroll), `badge` (codebase/priority/rerun chips), `toggle-group` (Day/Night).
  - As-built additions: the **"gate →" link** on cards sitting in any `*-review` column deep-links to the canonical `/approvals` surface (approve lives there — never on the board); a **filter bar** (codebase, priority, accountable human, overnight-eligible) above the board remains open (list-filtering reframe).
- **States:**
  - *empty (new pod):* board renders all 14 columns with a single dashed "No work yet — tickets arrive when your board sends them" card in Backlog; CTA "Open Work intake →" deep-links to **Work Intake** (`/intake`, specced below).
  - *loading:* `skeleton` cards (2–3 per column).
  - *populated:* current seed — every column has cards; agent columns show "agent running…" shimmer when a ticket is mid-run.
  - *agent-running edge:* the existing 4s edge-flow animation + auto-advance to the next review column.
  - *error:* a card whose ticket `state==="error"` gets a red left border and an "Agent failed — open incident" link (deep-links to Incidents & Recovery).
- **Mock data:** `src/mock/tickets.ts` (live ticker seed) + the in-file `extraTickets` so every column is populated. No new dataset; optionally promote `extraTickets` into `tickets.ts` so the board and gates share one source. Drives off `Ticket` (`stage`, `state`, `approver`, `codebase`, `priority`, `overnightEligible`, `rerunCount`).
- **Interactions:**
  - **NO drag anywhere (locked — vision §2 "no freeform stage moves"):** cards are not draggable at all — pipeline stages advance only via **events** (agent runs completing, gates clearing, Demo Director beats); the dashboard is a control plane, not an orchestrator. When an upstream run completes, the card advances on its own with the running shimmer.
  - **Approve lives on the gate surfaces:** review-column cards carry a **"gate →" link** to `/approvals`; there is no approve affordance on the board.
  - **Reject back-arrow on review cards = a decision, not a move — and it targets the ROOT CAUSE (vision §2 "rework follows the artifact chain", 2026-06-11):** the typed-reason dialog (min 10 chars) carries a **stage picker** listing every upstream agent stage (default = this gate's agent); picking an earlier stage (QA Review → Design) shows the cascade note — downstream agents are stale (consumes-graph) and re-run forward. On confirm: ticket moves to the target stage with `state: running` + `rerunCount+1` (the visible rework cost), `gate.rejected "{gate} → {target}: {reason} · downstream re-runs forward (…)"` lands on the session ledger, and rerun ≥ 2 notes the accountable-human escalation in dialog + toast.
  - Click a card title → opens the Gate Review surface (for review stages) or Traceability (for non-review stages).
- **Copy:** Title "Pipeline Board"; subline "Execution view — your tracker stays the system of record. Plain status + artifact links write back automatically. Cards move as agents finish and gates clear — no dragging; decisions happen on the gate surfaces." Empty Backlog: "No work yet — tickets arrive when your board sends them." Overnight banner: "Overnight run scheduled 22:00 UTC."
- **Demo note:** 0:30 RUN beat — the client's drag on the board sends the ticket in → it flows to Ready for Spec → BA runs → lands in **Spec Review**; the PM clicks "gate →" to jump to the client-grade surface.

---

### Work Intake — `/intake`  (NEW)
- **Design note (2026-06-11, tracker boundary) → ✅ AS-BUILT (same day; single-doorbell clarification applied):** the board drag is the **ONLY start signal in both modes** — `/intake` ships the **start-policy control** (confirm-first default — "the board starts it, the operator confirms"; vs auto-start; switching confirms → `policy.changed "intake.startPolicy: confirm-first → auto-start"` on the session ledger), the **always-on listening banner** ("Listening to Teamwork · board 'AutoMarket delivery' · column Ready → starts the chain / → arrives for your confirmation" per policy) with the idempotent **"Simulate a drag on the board"** demo affordance (AM-112 arrives with a `drag-to-Ready` provenance chip; a second click toasts "the doorbell is idempotent"), per-ticket **provenance chips** (operator-confirmed / drag-to-Ready), and the **write-back strip** with the echo-loop micro-note. Files: `src/components/intake/TriggerModeControl.tsx`, `src/mock/trigger.ts`. Honesty line on-screen: "activation always comes from the board — Agency OS confirms or auto-accepts, never originates." **Decline + draft reframe (same day):** the picker is the confirmation surface — header "What the board sent — confirm or decline each start"; footer CTAs are **"Confirm start — n tickets"** and **"Decline — return to board"** (typed reason ≥10 chars → rows leave the list, `gate.rejected "intake declined → returned to To-Do: {reason}"` on the session ledger, toast "returned to To-Do on 'AutoMarket delivery' — comment posted"); the dialog states the canon ("decline = not actionable / out of scope — if it's real but unclear, confirm and let the BA ask"). **The composer tab is REMOVED entirely (same day, owner call)** — ticket creation happens on the board, full stop; `/intake` is single-purpose (the confirmation surface; no tabs), its header states "Tickets are created on the board, never here", and the not-connected state points to the tracker + the LAUNCH readiness check instead of a paste fallback. (`TicketComposer.tsx` deleted AND the `composeTicket` seam removed from `src/mock/intake.ts`; a future "draft to board" convenience is registered in vision §2 — it would write INTO the tracker via the connector API, never beside it.)
- **Truth audit (2026-06-11, after the owner's "is it true now?" challenge) — `arrived` gating landed:** rows now carry three states — **on the board** (in scope, NOT sent — visible, muted, checkbox disabled, tooltip "starts when the client drags it into 'Ready'") → **in Ready** (indigo — the board sent it; confirm/decline) → **In pod** (started; an entry chip shows HOW: "started · drag-to-Ready" vs "started · operator-confirmed"). Only arrivals are selectable: **this screen cannot originate work** (`pickableTickets()` requires `arrived`). The counts line leads with "{n} in Ready awaiting you"; a no-arrivals hint replaces dead CTAs. **Auto-start now means auto-start:** in tracker mode the simulated drag calls `pullTickets()` immediately ("started automatically — BA picks it up"); confirm-first leaves it awaiting. The pipeline's "+ Add work" CTA was relabeled **"Work intake"** (Inbox icon — never "add").
- **Purpose:** The **confirmation surface of the single doorbell** — what the board sent, confirmed or declined: arrivals (scoped tickets the client dragged into the agreed column) wait here under confirm-first, with a per-ticket **routing preview** showing exactly which agent takes a confirmed start first. Nothing on this screen originates work — tickets are created on the board, never here. The stage for the demo's 0:30 "the board sends a ticket" beat.
- **Persona & entry:** Pod Admin / PM. Entered from the **Pipeline header action** ("Work intake", Inbox icon — never "add"), and from the product's empty-state CTAs (Overview empty, Pipeline empty Backlog, post-launch "warming up" ribbon) which deep-link here as the "where work arrives" surface.
- **Layout:** AppShell content, `max-w-5xl`, single-purpose (no tabs): header (title + sub + the **start-policy control**) → the **always-on listening banner** → the confirmation `table`: header row (connector chip "Teamwork · Connected" + the scope sentence with an "Edit scope" link + the counts line "{n} in Ready awaiting you · {m} in scope · {k} stay with your team") over rows in three truthful states — **on the board** (in scope, not sent: muted, checkbox disabled, tooltip "starts when the client drags it into 'Ready'") → **in Ready** (indigo — arrived; selectable) → **In pod** (greyed, entry chip "started · drag-to-Ready / started · operator-confirmed"). Below: the **write-back strip** + sticky footer ("{n} selected" + the mode chip + **"Decline — return to board"** + **"Confirm start — {n} tickets"**).
  - *Routing preview:* a compact rail per selected arrival: "AM-109 → **Backlog** → **Ready for Spec** → BA Agent runs first · {accountable} accountable" — derived from `chain.ts` (the first pipeline agent whose `consumes` is empty, i.e. BA).
- **Components:** shadcn: `table` + `checkbox`, `badge` (connector/label/priority/state chips), `button`, `alert` (not-connected gate, tracker error), `tooltip`, `sonner`, `skeleton`; the hand-rolled glass dialog idiom for decline. REUSE: connector identity + health from `connectors.ts`; the chain ordering from `chain.ts`; the trigger store from `trigger.ts`. AS-BUILT: `WorkIntakeView`, `TicketPickerTable`, `TriggerModeControl` (+ `TriggerListeningBanner`, `WriteBackStrip`), `RoutingPreview`.
- **States:**
  - *not connected (gate):* `alert` "Connect Teamwork or Jira — work arrives from your board." + CTA to Connect; copy points at the LAUNCH readiness check (no paste fallback exists).
  - *loading:* `skeleton` rows while the (mocked) board fetch resolves.
  - *populated:* the three row states above; only "in Ready" rows are selectable.
  - *no arrivals:* footer hint — confirm-first: "Nothing awaiting confirmation — tickets arrive here when the board sends them (drag to 'Ready')"; auto-start: "No pending arrivals — under auto-start, tickets start the moment the board sends them."
  - *auto-start with leftover confirm-first arrivals:* an amber bridge line — "{n} arrivals from the confirm-first era still need your decision — new drags start automatically."
  - *empty (scope matches nothing):* "Your scope matches no open tickets — widen it in the Connect step." + "Edit scope" link.
  - *error:* destructive `alert` "Couldn't reach Teamwork — retry"; "The board fetch failed — arrivals resume when the connector recovers."
- **Mock data:** `src/mock/intake.ts`: `intakeBacklog(): IntakeTicket[]` (`{ id; title; labels; priority; ageDays; inScope; pulled; arrived; provenance? }` — derived per render from `backlog.ts` + `trigger.ts`; ARRIVED_SEEDS = the rows the client already dragged to Ready, with matching `"To Do — Refined"` board status; AM-112/117/120 seed the "on the board" state, AM-112 being the simulate-drag target) + `pullTickets(ids, provenance)` (skips non-arrived rows — the seam enforces the doorbell; records start provenance) ; decline state lives in `trigger.ts` (`recordDecline` → back to "on the board", board status back to Backlog). Routing preview computed from `chain.ts` (no stored data).
- **Interactions:** Select arrivals → footer counts up → **"Confirm start — {n} tickets"** → rows flip to "In pod" with the operator-confirmed entry chip, toast "{id} confirmed — routing to BA Agent", tickets appear in the Pipeline Backlog, the bell increments. **"Decline — return to board"** → typed-reason dialog (min 10 chars; the dialog states the canon: "decline = not actionable / out of scope — if it's real but unclear, confirm it and let the BA ask") → the row drops back to **"on the board"**, `gate.rejected "intake declined → returned to To-Do: {reason}"` lands on the session ledger, toast "returned to To-Do on '{board}' — comment posted ([AgencyOS] tagged)". The start-policy control switches confirm-first ↔ auto-start via a ledger-confirmed dialog (`policy.changed "intake.startPolicy: …"`); in auto-start, the listening banner's "Simulate a drag" starts the arrival immediately (`started · drag-to-Ready`). "Edit scope" → the Connect sub-screen 3b. Routing preview rows deep-link to `/pipeline?ticket=<id>`.
- **Copy:** Title "Work intake". Sub "What the board sent — confirm or decline each start. Tickets are created on the board, never here." Scope sentence "Your pod's scope: AutoMarket · `pod-owned` plus tickets the client flagged for the pod." Footer CTAs "Confirm start — {n} tickets" / "Decline — return to board". Honesty line "activation always comes from the board — Agency OS confirms or auto-accepts, never originates · agent-to-agent activation runs inside Agency OS."
- **Demo note:** The stage for **0:30 RUN** — the Demo Director's `seedInflow` retells the client's drag ("AM-142 dragged to Ready · pod starts — start confirmed (confirm-first)"), or the presenter flips to auto-start and clicks "Simulate a drag on the board" to watch AM-112 walk in and start itself. The decline beat ("wrong ticket → back to the board, on the record") is the governance counterpoint.

---

### Gates — Approvals + Clarifications (unified queue) — `/approvals`  (REFRAME)
- **Purpose:** One queue, **two kinds** of human checkpoint — *approval* gates (artifact sign-off) and *clarification* gates (agent needs an answer to proceed). The single place a human clears everything blocking the pod.
- **Persona & entry:** PM (all gates), QA Lead and Engineering Lead (role-scoped subsets). Entry: RUN rail, the Overview human-gate queue, the notification bell ("my gates"), a Slack deep-link, or a Pipeline review card.
- **Layout:** Reuses AppShell. Header (kicker "human gates" + title "Gates"). Below: the existing 4-up stat strip, then per-human summary chips, then the filter bar, then the gate list. The KEY reframe: add a **kind switch** (`tabs` or `toggle-group`: "All · Approvals · Clarifications") and a leading **kind glyph** on every row. Each row also carries a **gate-policy chip** (from `gate-policies.ts`, P1-G1: e.g. `PM · 1-eye · ≤4h · L0 review-all`) so the policy behind every checkpoint is visible at the row. Each row stays an accordion that expands to a decision panel.
- **Components:**
  - REUSE: `src/components/approvals/ApprovalsView.tsx` (stats, per-human chips, filters, `ApprovalRow`, `ArtifactPreview` which already renders Spec/Design/Tasks/Code/QA previews — extend it with a `uix-ui-spec` renderer for the UI/UX stage), `accountableFor`/`activeHumans`.
  - shadcn primitives: `tabs` (kind switch), `badge` (gate/kind/SLA chips), `accordion` or `collapsible` (replace hand-rolled expand), `textarea` + `form` (the required reason — see below), `tooltip`, `select` (approver/age filters on small screens), `sonner` (existing toasts).
  - NEW components: **`ClarificationCard`** — for `kind==="clarification"` rows: renders the agent's question, the proposed options/free-text answer field, and a "Send answer" button (the BA Slack clarification gate surfaced in-app). **`RequiredReason`** — the shared decision-reason field. **Canon (P1-G1):** a typed reason is **REQUIRED on reject and on override**; **approve** offers optional structured **quick-reason chips** ("Meets EARS" · "Validators 8/8" · "Scope confirmed") plus an optional free-text note — clean approvals stay one click, so the ledger never fills with forced "Looks good" attestations. The reject reason feeds the agent's rerun context and the human-decision audit. *(As-built note: the shipped mock — GateReviewShell + the Gates queue, build #12 — already implements exactly this policy.)* **`GatePolicyChip`** — renders the row's `GatePolicy` summary.
- **States:**
  - *empty:* "All clear — no gates waiting. The pod is running unblocked." with a subtle check illustration.
  - *loading:* `skeleton` rows.
  - *populated:* current seed of approvals; clarification rows interleaved by `openedAt`.
  - *SLA breach edge:* rows ≥60m old get red `AlertTriangle` + "breach" meta; the stat tile turns error-toned (existing).
  - *filtered-empty:* "No gates match these filters."
  - *resolved (optimistic):* on decide, row collapses out with a toast and the count decrements.
- **Mock data:** `src/mock/approvals.ts` (derived from `tickets.ts`) for approval gates. NEW: extend with **clarification** gates — add a `ClarificationGate[]` to `approvals.ts` (or a `gates.ts`) with fields: `id`, `ticketId`, `kind:"clarification"`, `agentId:AgentId`, `question:string`, `options?:string[]`, `proposedAnswer?:string`, `accountable:string` (human id), `openedAt:number`. Maps to the contract's `HITLGate{ kind:'approval'|'clarification'; state:'open'|'resolved'|'expired' }`. Reuse `mock/governance.ts` `openDecisions` as the seed material for 2–3 clarifications (e.g. "Geo search engine: PostGIS vs Elasticsearch?" routed to Marin). NEW `src/mock/gate-policies.ts` (shape in the appendix) supplies the per-`ArtifactKind` `GatePolicy` rendered as each row's policy chip and the gate-review header chip.
- **Interactions:**
  - Switch kind tab → filters the list to approvals / clarifications / all.
  - Expand an **approval** row → renders the artifact preview + decision panel. For **Spec Review** (and Design Review), the primary CTA is **"Open full review →"** which routes to the client-grade Gate Review surface; inline approve/reject remains as a fast path (reject still requires the typed reason).
  - Expand a **clarification** row → answer inline (pick option or type), "Send answer" → ticket unblocks, toast "Answer sent to BA Agent — rerunning," audited as `clarification.answered`.
  - Approve (optional quick-reason chips/note) → ticket advances a stage, toast, audit record written (`gate.approved`, chips/note captured as `reason`).
  - Reject (typed reason REQUIRED) → ticket returns to the producing agent with the reason as added context, `rerunCount++` (`gate.rejected`).
- **Copy:** Title "Gates"; helper "Every pending human checkpoint — approvals to sign off and clarifications the agents need answered." Kind tabs: "All / Approvals / Clarifications." Reason label: "Decision note (required on reject)"; approve quick-reason chips "Meets EARS" · "Validators 8/8" · "Scope confirmed" + optional note placeholder "Add a note (optional)"; reject placeholder "What's missing or wrong? This becomes the agent's added context on rerun." Policy chip e.g. "PM · 1-eye · ≤4h · L0 review-all." Empty: "All clear — the pod is running unblocked."
- **Demo note:** 0:30 RUN beat — "a Slack clarification gate fires; the PM answers; the spec advances to ready; an approval gate appears in the unified queue." This screen shows both kinds in one place; the PM answers the clarification here, then opens the spec approval.

---

### Spec Review (client-grade gate review) — `/approvals/$gateId`  (NEW)
- **Design Review fleshed out (owner ask, 2026-06-12) — the SA twin is AS-BUILT:** Design Review gates now render a FULL client-grade review through the same shell: an enriched `design.md` (trace.ts — Approach / Architecture & components / API contract / Data model / NFR budgets / Failure modes & fallbacks / Constraints / Decisions; header pins `consumes spec.md@v2`), a **spec → design coverage map** (`DesignTraceMap` — every consumed-spec AC → the design sections that address it; the consumes-graph made reviewable), **decision records** (`DecisionRecordsList` — 3 ADRs with chosen-vs-alternatives + rationale; ADR-3 deliberately marked Low-confidence — "where your review earns its keep"), and the design's OWN deterministic check family — **`sa-design@2.1.0`, 7 checks D1–D7** (validators.ts: spec coverage, interface contracts, data-model integrity, component reachability, failure modes, NFR budget, consumed-version pin) with its own honesty line ("…not whether it's the right architecture"). **Never "the 8"** — that's the BA's moat claim; and a TRUTH FIX landed with it: non-spec/non-design gates no longer borrow the BA's validators (they render none until their family ships). Validator-row click lands on the coverage map; failing D1 rows show "not addressed" red. Demo pair: **appr-AM-138** (clean 7/7) and **appr-AM-140** (returned 2× · D1 fail "AC-2, AC-5 unmapped" + D5 warn — the imperfect beat).
- **Gate decisions MOVE the ticket (owner challenge, same day: "if human rejects the QA, what happens? is it visible where the task goes?") — AS-BUILT:** previously a gate decision only wrote the ledger and resolved the queue row — the pipeline card never moved (a truth gap, contradicting the Defects block's own copy). Now: **Approve** restages the ticket to the gate's next stage (`NEXT_STAGE_ID_AFTER_APPROVAL`; QA approval → Done, state approved) and **Reject** restages it to a **root-cause target** — the decision panel gains a chain-ordered "Reject sends back to" picker (default = the gate's own agent; on QA gates the report's highest-severity defect PROPOSES the target — AM-144 pre-selects SA with "proposed from AM-144-QA-1's root-cause trace — override if you disagree"), shows the cascade line ("SA re-runs first — downstream Tasklist, Dev, QA are stale and re-run forward"), bumps `rerunCount` (restageTicket gained the field), and the reject button reads "Reject & return to {target}". Ledger detail matches the pipeline format: `QA approval → Ready for Design: {reason} · downstream re-runs forward (Tasklist, Dev, QA)`. Both toasts carry a **"View on board"** action; spec gates (single upstream) hide the picker. Verified: reject AM-144→SA lands the card in Ready for Design (running · rerun 1 · write-back still "In Progress"); approve AM-128 lands it in Ready for Design.
- **QA Review fleshed out (owner ask, same day) — the third twin AS-BUILT:** QA gates render the full client-grade review: `qaReportMd` (trace.ts — built FROM `qaReport(t)`'s data so Traceability stays one source; Summary / Scope & environments / Results by suite / Performance vs budget (measured p95 174ms vs the 200ms bound) / Flaky & quarantined (Healer repairs recorded, never skipped) / Defects / Recommendation; pins `verifies PR #421 against spec.md@v2`), a **spec → test coverage map** (`QaCoverageMap` — every original-spec AC → named tests with pass/fail; "the chain closes where it started"; AC-5's failing telemetry test links defect QA-2), **defects + verdict** (`DefectsList` — each defect names its **suspected root-cause stage** ("traces to: Design (SA)" / "Implementation (Dev · web)") feeding the rework canon, plus the agent's **HOLD/SHIP banner**), and the report's own family **`qa-report@1.0.7`, 7 checks Q1–Q7**. The deliberate honesty beat: AM-144 shows **7/7 structural checks pass while the verdict is HOLD** — the checks prove the report's shape, not that the product works (QA_HONESTY_LINE says exactly that). Demo gate: **appr-AM-144**.
- **Purpose:** The KEY new surface — a **client-grade, in-app review of a SPEC.md**: render the spec, the EARS acceptance criteria, the agent's own notes, and the **deterministic (zero-LLM) structural validator results**, then **Approve (one click, optional quick-reason chips) / Reject (typed reason REQUIRED)**. A paying PM signs off here, inside Agency OS — never dropped into the BA's own tool except as a labeled fallback.
- **Persona & entry:** PM (spec owner) and BA-accountable human (Ana). Entry: from a Pipeline "Open review →" card in Spec Review, from a Gates row "Open full review →", from a Slack approval link, or Cmd-K. Generalizes to `/approvals/$gateId` so Design/UIX-UI-Spec/Tasks/Dev/QA reviews can reuse the same shell with their own facet renderer; **Spec is the fleshed-out one.** *(As-built: route file `src/routes/approvals_.$gateId.tsx` — the trailing underscore un-nests it from `/approvals` on purpose; `ApprovalsView` has no `Outlet`.)*
- **Layout:** Full-height AppShell content. Top: a **review header bar** — ticket id + title, gate kind badge ("Spec approval"), producing agent (BA), accountable human avatar, SLA/age chip, a **gate-policy chip** ("PM · 1-eye · ≤4h · L0 review-all", from `gate-policies.ts`), an **input-provenance chip** ("Sources: 1 customer-submitted ticket · 2 internal docs — external content treated as untrusted"), and right-aligned **Approve / Reject** buttons (sticky). Body is a 3-region grid:
  - **Left rail (≈220px):** an in-document **outline/section nav** (Problem, User stories, Acceptance criteria, Non-goals) + the validator summary score.
  - **Center (1fr):** the rendered **SPEC.md** (via `MarkdownLite`), with the **EARS acceptance-criteria** block called out as a structured, checkable list; below the doc, a collapsible **run-story timeline** (the plain-language run narrative).
  - **Right rail (≈320px):** the **Agent's notes panel** (badged "Self-reported by the agent · advisory") ABOVE the **Structural Validator panel** (badged "Validated deterministically — no LLM in the loop") + the **Decision panel** (quick-reason chips on approve, required reason on reject, deep-link fallback, prior-decision history).
- **Components:**
  - REUSE: `SpecPreview`/`MarkdownLite` from `TraceabilityView.tsx` (renders `specMd(ticket)`); `accountableFor`/`humans`; `buildLineage` (for the rejection-loop history of this ticket); the `Ticket` from `useLive`.
  - shadcn primitives: `scroll-area` (center doc), `card` (validator + decision panels), `badge` (the zero-LLM badge, EARS pass/fail chips, SLA), `separator`, `progress` (validator score ring/bar), `textarea` + `form` (required reason), `alert-dialog` (confirm "Approve — this advances the ticket and is recorded in the audit log"), `tooltip`, `breadcrumb` (Pipeline / Spec Review / AM-142), `tabs` (optional: "Spec | EARS | Validators | History").
  - NEW components:
    - **`GateReviewShell`** — the route layout + header + sticky decision bar; one shell, per-kind facet renderers. *(The P1-H2 rename `SpecReviewShell` → `GateReviewShell` is DONE as-built: `src/components/gates/GateReviewShell.tsx`.)*
    - **`EarsCriteriaList`** — renders each acceptance criterion in EARS shape with a per-criterion structural badge (has trigger? has measurable response? has AC-ID?). Checkbox-style, read-only validator state (NOT a human checklist).
    - **`StructuralValidatorPanel`** — the moat surface: a list of **deterministic checks** with pass/fail/warn, each labeled "checked in code." Headline badge: *"Validated deterministically — no LLM in the loop."* Sub-line: *"Structural quality, not semantic — we check shape, not meaning."* (honest language per vision §3-ACT III).
    - **`DecisionPanel`** — the reason-policy canon (P1-G1, as-built): **Approve is enabled immediately**, with optional structured quick-reason chips + an optional note; a typed reason is **REQUIRED on Reject** and on **overriding** failing checks (recorded as `gate.override`); writes the human-decision audit record; shows the deep-link fallback as a quiet secondary link.
    - **`AgentNotesPanel`** — the agent's self-report (`agentSelfReport`): **assumptions as flaggable rows** (flagging one pre-fills the reject reason), open questions, per-section **confidence dots**, and citations deep-linking into knowledge/constitution sources. Badged **"Self-reported by the agent · advisory"** — a third, clearly-walled signal class beside the deterministic checks and the LLM-advisory signals; it must never visually blend with either wall.
    - **`RunStoryTimeline`** — the plain-language run narrative derived from `trace.ts`/flow: sources read, clarifications asked & answered, checks run, cost — the same story the weekly report links per delivered item ("every delivered item links to its run story").
    - **`ProvenanceChip`** — the input-provenance header chip; external/customer-submitted content is flagged untrusted (part of the layered injection defense).
- **States:**
  - *loading:* skeleton doc + skeleton validator rows.
  - *populated (default):* full spec + criteria + validators; some validators warn (demoable imperfection).
  - *all-pass:* validator panel header turns green, "Structurally ready — 8/8 checks pass."
  - *has-failures:* failing checks pinned to top in red; Approve still allowed but a `tooltip`/inline note warns "2 structural checks failing — approving overrides them" (recorded as `gate.override`; a typed override reason is REQUIRED).
  - *agent-notes:* populated by default (2–3 assumptions + 1 open question + confidence dots); flagging an assumption tints the row amber and pre-fills the reject note; empty → "No self-reported notes for this run."
  - *already-decided:* if the gate is resolved, the decision panel collapses to a read-only stamp "Approved by Zlatko · 12m ago · 'reason'" with the audit pointer.
  - *rejected-then-fixed history:* if `rerunCount>0`, a banner "This spec was returned once — v2" with the prior feedback (from `buildLineage().reject`).
  - *error / spec unavailable:* "Couldn't render the spec in-app" + prominent **"Open in BA flow-observer ↗"** fallback deep-link.
- **Mock data:**
  - Body: `specMd(ticket)` from `mock/trace.ts` (already EARS-flavored: "Endpoint p95 latency < 200ms", "Empty state renders…", "Pagination uses cursor"). 
  - NEW mock to add (in `trace.ts` or a new `mock/specReview.ts`): a **`specValidators(ticket)`** returning `{ score:number, checks: Array<{ id:ValidatorCheckId; label:string; kind:"structural"; status:"pass"|"warn"|"fail"; detail:string; deterministic:true }> }`. The check ids are **BA's real validator registry ids** (from `agents/ba/pipeline/validators.py` `_STRUCTURAL_CHECK_IDS`; V3 retired), seeded **all 8**: `V1_ears_coverage` (every AC is EARS-formatted; <80% coverage fails), `V2_missing_section` (all canonical SPEC.md sections present), `V4_ac_id_parity` (AC IDs match between Sections 4 ↔ 11), `V5_br_references` (every business rule referenced in Section 14 exists in Section 5), `V6_eh_message_parity` (error-handling messages match between Sections 14 ↔ 7), `V7_decision_confidence_parity` (Low-confidence decisions marked consistently), `V8_metadata_header` (spec metadata header present), `V9_duplicate_ids` (no duplicate IDs within an owning section). Plus **`earsCriteria(ticket)`** returning `Array<{ id:string; text:string; trigger:string; response:string; measurable:boolean; valid:boolean }>` parsed from the AC block. Reuse `mock/governance.ts` constitution rule ids for the `V5_br_references` detail copy.
  - Decision history: derive from `buildLineage(ticket)` (`reject.feedback`, `approver`, `approvedAtOffsetMin`).
  - NEW (same `specReview.ts`, shapes in the appendix — *as-built file name: `src/mock/gate-detail.ts`*): **`agentSelfReport(ticket)`** (assumptions/open questions/section confidence/citations — the Agent's-notes panel), **`runStory(ticket)`** (the plain-language run timeline), **`inputProvenance(ticket)`** (the provenance chip). Note: **`earsCriteria()` binds to BA's real `/structured-ac` endpoint** (the spec `structured` block) once live — the mock mirrors its shape.
- **Interactions:**
  - Click an outline section → scrolls the center doc.
  - Click a validator check → scrolls/highlights the offending AC in the center pane.
  - **Flag an assumption** in the Agent's notes → the row tints amber and its text pre-fills the reject reason field.
  - **Approve is enabled immediately** — quick-reason chips ("Meets EARS", "Validators 8/8") and a free-text note are optional; a typed reason is REQUIRED only on **Reject** and when **overriding** failing checks.
  - **Approve** → `alert-dialog` confirm "This advances AM-142 to Ready for Design and is recorded in the audit log." → on confirm: ticket advances, audit record written (`actor` shown as "when-only" until auth), toast, route back to Gates with the gate cleared.
  - **Reject** → same required note → ticket returns to BA with the note as added context, `rerunCount++`, toast "Returned to BA Agent — rerunning."
  - **Deep-link fallback** ("Open in BA flow-observer ↗") → opens the agent's own tool in a new tab; only visible as a quiet secondary action, prominent only in the error state.
- **Copy:** Breadcrumb "Pipeline / Spec Review / AM-142." Header gate badge "Spec approval." Policy chip "PM · 1-eye · ≤4h · L0 review-all." Provenance chip "Sources: 1 customer-submitted ticket · 2 internal docs — external content treated as untrusted." Agent's-notes badge "Self-reported by the agent · advisory." Validator headline "Validated deterministically — no LLM in the loop." Validator sub "Structural quality, not semantic — we check the shape of the spec, not whether it's the right idea." EARS section label "Acceptance criteria (EARS)." Decision label "Decision note (required on reject · optional on approve)." Approve CTA "Approve spec"; confirm body "Advances AM-142 to Ready for Design. Recorded in the audit log."; Reject CTA "Reject & return to BA." Run-story header "How this spec was made." Fallback link "Open in BA flow-observer ↗." Override warning "2 structural checks are failing — approving overrides them; a typed override reason is required."
- **Demo note:** The headline RUN→close beat. 0:30 "the PM approves on a client-grade review surface inside Agency OS"; 2:45 close reuses **this same validator panel** to land the moat line — "checked deterministically, not graded by another model." This screen is the single most load-bearing NEW surface in the cluster — it carries both the "client-grade product, not internal tooling" and the "zero-LLM moat" claims.


### Comms & Escalations — `/comms`  (REFRAME)
- **Slack-first as-built (2026-06-11):** the view now leads with **`OutboundFeed`** — "Pushed by the pod — on its own schedule": daily preparation 07:45 · daily digest 08:00 → #automarket-pod · a clarification echo into the ticket thread (carrying the `[AgencyOS]` echo-loop tag) · two escalations (amber, deep-linked to `/incidents` and `/approvals`) · the Friday weekly report → Slack **and email to the sponsor** (deep-linked `/reports`). Header carries the honesty chips ("Slack first-class · email live · Teams next" — Teams Roadmap-badged) + the framing line "Humans answer in their own tools — the pod reaches out; the dashboard is optional depth." Read-only (zero audit writes). Data: `src/mock/outbound.ts`.
- **Purpose:** The single stream of agent-initiated outbound (Slack/Teams/Email/DM) plus the escalation tracker — every message and escalation tied to a deterministic trigger and an accountable human.
- **Persona & entry:** Pod Admin / PM lands from the left rail (RUN → Comms & Escalations) or by deep-link from an escalation badge on the Overview / a bell notification. QA/Eng leads enter to confirm an escalation routed to them was acknowledged.
- **Layout:** Reuses the existing `CommsView` shell — `p-4 lg:p-6 space-y-5`. Header band; full-width **Escalation tracker** glass-panel (top, most prominent); then a `grid lg:grid-cols-[1fr_360px]` with the **Communications log** (left, filterable stream) and **Scheduled comms / cadence** (right). One reframe addition: each open escalation row gets a **"Open in Incidents →"** affordance that deep-links to the matching incident in `/incidents` (escalations and incidents are two lenses on the same underlying fault — comms is the *who-was-told*, incidents is the *what-do-I-do*).
- **Components:**
  - Reuse: `CommsView` whole, `EscalationRow`, `TriggerBadge`, `StatusDot`, `channelIcon` helpers.
  - shadcn: keep the native `<select>` filters as-is (or swap to `select` primitive for consistency — optional). Add `tooltip` on the new escalation→incident link; `badge` for the severity pill if refactored.
  - NEW (small): an `EscalationLink` cell — a `Link to="/incidents" search={{ incident: incidentIdFor(esc) }}` rendered as a ghost button in a new right-most column of the escalation table.
- **States:**
  - *empty:* escalation tracker → "No open escalations · pod is clear" (muted, check icon). Comms log → "No outbound comms match these filters."
  - *loading:* skeleton rows in both panels (`skeleton`).
  - *populated:* drives off `ESCALATIONS`, `COMMS`, `SCHEDULED` (today's mock).
  - *error:* "Comms stream unavailable" inline banner (`alert`, destructive) — non-blocking; escalation tracker still renders from last-known.
  - *edge:* an escalation with `status: "open"` and `openedMinAgo` past SLA renders with the neon glow already in `EscalationRow`; if a matching incident exists, the new link cell is solid (primary), else disabled with tooltip "No incident — recovery not required."
- **Mock data:** `src/mock/comms.ts` unchanged for the core. Add ONE derived helper in `comms.ts`: `incidentIdFor(esc: Escalation): string | null` — maps an escalation's `ticketId` + `trigger` to an incident id in the new incidents mock (below), so the cross-link is data-driven, not hard-coded.
- **Interactions:** Filters (agent/channel/trigger) narrow the log live. Click a comm row → expand body + trigger reason (existing). Click ticketId → `/traceability` (existing). Click **"Open in Incidents →"** on an escalation → navigates to `/incidents/$id` (the canonical incident URL) with that incident pre-opened in the detail pane. "preview next send" disclosure on scheduled cards (existing).
- **Copy:** Header "Communications & Escalations" / "Agent-initiated outbound · scheduled or threshold-triggered" (keep). New column header "Recovery". Link label "Open in Incidents →". Disabled tooltip "No incident — recovery not required."
- **Demo note:** 1:30 beat — after the spec advances and the clarification fires, this screen shows the *threshold* trigger that posted to Slack and the open design-stale escalation routed to Marin, setting up the pivot to Incidents & Recovery as the "what now?" answer.

---

### Incidents & Recovery — `/incidents`  (NEW)
- **Purpose:** The operator's "an agent failed — what now?" surface: an incident inbox across five fault types, each with a timeline, a suggested action, and explicit recovery controls — every action written to the audit ledger.
- **Persona & entry:** Pod Admin / PM (non-engineer running the pod 24/7) is the primary. Lands from left rail (RUN → Incidents & Recovery), from a bell notification ("Agent QA is down"), from the Overview's paused/escalated state, or via the new deep-link from a `/comms` escalation. Engineering Lead enters for `run-failed` / `tool-disconnected` triage.
- **Layout:** App shell (`AppShell` + `TopBar` + `LeftRail`). Page = `p-4 lg:p-6 space-y-5`. Header band with title + open-incident counter and a severity summary chip row. Below: a `grid lg:grid-cols-[380px_1fr] gap-5` master-detail —
  - **Left: Incident inbox** (`glass-panel`, scrollable list). A filter bar (type · severity · status · agent). Each row = severity pill, type icon, title, affected agent/ticket, age, status. Selected row highlighted.
  - **Right: Incident detail pane** (`glass-panel`) for the selected incident: header (type, severity, affected entity, SLA-to-resolve countdown), a **Suggested action** callout (primary), the **Recovery controls** row (action buttons), the **per-incident timeline** (vertical, newest-last), and a "Linked comms / escalation" footer cross-linking back to `/comms`.
- **Components:**
  - shadcn: `card`/`glass-panel`, `badge` (severity + type), `button` (recovery controls), `alert-dialog` (confirm each recovery action — destructive ones need reason), `textarea` (required reason on reassign/restart), `select` (reassign-human picker, reauth-tool picker), `tooltip`, `separator`, `scroll-area` (timeline + inbox), `progress` (SLA-to-resolve bar), `sonner` (toast on action committed), `tabs` (optional: "Open / Resolved / All" on the inbox), `skeleton` (loading).
  - Reuse: `TriggerBadge`/`StatusDot` styling language from `CommsView`; `agentColor`/`agentName`/`humanName` helpers; `fmtAgo` (lift into a shared util or re-declare). Pull accountable-human list from `humans.ts`, agents from `agents.ts`.
  - NEW components to build: `IncidentInbox` (left list + filters), `IncidentRow`, `IncidentDetail` (right pane), `RecoveryControls` (the action button cluster, type-aware), `IncidentTimeline`, `SuggestedAction` callout, `RecoveryConfirmDialog` (wraps `alert-dialog` + reason `textarea`), `SlaCountdown` (progress + label). One small `AuditWriteToast` helper that renders the "Written to audit ledger ✓" confirmation.
- **States:**
  - *empty:* "No open incidents · pod is healthy" hero with a green liveness dot and a muted line "Incidents appear here when an agent stalls, a run fails, a gate goes overdue, a tool disconnects, or a sync goes stale." Detail pane shows a neutral "Select an incident" placeholder.
  - *loading:* inbox skeleton rows; detail-pane skeleton.
  - *populated:* master-detail driven by the new `INCIDENTS` mock.
  - *error:* if recovery action "fails" (mock can flag `recoverable:false` or a forced-fail demo incident), the confirm dialog returns an inline destructive `alert`: "Retry failed — escalating to <accountable human>." and appends a `recovery_failed` timeline event.
  - *key edge-cases:*
    - **already-resolving:** if an incident has an in-flight recovery (`status:"recovering"`), controls are disabled with a spinner and "Recovery in progress…".
    - **resolved:** controls collapse to a read-only "Resolved by <action> · <when>" stamp; timeline frozen; row moves to the Resolved tab.
    - **no-suggested-action:** fall back to "Manual triage — choose a recovery control below."
    - **gate-overdue with no accountable human:** the Reassign control is highlighted as the suggested action and the "uncovered" risk language from the accountability matrix is echoed.
- **Mock data (NEW — add `src/mock/incidents.ts`):** Define the incident shape. Fields:
  - `Incident`:
    - `id: string` (e.g. `"inc1"`)
    - `type: IncidentType` = `"agent-down" | "run-failed" | "gate-overdue" | "tool-disconnected" | "sync-stale" | "suspicious-input"` (Blind spot 6 — adversarial-input honesty: an ingested external item that trips the injection heuristics surfaces as an incident, not a silent drop)
    - `severity: EscSeverity` (reuse `"low"|"med"|"high"|"critical"` from comms.ts)
    - `status: IncidentStatus` = `"open" | "recovering" | "resolved"`
    - `title: string` (one-line, e.g. "QA Agent unresponsive · liveness lost 6m")
    - `summary: string` (1–2 sentences of what/why)
    - `agentId?: AgentId` (affected agent, for agent-down/run-failed/gate-overdue)
    - `ticketId?: string` (affected work item, e.g. "AM-138")
    - `toolId?: string` (for tool-disconnected/sync-stale, e.g. "github" | "teamwork" | "slack" | "jira" | "drive")
    - `accountableHumanId?: string` (from humans.ts — who owns the fix)
    - `openedMinAgo: number`
    - `slaToResolveMin: number` (target window; drives the countdown bar)
    - `detectedBy: string` (e.g. "liveness probe", "CI", "gate SLA timer", "OAuth health check", "sync watchdog")
    - `suggestedAction: RecoveryActionKind | null`
    - `availableActions: RecoveryActionKind[]` (which controls render, type-aware)
    - `linkedEscalationId?: string` (back-reference into `ESCALATIONS`)
    - `linkedCommId?: string` (back-reference into `COMMS`)
    - `timeline: IncidentEvent[]`
  - `RecoveryActionKind` = `"retry-run" | "resume-run" | "reauth-tool" | "reassign-human" | "pause-agent" | "restart-agent" | "escalate-to-q"` (P1-O3: **"Escalate to Q"** is a first-class recovery action — engineer-class faults the PM persona cannot triage get a real, audited path instead of unaudited email)
  - `IncidentEvent`: `{ id: string; tsOffsetMin: number; kind: "detected" | "notified" | "auto-attempt" | "human-action" | "recovery-failed" | "resolved"; label: string; actor?: string | null }` (`actor` null = "when-only", honoring the audit register).
  - Seed ~6–7 incidents mapping onto existing comms/escalations so the cross-links resolve:
    1. `agent-down` — QA Agent liveness lost (severity high, suggested `restart-agent`, links nothing).
    2. `run-failed` — Dev build failed on AM-131 (TS2345), retried 1/3 (links `c14`; suggested `retry-run`, available `retry-run`+`pause-agent`).
    3. `gate-overdue` — Design gate AM-138 stale 26h, accountable `marin` (links `esc1`/`c3`; suggested `reassign-human`).
    4. `tool-disconnected` — GitHub token expired (severity critical, suggested `reauth-tool`; blocks Dev runs).
    5. `sync-stale` — HubSpot/Drive sync amber > 12h (severity med, links the Curator digest `c18`; suggested `reauth-tool`).
    6. `run-failed` — AM-149 quality gate failing 3x, sql-injection blocker (links `esc2`; suggested `resume-run` after fix, manual triage).
    7. one **resolved** example (e.g. AM-149 source conflict, `resolved` via `resume-run`) so the Resolved tab is non-empty.
    8. `suspicious-input` — ONE seed (Blind spot 6): "Customer-submitted ticket AM-151 contains instruction-shaped content — quarantined for review" (severity med, `detectedBy: "input filter"`, suggested `pause-agent` on the consuming agent, links the ticket; resolving requires a human look — pairs with the Spec Review provenance chip).
  - Helpers to export: `openIncidents()`, `incidentsByType()`, `incidentById(id)`, and the cross-ref `incidentIdFor(esc)` consumed by `/comms`. The recovery action → audit write is mocked by a `recoverIncident(id, action, reason?)` that pushes a `human-action` then `resolved` event and returns an `AuditEntry`-shaped object (mirroring the dashboard `audit_log` row: `{ action, target, actor: null, ts }`).
- **Interactions:**
  - Click an inbox row → loads it in the detail pane (canonical entity URL `/incidents/$id` so it's deep-linkable from `/comms` and the bell; `?incident=` survives only as a list-filter alias — see the CROSS-CUTTING Canonical URLs block).
  - Filter bar narrows the inbox live (type/severity/status/agent).
  - Click a **recovery control** → opens `RecoveryConfirmDialog`. Destructive/ownership-changing actions (reassign-human, restart-agent, pause-agent) require a `textarea` reason; retry/resume/reauth confirm with a single click. On confirm: incident → `status:"recovering"` (controls disabled, spinner), timeline appends a `human-action` event, then after a short mocked delay → `resolved` (or `recovery-failed` for the forced-fail demo), a `sonner` toast "Recovery action recorded · written to audit ledger ✓" fires, and the row restyles/moves to Resolved.
  - **reassign-human** opens a `select` of `humans.ts` people; on confirm the reassignment is **pending until the new human accepts** — a one-tap audited **acceptance** (P1-O1: writes `human.reassigned`, then `accountability.accepted` on accept; the incident stays `recovering` until accepted — coverage is accepted, not assigned). Then updates `accountableHumanId` and echoes into the accountability story.
  - **escalate-to-q** opens a confirm (`textarea` reason) → files a Q-side ticket with the incident timeline attached; the incident gains a "With Q · tracked" status chip and stays visible in-pod until Q resolves; audited like every recovery action. Seeded engineer-class faults (run-failed TS2345, the sql-injection blocker) carry it as the suggested fallback for the non-engineer PM.
  - **reauth-tool** opens a mocked OAuth-style "Reconnect <tool>" step (a `dialog` with the tool's scopes, "Reconnect" button) — re-using the Connect-tile language from LAUNCH; on success the `tool-disconnected`/`sync-stale` incident resolves.
  - "Linked comms / escalation" footer link → `/comms` (deep-links the matching escalation row).
- **Copy:**
  - Title "Incidents & Recovery" · subtitle "Detect, decide, recover — every action is logged."
  - Counter "3 open · 1 critical".
  - Suggested-action callout: "Suggested: Restart QA Agent — liveness probe has had no heartbeat for 6m." with a primary "Restart agent" button.
  - Recovery control labels: "Retry run", "Resume run", "Re-authenticate tool", "Reassign accountable human", "Pause agent", "Restart agent", "Escalate to Q".
  - Reassign acceptance: "Waiting for {name} to accept — accountability transfers on their tap, and both steps land in the ledger." Escalate-to-Q chip: "With Q · tracked".
  - Confirm dialog: "Restart QA Agent? This interrupts any in-flight step. Add a reason for the audit ledger." Reason placeholder "Why are you restarting? (recorded with timestamp)". Confirm CTA "Restart & log".
  - Toast "Recovery action recorded · written to audit ledger ✓".
  - Empty state "No open incidents · pod is healthy".
  - Failure: "Retry failed — escalated to <human>. See timeline."
  - Resolved stamp "Resolved by Retry run · 4m ago".
  - Timeline event labels e.g. "Detected by liveness probe", "Notified #automarket-dev", "Auto-retry 1/3 failed", "Zlatko restarted agent", "Recovered".
- **Demo note:** 1:30–2:00 RUN beat and the line that turns "a demo" into "an operable product." After Comms shows the QA-down escalation, pivot here: the incident inbox shows it at the top with a **Suggested: Restart QA Agent**; the PM clicks it, fills the reason, confirms — the timeline appends "Zlatko restarted agent → Recovered" and the toast confirms it was **written to the audit ledger**. This directly sets up the MONITOR → Compliance & Audit beat (the append-only ledger that outlives the agent), closing the control narrative: *not autonomy you trust — recovery you can prove.*


---

## MONITOR


### MONITOR — ROI & Economics — `/economics` (REFRAME)
- **Purpose:** The MONITOR landing and the demo's "wow moment": lead with the CFO numbers — the canonical trio `humanHoursDisplaced` (shown as "human-hours freed"), cost-per-merged-ticket, cost-per-story-point — staged honestly (live tier = cost-per-approved-spec + time-to-approved-spec, badged **Live**; merged-ticket economics badged **"as agents ship"**), computed **net of plan fees**, then bound the fear with projected monthly run-rate vs. budget cap.
- **Persona & entry:** Pod Admin/PM lands here from the left rail (MONITOR group, item 1) or from the Overview ROI hero tile's "View ROI →" deep-link. Client Sponsor/Exec lands here as their rolled-up surface. Read-only-friendly; no operator dials.
- **Layout:** Standard AppShell (TopBar + LeftRail + content). Single scroll column, `p-4 lg:p-6`, vertical `space-y-4`:
  1. **Header row** — eyebrow + title left, **ROI hero block** right (reuse `RoiHeadline`, enlarged).
  2. **Hero KPI band** — the 3 headline tiles full-bleed across the top, visually dominant (larger than the secondary band): `humanHoursDisplaced` (label "Human-hours freed"), `costPerMerged`, `costPerStoryPoint` — each with a tier badge (**Live** for the approved-spec metrics rendered as a thin live-tier strip above the band: cost-per-approved-spec + time-to-approved-spec; **"as agents ship"** on `costPerMerged`/`costPerStoryPoint`), and an **"Edit assumptions"** affordance on the hero (opens the `roiAssumptions` editor — *your numbers, not ours*).
  3. **Budget panel** — NEW: a two-column row — left a **run-rate vs. budget-cap gauge**, right a **month-to-date burn bar** with projected-end-of-month marker.
  4. **Secondary KPI band** — reuse the existing `KpiTile` grid (offload savings, batch save, total spend, human-hours $).
  5. **Cost-per-ticket trend** — reuse `CostTrend` (the falling-cost story).
  6. **Per-ticket breakdown table + leaderboards** — reuse as-is, but moved below the fold (operator depth, not the lead).
- **Components:**
  - REUSE: `EconomicsView.tsx` internals — `RoiHeadline`, `KpiTile`, `CostTrend`, `StageBreakdown`, `Leaderboard`, `SortChips`, the per-ticket table; `aggregates`, `trend`, `ticketEconomics` from `src/mock/economics.ts`.
  - shadcn: `card`, `progress` (run-rate gauge + burn bar), `badge` (cap status: On track / Watch / Over), `tooltip` (gauge hover), `tabs` (optional: "This pod" vs "All pods" when multi-pod), `hover-card` (projection assumptions).
  - NEW: `BudgetGauge` (semicircular or linear run-rate-vs-cap), `BurnBar` (MTD spend with projected-EOM ghost segment), `HeroKpi` (the 3 enlarged headline tiles — a bigger variant of `KpiTile` with a one-line "vs. a human team" subcaption).
- **States:**
  - *empty:* no merged tickets yet → hero tiles show "—" with copy "Live-tier ROI (cost per approved spec) appears with your first approved artifact; merged-ticket economics light up as agents ship." Budget panel still renders (cap set, $0 burned).
  - *loading:* skeleton cards for hero band + gauge (shadcn `skeleton`).
  - *populated:* full reveal as above.
  - *error:* glass panel "Couldn't load economics for this pod. Retry."
  - *edge — over budget:* run-rate gauge needle in red zone, cap badge = "Over cap", a one-line inline `alert` "Projected run-rate exceeds the monthly cap by $X. Review usage →" deep-linking to Usage & Billing.
  - *edge — no cap set:* gauge shows "No budget cap set" with a "Set cap" affordance (opens the same edit popover as Usage & Billing).
- **Mock data:** Driven by existing `src/mock/economics.ts` `aggregates` (`costPerMerged`, `costPerStoryPoint`, `humanHoursDisplaced`, `humanHoursDisplacedUsd`, `roiMultiple`, `totalCost`, `offloadSavings`, `batchSavings`) and `trend`. ADD a NEW exported `budget` object, a `roiAssumptions` block, and `aggregates.pricePaidUsd` to `economics.ts`:
  ```
  budget: {
    monthlyCapUsd: number;        // e.g. 4000
    mtdSpendUsd: number;          // month-to-date actual (= aggregates.totalCost for the demo)
    daysElapsed: number;          // e.g. 9
    daysInMonth: number;          // e.g. 30
    projectedMonthlyUsd: number;  // mtdSpendUsd / daysElapsed * daysInMonth
    capStatus: "on_track" | "watch" | "over";  // derived: <80% / 80-100% / >100% of cap
    currency: "USD";
  }

  roiAssumptions: {
    blendedRateUsdPerHr: number;                 // e.g. 95 — the hourly rate behind hours→$ conversion
    baseline: string;                            // what the comparison assumes, e.g. "senior BA, 4h/spec"
    source: "client-provided" | "Q-default";     // provenance — editable from the ROI hero
  }

  // on aggregates:
  pricePaidUsd: number;  // plan fees this period — ROI/roiMultiple computed NET of this, never on raw compute cost
  ```
- **Interactions:** Hero tiles are static reveals (the headline). **"Edit assumptions"** on the hero → `popover` editing `roiAssumptions` (blended rate, baseline, source flips to "client-provided"); all hours→$ figures re-derive live — the objection becomes a feature (*your numbers, not ours*). Gauge hover → tooltip "Projected $X by Jun 30 · cap $Y". "Review usage →" / "Set cap" → navigate to `/billing`. Per-ticket rows still expand to `StageBreakdown`. Trend annotations are hover-labelled (existing). Optional pod tabs re-scope all aggregates.
- **Copy:** Eyebrow "RETURN ON INVESTMENT · THIS PERIOD". Live-tier strip: "Cost / approved spec" + "Time to approved spec", badged **Live**. Hero tile labels: "Human-hours freed", "Cost / merged ticket" (badge "as agents ship"), "Cost / story point" (badge "as agents ship"), each with subcaption e.g. "= $X at your blended rate (${rate}/h · {source})". Edit affordance: "Edit assumptions — your numbers, not ours." Footer note: "ROI is computed net of plan fees." Budget panel title "Run-rate vs. budget". Gauge caption "Projected this month vs. cap". Cap badges: "On track" / "Watch" / "Over cap". Over-cap alert: "Projected run-rate exceeds the monthly cap. Review usage →". Empty: "Live-tier ROI appears with your first approved artifact."
- **Demo note:** This is the **1:45 beat — the wow moment**. The presenter lands here right after the approval clears: the three CFO numbers are the headline; the budget gauge ("on track, well under cap") is the one-sentence answer to the unbounded-cost objection. Lead with this, then pivot to `/pod` accountability.

---

### Usage & Billing — `/billing` (NEW)
- **Purpose:** The client-facing reframe of operator economics into **consumption transparency**: what the pod consumed this period vs. the plan/budget, budget-alert state, and a downloadable monthly usage statement. Answers "what am I being billed for, and am I within budget?"
- **Persona & entry:** Pod Admin/PM (owns the budget) and Client Sponsor/Exec (sees the statement). Entered from left rail (MONITOR group, last item) or from the Overview/ROI over-cap alert deep-link.
- **Layout:** AppShell content column, `p-4 lg:p-6`, `space-y-4`:
  1. **Header** — eyebrow "USAGE & BILLING", title "Usage & Billing", sub "Consumption vs. your plan for this billing period", right-aligned **plan chip** ("Dedicated tenant · pilot — *pricing hypothesis*") + **"Export statement" button**.
  2. **Plan & budget summary row** — 3 cards: **Plan & cap** (plan name, monthly cap, billing period dates), **Consumed this period** (MTD spend, % of cap, big `progress` bar), **Projected at period end** (run-rate projection, over/under cap delta).
  3. **Budget alerts panel** — NEW: list of alert rules and their current state (e.g. "Alert at 80% of cap — TRIGGERED 2 days ago"), each with a status badge and a toggle.
  4. **Consumption breakdown** — reuse the existing `BreakdownTable` pattern but client-framed: usage **by agent/stage** (BA/SA/Dev/QA…) and **by codebase/project**, columns = Items, Units consumed, Amount, Share bar. Sourced from `ticketEconomics` stage rollups.
  5. **Monthly usage statement** — NEW: a table of past billing periods (month, items delivered, amount, status: Paid / Current / Estimated) with a per-row "Download" (PDF mock); line items link to the gate decisions behind them ("every line item links to a gate a human cleared").
  6. **Pricing simulator card** — NEW: this month's actual consumption modeled under the three §9.5 scenarios (tenant platform fee + per-active-pod fee · + outcome per approved artifact · + outcome per merged ticket), every figure labeled *pricing hypothesis*, the whole card badged **"MODELING — not a quote"**.
- **Components:**
  - shadcn: `card`, `progress` (consumed-vs-cap), `badge` (plan tier, alert status, cap status), `table` (statement + breakdown), `button` (Export / Download), `switch` (alert toggle), `popover` or `dialog` (edit cap / edit alert threshold), `tabs` (breakdown: "By agent" / "By project"), `alert` (over-cap banner), `tooltip` (unit definition), `separator`.
  - REUSE: `BreakdownTable` from `RealEconomicsView.tsx` (the share-bar table is a perfect fit — generalize its `rows` shape), `KpiTile`/`Kpi` glass tiles, `fmtUsd` helpers, `aggregates`/`ticketEconomics`/`stageLabel` from `src/mock/economics.ts`.
  - NEW: `UsageStatementTable` (period rows + download), `BudgetAlertRow` (rule label + state badge + toggle), `PlanSummaryCards`, `ConsumptionVsCapCard` (the headline progress card), `PricingSimulator` (the three-scenario modeling card). Consumption is denominated in the ROI unit (approved artifacts / merged tickets) — no separate "delivery unit" concept (killed per vision §9.5).
- **States:**
  - *empty:* new pod, no consumption → "No usage yet this period. Charges appear as your pod works." Plan + cap cards still render; statement table shows only the current (estimated, $0) period.
  - *loading:* skeleton cards + table rows.
  - *populated:* full view.
  - *error:* "Couldn't load billing for this pod. Retry."
  - *edge — alert triggered:* top-of-page `alert` (amber) "You've used 82% of your monthly budget. Projected to reach 104% by Jun 30." with "Adjust cap" CTA; the matching alert row badge = "Triggered".
  - *edge — over cap:* `alert` turns red "Over budget cap for this period"; consumed progress bar overfills past 100% (capped visually with an over-bar marker).
  - *edge — no cap:* cards show "No cap set" + "Set a budget cap" CTA; alerts disabled with hint "Set a cap to enable budget alerts."
- **Mock data:** **As-built: `src/mock/billing.ts`** (no `economics.ts` plan exports — billing imports economics to avoid a cycle). Shapes (§9.5-aligned — no "delivery unit", no fixed price):
  ```
  plan: BillingPlan                  // Dedicated tenant · pilot; §9.5 hypothesis framing, pricing-TBD note
  budget: Budget                     // monthlyCapUsd + capStatus "on_track" | "watch" | "over"
  budgetAlerts: BudgetAlert[]        // thresholdPct, channel, enabled, state "armed" | "triggered"
  usageStatements: UsageStatement[]  // period rows; StatementLineItem[] each linking to a gate decision
  consumptionByAgent() / consumptionByProject(): ConsumptionRow[]   // derived from ticketEconomics
  PRICING_SIMULATOR_BADGE = "MODELING — not a quote"
  pricingScenarios: PricingScenario[]  // "platform_pod" | "outcome_per_artifact" | "outcome_per_merged"
  ```
  The three `pricingScenarios` model exactly vision §9.5's components (platform fee + per-active-pod fee, + outcome per approved artifact, + outcome per merged ticket) against the current month's actuals; statement history covers Mar–Jun 2026.
- **Interactions:** "Export statement" → toasts (`sonner`) "Statement downloaded" (mock PDF). Per-period "Download" → same mock. Alert `switch` → flips `enabled`, toast confirms. "Adjust cap" / "Set cap" → `popover` with a number input writing `budget.monthlyCapUsd` (client-state only); re-derives `capStatus` and the progress bars live. Breakdown `tabs` re-scope the table (agent ↔ project). The over-cap alert's "Adjust cap" is the same popover.
- **Copy:** Header sub "Consumption vs. your plan for this billing period." Plan card: "Dedicated tenant · pilot — pricing finalized with your pilot agreement" (*pricing hypothesis* chip; no dollar figure). Consumed card big-number label "Used this period", under it "{pct}% of cap". Projected card: "Projected by {periodEnd}" + delta chip "$X under cap" / "$X over cap". Alert row example "Notify at 80% of monthly cap · in-app + Slack". Statement columns "Period · Items delivered · Amount · Status." Export CTA "Export statement". Empty: "No usage yet this period. Charges appear as your pod works." Over-cap banner: "Over budget cap for this period — projected $X by {date}." Simulator badge: "MODELING — not a quote."
- **Demo note:** Optional close-of-MONITOR beat. After the ROI hero, one click to Usage & Billing shows the same numbers as **client consumption vs. a bounded plan with budget alerts** — reinforcing the "Cost → budget cap + projected run-rate" pushback answer from the pitch. Not a core 3-min beat; the over-cap alert state is the most demoable single screen if shown.


### Governance (the moat) — `/governance`  (REFRAME)
- **Purpose:** Prove spec quality with a deterministic, zero-LLM structural moat visually separated and badged apart from any LLM-judge signal; say honestly "structural quality, not semantic."
- **Persona & entry:** QA Lead (primary) and Client Sponsor/Exec (read-only trust beat). Lands from the MONITOR rail and from the Overview "spec quality" KPI tile; in the 3-min demo arc this is the **2:45 close** — the hardest-to-copy headline claim.
- **Layout:** Standard `AppShell` content region. Top to bottom: (1) Header with route eyebrow + title + honesty-subline; (2) **Trust-banner strip** spanning full width — the badge; (3) **two clearly-walled validator panels** in a 60/40 grid on `xl` (left = Deterministic, right = LLM-assisted), stacked on smaller; (4) Completeness-by-dimension panel (full width); (5) Per-spec table (full width). The wall between the two validator panels is the load-bearing design decision — different border treatment, different icon, different header chip. The header band also carries an **"Overrides this period"** `Kpi` (P1-G1: count of `gate.override` ledger actions in the window, deep-linking to Compliance filtered to overrides) — **"0 overrides in 30 days" is itself a trust artifact**.
- **Components:**
  - REUSE wholesale from `RealGovernanceView.tsx`: `Kpi` tile, `ScoreCell`, the completeness-by-dimension bar block, the per-spec `<table>`, the `glass-panel`/`scoreTone` helpers, `Header`.
  - shadcn: `badge` (the deterministic badge + per-validator pass/fail pills), `tooltip` (hover "what does this check?" on each validator), `tabs` is NOT used here — the split must be spatial, not tabbed (a tab would let the skeptic ignore the distinction). `separator` between the two walls. `hover-card` on the deterministic badge to expand the "no model in the loop" explanation. `accordion` (optional) inside the deterministic panel to expand per-check detail. `alert` for the honesty callout (structural-vs-semantic).
  - NEW components to build:
    - `DeterministicValidatorPanel` — left wall. Header chip: shield-check icon + `Badge` reading **"Validated deterministically · no model in the loop"** (variant: emerald/`status-done` outline, monospace). Lists each structural validator as a row: name, pass/fail/partial pill, a coverage %, and a one-line "checked in code" descriptor. Visual treatment: solid emerald-tinted left border, `ShieldCheck` iconography.
    - `LlmJudgePanel` — right wall. Header chip: gavel icon + `Badge` reading **"LLM-assisted signal · advisory, not a gate"** (variant: amber/`status-waiting` outline). Lists Judge agreement + Persona approval. Visual treatment: dashed/amber-tinted border, `Gavel` iconography, a muted "model-graded — treat as advisory" footnote.
    - `StructuralVsSemanticNote` — an `alert` (info tone) reading the honest disclaimer.
- **States:**
  - *empty:* reuse existing `specs.length === 0` block — "No specs to assess yet. Structural validators run the moment BA emits a spec." Keep the two-wall scaffold visible but greyed so the IA reads even with zero data.
  - *loading:* `skeleton` rows in both walls + the completeness bars (6 shimmer bars).
  - *populated:* both walls filled; deterministic validators show green pills; LLM panel shows advisory scores.
  - *error:* `alert` (destructive) "Couldn't load governance signals — structural validator results are cached server-side and will reappear on refresh."
  - *key edge-case — a deterministic validator FAILS:* the failing row goes red with a "blocks readiness" pill; the structural-readiness rollup KPI flips to `status-error`; this is the demo-able "the moat caught a real gap" moment. *LLM judge disagrees but structure passes:* explicitly rendered as "advisory disagreement — does not block," reinforcing the separation.
- **Mock data:** Driven by `src/mock/governance.ts` for the violations/PR-gate flavour, but the validator split needs a NEW mock dataset — add `src/mock/governance-moat.ts`:
  - `structuralValidators: { id: ValidatorCheckId, label, descriptor, check: "deterministic", status: "pass"|"fail"|"partial", coverage: number /*0-100*/, detail: string, blocksReadiness: boolean }[]` — seed with **all 8 of BA's real validator registry ids** (same enum as `specValidators`; V3 retired): `V1_ears_coverage` ("Every AC is EARS-formatted — coverage ≥80%"), `V2_missing_section` ("All canonical SPEC.md sections present"), `V4_ac_id_parity` ("AC IDs match between Sections 4 ↔ 11"), `V5_br_references` ("Referenced business rules exist in Section 5"), `V6_eh_message_parity` ("Error-handling messages match between Sections 14 ↔ 7"), `V7_decision_confidence_parity` ("Low-confidence decisions marked consistently"), `V8_metadata_header` ("Spec metadata header present"), `V9_duplicate_ids` ("No duplicate IDs within an owning section") — both seed sets render **8/8**, matching the RUN gate's validator panel check-for-check.
  - `llmSignals: { id, label, score: number /*0-1*/, kind: "judge"|"persona", advisory: true, note: string }[]` — `judge_agreement`, `persona_approval`.
  - `structuralReadiness: { pct: number, blocking: number /*count of failing blockers*/ }`.
  - `overridesThisPeriod` — derived by counting `gate.override` rows in the audit bridge (`audit-bridge.ts`); no new dataset.
  - Reuse the existing `GovernanceData.summary.completeness` 6-dimension object for the completeness panel (no change).
- **Interactions:** Hover a deterministic validator row → `tooltip` shows the exact rule it checks ("checked in code, no LLM"). Click a validator row → `accordion`/`drawer` reveals which specs failed it (links into the per-spec table, filtered). Click a spec row → deep-link to `/agents/$agentId` (BA) trace, reusing existing `Link`. Hover the deterministic badge → `hover-card` expands: "These checks run as pure functions over the spec AST. No model scores them. Results are reproducible." Toggling has no destructive effect — read-only surface.
- **Copy:**
  - Title: **"Spec quality — the moat."** Eyebrow: `governance`.
  - Honesty subline: *"Structural quality, checked deterministically. This measures whether the spec is well-formed and complete in structure — not whether it is semantically correct."*
  - Deterministic badge: **"Validated deterministically · no model in the loop."**
  - LLM panel badge: **"LLM-assisted · advisory, not a gate."**
  - `StructuralVsSemanticNote`: *"Structural validators prove the spec is well-formed; the LLM judge offers an advisory opinion on substance. We never let a model grade its own gate."*
  - Deterministic panel header: **"Deterministic structural validators"**; sub: *"Pure code over the spec — reproducible, model-free."*
  - LLM panel header: **"LLM-assisted signals"**; sub: *"Advisory only — does not block readiness."*
  - Failing-validator pill: **"blocks readiness"**.
  - Overrides KPI: **"Overrides this period"** · sub *"0 overrides in 30 days — overrides are rare, reason-required, and on the record."*
- **Demo note:** This is the **2:45 close**. Presenter points at the emerald **"no model in the loop"** badge, then at the walled-off amber LLM panel: *"the AI is not grading its own homework — these checks are code."* The failing-validator red row (if staged) is the "and it actually catches gaps" punch.

### Accountability — `/pod`  (REFRAME)
- **Status note (wave-2 completion — P1-O1 capacity landed here):** `humans.ts` gained `workingHours`/`status: available|ooo`/`delegateId`/`capacityGatesPerDay`; the matrix now carries a **24h coverage timeline strip** (working-hours blocks; uncovered windows get the red treatment; Marin OOO → "Ivan covers · accountability stays with Marin"), **deputy chips** on cells (one solid "A" invariant kept), a **near-capacity chip** on the saturated human (Ivan 9/10 + throttle-policy tooltip), and **audited reassignment** (`human.reassigned`; new assignee renders amber until accepted via `/welcome`). `sla.ts` gained `clockMode: "24x7" | "coverage_hours"`; SlaStatusTab shows "clock paused outside coverage".
- **Purpose:** The live accountability matrix — one accountable human per agent, with live workload, SLA status, and gate ownership; an empty column is flagged as uncovered risk.
- **Persona & entry:** Pod Admin/PM (primary) and Client Sponsor/Exec (the answer to "who is responsible when it's wrong?"). Lands from the MONITOR rail; in the demo it's the **1:45 MONITOR** beat right after the ROI reveal.
- **Layout:** Reuse the existing `PodView.tsx` two-section layout (Roster grid + Accountability matrix), and ADD a third band between header and roster: an **at-a-risk strip** (uncovered-column count + SLA-breach count + overdue-gates count as three `Kpi`-style tiles). ADD a fourth band under the risk strip: the **coverage timeline strip** (P1-O1) — a 24h × 7-day band per agent column, built from each accountable human's `workingHours`/`availability`; hours with no available accountable human (or delegate) render with the **same red "uncovered" treatment as an empty matrix column — the signature motif extended into time**. Matrix cells gain an optional **deputy chip** (a small "D" beside the "A"; the single accountable "A" stays the invariant — a deputy covers, never owns). Keep: header, Roster card grid (`md:2 xl:3`), the sticky-left matrix table. The matrix grows a per-cell SLA/gate-ownership treatment.
- **Components:**
  - REUSE wholesale from `PodView.tsx`: header, `SectionHead`, the per-human `glass-panel` roster card (avatar, agent chips, the 4-up `Metric` workload block), the sticky-header accountability `<table>`, the `agentMeta` color logic, the existing SLA-breach pill.
  - shadcn: `badge` (SLA status per agent — on-track / at-risk / breached), `tooltip` (hover a matrix cell → "Ana — accountable for BA · 2 open gates · SLA on track"), `hover-card` (on a roster card → expand the human's current gate queue), `progress` (workload saturation bar per human), `avatar` (already approximated by the initials disc — keep), `alert` (the uncovered-risk banner when any column is empty).
  - NEW components to build:
    - `RiskStrip` — three `Kpi`-style tiles: **Uncovered agents** (red if >0), **SLA breaches** (sum of `workload.slaBreaches`), **Overdue gates** (new field). Each is a count + tone, reusing the `Kpi` pattern from `RealGovernanceView`.
    - `GateOwnershipCell` — augments the existing matrix "A" cell: keeps the accountable "A" glyph but adds a tiny gate-count superscript and an SLA dot (green/amber/red). Empty cells keep the dashed placeholder; an entirely empty column keeps the existing `bg-status-error/10` + "⚠ uncovered" header treatment.
    - `SlaStatusPill` — small badge: on-track (`status-done`), at-risk (`status-waiting`), breached (`status-error`).
    - `CoverageTimeline` — the 24h × 7d coverage band per agent column (P1-O1); gaps red-tinted, OOO hatched, delegate-covered hours rendered in the delegate's tint.
    - `DeputyChip` — the per-cell "D" chip (delegate from `Human.delegateId`); tooltip states the covers-not-owns rule.
- **States:**
  - *empty:* No humans assigned → reuse a centered `glass-panel` "No accountable people assigned yet. Assign one human per agent in LAUNCH → People & Roles." with a CTA `button` linking to the wizard People step.
  - *loading:* `skeleton` roster cards (3) + a skeleton matrix.
  - *populated:* full roster + matrix with live workload + SLA dots + gate counts.
  - *error:* `alert` (destructive) "Couldn't load accountability data."
  - *key edge-case — uncovered column:* the column header shows existing red "⚠ uncovered" treatment AND the `RiskStrip` "Uncovered agents" tile turns red AND an `alert` banner appears under the header: "1 agent has no accountable human — uncovered risk." *SLA-breached human:* roster card SLA pill glows (reuse existing `glow-pulse`), matrix cells for that human get a red SLA dot.
  - *key edge-case — coverage gap (time):* the `CoverageTimeline` shows a red band (e.g. 22:00–06:00 on QA) — "No coverage — overnight gates queue to 08:00 or route to the delegate"; pairs with the SLA clock (`clockMode: "coverage_hours"` pauses the clock outside coverage, so the gap reads as queued work, not fake breaches). *OOO human:* their hours render hatched; if `delegateId` is set the band shows the delegate's tint instead of red.
- **Mock data:** Driven by `src/mock/humans.ts` (`humans`, `OWNERSHIP`, `ownershipMap`, `agentsOf`, `activeHumans`) + `src/mock/agents.ts` for agent meta/colors — all reused unchanged. EXTEND `Human.workload` in `humans.ts` with two NEW fields to power gate-ownership + overdue:
  - `openGates: number` (gates currently owned/awaiting this human),
  - `overdueGates: number` (gates past their SLA-clearance time).
  - Optionally add a per-agent `slaStatus: "on_track" | "at_risk" | "breached"` derived map (NEW tiny helper `slaStatusFor(agentId)` in `humans.ts`) so each matrix cell can render its dot. Seed values so Marin (1 SLA breach) and Ivan (1 SLA breach) read "at-risk/breached," everyone else "on-track."
  - Capacity & coverage fields (P1-O1, appendix `humans.ts`): `workingHours`, `availability: "available" | "ooo"`, `delegateId`, `capacityGatesPerDay` — drive the `CoverageTimeline` and `DeputyChip`.
- **Interactions:** Hover a matrix "A" cell → `tooltip` with human + agent + open-gate count + SLA status. Click an agent chip on a roster card → existing deep-link to `/agents/$agentId`. Click a roster card → `hover-card`/`drawer` listing that human's open gates with deep-links into `/approvals`. Click the `RiskStrip` "Uncovered agents" tile → scrolls/filters the matrix to the uncovered column. Click "Overdue gates" tile → deep-link into `/approvals` filtered to overdue. Hover a coverage gap on the `CoverageTimeline` → tooltip with the uncovered window + an **"Assign a delegate"** action. The uncovered-risk `alert` has a CTA **"Assign owner"** linking to LAUNCH → People & Roles.
- **Copy:**
  - Title: **"Accountability"** (keep). Eyebrow: `human ↔ agent ownership` (keep).
  - Subline (keep + extend): *"Every agent has exactly one accountable human. One human can cover multiple agents. An empty column is uncovered risk."*
  - `RiskStrip` labels: **"Uncovered agents"**, **"SLA breaches"**, **"Overdue gates."**
  - Uncovered alert: **"{n} agent(s) have no accountable human — uncovered risk."** CTA: **"Assign owner."**
  - Matrix footnote (keep): *"Any empty column above is an uncovered risk."*
  - SLA pills: **"on track" / "at risk" / "breached."**
  - Coverage strip header: **"Coverage"** · gap tooltip *"No coverage 22:00–06:00 — gates queue or route to the delegate."* · Deputy chip tooltip *"Deputy — covers when {name} is OOO; accountability stays with {name}."*
- **Demo note:** The **second wow beat at 1:45**, right after the ROI reveal. Presenter lands on the matrix: *"one accountable human per agent — and the platform flags the second a column goes uncovered."* If a column is deliberately emptied during the demo, the red header + RiskStrip tile + alert all light up simultaneously — the visceral answer to the top enterprise objection, "who's responsible when it's wrong?"


### SLA & Client Reports — `/reports` (NEW — canonical route per P1-H1; `/sla` retired)
- **Purpose:** Show SLA definitions per stage/pod (response time, gate-clearance, delivery cadence) as target-vs-actual with breach history, and surface the shareable weekly client status report from the same data.
- **Persona & entry:** Pod Admin/PM lands here from the MONITOR rail ("SLA & Reports"); Client Sponsor/Exec lands here from a notification digest or the report deep-link. PM uses the SLA tab to spot breaches; sponsor consumes the report tab. Default tab for sponsor role = Report; for PM = SLA.
- **Layout:** Standard AppShell (TopBar + LeftRail). Page-level `Tabs` with two tabs: **SLA Status** and **Client Report**. Header `glass-panel` row mirrors RealComplianceView's `Header`: icon tile + title "SLA & Reports" + subtitle + right-aligned pod/period selector. 
  - **SLA Status tab:** top row = 3–4 SLA summary KPI tiles (reuse `KpiTile`/`KpiStrip` from command-center). Below = an SLA definitions `table` (one row per SLA), each row showing target, current actual, a small target-vs-actual progress bar (`Progress`), status badge, and breach count. Clicking a row opens a `Sheet` (right drawer) with that SLA's breach history timeline.
  - **Client Report tab:** a single centered "report sheet" surface (max-width ~880px, lighter `glass-panel`, print-friendly) — the WEEKLY CLIENT STATUS REPORT, composed of stacked report blocks. A sticky action bar (top-right of the tab) holds period selector + Export / Copy share-link / Mark as sent.
- **Components:**
  - shadcn primitives: `tabs`, `card`, `table`, `progress`, `badge`, `sheet`, `select` (pod + period), `button`, `separator`, `tooltip`, `dropdown-menu` (export format), `sonner` (toast on export/share), `skeleton`.
  - Reuse: `KpiStrip` + `KpiTile` (command-center) for SLA summary + report headline metrics; `AppShell`/`TopBar`/`LeftRail`; `fmtDateTime`/`fmtDate` from `@/lib/time`; pull cost/ROI numbers from `economics.ts` `aggregates` (costPerMerged, humanHoursDisplaced) and lifecycle counts from existing run/event data; `glass-panel` + neon theme classes throughout.
  - NEW components to build: `SlaStatusTable` (definitions + target-vs-actual rows), `SlaBreachDrawer` (breach history timeline in a `Sheet`), `BreachSparkline` (tiny inline chart per row, reuse `chart`), `ClientStatusReport` (the composed report sheet), `ReportBlock` (titled section wrapper), `ReportActionBar` (period select + export/share).
- **States:**
  - **Loading:** KPI tiles + table rows render `Skeleton`; report tab renders a skeleton report sheet (5 grey blocks).
  - **Empty (no SLAs defined):** SLA tab shows centered `glass-panel` empty card — "No SLAs defined for this pod yet. Targets are set in LAUNCH → Go live → **Targets & budget** (sub-screen 6a), or start from blueprint defaults." with a secondary CTA "Use blueprint defaults" and a deep-link "Set targets →" into the Go live step. *(Resolves the former contradiction — a wizard surface now actually sets them.)*
  - **Empty (no report period data):** Report tab shows "Nothing delivered in this period yet. Your first weekly report generates once work clears a gate."
  - **Populated:** table with mix of `on-track` (green), `at-risk` (amber), `breached` (red) rows; report sheet fully composed.
  - **Error:** `glass-panel` error card "Couldn't load SLA data — showing last known snapshot." with a retry `button`.
  - **Edge — breached SLA:** breached rows pinned to top, red left-border accent, breach-count badge; the summary KPI "SLAs breached" tile turns red. Sponsor report shows breached SLAs honestly with a one-line "what we're doing" mitigation note.
  - **Edge — clock paused outside coverage (P1-O1):** rows with `clockMode: "coverage_hours"` show a muted "clock paused outside coverage hours" chip overnight instead of fake breaches — breach math counts coverage hours only (24×7 stays available per SLA as `clockMode: "24x7"`).
  - **Edge — throttled pod:** when any human's open gates exceed the throttle threshold, a banner notes "Intake paused — {name} has {n} open gates (cap {N})" with the amber pod state mirrored on the Overview `PodControlBar`.
- **Mock data:** NEW dataset `src/mock/sla.ts`.
  - `SlaMetric = "response_time" | "gate_clearance" | "delivery_cadence" | "rework_rate"`.
  - `SlaStatus = "on_track" | "at_risk" | "breached"`.
  - `SlaDefinition { id: string; podId: string; metric: SlaMetric; label: string; scope: "pod" | Stage; targetValue: number; unit: "min" | "hr" | "per_week" | "pct"; comparator: "lte" | "gte"; actualValue: number; status: SlaStatus; breachCount30d: number; trend: number[] /* last 7 buckets, drives BreachSparkline */; lastBreachAt?: number /* ms */; clockMode: "24x7" | "coverage_hours" /* P1-O1: coverage_hours pauses the clock outside the accountable human's workingHours */ }`.
  - Pod-level `throttlePolicy { maxOpenGatesPerHuman: number; onExceed: "pause-intake" }` (P1-O1) — when a human's open gates exceed N, upstream intake pauses and the pod shows the amber "throttled" state on `PodControlBar`; the intake pause is audited.
  - `SlaBreach { id: string; slaId: string; occurredAt: number; actualValue: number; targetValue: number; stage: Stage; workItemId?: string; workItemTitle?: string; durationOverMin: number; note?: string }`.
  - Seed ~6 definitions over the AutoMarket pod (BA spec response ≤ 30min, gate clearance ≤ 4h, design-review clearance ≤ 8h, delivery cadence ≥ 3/week, rework rate ≤ 15%, overall pod response ≤ 60min) with 1–2 breached so the demo has red. ~8 `SlaBreach` rows referencing real ticket ids from `tickets.ts` (AM-138, AM-149) for credibility.
  - NEW dataset `src/mock/report.ts` (the weekly report):
  - `WeeklyReport { id: string; podId: string; podName: string; periodStart: number; periodEnd: number; status: "draft" | "sent"; sentAt?: number; headline: { itemsDelivered: number; gatesCleared: number; avgCycleTimeHr: number; spendUsd: number; humanHoursSaved: number }; delivered: ReportItem[]; gatesCleared: ReportGate[]; slaSummary: { onTrack: number; atRisk: number; breached: number; notable: string[] }; upcoming: string[]; costNote: string; narrative: string }`.
  - `ReportItem { workItemId: string; title: string; stage: Stage; deliveredAt: number; storyPoints: number }`.
  - `ReportGate { workItemId: string; title: string; kind: "approval" | "clarification"; decision: "approved" | "rejected"; clearedAt: number; turnaroundHr: number }`.
  - Seed one `sent` report (prior week) + one `draft` (current week) from AutoMarket tickets/economics so the period selector has two entries. `headline.spendUsd`/`humanHoursSaved` mirror `economics.ts aggregates` so numbers reconcile across MONITOR.
- **Interactions:**
  - Pod `select` (TopBar pod switcher is canonical; this page mirrors current pod) + period `select` re-scope both tabs.
  - SLA row click → `SlaBreachDrawer` `Sheet` opens with that SLA's breach timeline; each breach row deep-links to the work item / `/pipeline`.
  - Report tab "Export" `dropdown-menu` → PDF / CSV / Copy share link → fires `sonner` toast "Report link copied" / "PDF exported (mock)". "Mark as sent" flips draft→sent and writes a `data.exported`-style entry into the audit ledger story (see Compliance screen) — toast "Weekly report sent to sponsor".
  - "Print" uses the report sheet's print-friendly layout.
- **Copy:** Header subtitle: "Service-level targets per stage, and the weekly status report your sponsor reads." SLA status legend: "On track / At risk / Breached". Clock chip: "Clock paused outside coverage hours". Throttle banner: "Intake paused — {name} has {n} open gates (cap {N})." Report title: "Weekly Status — AutoMarket Pod". Report intro line: "Here's what your pod delivered this week." Export CTA: "Export report". Share CTA: "Copy share link". Empty SLA: "No SLAs defined for this pod yet." Breach drawer title: "Breach history — Spec gate clearance".
- **Demo note:** 1:45 MONITOR beat — after the ROI hero, flip to SLA & Reports → "every stage has a target, here's target-vs-actual, one's at-risk and here's the breach history" → switch to the Client Report tab and "this is the one-click weekly status your sponsor gets" → Export. The sponsor-facing artifact that turns telemetry into a sellable deliverable.

### Compliance & Audit — `/compliance` (REFRAME)
- **Purpose:** The durable, append-only audit ledger that outlives agent data, UPGRADED with human-decision attribution (actor + decision + reason per gate), honestly shown as "when-only" until auth lands.
- **Persona & entry:** PM and Compliance/Exec land from MONITOR rail "Compliance & Audit"; also reached from a gate's "View in audit" link (`/approvals`) and from the Client Report's "Mark as sent" action. Read-mostly; export is the only action.
- **Layout:** Keep RealComplianceView's structure (it's already the live, server-backed view). Reframe to two stacked sections inside the existing `space-y-4 p-4 lg:p-6` container, fed by `getAuditFn` (the real Supabase ledger):
  - **Header** (`glass-panel`, unchanged shape) + a new "Export ledger" `button` on the right next to the `{count} events` chip.
  - **Section A — Human decisions (new, on top):** a filtered, richer view of `gate.approved` / `gate.rejected` / `gate.override`-class actions rendered as decision cards/rows that foreground the human attribution: actor avatar (or a dashed "unattributed" placeholder), decision badge, target artifact, and the **reason** captured at the gate (typed and required on reject/override; optional quick-reason chips on approve — the P1-G1 canon).
  - **Section B — Full audit trail:** the existing `table` (When / Action / Agent / Target / Project / Actor), kept verbatim as the complete append-only log, now with the actor column wired to render attribution when present. Interleaved **gap-marker rows** (Blind spot 5): when ledger ingest was down, a muted hatched row reads "**sync gap 02:10–02:34** — events in this window were not captured (the agent bus is ephemeral); the gap is permanent and shown, not hidden" — the when-only honesty pattern applied to the platform itself. Mirrors the `/status` degraded-mode story.
  - **Section C — AI Act deployer readiness (NEW):** a `glass-panel` re-labeling the same controls as regulatory evidence. (1) A **control→article mapping table** (4 rows): Accountability matrix → **Art 26(2)** assigned human oversight · Append-only ledger → **Art 26(6)** log retention · Incidents & Recovery → **Art 26(5)** serious-incident reporting · Gate decisions-with-reasons → human-oversight evidence. (2) A one-click **"Deployer evidence pack"** export button — joins the ledger + decision reasons + accountability-matrix history into one bundle. (3) A **retention indicator** chip: "Ledger retained 12mo · exceeds Art 26 minimum." (4) One **NIST AI RMF crosswalk line** for US buyers: "These controls also map to NIST AI RMF GOVERN/MANAGE — crosswalk included in the evidence pack."
- **Components:**
  - shadcn primitives: `table` (existing), `badge`, `avatar` (NEW use — actor identity), `tooltip` (hash / "when-only" explainer), `tabs` OR `toggle-group` for the filter — the compliance filter buckets (P1-G4): **All / Decisions / Policy changes / Recovery / Pod control / Resets**, mapped over the `AuditAction` enum in `audit-bridge.ts` — `button` + `dropdown-menu` (export CSV/JSON), `hover-card` (full reason on a decision row), `separator`.
  - Reuse: `RealComplianceView` (extend in place), `getAuditFn`/`AuditEntry`/`AuditData` types from `fleet.functions.ts`, `fmtDateTime`, `ACTION_META` map (extend with `rejected` + decision entries), `cn`, `glass-panel`.
  - NEW components: `HumanDecisionList` (Section A), `DecisionRow` (actor + decision + reason), `ActorChip` (avatar-or-unattributed, with "when-only" tooltip), `LedgerExportMenu`, `AiActReadinessPanel` (Section C — the control→article table is a static config in the component, no new dataset) + `EvidencePackExport` (extends `LedgerExportMenu`).
- **States:**
  - **Not configured:** existing `NotConfigured` panel (env unset) — unchanged.
  - **Loading:** poll keeps `initialData`; first paint is SSR'd, so no separate spinner; if extending, `Skeleton` rows.
  - **Empty:** existing "No audited actions yet…" copy, plus Section A empty: "No human gate decisions recorded yet. When someone approves or rejects a gate, the who/what/why lands here — permanently."
  - **Populated:** Section A shows decision rows; Section B shows the full ledger.
  - **Edge — actor null (the honest "when-only" state):** `ActorChip` renders a dashed-outline avatar with a "—" and a `tooltip`/`hover-card`: "Who isn't captured yet — only when & what. Decision attribution arrives with sign-in (auth v2)." The decision/reason still render; only the identity is pending. This is the load-bearing honesty moment.
  - **Edge — reason missing on an older entry:** reason field shows muted "No reason recorded" rather than blank.
  - **Edge — sync gap (Blind spot 5):** a gap-marker row renders inside Section B at its chronological position ("sync gap 02:10–02:34"); it is excluded from counts/filters but always visible in "All" — a ledger sold as gap-free must show its gaps.
  - **Error:** swallowed by `getAuditFn` (returns empty) — view degrades to empty state, never blanks.
- **Mock data:** Primary driver stays the REAL `getAuditFn` ledger (Supabase `audit_log`, actions `reset`/`approved`). To demo the decision-attribution upgrade without auth, extend the `AuditEntry` record SHAPE (and seed mock fallback) with the designed-now fields:
  - Add to the audit record: `decision?: "approved" | "rejected"`, `reason?: string | null`, `actor?: string | null` (already present, kept null = when-only), `gate_kind?: "approval" | "clarification"`.
  - For the mock/demo path, reuse `src/mock/compliance.ts` `AUDIT` (it already has `actor: { kind, id }`, `action: "gate.approved"|"gate.rejected"`, and `rationale` — map `rationale`→`reason`, `actor.id`→attributed actor) so Section A is richly populated in mock mode even while the live Supabase actor stays null. No new dataset required; map the two shapes in the view.
  - Seed **3–4 `policy.changed {field, before, after}` rows** in the audit bridge (budget cap raised, approver channel rewired, retention window change, autonomy grant L0→L1) so the **Policy changes** bucket is non-empty — "every action is written to the ledger" must include policy mutations, not just two verbs (P1-G4).
  - Seed **one sync-gap marker** (`{ kind: "gap", from: "02:10", to: "02:34" }`-shaped sidecar row, matching the `/status` uptime seed's degraded stretch) so the gap-marker rendering is demoable.
- **Interactions:**
  - Filter `toggle-group` (All / Decisions / Policy changes / Recovery / Pod control / Resets) re-filters both the full table and Section A.
  - A decision row → `hover-card` with full reason + artifact ref + tamper-evident `hash`/`prevHash` (from `compliance.ts` mock) as a "chain intact" indicator.
  - "Export ledger" → CSV/JSON of the current filter (mock download) → `sonner` toast; in mock mode this also appends a `data.exported` entry, demonstrating the ledger recording its own export.
  - **"Deployer evidence pack"** (Section C) → mock bundled export (ledger + reasons + matrix history) → toast "Evidence pack generated (mock)"; also appends a `data.exported` entry.
  - Deep-link in: `/approvals` "View in audit" scrolls to the matching `gate.approved` row (anchor by target id).
- **Copy:** Header (existing): "Durable, append-only record of state-changing actions across the fleet — kept in the control plane so it survives an agent deleting its own data." Section A title: "Human decisions". Section A subtitle: "Who approved or rejected each gate, and why — captured at decision time." When-only tooltip: "Actor capture arrives with sign-in. Today we record when & what; who is honestly shown as '—'." Section C title: "AI Act deployer readiness". Section C subtitle: "Your oversight controls, mapped to EU AI Act Article 26 deployer obligations — designed now, certified later." Retention chip: "Ledger retained 12mo · exceeds Art 26 minimum." NIST line: "Also maps to NIST AI RMF GOVERN/MANAGE — crosswalk in the evidence pack." Evidence-pack CTA: "Deployer evidence pack". Footer (extend existing): "Audited: the full action vocabulary — pod/agent control, gate decisions & overrides, clarification answers, recovery actions, reassignments & accountability acceptances, policy changes, constitution amendments, report sends, data exports, resets. Actor (who) is captured once sign-in lands; until then, when & what only." Export CTA: "Export ledger". Gap-marker row: "sync gap {from}–{to} — events in this window were not captured; gaps are permanent and shown."
- **Demo note:** 1:45 MONITOR close-out — after the gate is approved in the RUN beat (`/approvals`), open `/compliance`: "that approval is now in a durable ledger that outlives the agent — and when sign-in lands, this column names the human who approved and shows their reason." For an EU buyer, point at Section C: "the matrix, the ledger, the incidents, the gate reasons — these *are* your Article 26 deployer evidence; one click exports the pack." Pair with the governance zero-LLM moat as the 2:45 close.

### Accountability — Human Decision Audit panel — `/pod` (REFRAME, shared component)
- **Purpose:** Surface per-human decision attribution (actor + decision + reason + SLA turnaround) on the Accountability matrix, so "who is responsible when it's wrong?" is answered with an evidence trail, not just an org chart.
- **Persona & entry:** PM/Exec on the Accountability page (`/pod`, reused PodView); also the target of "View decisions" from the Compliance ledger and from a human's row in the matrix.
- **Layout:** Within reused `PodView`, add a right-side `Sheet` (or expandable row detail) per human: their recent gate decisions. Matrix cell already shows the accountable human per agent (from `humans.ts` `OWNERSHIP`); add a per-human "decisions" affordance opening the drawer. The drawer reuses `DecisionRow`/`ActorChip` from the Compliance screen so attribution is rendered identically everywhere.
- **Components:**
  - shadcn primitives: `sheet`, `table`, `badge`, `avatar`, `hover-card`, `tooltip`, `separator`.
  - Reuse: `PodView` (extend), `humans.ts` (`workload.slaBreaches`, `avgApprovalMin`, `decisionsToday`), `DecisionRow`/`ActorChip` (NEW, shared with Compliance), `compliance.ts` `AUDIT` filtered by `actor.id` for that human's decision history, `fmtDateTime`.
  - NEW components: `HumanDecisionDrawer` (wraps `HumanDecisionList` scoped to one human + their SLA stats header).
- **States:**
  - **Populated:** drawer header = human name/role/initials + KPIs (decisions today, avg approval min, SLA breaches from `humans.ts`); body = their decision rows (reason + target + turnaround).
  - **Empty:** "No decisions recorded for {name} in this window."
  - **Edge — empty accountability column:** if an agent has no accountable human (`OWNERSHIP` gap), the matrix cell renders the existing "uncovered risk" red flag and the drawer is disabled with "Assign an accountable human first" (links to LAUNCH People & Roles).
  - **Edge — actor null:** decisions show attributed via the mock `compliance.ts` actor ids; the same "when-only" honesty note appears if rendering live-ledger data.
- **Mock data:** No new dataset — joins `humans.ts` (`workload`, `OWNERSHIP`) with `compliance.ts` `AUDIT` (filtered `actor.kind === "human"`, grouped by `actor.id`). Optionally add per-human `slaTurnaroundHr` derived from `avgApprovalMin` for the drawer header.
- **Interactions:** Click a human in the matrix → `HumanDecisionDrawer`; a decision row → deep-link to `/compliance` anchored at that entry, or to the artifact/`/pipeline`. "View full ledger" button → `/compliance` filtered to that actor.
- **Copy:** Drawer title: "{Name} — decision history". KPI labels: "Decisions today", "Avg clearance", "SLA breaches". Empty: "No decisions recorded in this window." Footer reuses the "when-only" attribution note.
- **Demo note:** Optional accountability beat after the ROI/SLA reveal — "one accountable human per agent, and here's their decision trail with reasons and clearance times." Reinforces the accountability-matrix wow beat; secondary to the SLA/report and Compliance beats.


### Pod Memory & Constitution — `/memory`  (NEW)
- **Status:** ✅ in the mock (wave 2) — route `src/routes/memory.tsx`, components `src/components/memory/*`, data `src/mock/memory.ts`; `/knowledge` now redirects here (real-mode → `/`) and its source-row rendering is absorbed as the "What it knows" section. Ratify writes `constitution.amended`, Dismiss requires a typed reason, Forget tombstones the source + writes `policy.changed` — all via `audit-bridge`, visible in Compliance.
- **Purpose:** The compounding moat surface (P1-A2): the pod's per-client **Constitution** (rules with provenance), **Proposed amendments** mined from rejection-reason clusters (ratified through a gate, on the record), and **What it knows** (sources with an audited Forget). RESOLVES the orphaned `/knowledge` route — it folds in here as section 3 (coverage review #3).
- **Persona & entry:** PM / QA Lead (ratify, forget), Sponsor read-only. MONITOR rail "Memory & Rules" (wave 2); deep-linked from a Spec Review citation chip and from `/compliance` amendment evidence.
- **Layout:** AppShell content, three stacked sections: (1) **Constitution** — rule list grouped by category; each row: rule text, **provenance badge** ("Blueprint default" / "Client-provided" / "Ratified {date} — from rejection cluster"), and the gate decisions citing it; (2) **Proposed amendments** — cards: the draft rule + its mined evidence ("3 specs rejected for missing error-state ACs → proposed rule"), evidence deep-links to `/compliance`, **Ratify / Dismiss** actions; (3) **What it knows** — the source list (lifts the existing `KnowledgeView` rendering) with scopes, last-sync, and an audited **"Forget this"**.
- **Components:** shadcn `card`, `badge`, `accordion` (rule categories), `alert-dialog` (ratify/forget confirms), `hover-card` (evidence peek), `button`, `scroll-area`, `tooltip`, `separator`. REUSE `KnowledgeView` source rows + `src/mock/knowledge.ts`; constitution rule ids from `governance.ts`; `appendAuditMock`. NEW: `ConstitutionList`, `AmendmentCard`, `KnowledgeSourcesPanel`, `ProvenanceBadge`.
- **States:** *populated:* seeded rules + 2 proposed amendments + sources. *empty constitution (new pod):* "Your pod starts with the blueprint's defaults — rules accrue as you reject with reasons." *no proposals:* "No amendment proposals yet — rejection reasons are mined into draft rules weekly." *forgotten source:* row collapses to a tombstone "Forgotten · {date} · on the record." *error:* destructive `alert` + retry.
- **Mock data:** NEW `src/mock/memory.ts` — `ConstitutionRule { id; text; category; provenance: "blueprint" | "client" | "ratified-amendment"; ratifiedAt?: number; citedByGateIds: string[] }`, `AmendmentProposal { id; draftText; minedFrom: { rejectionGateIds: string[]; clusterLabel: string }; state: "proposed" | "ratified" | "dismissed" }`. Sources reuse `knowledge.ts`. Ratify writes **`constitution.amended`** via `appendAuditMock`; Forget is recorded as `policy.changed { field: "knowledge.sources", before, after }` (staying inside the P1-G4 vocabulary).
- **Interactions:** **Ratify** → `alert-dialog` ("Recorded in the ledger") → rule joins the Constitution with provenance "Ratified {date}"; **Dismiss** requires a short typed reason (consistent with the reject canon); **Forget this** → confirm → source tombstones + audit row; a rule row expands its citing decisions (deep-link `/compliance` anchored); a source row expands scopes.
- **Copy:** Title "Memory & Constitution". Sub "Your standards become the pod's standards — through a gate, on the record." Amendment example: "3 specs rejected for missing error-state ACs → proposed: 'Every AC set includes error-state criteria.'" CTAs "Ratify (recorded)" / "Dismiss". Forget confirm: "Forget this source? The pod stops drawing on it; the removal is recorded." Provenance badges "Blueprint default" / "Client-provided" / "Ratified {date}".
- **Demo note:** The compounding-moat beat — after a reject in RUN, show the rejection cluster already mined into a draft rule: the pod learns your standards through the same gates that govern it.

### Pilot Scorecard — `/pilot`  (NEW)
- **Status:** ✅ in the mock (wave 2) — route `src/routes/pilot.tsx`, components `src/components/pilot/*`, data `src/mock/pilot.ts` (`PILOT_MODE = true`). As-built: the MONITOR rail item renders with a `PILOT` tag (the mock tenant is always in pilot mode; the not-in-pilot empty state is coded behind the flag); weeks 1–4 carry honest misses, 5–6 pending; fee figures derive from `economics.ts` `PRICE_PAID_USD` and every money row carries the "pricing hypothesis" label.
- **Purpose:** The pilot motion surface (P1-C3): targets-vs-actuals against the pilot criteria set in LAUNCH → Go live → Targets & budget (6a), a week 1–6 strip, the human baseline, and the end-of-pilot conversion sheet.
- **Persona & entry:** PM + Sponsor. MONITOR rail item rendered **only when the tenant is `mode: "pilot"`**; deep-linked from the post-launch ribbon's TTFAA chip.
- **Layout:** AppShell content: (1) header — pilot window + days-remaining chip; (2) **targets-vs-actuals tiles** (reuse the SLA target-vs-actual pattern): TTFAA < 24h, approved artifacts per pod-week, gate-clearance p50, validator pass-rate, spend vs cap; (3) **week 1–6 strip** — one column per week, per-metric status dots; (4) **baseline panel** — the `roiAssumptions` baseline ("senior BA, 4h/spec · {source}" — *your numbers, not ours*); (5) **conversion sheet** — pilot fee credited to year one + the annual plan summary (both labeled *pricing hypothesis*) + "Generate conversion sheet".
- **Components:** shadcn `card`, `progress`, `badge`, `table`, `button`, `select` (period), `tooltip`, `separator`, `chart` (week strip). REUSE `KpiTile`, the `SlaStatusTable` row pattern, the `roiAssumptions` edit affordance. NEW: `PilotTargetsBand`, `PilotWeekStrip`, `BaselinePanel`, `ConversionSheet`.
- **States:** *mid-pilot populated* (default). *early (week 1):* most tiles "—" with "first signal expected by {date}". *target missed:* honest red tile + a one-line mitigation note (same honesty rule as the sponsor report). *pilot ended:* banner "Pilot window closed — conversion sheet ready" + export. *not in pilot mode:* hidden from the rail; direct nav shows a calm empty state "This pod isn't running a pilot."
- **Mock data:** NEW `src/mock/pilot.ts` — `PilotPlan { podId; startIso; endIso; criteria: { metric: string; target: number; unit: string }[]; weekly: { week: 1|2|3|4|5|6; actuals: Record<string, number> }[]; baseline: { label: string; source: "client-provided" | "Q-default" }; conversion: { pilotFeeUsd: number; creditedToYear1: true; planName: string } }` — fee figures labeled *pricing hypothesis*; actuals mirror `economics.ts aggregates` + `report.ts` so the numbers reconcile across MONITOR.
- **Interactions:** Tile click → the underlying surface (TTFAA → `/reports`, spend → `/billing`, validator pass-rate → `/governance`). "Generate conversion sheet" → mock PDF + a `data.exported` audit row + toast. Period select re-scopes the strip.
- **Copy:** Title "Pilot scorecard". Sub "The targets you set before launch, measured by the same ledger that runs the pod." TTFAA tile: "Time to first approved artifact — {h}h (target < 24h)". Conversion CTA "Generate conversion sheet". Footer "Pilot fee credited to year one · pricing hypothesis."
- **Demo note:** The pilot-buyer close — "you'll know by week 6, from your own data, with the conversion math pre-filled."

### Org Portfolio Rollup — `/org`  (NEW)
- **Status:** ✅ in the mock (wave 2) — route `src/routes/org.tsx`, components `src/components/org/*` (+ `pod-stats.ts` deterministic per-pod derivations over the pod store). As-built: PodSwitcher footer gained "View all pods →"; row click switches the active pod and lands on `/economics`; the ExpansionHint CTA lands on `/pods/new?step=blueprint` without pre-selecting the blueprint (the wizard's search params validate only `step`).
- **Purpose:** The multi-pod sponsor's rollup (P1-C2): every pod in the client org on one page — status, the canonical ROI trio, open gates/incidents, spend vs cap — and the expansion engine's home (`ExpansionHint` cards live here).
- **Persona & entry:** Client Sponsor/Exec with more than one pod; PM for portfolio review. Entry from the pod switcher footer ("View all pods") and the Exec Digest header.
- **Layout:** AppShell content: header (org name + period selector) → **org-level KPI band** (the canonical trio summed across pods, net of plan fees) → **pod table** — one row per pod: name, status pill (Live/Setting up/Paused), agents, accountable humans, open gates, open incidents, MTD spend vs cap bar, ROI-trio mini → an **`ExpansionHint` card** ("Listr's backlog fits the Web App Delivery blueprint — launch a second pod →").
- **Components:** shadcn `table`, `card`, `badge`, `progress`, `select` (period), `tooltip`, `separator`. REUSE `RoiHeroRow` (as-built `src/components/monitor/`), pod-row styling from `PodSwitcher`, `KpiTile`. NEW: `OrgRollupTable`, `ExpansionHintCard`.
- **States:** *multi-pod populated* (default). *single pod:* renders with a "one pod live" note + the ExpansionHint. *pod paused / over-cap:* the row carries the amber/red state inline (same tones as `PodControlBar`/cap badges). *loading/error:* skeleton rows / alert + retry.
- **Mock data:** No new dataset — derives from the as-built pod store (`src/lib/pods/pod-store.tsx`, localStorage `aiops_pods_v1`) joined with per-pod `economics.ts` aggregates and the open counts (`openGateCount()`, `incidents.ts`); each pod keeps its distinct mini-dataset (the Post-Launch demo-binding rule), so the rollup proves scoping is real.
- **Interactions:** Row click → switches the active pod (same cookie mechanics as `PodSwitcher`) and lands on that pod's `/economics`. ExpansionHint CTA → `/pods/new?step=blueprint` pre-selected to the suggested blueprint. Period selector re-scopes the band.
- **Copy:** Title "Your pods". KPI band labels = the canonical trio + "net of plan fees". ExpansionHint: "Backlog 'Listr' fits the Web App Delivery blueprint — launch a second pod →". Single-pod note: "One pod live — the portfolio view grows with you."
- **Demo note:** The expansion beat — flip from one pod's ROI to the org rollup ("this is what the CFO sees at three pods"), then click the hint straight into LAUNCH.

### Deliverables — `/artifacts`  (NEW)
- **Status:** ✅ in the mock (wave 2) — route `src/routes/artifacts.tsx`, components `src/components/artifacts/*`, data `src/mock/artifacts.ts` (header comment states the snapshotted-at-gate-clearance rule). As-built: the spec's `ActorChip` didn't exist — a local `ApproverChip` renders the approved-by join; the rejected-iteration diff is a line-level LCS render (`artifact-ui.tsx`) with a "diff vs vN / as-written" toggle; AM-142 ships the demoable v1-rejected → v2 story; `MarkdownLite` reused from `TraceabilityView`.
- **Purpose:** The shelf (Blind spot 4): everything the pod has produced — a filterable artifact table with approved-by joined from the ledger, a per-artifact version timeline with rejected-iteration diffs, and Export all. Carries the load-bearing rule: **approved artifacts are snapshotted into the control plane at gate-clearance** — no agent reset deletes a paid deliverable (the same rationale that created the audit DB).
- **Persona & entry:** PM + Sponsor ("where's the spec we approved last month?"). MONITOR rail "Deliverables" (wave 2); deep-linked from weekly-report delivered items and from a gate's already-decided stamp.
- **Layout:** AppShell content: header + filter bar (kind from `chain.ts ArtifactKind`, ticket, period, approver) → **artifact table**: kind icon, title, ticket id, version, **approved-by** (`ActorChip`, joined from the ledger), approved date, gate link → a row opens the **version timeline** (right `sheet`): each iteration v1→vN with **rejected-iteration diffs** (`MarkdownLite` render, the reject reason inline), the gate that cleared it, and the **snapshot stamp** → header-right **"Export all"**.
- **Components:** shadcn `table`, `sheet` (version timeline), `badge`, `button`, `dropdown-menu` (export format), `scroll-area`, `tooltip`, `separator`. REUSE `MarkdownLite` + `buildLineage` (trace.ts), `ActorChip`/`DecisionRow` (Compliance family), `FilterBar` + `useListFilter`. NEW: `ArtifactsTable`, `VersionTimeline`, `SnapshotStamp`.
- **States:** *populated* (default). *empty:* "Nothing delivered yet — approved artifacts land here the moment a gate clears, and stay here even if an agent resets." *rejected-history:* v1 renders as a struck-through diff against v2 with the reject reason. *snapshot-pending edge:* an artifact approved during a ledger sync gap shows "snapshot pending · backfills on reconnect" (mirrors the degraded-mode honesty). *error:* alert + retry.
- **Mock data:** NEW `src/mock/artifacts.ts` — `ArtifactSnapshot { id; kind: ArtifactKind; ticketId; title; version: number; approvedByGateId: string; approvedAt: number; contentRef: string; snapshotAt: number }` + `artifactVersions(ticketId)`; approved-by joined from `audit-bridge.ts` rows. Seeds: AM-142's spec at v2 (one rejected iteration, diff demoable) + the merged ticket from `economics.ts`. The snapshot-at-gate-clearance rule stated in the file header comment (control-plane data model: `ArtifactSnapshot`).
- **Interactions:** Filters narrow live (URL-param contract per the FilterBar spec). Row → version timeline; diff toggle per iteration; gate link → `/approvals/$gateId` (read-only decided stamp). **"Export all"** → mock zip + a `data.exported` audit row + toast.
- **Copy:** Title "Deliverables". Sub "What your pod produced — snapshotted at gate-clearance, owned by you." Snapshot stamp: "Snapshotted at clearance · survives agent resets." Export CTA "Export all". Empty as above.
- **Demo note:** The renewal-meeting answer — "where's the spec we approved last month?" lands here in one click, with who approved it, why v1 was rejected, and the proof it outlives the agent.

### Platform Status — `/status`  (NEW)
- **Status:** ✅ in the mock (wave 2) — route `src/routes/status.tsx`, components `src/components/status/*`, data `src/mock/status.ts` (deterministic 90-day seeds incl. the ledger degraded stretch). As-built: the rail entry sits under ADVANCED · technical; the Settings entry link and the degraded-banner deep-link are NOT wired yet (the App Shell degraded banner itself is still unbuilt — `settings.tsx` is a live-shared route, left untouched by design).
- **Purpose:** The per-tenant status page (Blind spot 5): component health, 90-day uptime, the current degraded-mode state, and the honest platform story ("agents continue working when the dashboard is down") — doubling as a procurement artifact.
- **Persona & entry:** Any member; procurement/security reviewers via a share link. Entry from Settings → Tenancy & Security ("Platform status →") and from the App Shell degraded-mode banner's "details →" link. Renders client-clean (no operator chrome needed).
- **Layout:** Centered column: header (tenant name + overall state pill) → **component health list** (Dashboard/control plane, Ledger sync, Agent gateway, Slack bridge, Connected tools rollup) each with a state dot + last-incident line → **90-day uptime bars** per component → a **"How degradation works" card** (the three-line honesty: agents keep working; gates remain answerable in Slack; the ledger backfills with gap-markers) → footer: uptime target + ledger RPO (per the §8 "Platform availability & DR" row).
- **Components:** shadcn `card`, `badge`, `tooltip`, `separator`, `progress`/`chart` (uptime bars). REUSE the `StatusDot` visual language. NEW: `StatusComponentRow`, `UptimeBars`, `DegradationExplainer`.
- **States:** *all operational* (default). *degraded:* matches the App Shell banner; the affected component amber with "since {t}". *active ledger sync gap:* the Ledger row reads "sync gap open since {t} — the gap will be marked in Compliance." *historical incident:* a red uptime-bar segment with hover detail. *empty history (new tenant):* "Your 90-day history accrues from launch."
- **Mock data:** NEW `src/mock/status.ts` — `StatusComponent { id; label; state: "operational" | "degraded" | "down"; since?: number; lastIncidentAt?: number }`, `uptimeDays: { componentId; day: string; pct: number }[]` (90 seeded days incl. one degraded stretch matching the Compliance gap-marker seed), `platformSla { uptimeTargetPct: number; ledgerRpoMin: number }`.
- **Interactions:** Read-only. Component row expands its last incident; print/share-friendly; the shell banner deep-links here.
- **Copy:** Title "Platform status — {tenant}". Overall pill "All systems operational" / "Degraded — your agents are unaffected". Explainer: "If Agency OS is unreachable: your agents continue working; gates remain answerable in Slack; the ledger backfills on reconnect and marks any gap honestly." Footer "Uptime target {pct}% · ledger RPO {n} min."
- **Demo note:** The procurement pull-up — when security asks "what happens when *you* go down," this page is the one-screen answer, consistent with the gap-marked ledger.


---

## CROSS-CUTTING


> ### Canonical URLs — addressing rules (NORMATIVE, P1-H1)
> Exactly **one URL per entity**; `?param=` is a **list-filter affordance only**, never an entity address. The canon (as-built where noted):
> - **Wizard** — `/pods/new?step=blueprint|agents|connect|people|slack|golive` *(as-built: `src/routes/pods.new.tsx`; the historical `/fire-up/*` and `/new-pod/*` forks are retired).*
> - **Gate** — `/approvals/$gateId` *(as-built: `src/routes/approvals_.$gateId.tsx` — trailing underscore = un-nested from `/approvals` on purpose; `ApprovalsView` has no `Outlet`).* `?gate=` on `/approvals` pre-filters/highlights the list only.
> - **Incident** — `/incidents/$id`; `?incident=` survives only as a list-filter alias.
> - **Ticket** — `/pipeline?ticket=` is a filter+highlight, never an entity URL (a ticket's entity surfaces are its gate and trace views).
> - **SLA & reports home** — `/reports` (the `/sla` route name is retired).
> - **Notifications** — the TopBar bell + `/notifications`; **no left-rail item**.
> - **Shared reports** — `/share/$token` (chrome-less; see the Shared Report Viewer spec below).
> All `deepLink` values (in `notifications.ts`, ⌘K results, and Slack messages) use these canonical forms.


### Notification Bell + Inbox Popover — `(global, in TopBar)`  (NEW)
- **Purpose:** The persistent in-app notification surface — a bell in the TopBar that opens a per-user notification inbox without leaving the current screen.
- **Persona & entry:** Every persona (PM, Eng Lead, QA Lead, Sponsor). Entry: the `🔔` bell in the TopBar (added next to the existing ESC/digest chips), or keyboard `g n`. Replaces today's transient-only `sonner` toasts with a durable, reviewable list.
- **Layout:** A `Popover` anchored bottom-right under the bell (width ~`w-96`, `max-h-[32rem]`). Header row: title "Notifications" + unread count badge + a "Mark all read" text button + a gear icon deep-linking to `/notifications` preferences. Body: a `ScrollArea` list of notification rows grouped by recency ("Now / Earlier today / This week"). Footer: a full-width "Open inbox" link to `/notifications`. The bell itself carries a small red count dot when `unread > 0` (mirror the existing ESC-chip `animate-pulse` treatment).
- **Components:** `Popover` + `PopoverTrigger`/`PopoverContent`, `ScrollArea`, `Badge`, `Button` (ghost), `Tabs` is NOT needed here (keep it a flat list). Reuse `Avatar` for actor/agent icon. NEW components: `NotificationBell` (the trigger + unread dot, lives in `TopBar.tsx`), `NotificationInboxPopover`, `NotificationRow` (icon by `kind`, title, body preview, relative time, unread dot, optional inline action button). *(There is exactly ONE `NotificationBell` — this cluster owns the spec, the shell hosts it; as-built: `src/components/shell/NotificationBell.tsx`. The TopBar spec's bell defers here — P1-H2.)*
- **States:**
  - *empty:* bell with no dot; popover body shows centered "You're all caught up" + muted "New gates, escalations and SLA alerts will appear here."
  - *loading:* 4 `Skeleton` rows (avatar circle + two text bars).
  - *populated:* rows sorted newest-first; unread rows have a left accent bar (`border-l-2 border-primary`) + bolder title; read rows muted.
  - *error:* inline `Alert` (destructive) "Couldn't load notifications" + "Retry".
  - *edge — high volume:* cap the popover at 20 rows; show "+N more — open inbox" pinned at bottom.
- **Mock data:** NEW dataset `src/mock/notifications.ts` (shape defined once below, shared by this, the full inbox, and the mobile gates view). Bell unread count = `notifications.filter(n => !n.read && n.recipientId === currentUser).length`.
- **Interactions:** Click a row → marks read + navigates to its `deepLink` (e.g. a gate → `/approvals?gate=appr-AM-142`, an incident → `/incidents/inc-3`, a comm → `/comms?id=c3`). Inline action button on actionable rows (e.g. "Approve" on a gate row) opens the gate review surface directly. "Mark all read" zeroes the count. Gear → `/notifications` (Preferences tab). Bell stays mounted across route changes (it's in the shell).
- **Copy:** Bell `aria-label`: "Notifications". Header: "Notifications". Empty: "You're all caught up". CTA: "Open inbox", "Mark all read".
- **Demo note:** During the 0:30 RUN beat, when the BA clarification gate fires, the bell pulses to `1` and the popover preview shows "Clarification needed · AM-142" — the visible proof that the gate *reached the human*.

---

### Notification Inbox + Preferences + Alert Rules + Digests — `/notifications`  (NEW)
- **Purpose:** The full per-user notification center: a filterable history of all notifications, channel/event delivery preferences, SLA/incident alert rules, and stakeholder digest config.
- **Persona & entry:** PM/operator primarily (owns alert rules + digests); any user manages their own per-event channel preferences. Entry: the bell popover gear or its "Open inbox" footer ONLY — **no left-rail item** (canonical addressing per P1-H1: notifications = bell + `/notifications`) — sits alongside the NEW notifications system named in vision §4.
- **Layout:** Standard app-shell main region. Page header "Notifications & Alerts". A `Tabs` strip with four tabs: **Inbox** · **Preferences** · **Alert rules** · **Digests**.
  - *Inbox tab:* left a filter bar (search `Input` + `kind` filter chips + read/unread `toggle-group` + channel `Select`), right the list — reuse `NotificationRow` in a denser full-width table-like layout, paginated via `Pagination`. Bulk actions row ("Mark read", "Dismiss") appears when rows are selected (`Checkbox` per row).
  - *Preferences tab:* a `Table` matrix — rows = event types (Clarification gate, Approval gate, Escalation, SLA breach/at-risk, Incident opened, Run failed, Tool disconnected, Daily digest, Weekly report), columns = channels (In-app, Email, Slack, Push) each a `Switch`. A "muted hours / quiet hours" row with a time-range note. Channel column headers carry a Live/Roadmap `Badge` (In-app + Slack Live; Email + Push Roadmap — honesty per the Live-vs-Roadmap pattern in §4).
  - *Alert rules tab:* `Card` list of rules; each rule: trigger condition (built from SLA defs + incident kinds), threshold, channel(s), routedTo human, on/off `Switch`, "Edit" → a `Sheet` (side) with the rule form. "New rule" button top-right.
  - *Digests tab:* reuse the existing `SCHEDULED` digest model from `src/mock/comms.ts` — list of digest cards (name, cadence, audience, channel, next-run countdown) with a live `preview` rendered from `ScheduledComm.preview`. Each has on/off + "Edit recipients".
- **Components:** `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `Table`, `Switch`, `Select`, `Input`, `Badge`, `Card`, `Sheet` (rule editor), `ToggleGroup`, `Checkbox`, `Pagination`, `Button`, `Separator`. Reuse `NotificationRow`. Reuse `minutesUntilUtc`/`nextDailyDigest` from `comms.ts` for digest countdowns. NEW components: `NotificationsView`, `PreferenceMatrix`, `AlertRuleCard`, `AlertRuleEditorSheet`, `DigestCard` (the last can wrap existing `ScheduledComm.preview` rendering already used in `CommsView`).
- **States:**
  - *Inbox empty:* "No notifications yet" + illustration; *filtered-empty:* "No notifications match these filters" + "Clear filters".
  - *Preferences:* all switches reflect mock defaults; toggling a Roadmap channel shows a `Tooltip`/inline note "Email delivery is on the roadmap — in-app only for now" and the switch is allowed but tagged.
  - *Alert rules empty:* "No alert rules yet — add one to get paged when an SLA is about to breach" + "New rule".
  - *loading:* `Skeleton` rows/cards per tab. *error:* destructive `Alert` + retry.
- **Mock data:** NEW `src/mock/notifications.ts` drives Inbox; NEW `alertRules` array (below) drives Alert rules; existing `SCHEDULED` (`comms.ts`) drives Digests; existing `humans.ts` for `routedTo` pickers. Preference matrix backed by NEW `notificationPrefs` (below).
- **Interactions:** Toggling a `Switch` in Preferences optimistically updates + `sonner` toast "Slack delivery enabled for Approval gates". Creating/editing a rule in the `Sheet` validates threshold + channel + routedTo, then closes and prepends to the list. Clicking a digest "preview" expands the `ScheduledComm.preview` sections inline. Inbox row click behaves as in the popover (mark read + deep-link).
- **Copy:** Tabs: "Inbox / Preferences / Alert rules / Digests". Preferences subtitle: "Choose what reaches you, and where." Alert-rule example label: "When **Spec Review** gate is **>4h overdue** → Slack #automarket-leads + DM Ana". CTA: "New rule", "Save rule", "Edit recipients". Quiet-hours: "Mute non-critical alerts 22:00–07:00 UTC (escalations always notify)."
- **Demo note:** Brief cameo in the 1:45 MONITOR beat if shown — the Preferences matrix is the one-screen answer to "how does the human actually get pulled in?", reinforcing the HITL loop closing claim from §4.

---

### My Gates (mobile-first approvals) — `/m/gates`  (NEW)
- **Status:** ✅ resolved as RESPONSIVE design (wave-2 completion) — there is NO `/m/` route. Below `md`, the unified `/approvals` renders this spec's card stack (SLA-sorted, red over-SLA accents, "My gates" header, the empty/loading states below) and `/approvals/$gateId` renders single-column with a **sticky bottom decision bar** (reason canon intact; reject min-10-chars to match desktop). As-built deviation: mobile cards deep-link to the canonical gate URL instead of deciding inline in a bottom sheet (canonical-URL canon wins); desktop is byte-identical except the added policy chips.
- **Purpose:** A phone-optimized surface where a PM or QA lead clears a clarification or approval gate from their pocket — the "the gate is worthless if it never reaches the human" payoff from §4.
- **Persona & entry:** PM / QA Lead / Eng Lead on mobile. Entry: tapping a push/Slack/email notification's `deepLink` (lands directly on a single gate), or `/m/gates` for the full personal queue. Renders full-bleed (no left rail; a slim mobile top bar with pod name + back).
- **Layout:** Single-column, max-width mobile. Top: sticky header "My gates" + filter `ToggleGroup` (All / Clarifications / Approvals) + a count badge. Body: a vertical stack of `Card` gate items, each showing: gate kind badge (Clarification|Approval), ticket id + title, artifact name, age vs SLA (green/amber/red `Badge`), accountable agent avatar. Tapping a card opens the **gate detail** as a full-height bottom `Sheet` (`side="bottom"`): rendered artifact summary (spec sections / EARS criteria for spec gates), the structural-validator result chips, and a sticky action bar at the bottom — **Approve** (one tap, optional quick-reason chips) / **Reject** with a required reason `Textarea`, or for clarifications a free-text answer `Textarea` + Send.
- **Components:** `Card`, `Badge`, `ToggleGroup`, `Sheet` (`side="bottom"` for the gate detail — exactly the primitive this cluster was told to use), `Textarea`, `Button`, `Avatar`, `Separator`, `ScrollArea`. Reuse the gate/decision logic and the decision-reason canon from the desktop Gates/Spec Review (P1-G1: typed reason required on reject/override; optional quick-reason chips on approve). NEW components: `MobileGatesView`, `MobileGateCard`, `MobileGateDetailSheet`.
- **States:**
  - *empty:* "No gates waiting on you" + "We'll notify you the moment one opens." (the good-news state).
  - *loading:* 3 skeleton cards.
  - *populated:* gates sorted by SLA urgency (most-overdue first); overdue gates get a red left accent + "⚠ 4h over SLA".
  - *submitting:* action bar buttons show spinner + disable; on success the card collapses with a "Approved ✓" flash then removes.
  - *error:* inline destructive `Alert` in the sheet "Couldn't submit — retry"; the decision is not lost (textarea retained).
  - *edge — reason required (reject):* Reject disabled until the reason is non-empty; helper text "A reason is required on reject and is written to the audit log." Approve stays one tap (chips optional).
  - *edge — already resolved elsewhere:* if the gate was cleared on desktop meanwhile, the sheet shows "This gate was already resolved by Ana 2m ago" (read-only).
- **Mock data:** Driven by NEW `notifications.ts` (gate-kind rows) joined to existing `approvals`/`tickets` mock for the artifact + SLA. Decision writes a mock entry shaped like the audit ledger record (actor when-real, else "when-only" timestamp per §4/§8 — capture `decision`, `reason`, `ts`).
- **Interactions:** Filter toggles scope the list. Card tap → bottom `Sheet`. Approve/Reject (with reason) or Send-answer → optimistic resolve, toast, card removed, and the desktop queue/audit reflect it. Back chevron returns to the queue; deep-linked single-gate entry shows a "View all my gates" link.
- **Copy:** Header "My gates". Empty "No gates waiting on you". Approve CTA "Approve & continue". Reject CTA "Reject — needs changes". Clarification CTA "Send answer". Reason placeholder "Why? (written to the audit log)". SLA chip "Due in 2h" / "4h over SLA".
- **Demo note:** Optional strong beat — pull out a phone during the 0:30 RUN demo, tap the Slack notification, land on this gate, type a clarification answer, hit Send — the spec advances to *ready* on the big screen. Demonstrates 24/7-operable-by-a-non-engineer-from-anywhere.

---

### Global Command Palette (⌘K) — `(global overlay)`  (NEW)
- **Purpose:** One keystroke to jump anywhere — search across runs/tickets, artifacts, gates, incidents, people, connections, and pods, with deep-links; plus quick actions.
- **Persona & entry:** All personas, power-users especially. Entry: `⌘K` / `Ctrl-K` anywhere, or the `[⌘K search]` affordance in the TopBar. Mounted in the app shell so it's available on every route.
- **Layout:** `CommandDialog` (centered modal over a dimmed overlay). Single `CommandInput` at top. `CommandList` with `CommandGroup`s in priority order: **Quick actions** (New pod, Pause pod, Go to Overview…), **Gates**, **Runs / Tickets**, **Artifacts**, **Incidents**, **People**, **Connections**, **Pods**. Each `CommandItem`: a kind icon (lucide) + primary label + muted secondary (e.g. ticket id / status) + a right-aligned `CommandShortcut` for navigations. A `CommandEmpty` fallback.
- **Components:** `CommandDialog`, `Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandSeparator`, `CommandShortcut`, `CommandEmpty` (all already exist in `command.tsx`). NEW components: `GlobalCommandPalette` (state + keybind + result assembly), `useCommandPaletteData` (assembles a flat searchable index from existing mocks). NEW shell wiring: a `⌘K` trigger chip in `TopBar.tsx` and a global `keydown` listener.
- **States:**
  - *initial (no query):* show "Quick actions" + a "Recent" group (last 5 visited entities, from a mock recents list) so it's useful before typing.
  - *typing:* fuzzy-filtered groups; empty groups hidden.
  - *no match:* `CommandEmpty` "No results for '<q>'" + a hint "Try a ticket id (AM-142), a name, or 'gates'".
  - *loading:* (mock is sync, so n/a) — but show a thin top progress bar if a real search is wired later.
- **Mock data:** Assembled from EXISTING mocks (no new dataset required for the index): `tickets`/`runs` → Runs group, `approvals`+`tickets` → Gates group, artifact strings from `approvals.artifact` + `agents.lastArtifact` → Artifacts, NEW `incidents` mock (owned by the Incidents cluster) → Incidents, `humans` → People, `comms`/connections mock → Connections, `projects` (`project.ts`) → Pods. Each indexed item shape: `{ id, kind: "action"|"gate"|"run"|"artifact"|"incident"|"person"|"connection"|"pod", label, sublabel, deepLink, keywords[] }`. A small NEW `recentEntities` array (ids) for the Recent group.
- **Interactions:** Select an item → close palette + navigate to its `deepLink` (gates → `/approvals?gate=…`, run → `/pipeline?ticket=AM-142`, person → `/pod?human=ana`, incident → `/incidents/<id>`, connection → `/connections?tool=slack`, pod → switch pod). Quick actions fire their handler (e.g. "New pod" → `/pods/new`, "Pause pod" → confirm dialog). Arrow keys + Enter standard; `Esc` closes.
- **Copy:** Input placeholder "Search runs, gates, people, incidents…  (⌘K)". Group headings as above. Empty "No results for '<q>'". TopBar chip text "Search ⌘K".
- **Demo note:** Light touch — a single ⌘K → type "AM-142" → jump straight to the gate, shown once to convey daily-driver fluency (vision §6 names the global ⌘K palette explicitly). *(As-built: the shell/xcut duplication is resolved — ONE palette, `src/components/shell/CommandPalette.tsx`; Pod Copilot below joins it as the second mode of one omnibox family.)*

---

### Pod Copilot — `(global overlay, TopBar + ⌘J)`  (NEW)
- **Status:** ✅ in the mock (wave 2) — `src/components/copilot/*` (mounted standard-only in the AppShell beside the ⌘K palette), data `src/mock/copilot.ts` (canned, keyword-matched — no LLM, badged accordingly). As-built: TopBar sparkle, `⌘J`, and the `aiops:copilot-toggle` CustomEvent all toggle it; answers cite real seed ids (ledger/gate/validator receipt chips deep-linking `/compliance#audit`, `/approvals/$gateId`, `/governance`); proposed-action Confirm writes the exact previewed row via `audit-bridge` with typed reason required on pause intents — the pod store has no pause/resume mutations yet, so the ledger write + toast IS the effect (wire real mutations when agent state lands in the store).
- **Purpose:** The product finally talks (P1-A1): a pod-scoped copilot for **diagnostic Q&A that cites ledger entries and gate decisions** ("ask-with-receipts"), and **NL operations rendered as proposed-action cards** confirmed through the same audited paths as the buttons. Executes the coverage review's ⌘K dedup as **one omnibox family**: ⌘K = navigate, ⌘J = ask/act — one input affordance, two modes.
- **Persona & entry:** PM primarily; every role can ask, only roles with the `act` capability see action cards. TopBar sparkle button + `⌘J` anywhere; "Ask why" affordances on gate stamps and incident rows pre-fill the question.
- **Layout:** Right-side `sheet` (sharing the omnibox input affordance with the as-built `CommandPalette`): input at top, conversation below. Answers are short paragraphs with **receipt chips** (ledger #, gate id, validator report) that deep-link to the canonical URLs; an NL op produces a **proposed-action card** — action summary, target, the exact audit row it will write, **Confirm / Cancel**. A persistent honesty badge sits under the input.
- **Components:** shadcn `sheet`, `command` (input), `card` (proposed-action), `badge` (receipt chips + honesty badge), `button`, `scroll-area`, `separator`, `tooltip`. REUSE the existing `SectionAssistant` + `insights.ts` computations (`buildLineage`, gate stats, `ESCALATIONS`) — promoted from legacy chrome to a product surface; the `pausePod()/pauseAgent()` stores; `appendAuditMock`. NEW: `PodCopilot`, `ReceiptChip`, `ProposedActionCard`, `useCopilotAnswers`.
- **States:** *idle:* suggested prompts ("What needs me?", "Why did AM-142 ship?", "Pause the QA agent"). *answer:* paragraph + receipt chips. *proposed-action pending:* card with Confirm/Cancel — **nothing executes unconfirmed**. *action confirmed:* card collapses to the written audit row ("agent.paused · ledger #…"). *can't answer:* honest fallback "I answer from pod telemetry only — try a gate, ticket, or person." *read-only role:* Q&A only; action cards never render.
- **Mock data:** NEW `src/mock/copilot.ts` — canned Q&A keyed to the demo spine: `CopilotAnswer { q: string; answerMd: string; receipts: { kind: "ledger" | "gate" | "validator"; refId: string; label: string }[] }` + `ProposedAction { intent: "pause-pod" | "pause-agent" | "resume-agent" | "open-gate"; target: string; auditPreview: AuditEntryLike }`. Answers are computed/cited from `insights.ts`, `audit-bridge.ts`, and `gate-detail.ts` — **no LLM in the mock**, and the surface is badged accordingly.
- **Interactions:** Type a question → answer + receipt chips (deep-link `/compliance` anchored rows, `/approvals/$gateId`). An NL op → proposed-action card → **Confirm** calls the same store mutation as the equivalent button and writes the same audit row (reason required where the button requires it); **Cancel** dismisses. `⌘J` toggles; receipts are hoverable previews.
- **Copy:** Input placeholder "Ask the pod, or tell it what to do…  ⌘J". Honesty badge: "**Answers computed from pod telemetry · actions always confirmed by you.**" Receipt chips: "ledger #4812" / "gate AM-142" / "8/8 checks". Proposed card: "Pause QA Agent — will write `agent.paused` to the ledger (reason required)." Fallback: "I answer from the ledger, gates, and runs — not from the internet."
- **Demo note:** The 1:30 beat upgrade — type "what needs me?" and get the open gate + escalation with receipts; "why did this ship?" answers with the approver, the reason, and the 8/8 checks. A conversational surface that is *itself* a governance feature, because every answer cites the record.

---

### Shared Report Viewer — `/share/$token`  (NEW)
- **Status:** ✅ in the mock (wave 2) — route `src/routes/share.$token.tsx`, components `src/components/share/*`, data `src/mock/share.ts`. As-built: `__root.tsx` skips BOTH the auth redirect and the AppShell chrome for `/share/*`; `ClientStatusReport`/`ReportBlock` are now exported from `ClientReportTab.tsx` for reuse; the `.share-clean` light scope + print CSS live in `styles.css`; `/reports` "Copy share link" copies the seeded active token (`/share/qshare-am-weekly-7f3k`); opening an active link records the view as a `data.exported` session-ledger row (StrictMode-safe single write).
- **Purpose:** The target of every "Copy share link" (P1-H4): a **chrome-less, client-clean** render of a shared report (weekly status, usage statement, exec digest) for someone with no account — with expired/revoked states, and the **view event audited**.
- **Persona & entry:** The sponsor's CFO/stakeholder opening a link from email or Slack; no auth, no shell. Links are generated from SLA & Client Reports ("Copy share link") and Billing ("Export statement").
- **Layout:** No AppShell — a centered client-clean sheet (light-first, no glow/scanline, client logo slot, ≥12px body — the vision §6 client-clean mode) rendering the `ClientStatusReport` blocks read-only. Slim footer: "Shared by {pod} via Agency OS · this view is recorded · link expires {date}" + a muted "What is Agency OS?" link (the funnel asset).
- **Components:** REUSE `ClientStatusReport`/`ReportBlock` under a client-clean theme variant, `fmtDate`. shadcn `card`, `badge`, `separator`, `alert` (expired/revoked), `skeleton`. NEW: `ShareViewer`, `ClientCleanTheme` wrapper, `ShareFooter`.
- **States:** *active:* the full report, print-friendly. *expired:* a calm, data-free card "This link has expired — ask {sender} for a fresh one." *revoked:* distinct, equally data-free "This link was revoked by the pod admin." *unknown token:* neutral not-found card. *loading:* skeleton sheet.
- **Mock data:** NEW `src/mock/share.ts` — `ShareLink { token; kind: "weekly_report" | "usage_statement" | "exec_digest"; targetId: string; createdBy: string; createdAt: number; expiresAt: number; state: "active" | "expired" | "revoked"; views: { at: number }[] }`. Seeds: one active link to the current weekly report + one expired. Opening an active link appends a view entry + a `data.exported`-class audit row ("report viewed via share link" — the audited view event); revoking (from the report's share menu) writes `policy.changed { field: "share.state" }`.
- **Interactions:** Read-only; print-friendly; the footer link is the only navigation. Expired/revoked states leak no report data.
- **Copy:** Footer: "Shared by {Pod} via Agency OS · this view is recorded · expires {date}". Expired: "This link has expired. Ask {name} to share a fresh one." Revoked: "This link was revoked by the pod admin." Funnel link: "What is Agency OS?"
- **Demo note:** The "send your CFO the ROI screen" close — copy the share link in `/reports`, open it in an incognito window, and the same reconciled numbers render client-clean while the view lands in the ledger.

---

### Demo Director — `(global hidden overlay, ⌘⇧D)`  (NEW)
- **Status:** ✅ in the mock (wave-2 completion) — `src/mock/demoDirector.ts` + `src/components/demo/*`, mounted standard-only in the AppShell; reactivity via `src/mock/demo-bus.ts` (`useDemoTick()` consumed by the bell, the gates queue, and incidents). As-built deviations: beats **re-stage seeded entities** rather than appending duplicates (`clar-AM-142` re-timed to now, `inc-1` re-opened, the `esc1` escalation arrives as a notification only); only `pod.launched` writes to the ledger (once per session — the other beats have no audit-vocabulary verb); checkpoints restore by clearing the staged overlay and reapplying (field `restore()`, the spec's `snapshot()` mechanic under a clearer name); the overlay stays mounted but hidden after first summon so a running script keeps firing across routes. *(0:30 beat retold 2026-06-11 per the tracker boundary: "AM-142 dragged to Ready · pod starts" — the fire also flips AM-142's intake provenance to drag-to-Ready, undo-captured for checkpoint restore.)*
- **Purpose:** The staged-event engine that makes the 3-minute demo performable: a hidden presenter overlay whose step list mirrors the demo script, each step dispatching **staged mutations into the existing mock stores** — nothing in the product is special-cased; the surfaces just react. Fixes the "nothing fires the demo's timed events" hole (the static `notifications.ts`/`clarificationGates`/`INCIDENTS` arrays gain a driver).
- **Persona & entry:** The presenter (and later, every new customer — see Demo note). Opened with **⌘⇧D** from anywhere; never appears in any nav, rail, or ⌘K index. Mounted in the app shell.
- **Layout:** A compact draggable overlay panel (`Card`, ~320px, corner-pinned, high z-index, dimmed-glass) that floats above any screen without stealing focus. Header: "Demo Director" + script name + elapsed timer + auto/manual `toggle`. Body: the **step list** mirroring the 3-minute script (0:00 LAUNCH → 0:30 ticket inflow + clarification → 1:30 escalation/incident → 1:45 MONITOR reveal → 2:45 moat close), each row: timestamp, label, state dot (pending / fired / current). Footer: `▶ Run` / `⏸ Pause`, `Step →` (manual advance), and `Reset to checkpoint` (select + button).
- **Components:** shadcn: `card`, `button`, `toggle` (auto/manual), `select` (checkpoint picker), `badge` (step state dots), `scroll-area`, `tooltip`, `separator`. NEW: `DemoDirectorOverlay`, `DemoStepRow`, `useDemoScript` (timer + dispatcher). No new visual primitives — it must be invisible to the demo audience until summoned.
- **States:**
  - *hidden (default):* nothing rendered; the keybind listener is the only footprint.
  - *idle (opened, not running):* step list pending, "Run" primary; checkpoint select defaults to "Start (pod launched, empty)".
  - *running (auto):* steps fire on the script's timestamps; the current step glows; fired steps tick.
  - *running (manual):* timer paused; `Step →` fires the next step on click — for presenters who narrate at their own pace.
  - *fired/done:* all steps ticked; "Reset to checkpoint" is the only affordance.
  - *edge — mid-script navigation:* the director keeps firing regardless of the visible route (mutations land in the stores; whichever screen is open reacts) — the presenter can roam freely.
- **Mock data:** NEW `src/mock/demoDirector.ts`: `DemoStep { id; at: string /* "0:30" */; label: string; fire: () => void }[]` where each `fire` dispatches into the **existing** mock stores — e.g. `seedInflow(podId)` (AM-142 arrives + BA run starts), `openClarification("AM-142")` (appends the seeded `ClarificationGate` + a `notifications.ts` entry so the bell pulses), `raiseEscalation("AM-138")`, `openIncident("inc1")`, `completeBaRun("AM-142")` (spec → Spec Review). Plus `CHECKPOINTS: { id; label; snapshot: () => void }[]` (Start / Post-inflow / Pre-MONITOR) that restore store seeds — the same snapshot/restore mechanic as the Sample pod's "Reset sample". Exports `seedInflow(podId)` consumed by the Post-Launch Landing demo binding.
- **Interactions:** ⌘⇧D toggles the overlay. `Run` starts the auto timeline; `Pause` halts it; auto/manual `toggle` switches advance mode; `Step →` fires the next step manually. `Reset to checkpoint` restores the chosen snapshot and rewinds the step list (toast "Demo reset to '{checkpoint}'"). Steps are idempotent (re-firing a fired step is a no-op) so a fumbled reset never double-seeds.
- **Copy:** Header "Demo Director". Auto/manual labels "Auto-advance / On my cue". Step labels mirror the script verbatim ("0:30 — AM-142 arrives · BA picks it up", "0:45 — BA asks a clarification", "1:30 — design gate goes stale → escalation", "2:45 — validator panel: the moat close"). Reset CTA "Reset to checkpoint". Footer micro-note "Staged data · mutations land in the same mock stores the product reads."
- **Demo note:** CROSS-CUTTING — this *is* the demo's stage crew, and it ships later as product: the same staged-event engine becomes the **guided, replayable Sample-pod onboarding tour** ("watch a ticket flow through your pod"), so demo infrastructure and customer onboarding are one artifact. Never shown to the audience; if a buyer asks "is this live?", the honest answer is scripted: "staged data, real product — every event you saw landed in the same stores the real pod writes."

---

### List Filtering on High-Volume Views — `(/pipeline, /approvals, /compliance)`  (REFRAME)
- **Purpose:** Make the high-volume RUN/MONITOR lists scannable — shared filter/search affordances so the same gestures work everywhere (vision §6: "list-filtering on high-volume views").
- **Persona & entry:** Operators on `/pipeline`, `/approvals`, `/compliance`. No new route — a reusable filter bar injected at the top of each list view; filters also settable via URL query (so ⌘K deep-links like `/approvals?gate=…` and `/pipeline?ticket=…` pre-apply a filter).
- **Layout:** A sticky `FilterBar` row above each list: a search `Input` (left), a set of `Select`/`ToggleGroup` facet controls (right), a result count + "Clear" on the far right. Facets per view:
  - `/pipeline`: stage, agent, priority (P0–P3), codebase, overnight-eligible toggle.
  - `/approvals`: gate type, approver (human), SLA status (on-track / at-risk / overdue), kind (clarification/approval).
  - `/compliance`: action type (reset/approve), actor, date range (`Calendar` in a `Popover`).
- **Components:** NEW `FilterBar` (shared) composed of `Input`, `Select`, `ToggleGroup`, `Badge` (active-filter chips), `Popover`+`Calendar` (date range), `Button` ("Clear"). NEW `useListFilter<T>` hook that reads/writes URL search params and returns the filtered array. Reuses each view's existing row rendering unchanged.
- **States:**
  - *no filters:* full list, count shows total.
  - *active filters:* show removable filter `Badge` chips ("Stage: Spec Review ✕"); count shows "12 of 48".
  - *filtered-empty:* "No items match these filters" + "Clear all".
  - *deep-linked:* arriving with a query param pre-fills the bar and highlights/scrolls to the targeted row.
- **Mock data:** No new data — filters operate over existing `tickets`/`approvals`/compliance `audit_log` mocks. Adds only the query-param contract: `?stage=&agent=&priority=&approver=&sla=&kind=&action=&actor=&from=&to=&ticket=&gate=`.
- **Interactions:** Changing any facet updates the URL (shareable filtered view) and the list reactively. "Clear" resets to no params. A targeted `?ticket=`/`?gate=` from ⌘K or a notification deep-link both filters to and visually highlights the row.
- **Copy:** Search placeholders: "Filter tickets…", "Filter gates…", "Filter audit entries…". Empty "No items match these filters". Chip "Clear all".
- **Demo note:** Supporting only — ensures the ⌘K and notification deep-links land cleanly (the targeted row is filtered-to and highlighted), so the demo's jumps feel precise.

---

### NEW mock shape — `src/mock/notifications.ts`

```ts
export type NotificationKind =
  | "clarification_gate" | "approval_gate"   // HITL gates
  | "escalation" | "sla_at_risk" | "sla_breach"
  | "incident_opened" | "run_failed" | "tool_disconnected"
  | "digest" | "comment" | "delivered";
export type NotificationChannel = "in_app" | "email" | "slack" | "push";
export type NotificationSeverity = "info" | "warning" | "critical";

export interface AppNotification {
  id: string;                       // "ntf-1"
  recipientId: string;              // human id from humans.ts ("ana")
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;                    // "Clarification needed · AM-142"
  body: string;                     // one-line preview
  ts: number;                       // epoch ms (or tsOffsetMin like comms)
  read: boolean;
  actorId?: string | null;          // agent or human that triggered it; null = "when-only"
  ticketId?: string;                // "AM-142"
  entityId?: string;                // gate/incident id the item points at ("appr-AM-142")
  deepLink: string;                 // "/approvals?gate=appr-AM-142"
  channels: NotificationChannel[];  // where it was delivered
  actionable?: boolean;             // renders an inline action button
  actionLabel?: string;             // "Approve", "Answer", "Re-auth"
  slaState?: "on_track" | "at_risk" | "overdue";
}

// Per-user, per-event delivery matrix (Preferences tab)
export interface NotificationPref {
  recipientId: string;
  kind: NotificationKind;
  channels: Record<NotificationChannel, boolean>;
}

// Alert rules (Alert rules tab)
export interface AlertRule {
  id: string;                       // "rule-1"
  name: string;                     // "Spec gate overdue"
  enabled: boolean;
  trigger: { kind: NotificationKind; comparator: ">" | ">="; thresholdMin?: number };
  channels: NotificationChannel[];
  routedTo: string[];              // human ids or channel labels
  scope?: "pod" | "agent";
}

// for ⌘K Recent group
export const recentEntities: string[]; // entity ids most-recently visited
export const notifications: AppNotification[];
export const notificationPrefs: NotificationPref[];
export const alertRules: AlertRule[];

export const unreadFor = (humanId: string) =>
  notifications.filter((n) => !n.read && n.recipientId === humanId).length;
export const gatesFor = (humanId: string) =>
  notifications.filter(
    (n) => n.recipientId === humanId &&
      (n.kind === "clarification_gate" || n.kind === "approval_gate") && !n.read,
  );
```

Seed ~12–16 `notifications` mapped to existing tickets/escalations (e.g. `clarification_gate` for AM-142 → Ana, `escalation` for AM-138 → Marin, `sla_breach` for AM-138 design gate, `incident_opened` from the Incidents cluster, `tool_disconnected` HubSpot sync amber from `comms.ts` c18, `digest` for the daily digest). `notificationPrefs` seeded with in-app+slack ON for gates/escalations/incidents, email/push OFF (Roadmap). `alertRules` seeded with 2–3 (spec-gate-overdue, sla-breach-critical, incident-opened → PM).


### Roles & Access — `/settings/roles`  (NEW)
- **Status:** ✅ in the mock (wave-2 completion) — route `src/routes/settings_.roles.tsx` (un-nested file → `/settings/roles`, so the live-shared `settings.tsx` stays untouched), guarded by `mockOnlyBeforeLoad`; linked from the Settings "Roles & Access" tab and from `/pod`. Five role cards per this spec with locked capability toggles + the mocked-RBAC honesty footer.
- **Purpose:** Define the five role personas and what each can see/do; this is the source-of-truth screen that powers role-scoped landings and gate attribution everywhere else.
- **Persona & entry:** Pod Admin / PM only. Entry from Settings sub-nav ("Roles & Access") and from the People & Roles screen (`/pod`) via a "Manage roles" link. Read-only roles (Sponsor/Viewer) cannot reach this route — it 403-redirects them to their landing.
- **Layout:** Standard AppShell (LeftRail + TopBar). Single column inside `p-4 lg:p-6 space-y-4`. A `glass-panel` header strip (icon + "Roles & Access" + one-line subtitle). Below: a `Card` per role (5 cards in a responsive 1/2-col grid), each showing role name, default-landing route, a capability checklist (read/act/approve/configure/export), and a count of members holding that role. A footer `alert` carries the auth-deferral honesty note.
- **Components:** shadcn `card`, `badge`, `switch` (capability toggles — visually present but **disabled/locked** with a tooltip "RBAC is mocked; enforcement lands with auth v2"), `tooltip`, `separator`, `alert`. Reuse the `glass-panel` header pattern from `SettingsView.tsx`. NEW component `RoleCard` (role + capability matrix). Reuse `humans.ts` for member counts via a new `roleOf()` helper.
- **States:**
  - *populated:* 5 role cards with their landings + capabilities + member chips.
  - *empty (a role with no members):* card shows a muted "No members yet — assign from People & Roles" with an outline-amber hairline (uncovered-risk styling, matching the accountability empty-column motif).
  - *loading:* skeleton 5 cards.
  - *edge — locked toggles:* every capability switch renders checked-but-disabled; hovering shows the deferral tooltip. No error state (static mock).
- **Mock data:** NEW dataset `src/mock/roles.ts`. Shape:
  - `Role { id: "pod_admin"|"eng_lead"|"qa_lead"|"sponsor"|"viewer"; label: string; description: string; defaultLanding: string (route); readOnly: boolean; capabilities: { read: boolean; act: boolean; approve: boolean; configure: boolean; export: boolean } }`
  - `RoleAssignment { humanId: string; roleId: Role["id"] }[]` — maps existing `humans.ts` ids (ana→pod_admin, ivan→eng_lead, petra→qa_lead, marin→eng_lead, zlatko→pod_admin) plus one mocked `sponsor` (e.g. `{ humanId: "client-sponsor", name: "Client Sponsor", ... }` added to `humans.ts`).
  - Helpers: `roleOf(humanId)`, `membersOf(roleId)`, `landingFor(roleId)`.
- **Interactions:** Clicking a role card's "View landing" opens that role's default landing in a new context (or previews it). "Manage members" deep-links to `/pod`. Toggles are inert. No destructive actions.
- **Copy:** Header "Roles & Access". Subtitle "Who sees what, and who can act. Enforcement arrives with sign-in (auth v2)." Capability labels: "View", "Act on gates", "Approve / reject", "Configure pod", "Export reports". Locked-toggle tooltip "Roles are designed now; enforced when real sign-in lands." Footer alert "Mocked RBAC — these roles shape every member's landing and gate attribution today; access is not yet enforced server-side."
- **Demo note:** Not in the core 3-min arc, but the click-target that explains *why* the exec sees a different screen than the PM — pull up if the buyer asks "can my sponsor log in without touching the controls?"

### My Workspace (role-scoped landing router) — `/` redirect  (NEW)
- **Status:** ✅ in the mock (wave-2 completion) — built INSIDE the standard-mode "/" component (`RoleLandingRouter` + `RoleRibbon`, `src/components/roles/*`); `src/routes/index.tsx` untouched (it has the live branch). View-as state: `src/mock/view-role.ts` (localStorage `aiops_view_role_v1`, default pod_admin); "Switch view" on the PM cockpit cycles personas; every non-PM landing offers "Back to my cockpit". As-built note: the spec line "reuse RealCommandCenter" predates the experience gate — the PM landing reuses the MOCK command center; the real cockpit belongs to real mode and is never role-scoped.
- **Purpose:** Send each user to the right default surface on login instead of dumping everyone on the operator Overview — the spine that makes the multi-stakeholder story real.
- **Persona & entry:** All personas, on login / on hitting `/`. Resolves the user's role (via `roleOf(user.email)`), then renders the role's landing inline (not a hard redirect, so the URL stays `/` and the LeftRail highlights the pillar).
- **Layout:** No layout of its own — it is a switch that mounts one of: PM → `RealCommandCenter` (existing); Eng Lead → Pipeline + Traceability split; QA Lead → scoped Gate Queue (below); Sponsor/Viewer → Exec Status Digest (below). A thin `glass-panel` "context ribbon" at the top of any non-PM landing names the active role and links "Switch view" (PM-only, for demo).
- **Components:** Reuse `RealCommandCenter`, `PipelineBoard`, `TraceabilityView`. NEW thin `RoleLandingRouter` wrapper. shadcn `badge` for the role ribbon. NEW `RoleRibbon` component.
- **States:**
  - *populated:* role-correct landing renders.
  - *unknown role / fallback:* defaults to Viewer digest with an info `alert` "Role not set — showing read-only digest."
  - *loading:* delegate to the child surface's own skeletons.
  - *edge — PM impersonation:* if PM clicks "Switch view → QA Lead", router renders the QA landing with a `badge` "Viewing as QA Lead" + "Back to my cockpit".
- **Mock data:** Drives off `roles.ts` (`landingFor`) + the existing user from `auth.ts`. No new dataset beyond `roles.ts`.
- **Interactions:** Login → land on role surface. "Switch view" (PM only) cycles personas for demoing without re-login. LeftRail still shows the full nav for PM; for read-only roles the rail is filtered (see Read-only rail note below).
- **Copy:** Ribbon "Your landing · {RoleLabel}". PM impersonation "Previewing as {role} — Back to my cockpit". Fallback alert "We couldn't determine your role; showing the read-only status digest."
- **Demo note:** Optional opener flourish — log in as PM (Overview), then "Switch view" to Sponsor to reveal the exec digest, proving one pod, many audiences. Sets up the 1:45 MONITOR beat.

### Exec Status Digest (Sponsor / Viewer landing) — `/` (read-only)  (NEW, reuses economics + governance + lifecycle mock)
- **Status:** ✅ in the mock (wave-2 completion) — `ExecDigest` + `SlaTargetBar` (`src/components/roles/`); `roiMultiple` appears ONLY as the digest subcaption (grep-enforced); "Download this week's report" writes `data.exported`; zero operator controls (grep-verified); sponsor/viewer also get the read-only rail (MONITOR + Settings, VIEW-ONLY chip).
- **Purpose:** Answer "what did my money buy this week?" for a non-operator — ROI, delivery, SLA target-vs-actual, accountability coverage — with **zero operator dials**.
- **Persona & entry:** Client Sponsor / Exec and Viewer, as their default landing. Also reachable by PM via "Switch view" and from SLA & Reports as the report preview.
- **Layout:** AppShell with a **filtered read-only LeftRail** (see note). Content: a hero band of 3 ROI tiles (full-width `glass-panel`), then a 2-col grid: left = "Delivered this week" list + "SLA target vs actual" mini-bars; right = "Accountability coverage" donut/legend + "Open gates (informational)" count. A header strip names the pod, the reporting window, and a "Sample" badge if it's the sandbox pod.
- **Components:** Reuse `KpiTile`/`KpiStrip` (command-center) for the ROI hero; reuse the ROI numbers from `RealEconomicsView` aggregates. shadcn `card`, `progress` (SLA target-vs-actual bars), `badge`, `chart` (coverage donut), `separator`. NEW `ExecDigest` composite + `SlaTargetBar` sub-component. Explicitly **no** Approve/Pause/Reset buttons.
- **States:**
  - *populated:* hero shows the canonical trio `humanHoursDisplaced`, `costPerMerged`, `costPerStoryPoint`, with `roiMultiple` rendered **only as the digest subcaption** ("≈ {n}× your plan spend, net of fees" — the single place roiMultiple appears in the product); delivered list shows merged tickets; SLA bars show 2-3 definitions.
  - *empty (brand-new real pod):* hero tiles read "—" with subtext "No delivered work yet — your first report generates once a ticket ships." Non-blank: a 3-step "what to expect" mini-checklist.
  - *loading:* skeleton hero + lists.
  - *error:* `alert` "Couldn't load this week's figures — last good snapshot shown" with a stale-data timestamp.
- **Mock data:** `economics.ts` `aggregates` (ROI hero) + `merged` tickets (delivered list); `governance.ts` for posture chip; accountability coverage from `humans.ts`/`OWNERSHIP`. SLA bars render a `SlaTarget { id; label; targetMin; actualMin; breached }` projection. *(Shape superseded — `SlaTarget` is DERIVED from the Appendix `sla.ts SlaDefinition`, never a second stored shape; resolves coverage #15.)*
- **Interactions:** Read-only. "Download this week's report" CTA → triggers the SLA & Reports export (PDF/CSV mock, `sonner` toast). Clicking a delivered item opens a read-only artifact peek (no actions). No state-changing affordances anywhere.
- **Copy:** Header "{Pod} · Weekly status · {date range}". Hero tile labels "Human-hours freed", "Cost per shipped ticket" (badge "as agents ship"), "Cost per story point"; hero subcaption "≈ {n}× your plan spend, net of fees" (`roiMultiple` — its only appearance). CTA "Download this week's report". Empty "No delivered work yet — your first report generates once a ticket ships." Footer micro-note "Read-only view for sponsors. Operator controls are hidden."
- **Demo note:** This *is* the 1:45 MONITOR ROI reveal seen through the sponsor's eyes — the "what did my money buy" wow tile, stripped of operator noise. Strong close-adjacent beat.

### QA Gate Queue (QA Lead landing) — `/` (scoped to `/approvals`)  (NEW, reuses approvals + governance)
- **Status:** ✅ in the mock (wave-2 completion) — `ScopedGateLanding` (`src/components/roles/`) reusing `ApprovalRow`/`ClarificationRow` + the governance `ValidatorPanel` (no forks); Mine/All tabs; decisions write the same audit rows as `/approvals` (`gate.approved`/`gate.rejected`/`clarification.answered`).
- **Purpose:** Drop the QA Lead straight into "what needs my sign-off and what's the quality posture" — a gate queue pre-filtered to QA-owned gates plus the structural-validator panel.
- **Persona & entry:** QA Lead default landing; also reachable via the unified `/approvals` with a "My gates" filter preset.
- **Layout:** AppShell. Two-column: left (2/3) = scoped gate list reusing `ApprovalsQueue`/`ApprovalsView`, filtered to `gate: "QA Review"` and gates whose accountable human is the QA Lead; right (1/3) = a "Quality posture" rail showing the badged zero-LLM structural validators (reuse the governance moat panel) + a "My SLA" mini (avg approval min, breaches from `humans.ts` workload).
- **Components:** Reuse `ApprovalsView` + `GateReviewShell` (the client-grade review surface — `HumanGate` is demoted to the legacy mock command-center per the registry); reuse `ValidatorPanel` for the structural-checks posture. shadcn `tabs` ("Mine" / "All gates"), `badge`, `card`. NEW `ScopedGateLanding` wrapper that injects the QA filter.
- **States:**
  - *populated:* QA gates listed, posture rail green/amber.
  - *empty (no QA gates open):* "You're clear — no QA gates waiting" with a calm check illustration and a link "See all gates".
  - *loading:* skeleton queue rows.
  - *error:* `alert` on gate-load failure with retry.
  - *edge — gate expired:* expired gates render with an `expired` badge and a "reopen / escalate" affordance (links to Incidents).
- **Mock data:** `approvals.ts` filtered by `gate === "QA Review"` + accountability; `governance.ts` for the validator panel; `humans.ts` (petra) for the SLA mini.
- **Interactions:** Approve/Reject via `GateReviewShell` with the reason canon (typed reason **required on reject/override**; optional quick-reason chips on approve). Tabs toggle Mine/All. Posture chip click → `/governance`. Expired-gate "escalate" → Incidents inbox.
- **Copy:** Header "Your gate queue · QA". Tabs "Mine" / "All gates". Empty "You're clear — no QA gates waiting." Posture chip "Validated deterministically · no LLM in the loop". SLA mini "Avg clearance {n}m · {b} breaches".
- **Demo note:** Supports the RUN gate beat from the QA persona — show the same gate the PM sees, now scoped and paired with the zero-LLM validator badge (reinforces the moat at 2:45).

### Members & Invites — `/pod` (People & Roles)  (REFRAME `/pod` PodView)
- **Purpose:** Add the missing "who is on this pod, what role, what agents are they accountable for" management + invite-by-email flow on top of the existing read-only accountability matrix.
- **Persona & entry:** Pod Admin / PM. Entry from LeftRail "People & Roles" (LAUNCH pillar) and from the LAUNCH wizard's People step (shares this component). Read-only roles see the matrix without the invite/edit controls.
- **Layout:** Existing `PodView` accountability matrix stays as the hero. Add **above it** a `glass-panel` "Members" strip: a row of member chips (avatar + name + role badge) with an "Invite" button on the right. Add a right-aligned "Roles & Access →" link to `/settings/roles`. Below the matrix, keep the existing uncovered-risk callout.
- **Components:** Reuse `PodView` matrix, `humans.ts`, `OWNERSHIP`. shadcn `avatar`, `badge`, `dialog` (invite modal), `form` + `input` + `select` (email + role picker), `dropdown-menu` (per-member: change role / reassign agents / remove), `sonner` (invite-sent toast), `tooltip`. NEW `MembersStrip` + `InviteDialog`.
- **States:**
  - *populated:* member chips with role badges; matrix with accountable owners; any uncovered agent column flagged amber.
  - *empty (no members):* "No people on this pod yet — invite your team" CTA (this is the LAUNCH setup entry).
  - *loading:* skeleton chips + matrix.
  - *invite in-flight / sent:* dialog shows a mocked "Invitation sent — one-time link copied" success with a copyable link string; pending invitee appears as a ghost chip badged "Invited".
  - *edge — uncovered column:* the matrix column with no owner shows the "uncovered risk" amber outline and a "Assign owner" inline action.
- **Mock data:** `humans.ts` (members) + `OWNERSHIP` (matrix) + new `roles.ts` (role badges, via `roleOf`). NEW invite shape (ephemeral, client-only): `PendingInvite { email: string; roleId: Role["id"]; sentAt: number; oneTimeLink: string (mocked token) }[]` held in component state / a small `src/mock/invites.ts` seed.
- **Interactions:** "Invite" → dialog → email + role + (optional) agent assignment → submit → mocked success + ghost chip. Per-member dropdown: change role (writes to local roleAssignment), reassign accountable agents (updates matrix), remove (with `alert-dialog` confirm). "Assign owner" on an uncovered column opens a person picker. "Roles & Access →" → `/settings/roles`.
- **Copy:** Strip header "Pod members". Invite CTA "Invite". Dialog title "Invite to {Pod}", fields "Email", "Role", "Accountable for (optional)". Submit "Send invite". Success "Invitation sent — link copied to clipboard." Empty "No people on this pod yet — invite your team." Uncovered "No accountable human — uncovered risk. Assign owner."
- **Demo note:** Backs the LAUNCH 0:00 beat ("drag in two accountable people") and the 1:45 accountability matrix beat — the empty-column-as-risk moment is the answer to "who's responsible when it's wrong?"

### Settings — `/settings`  (REFRAME SettingsView)
- **Experience switch (owner call, 2026-06-12 — "login based is not good"):** Demo ↔ Live is now an explicit per-browser choice, not a property of the account. `ExperiencePanel` renders directly under the Settings header **in BOTH experiences** (you must be able to switch back): segmented "Demo product / Live only" + "switched this browser" badge + account-default line. Mechanics: an httpOnly cookie (`aiops_experience`, values reuse the neutral DataMode names) set/cleared by `setExperienceFn` (auth.ts); `fetchUser` resolves the EFFECTIVE `user.dataMode` (cookie overrides the account default, `dataModeDefault` carries the original), so every gate — route guards, nav, isMock — follows from one truth; switching reloads at "/" so SSR + guards re-evaluate (session demo state starts fresh). Verified both directions incl. mock-route bounce under Live. Login defaults remain as seeds (qai → Demo, zlatko → Live) but are no longer the only path.
- **Status:** ✅ in the mock (wave-2 completion) — `SettingsView` reframed with the 6 tabs below, **standard-mode only**: the real-mode user renders the original audit-DB panel byte-equivalent (SSR-verified: zero "gate policies/autonomy/tenancy" markers in real-mode HTML). *(Amended 2026-06-12: the real-mode surface now additionally renders the ExperiencePanel above the audit panel — the one owner-requested addition; everything else stays byte-equivalent.)* New data: `src/mock/tenancy.ts` (posture + retention; audit_log locked "append-only, never auto-deleted"), `src/mock/modelPlane.ts` (per-agent provider/pinned-model/region disclosure; EU inference Roadmap-badged). The **Gate policies & autonomy** tab (#gates) is P1-G1 as-built: `GatePolicyTable` (per-ArtifactKind rows from `ARTIFACT_GATE_POLICIES`; edits confirm-dialog → `policy.changed`) + `AutonomyLadder` (per-agent L0–L3; BA's showcase proposal "47 consecutive 8/8 specs · 4% rejection" with the `autonomyPreviewStat` "would have auto-cleared 14 of 22 gates last week, saving ~9h"; **Grant** → `policy.changed {before,after}` on the ledger, **Dismiss** → typed reason). Hash deep-links `#tenancy` / `#models` / `#gates` supported. Export → `data.exported`.
- **Purpose:** Upgrade the single audit-DB panel into the trust surface: tenancy/security posture, connected-tool scopes, isolation + data-handling statement, and data export & retention — the buyer-trust block the vision §8 calls for.
- **Persona & entry:** Pod Admin / PM (full); read-only roles see posture + data-handling as read-only and lose the export/retention controls. Entry from LeftRail "Settings", and deep-linked from the tenancy badge in the TopBar (badge → `/settings#tenancy`).
- **Layout:** AppShell, `p-4 lg:p-6 space-y-4`. Keep the existing header strip. Convert the body to a vertical stack of `glass-panel` sections (or shadcn `tabs`: "Tenancy & Security", "Connected tools", "Gate policies & autonomy", "Roles & Access", "Data & retention", "Audit database"). The **Roles & Access** tab is the Settings entry point for the `/settings/roles` spec (the P2 label-sweep fix — the Roles & Access screen now has a named home in the Settings sub-nav):
  1. **Tenancy & Security posture** (`#tenancy`) — `dl` of Deployment "Dedicated", Region "EU-West", Database "Isolated (per-client)", Encryption "At rest + in transit", with the tenancy `badge` mirrored from the TopBar; plus a **"Trust & Evidence"** link row → `/compliance` (the AI Act deployer-readiness panel + evidence-pack export live there).
  2. **Models & subprocessors** (`#models`, inside Tenancy & Security) — a per-agent table answering "who actually processes our content one LLM call deep": columns **Agent · Provider · Pinned model · Processing region · Retention terms** (e.g. BA · Anthropic · pinned model id · US (EU-region inference: **Roadmap**) · Zero-data-retention API terms), each row carrying the existing Live/Roadmap honesty badges; a footer line lists subprocessors.
  3. **Connected tools & scopes** — a table of each connector with granted scopes, Live/Roadmap badge, last health check, and a "Review scopes" action.
  4. **Gate policies & autonomy** (`#gates`) — the policy layer behind the gates (P1-G1). (a) A **gate-policy table** (one row per `ArtifactKind` from `chain.ts`): required role, N-eyes, clearance SLA, delegation, override policy, and review mode (**full · batch · auto-with-sampling**) — seeded from blueprint defaults; every edit writes `policy.changed {field, before, after}` to the ledger. (b) The **autonomy ladder** — **L0 review-all → L1 batch → L2 sample-1-in-5 → L3 auto-low-risk** — rendered per agent with its current level and promotion criteria as **deterministic validator streaks** ("BA eligible for L2: 47 consecutive 8/8 specs · 4% rejection"); promotions are **proposed by the system, granted by the accountable human, written to the ledger**. (c) The **preview stat** on any proposed policy/level change: *"this policy would have auto-cleared 14 of 22 gates last week, saving ~9h."*
  5. **Data handling & retention** — the data-handling statement, retention sliders/selects per data class, and the **Export data** controls.
  6. **Audit database** — the existing panel, unchanged.
- **Components:** Reuse the existing `Field`/`StatusBadge`/`glass-panel` patterns from `SettingsView.tsx`. shadcn `tabs`, `table`, `badge`, `select` (retention windows), `switch` (toggles, mocked), `button`, `alert`, `tooltip`, `separator`, `dialog` (export confirm), `sonner`. NEW `TenancyPostureCard`, `ModelPlanePanel` (reads `modelPlane.ts`), `ConnectedToolsTable`, `GatePolicyTable` + `AutonomyLadder` (read `gate-policies.ts`; grant flow writes `policy.changed`), `DataRetentionPanel`, `ExportDataDialog`.
- **States:**
  - *populated:* posture filled from a mock tenancy record; tools table from connectors; retention windows preset.
  - *export in-flight:* dialog → "Preparing export…" → mocked download link + toast "Export ready (audit_log.csv, runs.csv)".
  - *loading:* skeleton sections.
  - *error:* keep the existing audit-DB error/`not configured` panels verbatim; add a per-section "couldn't load posture" alert.
  - *edge — read-only role:* export/retention controls hidden or disabled with tooltip "Requires Pod Admin"; posture remains visible (transparency for sponsors).
- **Mock data:** Existing `AuditStatus` (audit panel). NEW `src/mock/modelPlane.ts`: `ModelPlaneEntry { agentId: AgentId; provider: string; modelPin: string; region: string; zdr: boolean }[]` (one row per agent; seed BA live, rest roadmap; `region` honestly non-EU with "EU-region inference: Roadmap"). NEW `src/mock/tenancy.ts`:
  - `Tenancy { deployment: "Dedicated"; region: "EU-West"; isolation: "Isolated per-client DB"; encryption: "AES-256 at rest · TLS 1.3 in transit"; dataResidency: string; dpaSigned: boolean }`
  - `ConnectorScope { tool: "Jira"|"Drive"|"Email"|"Slack"|"GitHub"|"Teamwork"; status: "live"|"roadmap"; connected: boolean; scopes: string[]; lastCheck: number; health: "ok"|"degraded"|"down" }[]` (Slack/GitHub/Teamwork live; Jira/Drive/Email roadmap — match vision §4).
  - `Retention { dataClass: "audit_log"|"runs"|"artifacts"|"comms"; windowDays: number; locked: boolean }[]` (audit_log locked = "append-only, never auto-deleted").
  - NEW `src/mock/gate-policies.ts` (shape in the appendix): `gatePolicies` (the per-`ArtifactKind` table), `autonomyPromotions` (proposed/granted ladder moves), `autoClearPreview()` (powers the preview stat).
- **Interactions:** Tab switching. "Review scopes" → popover listing granted scopes per tool. Editing a gate-policy row or granting an autonomy promotion → `alert-dialog` confirm (the preview stat rendered inside) → writes `policy.changed {field, before, after}` to the audit bridge + toast "Policy updated · recorded in the ledger". Retention selects update local state (mocked). "Export data" → dialog → pick data classes → "Generate export" → mocked CSV/JSON download + toast. Tenancy badge in TopBar deep-links to `#tenancy`.
- **Copy:** Section titles as above. Tenancy values "Dedicated · EU-West · Isolated per-client DB". Data-handling statement "Your data lives in a dedicated, isolated database in EU-West. Connected-tool access is scoped to the minimum required and shown at connect-time. Content is processed by each agent's pinned model provider under zero-retention terms; storage, memory, and the audit ledger remain in your EU-West tenant. EU-region inference: Roadmap. The audit ledger is append-only and outlives agent resets." Models panel sub: "Which model processes your content, where, and under what retention terms — per agent, pinned, honest." Trust & Evidence link: "Trust & Evidence → AI Act deployer readiness (/compliance)". Export CTA "Export data". Scope tooltip "Granted at connect-time · minimum required." Gate-policies sub: "Who clears which gate, under what SLA — and how much autonomy each agent has earned. Every change is on the record." Autonomy grant confirm: "Grant L1 (batch review) to BA Agent? Proposed on a 47-spec validator streak — this policy would have auto-cleared 14 of 22 gates last week, saving ~9h. Recorded in the ledger." Retention "audit_log — append-only, never auto-deleted (compliance)." Read-only note "Posture is visible to all members; export, retention, and gate policies require Pod Admin."
- **Demo note:** Pull-up for the "Data" pushback (vision §10) — the tenancy/residency + isolation + minimal-scope + append-only-audit statement is the one-screen answer to "where does our data live and who can touch it?"

### Sandbox / Sample Pod — `/` (one-click seeded pod)  (NEW)
- **Purpose:** A pre-loaded, fully-populated demo pod badged **Sample** so an evaluator (or the demo) sees a rich, in-flight pod instantly — mapping onto the existing `src/mock/*` — without running anything.
- **Persona & entry:** Any user on the `standard` dataMode account (`qai@q.agency`), or any pod created via "Load sample pod" from the pod switcher / empty New-Pod screen. The sample pod is the AutoMarket project from `project.ts` with all curated roles installed (the full 7-node pipeline chain plus DevOps and Knowledge), in-flight specs, open gates, one incident, and a delivered item.
- **Layout:** Identical to the normal Overview (`RealCommandCenter`) — the point is it looks real. The only differences: a **"Sample" badge** in the TopBar next to the pod name and a dismissible `glass-panel` ribbon under the TopBar offering "This is a sample pod — explore freely. Create your own pod →".
- **Components:** Reuse the entire existing stack (`RealCommandCenter`, `KpiStrip`, `AgentStatusGrid`, `FlowRiver`, `ActivityFeed`, `ApprovalsQueue`). shadcn `badge` ("Sample"), `alert`/`glass-panel` ribbon, `button`. NEW: a `SampleBadge` + `SampleRibbon`, and a `samplePod` selector in mock that bundles existing datasets under one pod identity.
- **States:**
  - *populated (default):* the AutoMarket pod fully lit — agents running/waiting/idle (from `agents.ts`), gates open (`approvals.ts`), an escalation (`comms.ts`), merged ticket (`economics.ts`), governance posture (`governance.ts`).
  - *ribbon dismissed:* persists in local storage; badge stays.
  - *no edge errors* — sample data is static, so it never fails; that reliability is the point.
  - *reset action:* "Reset sample" restores any locally-mutated demo state (cleared gates) to seed — mocked, toast "Sample pod reset".
- **Mock data:** No new datasets — a NEW thin selector `src/mock/samplePod.ts` exporting `SAMPLE_POD = { id: "automarket-sample", name: project.name, badge: "Sample", region: "EU-West", isolation: "Isolated", agents: agents, members: humans, gates: approvals, ... }` that re-exports the existing mock under one pod object. Add a `isSample: true` flag and a `seed` snapshot for reset.
- **Interactions:** "Create your own pod →" → New Pod wizard (LAUNCH). "Reset sample" restores seed. Everything else behaves like the live Overview (gates approvable, etc.) but mutations are local-only and resettable. The pod switcher lists "AutoMarket (Sample)" with the badge.
- **Copy:** TopBar badge "Sample". Ribbon "This is a sample pod, pre-loaded so you can explore Agency OS end-to-end. Create your own pod →". Reset "Reset sample". Switcher entry "AutoMarket — Car Selling Platform · Sample".
- **Demo note:** This is the cleanest demo substrate — the entire 3-min arc can run on the Sample pod with zero setup risk; the "Sample" badge keeps it honest while showing the rich populated experience. The "Create your own pod →" CTA is the bridge into the LAUNCH 0:00 beat.

### Empty States — global pattern  (NEW, non-route)
- **Purpose:** Guarantee no client-facing surface ever renders blank for a real (non-sample) pod — every empty view explains what will appear and offers the next action, so a freshly-created pod is demoable and never looks broken.
- **Persona & entry:** All personas, on any view of a real pod with no data yet (no runs, no gates, no economics, no incidents).
- **Layout:** A reusable centered `glass-panel` card within each view's content region: icon, one-line headline, one-line subtext, and 0–1 primary CTA. Never a bare "No data".
- **Components:** shadcn `card`/`glass-panel`, `button`, lucide icon. NEW `EmptyState` component: `EmptyState({ icon, title, body, cta?: { label, to } })`. Drop into Overview, Pipeline, Gates, Comms, Incidents, Economics, Governance, SLA & Reports.
- **States:** This *is* the empty state. Per surface the copy differs (every add-work CTA below deep-links to **Work Intake** — `/intake`):
  - Overview → "Pod is live but quiet — no active work yet." CTA "Open Work intake" → `/intake` (work ARRIVES from the board — never "add").
  - Pipeline → "Nothing in the pipeline. Work appears here once a ticket enters." CTA "Open Work intake" → `/intake` (work ARRIVES from the board — never "add").
  - Gates → "No gates waiting. You'll be notified when a human decision is needed."
  - Comms → "No agent messages yet."
  - Incidents → "All clear — no incidents."
  - Economics/ROI → "No ROI to show yet — live-tier numbers (cost per approved spec) start with your first approved artifact." CTA "Load sample pod" (so an evaluator can preview).
  - Governance → "No specs scored yet."
  - SLA & Reports → "No completed reporting window yet — your first weekly report generates on {date}."
- **Mock data:** None — the EmptyState renders when the relevant `src/mock/*` selector returns empty for the active pod (i.e. a non-sample pod). The "Load sample pod" CTA bridges to the Sample pod above.
- **Interactions:** CTA routes to the relevant LAUNCH setup step, to **Work Intake** (`/intake`) for every add-work CTA, or loads the sample pod. Empty states with no sensible action (e.g. "All clear — no incidents") have no CTA, just calm confirmation.
- **Copy:** As listed per surface above; tone is calm/explanatory, never error-like. Default CTA on data-bearing views "Load sample pod" or "Open Work intake" (→ `/intake` — work arrives from the board; never "add").
- **Demo note:** Indirect — lets you create a fresh pod on stage and have it look intentional rather than broken; the contrast between an empty real pod and the rich Sample pod is itself a talking point ("here's yours empty, here's one fully running").

### Read-only LeftRail (filtered nav for Sponsor/Viewer) — shell behavior  (REFRAME LeftRail)
- **Purpose:** For read-only personas, hide operator pillars (LAUNCH, RUN controls) and surface only MONITOR read surfaces — so a sponsor never sees a "Launch pod" or "Approve" affordance they can't use.
- **Persona & entry:** Sponsor / Viewer, on every screen. PM/leads see the full pillar-grouped rail.
- **Layout:** Same `LeftRail` aside, but the `items` list is filtered by role: Sponsor/Viewer get only Overview/ROI, Governance (read), Accountability (read), SLA & Reports, Compliance & Audit. LAUNCH, Pipeline controls, Gates-as-actor, Incidents, Settings-config are removed; Settings shows posture-only.
- **Components:** Reuse `LeftRail`; add role-aware filtering driven by `roles.ts` (`capabilities`). NEW `navItemsFor(roleId)` helper. shadcn nothing new.
- **States:**
  - *PM/lead:* full pillar-grouped rail.
  - *read-only:* trimmed rail; a small "Read-only" `badge` under the Agency OS wordmark.
  - *edge — direct URL to a hidden route:* read-only user navigating to `/approvals` etc. is redirected to their landing with an info toast "That's an operator view — here's your status digest."
- **Mock data:** `roles.ts` capabilities. No new dataset.
- **Interactions:** Rail renders role-scoped items; hidden routes guard-redirect. Pillar group headers (LAUNCH / RUN / MONITOR / ADVANCED) are the same ones the IA reorg introduces.
- **Copy:** "Read-only" badge. Redirect toast "That's an operator view — here's your status digest."
- **Demo note:** Reinforces the multi-stakeholder story when paired with "Switch view" — flip to Sponsor and watch the rail shrink to the read-only MONITOR set, visually proving scoped access without real auth.


---

## Coverage & consistency review

*From the review pass over all 14 clusters — gaps, state-completeness, shared-component reuse, the new-mock inventory, and the demo-path check. Treat as the punch-list when mocking.*

## Screen-Spec Catalog Review — Coverage, Consistency, Mock Inventory, Demo Path

### 1. COVERAGE — IA (§6) and Build Order (§7)

**IA spine: fully covered.** Every left-rail item in §6 has a spec. Verified item-by-item: LAUNCH (New Pod wizard, Catalog, Connections, People & Roles) ✓; RUN (Overview, Pipeline, Gates, Comms & Escalations, Incidents & Recovery) ✓; MONITOR (Overview/ROI, Governance, Accountability, SLA & Reports, Compliance & Audit, Usage & Billing) ✓; Settings ✓; TopBar (Pod switcher, Tenancy badge, ⌘K, Bell, user/role) ✓.

**Gaps to fix (prioritized):**

1. **[HIGH] ADVANCED drawer (§6 line 157-158, build #1) has NO spec.** Observability / Orchestration / Flow / Traceability are named only as REUSE/demoted in the shell cluster's migration note, but no cluster owns a spec for them — not even a one-line "REUSE as-is, demoted" entry confirming they render inside the new shell + role-filtered rail. The Pipeline/Gates clusters lean on `/orchestration`'s topology model and `/traceability`'s `MarkdownLite`/`buildLineage`; the assembler needs an explicit ADVANCED entry so these aren't dropped. **Add a short REUSE spec for the ADVANCED group.**

2. **[HIGH] Route naming for the wizard is INCONSISTENT across clusters — this breaks the build.** The wizard is variously specced as `/fire-up/new` (shell cluster says `/pods/new`), `/fire-up/readiness`, `/new-pod?step=connect`, `/new-pod/people`, `/new-pod/slack`, and the shell's NAV config says `/pods/new`. Five different base paths for one wizard. The ⌘K/Command Palette and Pod Switcher both link "New pod" to `/pods/new`, but the wizard clusters use `/fire-up/*` and `/new-pod/*`. **The assembler must pick ONE base route and rewrite every cross-link.** This was the single highest-risk inconsistency for a builder. **→ RESOLVED as-built:** the canon is **`/pods/new?step=blueprint|agents|connect|people|slack|golive`** (`src/routes/pods.new.tsx`, step bodies in `src/components/fireup/`); every wizard reference in this doc now uses it, and the intro note records the resolution.

3. **[MED] Knowledge (`/knowledge`) is orphaned.** §4/§5 name Knowledge as a peer service and the existing `/knowledge` route + `KnowledgeView` + `src/mock/knowledge.ts` exist. The shell migration note says "fold under People & Roles or Catalog detail" but no cluster specs it. The Catalog cluster renders Knowledge as the existing `curator` (installable, pod-wide — no stub) but does not spec the route. **Decide: demote `/knowledge` to ADVANCED, or explicitly drop it. Don't leave it unassigned.** **→ RESOLVED (P1-A2):** `/knowledge` **folds into `/memory`** (MONITOR — Pod Memory & Constitution, ✅ shipped in the wave-2 slice) as its "What it knows" section; the old route redirects there. No ADVANCED demotion needed.

4. **[MED] Build #13 (in-product help / coach-marks; a11y pass) is unspecced.** §8 names accessibility as deferred-but-required for client surfaces (wizard, gates, reports). No cluster mentions coach-marks or an a11y note. Lower priority (tail item), but flag it as a known gap so it isn't assumed covered.

5. **[LOW] UI/UX + DevOps/Release agents** — the Catalog cluster's own closing note flags that these have no `agents.ts` record and recommends adding two stubs (Knowledge needs no stub — it is the existing `curator`, surfaced as an installable pod-wide card). This is a real decision the assembler must make (the pitch promises seven SDLC roles); surface it as an explicit action, not a footnote.

### 2. STATE COMPLETENESS

Strong overall — nearly every spec covers empty/loading/populated/error plus edge cases. Specific holes:

6. **[MED] Launching/Transition overlay (fireup-launch) error state depends on a forced-fail flag that no mock defines.** It references "a mocked step fails (e.g. tool went unreachable)" but `LAUNCH_STEPS` in the proposed `fireup.ts` shape is just `{id,label,ms}` — no `failable` field. **Add a `forceFailAt?` or `failable` field to `LAUNCH_STEPS` so the error state is actually reachable for the demo.**

7. **[LOW] Per-Role Default Landing (shell) has no loading/error state** for the redirect resolver itself (e.g. role unresolved while auth mock initializes). The xcut-roles cluster's "My Workspace" router covers the unknown-role fallback better — **consolidate these two specs (see consistency #9); the shell version is thinner and partly duplicated.**

8. **[LOW] Command Palette appears in TWO clusters with slightly different state lists.** Shell cluster's "Command Palette (⌘K)" and xcut cluster's "Global Command Palette (⌘K)" both spec the same overlay. The xcut version adds a "Recent" group and `recentEntities` mock; the shell version adds a pod-scope footer. Neither is wrong but a builder will build it twice. **Merge into one canonical spec (recommend the xcut version as the home, with the shell's pod-scope footer folded in).** **→ RESOLVED as-built:** one palette — `src/components/shell/CommandPalette.tsx` (xcut spec as home, shell hosts); Pod Copilot (`⌘J`, wave 2) extends the same omnibox family rather than adding a third input.

### 3. CONSISTENCY — shared components & reuse

**Duplicated/forked specs the assembler must dedupe:**

9. **[HIGH] Role-scoped landing is specced THREE times:** shell "Per-Role Default Landing", xcut-roles "My Workspace (role-scoped landing router)", and implicitly the QA Gate Queue / Exec Digest landings. The shell cluster names a `defaultLandingFor(role)` helper; xcut names `landingFor(roleId)` + `RoleLandingRouter`. **Pick one helper name and one router component.** Recommend `roles.ts: landingFor()` + `RoleLandingRouter` (xcut) as canonical and delete the shell's `defaultLandingFor`.

10. **[HIGH] Command Palette duplicated** (see #8) — `CommandTrigger`/`NotificationBell` defined in shell TopBar spec; `GlobalCommandPalette`/`useCommandPaletteData` defined in xcut. Same overlay, two component names. Merge. **→ RESOLVED as-built:** one `CommandPalette` (`src/components/shell/CommandPalette.tsx`) and one `NotificationBell` (`src/components/shell/NotificationBell.tsx`); the TopBar spec defers to the cross-cutting specs for both.

11. **[HIGH] The gate-review / decision surface is the most-shared component and is named consistently, GOOD — but the "required reason" rule is specced in 4 places with subtle drift.** run-pipeline-gates defines `RequiredReason` (required on BOTH approve and reject); the Spec Review screen defines `DecisionPanel`; mobile "My Gates" reuses "the required-reason rule"; Compliance defines `DecisionRow`/`ActorChip`. These are consistent in intent. **Action: declare `DecisionPanel` + `RequiredReason` + `ActorChip` + `DecisionRow` as a single shared component family in one cluster (run-pipeline-gates owns Decision; monitor-sla-compliance owns ActorChip/DecisionRow) and have mobile + compliance explicitly import them.** Right now each says "reuse" but two different clusters define overlapping primitives. **Reason-policy RESOLVED (P1-G1 canon, supersedes any "both approve and reject" wording):** typed reason REQUIRED on **reject and override**; approve = optional structured quick-reason chips + optional note. The shipped mock (GateReviewShell + Gates queue, build #12) already complies.

12. **[MED] Accountability matrix component naming forked.** fireup-people-slack lifts PodView's matrix into `AccountabilityMatrix`; monitor-governance-accountability adds `GateOwnershipCell`/`RiskStrip`/`SlaStatusPill` to PodView directly; xcut-roles adds `MembersStrip`/`InviteDialog` to PodView; fireup-people-slack ALSO has `InviteByEmailDialog`. **Two invite dialogs (`InviteByEmailDialog` vs `InviteDialog`) for the same flow on the same `/pod` component.** Pick one. And confirm `/pod` = one component serving People & Roles (LAUNCH), Accountability (MONITOR), wizard step 4, and Members & Invites — that's four entry framings on one PodView; the assembler needs a single component contract.

13. **[MED] Tenancy badge / data-handling statement specced in 3 places with different field shapes.** Shell TopBar: `tenancy: { mode, region, isolatedDb, residencyNote }`. fireup-launch `PodDraft.tenancy: { mode, region, isolatedDb }`. xcut Settings `src/mock/tenancy.ts: Tenancy { deployment, region, isolation, encryption, dataResidency, dpaSigned }`. **Three overlapping shapes for the same concept.** Unify: `tenancy.ts` should be the source; the pod/draft carries a reference or subset; the TopBar badge reads from it.

14. **[MED] Connector/tool shape forked between clusters.** fireup-connect defines `src/mock/connectors.ts: Connector{ id, scopes:{id,label,access,reason}, health:{state,...} }`. xcut Settings defines `ConnectorScope{ tool, status, connected, scopes:string[], lastCheck, health }`. Catalog defines connector ids as strings (`"jira","github"...`). fireup-launch `ConnectionDraft{ tool, label, availability, health, scopes:string[] }`. **Four representations of "a connected tool."** The assembler must canonicalize on `connectors.ts` and have Settings + the wizard draft + readiness all derive from it. Also note id drift: `"gdrive"` (connect) vs `"drive"` (catalog/launch/comms incidents) vs `"Drive"` (Settings) — **normalize connector ids.**

15. **[MED] SLA mock defined twice, divergently.** monitor-sla-compliance: `src/mock/sla.ts` with `SlaDefinition{...targetValue, unit, comparator, actualValue, status, breachCount30d, trend, ...}`. xcut-roles Exec Digest: "NEW small shape for SLA bars — `SlaTarget{ id, label, targetMin, actualMin, breached }` (add to a new `src/mock/sla.ts`)". **Same file, two incompatible shapes.** Canonicalize on the richer `SlaDefinition` and have the Exec Digest derive `SlaTarget` from it (or just use a projection).

16. **[MED] Incidents mock referenced by 4 clusters; one shape, but cross-ref helpers scattered.** `incidentIdFor(esc)` is "owned" by comms but consumes `src/mock/incidents.ts` "owned" by run-comms-incidents; shell + xcut ⌘K read incident open-counts; notifications reads `incident_opened`. The shape is consistent (good), but **the assembler should put `incidentIdFor` IN `incidents.ts`, not `comms.ts`** (comms shouldn't import-cycle into incidents). Flag the ownership.

17. **[LOW] EmptyState component:** xcut-roles defines a global `EmptyState({icon,title,body,cta})`. Many clusters hand-roll empty copy (Overview "EmptyFleet", Pipeline dashed card, Gates "All clear", etc.). **Action: name `EmptyState` as the canonical primitive and have all cluster empty-states use it** — otherwise you get N bespoke empty cards.

18. **[LOW] ROI hero forked.** run-command-center defines `RoiHeroTile`; monitor-roi-billing reuses `RoiHeadline` + defines `HeroKpi`. The Overview hero and the `/economics` hero should share one component. **Name one (`RoiHero`/`HeroKpi`) and reuse on both.**

### 4. NEW-MOCK INVENTORY (with conflicts flagged)

New datasets the specs introduce:
- `src/mock/pods.ts` — `Pod` + `tenancy` (shell). **Conflicts with** `fireup.ts PodDraft.tenancy` and `tenancy.ts` (#13).
- `src/mock/podDraft.ts` (fireup-wizard) **vs** `src/mock/fireup.ts PodDraft` (fireup-launch). **DUPLICATE — two files define `PodDraft`.** Canonicalize on `fireup.ts`. (#critical)
- `src/mock/blueprints.ts` — `PodBlueprint` (fireup-wizard). Clean.
- `src/mock/catalog.ts` or extend `agents.ts` — `CatalogFacet` (fireup-catalog). Clean, but decide file location.
- `src/mock/connectors.ts` — `Connector` (fireup-connect). **Conflicts with** Settings `ConnectorScope`, launch `ConnectionDraft` (#14).
- `src/mock/pod-setup.ts` — `assignments`, `Invite`, `pendingInvites` (fireup-people). **Overlaps** `fireup.ts PodDraft.accountability` and xcut `invites.ts PendingInvite` (#12).
- `src/mock/slack-wiring.ts` (fireup-people-slack) **vs** `fireup.ts SlackWiring` (fireup-launch). **DUPLICATE shape** (`approverChannelId`/`eventRouting` vs `approverChannel`/`mappings`). Reconcile.
- `src/mock/fireup.ts` — `PodDraft, ConnectionDraft, SlackWiring, ReadinessCheck, LAUNCH_STEPS, computeReadiness` (fireup-launch). The intended aggregator — make it authoritative for draft/slack/connection (absorbs podDraft.ts, slack-wiring.ts, pod-setup.ts).
- `src/mock/podControl.ts` — `PodControlState` + pause/resume helpers (run-command-center). Clean.
- `economics.ts` extensions — `budget`, `plan`, `budgetAlerts`, `usageStatements` + `projectedMonthlyRunRate`/`budgetCapMonthly`. **Note:** run-command-center adds `projectedMonthlyRunRate`/`budgetCapMonthly` to the economics *summary*; monitor-roi-billing adds a `budget` *object* with `projectedMonthlyUsd`/`monthlyCapUsd`. **Two names for projected-run-rate and cap.** Unify on the `budget` object.
- `src/mock/governance-moat.ts` — `structuralValidators`, `llmSignals`, `structuralReadiness` (monitor-governance). Clean.
- `src/mock/gate-policies.ts` — `GatePolicy`, `AutonomyPromotion`, `autoClearPreview` (added by the P1-G1 gate-policies/autonomy pass; consumed by Gates rows, the gate-review header, Settings, and the `/governance` overrides KPI). Clean — single owner.
- `src/mock/specReview.ts` (or in trace.ts) — `specValidators(ticket)`, `earsCriteria(ticket)` (run-pipeline-gates Spec Review). **Overlaps** `governance-moat.ts structuralValidators` — the Spec Review per-ticket validators and the Governance fleet-level validators share the same check vocabulary (BA's real registry ids: `V1_ears_coverage`, `V2_missing_section`, `V4_ac_id_parity`, `V5_br_references`, `V6_eh_message_parity`, `V7_decision_confidence_parity`, `V8_metadata_header`, `V9_duplicate_ids` — V3 retired; both seed 8/8). **Define the check-id enum once and share it.**
- `src/mock/incidents.ts` — `Incident`, `RecoveryActionKind`, `IncidentEvent` + helpers (run-comms-incidents). Clean; ownership of `incidentIdFor` (#16).
- `src/mock/sla.ts` — `SlaDefinition`, `SlaBreach` (monitor-sla). **Conflicts with** xcut `SlaTarget` (#15).
- `src/mock/report.ts` — `WeeklyReport`, `ReportItem`, `ReportGate` (monitor-sla). Clean.
- `src/mock/notifications.ts` — `AppNotification`, `NotificationPref`, `AlertRule`, `recentEntities` + helpers (xcut-notifications). Clean, well-specified. **This is the canonical notifications shape — the shell TopBar bell spec's inline `notifications` shape must defer to it** (shell defines a lighter `{id,kind,title,ts,read,deepLink}` — align it).
- `src/mock/roles.ts` — `Role`, `RoleAssignment` + helpers (xcut-roles). Clean. **Adds a `sponsor`/`client-sponsor` human to `humans.ts`** — coordinate with humans.ts extensions below.
- `src/mock/invites.ts` — `PendingInvite` (xcut-roles). **Duplicate of** fireup-people `Invite`/`pendingInvites` (#12).
- `src/mock/tenancy.ts` — `Tenancy`, `ConnectorScope`, `Retention` (xcut Settings). **Conflicts** (#13, #14).
- `src/mock/samplePod.ts` — `SAMPLE_POD` selector (xcut sandbox). Clean.
- **Wave-2 additions (specced, not yet built):** `src/mock/code-integration.ts` (two seeded PRs + the gate↔PR mirroring rule — Blind spot 3), `memory.ts` (P1-A2), `pilot.ts` (P1-C3), `artifacts.ts` (Blind spot 4), `share.ts` (P1-H4), `status.ts` (Blind spot 5), `copilot.ts` (P1-A1) — owned by the wave-2 specs above; shapes in the appendix.

**As-built file-name mapping (mock shipped through build #12 — commits `f76ee4a` + `69014e0`):** `validatorChecks.ts` landed as **`src/mock/validators.ts`**; `specReview.ts` landed as **`src/mock/gate-detail.ts`**; the `economics.ts` billing extensions (`plan`/`budgetAlerts`/`usageStatements`) landed as **`src/mock/billing.ts`**; the `tickets.ts` client-backlog extension landed as **`src/mock/backlog.ts`**; the `CatalogFacet` location decision went to **`src/mock/catalog.ts`**; `pods.ts` + the `fireup.ts` draft state landed as **`src/lib/pods/pod-store.tsx`** (localStorage `aiops_pods_v1`). Shipped as named: `chain.ts`, `connectors.ts`, `blueprints.ts`, `incidents.ts`, `notifications.ts`, `sla.ts`, `report.ts`, `roles.ts`, `intake.ts`, `governance-moat.ts`. Still planned: `tenancy.ts`, `podControl.ts`, `gate-policies.ts`, `invites.ts`, `samplePod.ts`, `audit-bridge.ts`, `modelPlane.ts`, `demoDirector.ts` + the wave-2 set.

**`humans.ts` extensions requested by 4 clusters — reconcile into one edit:** invite fields (`email,status,invitedAtIso,inviteLink`) from fireup-people; `workload.openGates`/`overdueGates` + `slaStatusFor()` from monitor-governance; `decisionsToday`/`avgApprovalMin` referenced by compliance; `sponsor` member from xcut-roles. **The assembler must apply these as one coherent `Human`/`workload` shape, not four separate patches.**

### 5. THE 3-MINUTE DEMO PATH — can a builder walk it?

The demo arc (§1, lines 22-26) is well-covered scene-by-scene, and every beat has a "Demo note." But end-to-end walkability has these blockers:

19. **[HIGH] The LAUNCH→RUN seam needs a single working state object.** The demo clicks Launch (fireup-launch) → lands on Overview with FirstRunRibbon → first clarification gate appears. This requires `fireup.ts PodDraft` (launch) and `podControl.ts`/`tickets.ts` (RUN) and `notifications.ts` (bell pulses to 1) to share the same active-pod id and the same `AM-142` ticket. **No cluster defines the canonical demo seed ticket (`AM-142`) end-to-end** — it's referenced by Spec Review, Gates, notifications, ⌘K, and the FirstRunRibbon, but each assumes it exists in `tickets.ts`. **Action: the assembler must seed `AM-142` (and `AM-138` for the escalation/incident beat) once in `tickets.ts` and verify the spec/gate/notification/incident all key off it.** The launched demo pod's agent seed is the canonical demo pick: five taps (`ba`, `sa`, `uiux`, `dev`, `qa`) + two one-click auto-fixes (`tasklist`, `review`) → the continuous 7-node chain `[ba, sa, uiux, tasklist, dev, review, qa]`, covered by Ana/Marin/Ivan/Petra (one human covers several agents). This is the load-bearing demo-continuity fix.

20. **[MED] The clarification gate that fires at 0:30 is specced in 3 surfaces (Slack preview in Wire Slack, ClarificationCard in Gates, clarification_gate notification + mobile) but no one owns the seed `ClarificationGate` record for AM-142.** run-pipeline-gates says "add a `ClarificationGate[]` to approvals.ts… reuse governance.ts openDecisions." **Action: seed the specific AM-142 clarification once and link it from the Slack preview, the bell, and the Gates queue** so the 0:30 beat is continuous.

21. **[MED] Pause-pod control (the §10 control objection) is demoable but its audit write is hand-waved.** run-command-center's `pausePod()` "writes an audit-shaped entry"; Incidents `recoverIncident()` "returns an AuditEntry-shaped object"; Compliance reads the real `getAuditFn` Supabase ledger. **The demo claims "every action written to the audit ledger" but the mock pause/recover writes are local, while Compliance reads live Supabase.** For a clean demo, **decide whether mock-mode actions append to a client-side audit array that Compliance Section A renders, or whether they POST to the real ledger.** Currently a builder can't make "pause pod → see it in Compliance" work from these specs without inventing the bridge.

22. **[LOW] 2:45 Close (Governance moat) reuses the Spec Review validator panel** — confirmed both clusters reference the zero-LLM badge with identical copy ("Validated deterministically — no LLM in the loop"). Good. Just ensure the shared check-id enum (#specReview/governance-moat) so the close and the RUN gate show the same check names.

---

#### Top fixes the assembler must apply, in order
1. **Unify the wizard route** and rewrite all cross-links (#2). ✅ **DONE as-built:** `/pods/new?step=…` (`src/routes/pods.new.tsx`).
2. **Collapse duplicate mock files into `fireup.ts`**: kill `podDraft.ts`, fold `slack-wiring.ts` + `pod-setup.ts`; canonicalize `PodDraft`/`SlackWiring` (#mock-inventory, #19).
3. **Canonicalize connector shape** (`connectors.ts`) + normalize connector ids; derive Settings/draft/readiness from it (#14).
4. **Unify tenancy shape** (`tenancy.ts` as source) (#13).
5. **Unify SLA shape** (`SlaDefinition`, derive `SlaTarget`) and the `budget` object (#15, economics note).
6. **Dedupe the three role-landing specs and the two ⌘K specs** into one each (#9, #10). *(⌘K + bell halves DONE as-built — one `CommandPalette`, one `NotificationBell` in `src/components/shell/`; role-landing dedupe still open.)*
7. **Share the Decision/ActorChip/Validator component+check-id families** across gates/mobile/compliance/governance (#11, specReview/governance-moat).
8. **Seed the demo spine once** — `AM-142` ticket + its spec + clarification gate + approval gate + notification, `AM-138` escalation+incident — and verify continuity LAUNCH→RUN→MONITOR (#19, #20).
9. **Decide the mock-action→audit-ledger bridge** so pause/recover show up in Compliance (#21).
10. **Add the missing ADVANCED-drawer spec and resolve `/knowledge`** (#1, #3) — *`/knowledge` RESOLVED: folds into `/memory` (wave 2); the ADVANCED-drawer REUSE spec remains open*; add `LAUNCH_STEPS.failable`, the two agent stubs, and a one-line a11y/help note as known tail gaps (#5, #6, #4).


---

## Appendix — consolidated synthesis (shared components & new mock data)

*Auto-consolidated across clusters: the shared components to build once, and the de-duplicated new mock-data shapes. Per-screen detail lives in the pillar sections above.*

| Component (family) | Home | Used by | Notes |
|---|---|---|---|
| **`GateReviewShell`** | `src/components/gates/` | Gate review (`/approvals/$gateId`, route file `approvals_.$gateId.tsx`); `/welcome` walkthrough (read-only mode) | The client-grade review surface — one shell, per-kind facet renderers. **P1-H2 rename `SpecReviewShell` → `GateReviewShell`: DONE as-built** (`GateReviewShell.tsx` + `DecisionPanel`/`EarsCriteriaList`/`SpecDocument`). `HumanGate` is **demoted to the legacy mock command-center** — never the review surface. |
| **`NotificationBell`** | `src/components/shell/` (host) — spec owned by the CROSS-CUTTING bell cluster | TopBar, every route | Exactly ONE bell (P1-H2). As-built: `src/components/shell/NotificationBell.tsx`. |
| **`RoiHero` family** | `src/components/monitor/` | Overview hero row, `/economics` hero band, Exec Digest, `/org` rollup | One implementation set (P1-H2 — supersedes the `RoiHeroTile`-vs-`HeroKpi` fork). As-built: **`RoiHeroTile` / `RoiHeroBand` / `RoiHeroRow`** + `RoiAssumptionsDialog`/`useRoiAssumptions`. |
| **`InviteDialog`** | `src/components/pod/` | wizard People step; Members & Invites (`/pod`) | Single invite dialog (supersedes `InviteByEmailDialog`). Props: `email`, `roleId`, optional `assignedAgentId`; writes `invites.ts: PendingInvite`. *(As-built: `src/components/fireup/InviteDialog.tsx`.)* |
| **Decision family: `DecisionPanel` + `RequiredReason` + `DecisionRow` + `ActorChip`** | `src/components/gates/` (Decision/reason) + `src/components/compliance/` (DecisionRow/ActorChip) | Gates inline (`/approvals`); Spec Review (`/approvals/$gateId`); Mobile Gates (`/m/gates`); Compliance (`/compliance`); Accountability decision drawer | `RequiredReason` enforces a typed note on **reject and override** (P1-G1 canon, as-built); **approve** offers optional structured quick-reason chips + an optional note. `ActorChip` renders attributed-or-"when-only". One family, imported everywhere. |
| **`GatePolicyChip` + `GatePolicyTable` + `AutonomyLadder`** | `src/components/gates/` (chip) + `src/components/settings/` (table/ladder) | Gate rows (`/approvals`); gate-review header (`/approvals/$gateId`); Settings → Gate policies & autonomy | All read `gate-policies.ts` (P1-G1). Policy edits and autonomy grants write `policy.changed` via the audit bridge; `/governance` derives the "Overrides this period" KPI from `gate.override` rows. |
| **Structural validator panels + shared check-id enum** | `src/components/governance/` (`DeterministicValidatorPanel`, `LlmJudgePanel`) + a shared `validatorChecks.ts` enum | Governance (`/governance`); Spec Review; QA Gate Queue; Mobile Gates chips | The check-id enum is **BA's real validator registry** (`V1_ears_coverage`, `V2_missing_section`, `V4_ac_id_parity`, `V5_br_references`, `V6_eh_message_parity`, `V7_decision_confidence_parity`, `V8_metadata_header`, `V9_duplicate_ids` — V3 retired), defined once; both fleet-level (`governance-moat.ts`) and per-ticket (`specValidators`) draw from it and seed **8/8**, so names match across the RUN gate and the 2:45 close. |
| **`ConnectorTile` + `ConnectDialog` + `LiveRoadmapBadge` + `ConnectorScopeList` + `ConnectorHealthLine`** | `src/components/connectors/` | Connect Tools (wizard step 3); Connections Hub (`/connections`); Incidents reauth-tool; Settings tools table | All read `connectors.ts`. `probeConnectorFn` extends `probeAgentFn`. |
| **`EmptyState({ icon, title, body, cta? })`** | `src/components/ui/` (or `shell/`) | every data-bearing view | The single empty-state primitive (supersedes `EmptyFleet` and all bespoke empty cards). |
| **`FilterBar` + `useListFilter<T>`** | `src/components/shell/` | `/pipeline`, `/approvals`, `/compliance` | Reads/writes URL search params; deep-link targeting highlights the row. |
| **`PodControlBar` + `PausedOverlay` + `AgentActionsMenu` + `EscalationsPanel`** | `src/components/command-center/` | Overview | Drive off `podControl.ts`; mutations append to the client-side audit bridge. |
| **`ReadinessGauge` (conic `Ring`)** | `src/components/fireup/` (as-built dir) | Readiness step; reusable progress ring | Lifted from the `Ring` pattern in `RealCommandCenter.tsx`. |
| **`WizardShell` + `WizardStepper` + `WizardFooterNav` + `useWizardDraft`** | `src/components/fireup/` (as-built) | the whole `/pods/new?step=…` family | Owns `PodDraft` state, per-step validity, cookie/localStorage persistence (as-built: `pod-store.tsx`, `aiops_pods_v1`). |
| **Client-side audit bridge (`appendAuditMock`)** | `src/mock/audit-bridge.ts` | pause/resume (`podControl`), `recoverIncident`, `pod.launched`, report "Mark as sent", ledger export | In mock mode, appends an `AuditEntry`-shaped row to a client-side array that Compliance Section A renders, so "pause pod → see it in Compliance" works without POSTing to live Supabase (coverage review #21). |

---

### New mock data to add (appendix)

Consolidated, de-duplicated list of every NEW mock dataset/shape. **EXTEND** = add fields to an existing file; **NET-NEW** = a new file. Conflicts flagged by the coverage review are reconciled here — these shapes are authoritative.

#### NET-NEW files

##### `src/mock/pods.ts` — the multi-pod scope object
```ts
export interface Pod {
  id: string; name: string; client: string;
  status: "live" | "setup" | "paused";
  region: string; isolatedDb: boolean; agentCount: number;
  isSample?: boolean;
  // tenancy is NOT duplicated here — pods reference tenancy.ts by region/isolation;
  // the full Tenancy record lives in tenancy.ts (single source).
}
export const pods: Pod[];        // seed: AutoMarket (live, Sample), Listr (live), Kasa (setup)
// Pod.status:"setup" ⇔ PodDraft.status:"draft" — a "setup" pod IS the live projection of a mid-wizard
// PodDraft; selecting it resumes /pods/new?step= at its last step. (The one-line mapping per P2.)
```
Active pod id stored in the existing `aiops_project` cookie. *(As-built: `pods.ts` + the draft state are unified in `src/lib/pods/pod-store.tsx`, persisted to localStorage `aiops_pods_v1`.)*

##### `src/mock/tenancy.ts` — single source of truth for tenancy (resolves #13)
```ts
export interface Tenancy {
  deployment: "Dedicated"; region: "EU-West";
  isolation: "Isolated per-client DB";
  encryption: "AES-256 at rest · TLS 1.3 in transit";
  dataResidency: string; dpaSigned: boolean;
}
export interface Retention {
  dataClass: "audit_log" | "runs" | "artifacts" | "comms";
  windowDays: number; locked: boolean; // audit_log: locked=true ("append-only, never auto-deleted")
}
export const tenancy: Tenancy;
export const retention: Retention[];
// Connected-tool scopes are derived from connectors.ts — NOT a separate ConnectorScope shape.
// TopBar TenancyBadge reads a subset; PodDraft.tenancy carries a reference/subset.
```

##### `src/mock/blueprints.ts`
```ts
export interface PodBlueprint {
  id: "web-app" | "mobile" | "maintenance";
  name: string; tagline: string; icon: string; popular?: boolean;
  agentIds: AgentId[]; suggestedConnectorIds: string[];   // connector ids (normalized)
  defaultSlas: { responseMin: number; gateClearMin: number; deliveryCadence: string };
  recommendedRoles: { agentId: AgentId; roleLabel: string }[];
  language: string;   // default working language (Blind spot 7) — "specs, reports, and gates are produced
                      // in this language"; EARS keywords stay English as a structural convention
                      // (the validators check structure), body text localized
}
export const blueprints: PodBlueprint[];
// Seeds: web-app [ba,sa,uiux,tasklist,dev,review,qa] / [teamwork,slack,github,jira,drive] {30,240,"weekly"} popular;
//        mobile [ba,sa,dev,qa] / [teamwork,github,slack] {60,480,"biweekly"};
//        maintenance [ba,dev,review,qa] / [slack,teamwork,jira,email] {15,120,"continuous"}.
// suggestedConnectorIds are ordered LIVE-FIRST (teamwork/slack/github); roadmap connectors (jira/drive/email) trail, rendered as Optional · Roadmap.
// "Start from scratch" is hard-coded in the component, not the dataset.
// Blueprint agentIds derive their ordering/validity from chain.ts (single source of truth).
```

##### `src/mock/chain.ts` — the canonical chain (single source of truth; resolves the five-way chain fork)
```ts
export type ArtifactKind = "spec" | "design" | "uix-ui-spec" | "tasks" | "code" | "review" | "test" | "release" | "knowledge";
export interface ChainRole { agentId: AgentId; produces: ArtifactKind; consumes: ArtifactKind[]; pipeline: boolean; }  // pipeline:false = pod-wide peer
export const CHAIN: ChainRole[];
// ba []→spec; sa [spec]→design; uiux [design]→uix-ui-spec; tasklist [uix-ui-spec]→tasks;
// dev [tasks]→code; review [code]→review; qa [code,review]→test; devops [test]→release;
// curator (Knowledge) = pod-wide peer (pipeline:false, GenericFacet) — runs pod-wide, not in the pipeline rail.
export const EDGES: { from: AgentId; to: AgentId; artifact: ArtifactKind }[];   // derived
// catalogFacets (agents.ts), blueprint seeds (blueprints.ts), and PipelinePreview ordering ALL derive from this module — no spec re-declares the chain.
```

##### `src/mock/fireup.ts` — the wizard aggregator (absorbs the would-be `podDraft.ts`, `slack-wiring.ts` routing draft, `pod-setup.ts`)
```ts
export interface PodDraft {
  id: string; name: string;
  blueprintId: "web-app" | "mobile" | "maintenance" | "scratch" | null;
  language: string;                                 // working language (Blind spot 7) — defaults from the blueprint
  tenancy: Pick<Tenancy, "deployment" | "region" | "isolation">;  // reference/subset of tenancy.ts
  agentIds: AgentId[];
  connections: ConnectionDraft[];
  scopeRule?: {                                     // brownfield work slice (Connect sub-screen 3b)
    connectorId: ConnectorId;                       // which tracker the slice filters
    projectKey?: string; labels?: string[]; components?: string[];   // AND semantics
  };                                                // "everything else stays with your team, untouched"
  accountability: Record<AgentId, string | null>;   // humanId or null (single source; no pod-setup.ts)
  slack: SlackWiring;
  slas: { responseMin: number; gateClearMin: number; deliveryCadence: string };
  budget: { monthlyCapUsd: number; onCapReached: "alert" | "pause-new-work" | "hard-pause" };  // set by the Go live "Targets & budget" panel (sub-screen 6a)
  stepStatus: Record<1|2|3|4|5|6, "todo" | "current" | "done" | "error">;
  status: "draft" | "launching" | "live";
  updatedAt: number;
}
export interface ConnectionDraft {                  // derives from connectors.ts (no forked tool shape)
  connectorId: string; required: boolean;
  health: "connected" | "unreachable" | "unconfigured";
  scopesGranted: string[];
  statusMap?: { podStage: string; clientStatus: string }[];  // 5-row status write-back mapping (ticketing connectors only, edited in ConnectDialog)
}
export interface SlackWiring {                       // canonical (resolves the fork)
  approverChannel: string | null;
  mappings: { event: "clarification" | "approval" | "escalation" | "daily-brief"; channel: string }[];
}
export interface ReadinessCheck {                    // derived by computeReadiness, not stored
  id: "agents" | "accountability" | "tools" | "slack" | "budget" | "sla_targets" | "coverage" | "code_integration" | "knowledge";
  // budget + sla_targets: required, satisfied by the Go live "Targets & budget" panel (6a)
  // coverage: advisory (P1-O1) — derived from humans.ts workingHours/availability
  // code_integration: advisory (Blind spot 3) — "Bot collaborator invited · branch-protection compatible",
  //   rendered only when GitHub is connected; reads code-integration.ts
  label: string; status: "pass" | "blocked" | "warn" | "pending";
  severity: "required" | "advisory"; detail: string; fixRoute: string;
  items?: { label: string; ok: boolean }[];
}
export const LAUNCH_STEPS: { id: string; label: string; ms: number; failable?: boolean }[];  // failable added (#6)
export function computeReadiness(d: PodDraft): { checks: ReadinessCheck[]; requiredAllPass: boolean; anyWarn: boolean; pct: number };
export const seedDraftAllGreen: PodDraft;            // AutoMarket happy path
export const seedDraftBlocked: PodDraft;             // QA uncovered + GitHub unconfigured
```
Channel/workspace *content* (workspace name, `slackChannels[]`) may live in a small `src/mock/slack-wiring.ts`, but the routing **draft state** is `PodDraft.slack`.

##### `src/mock/connectors.ts` — single connector shape, normalized ids (resolves #14)
```ts
export type ConnectorId = "jira" | "drive" | "email" | "slack" | "github" | "teamwork";  // NORMALIZED (no "gdrive"/"Drive")
export interface Connector {
  id: ConnectorId; name: string; vendor: string; icon: string; description: string;
  category: "ticketing" | "storage" | "comms" | "scm" | "pm";
  availability: "live" | "roadmap";
  direction: "inbound" | "outbound" | "bidirectional";
  requiredByAgents: AgentId[];
  scopes: { id: string; label: string; access: "read" | "write"; reason: string }[];
  health: { state: "healthy" | "degraded" | "unreachable" | "unknown"; latencyMs?: number; lastSyncMin?: number; error?: string };
  docsUrl: string;
}
export const CONNECTORS: Connector[];
// Seeds: teamwork/slack/github=healthy live; jira/drive/email=roadmap; degraded-slack alternate for Incidents.
// Settings tools table, PodDraft.connections, and computeReadiness all DERIVE from this.
```
`probeConnectorFn({ connectorId })` extends `probeAgentFn`. Connected state persisted to the existing `aiops_systems` cookie (extend `StoredSystem` with `connectorId`, `scopesGranted`, `connectedAt`).

##### `src/mock/podControl.ts`
```ts
export interface PodControlState {
  podId: string;
  podState: "running" | "paused" | "escalated";
  pausedBy?: string | null;   // null = "when-only" until auth
  pausedAt?: string; pausedReason?: string;
  agentOverrides: Record<AgentId, { state: "running" | "paused"; pausedBy?: string | null; pausedAt?: string }>;
  openEscalations: number;    // derived from comms.ts ESCALATIONS
}
export function pausePod(reason?: string): void;
export function resumePod(): void;
export function pauseAgent(id: AgentId, reason?: string): void;
export function resumeAgent(id: AgentId): void;
// each helper mutates in-memory and calls appendAuditMock(...) (the audit bridge)
```

##### `src/mock/incidents.ts` — owns `incidentIdFor` (resolves #16)
```ts
export type IncidentType = "agent-down" | "run-failed" | "gate-overdue" | "tool-disconnected" | "sync-stale" | "suspicious-input";
// suspicious-input (Blind spot 6): ingested external content that trips the injection heuristics surfaces
// as an incident (quarantined for human review) — pairs with the Spec Review input-provenance chip.
export type IncidentStatus = "open" | "recovering" | "resolved";
export type RecoveryActionKind = "retry-run" | "resume-run" | "reauth-tool" | "reassign-human" | "pause-agent" | "restart-agent" | "escalate-to-q";
// escalate-to-q (P1-O3): files a Q-side ticket with the incident timeline attached; tracked in-pod; audited.
// reassign-human (P1-O1): pending until the new human ACCEPTS — writes human.reassigned, then accountability.accepted.
export interface IncidentEvent {
  id: string; tsOffsetMin: number;
  kind: "detected" | "notified" | "auto-attempt" | "human-action" | "recovery-failed" | "resolved";
  label: string; actor?: string | null;  // null = "when-only"
}
export interface Incident {
  id: string; type: IncidentType; severity: "low" | "med" | "high" | "critical";
  status: IncidentStatus; title: string; summary: string;
  agentId?: AgentId; ticketId?: string; toolId?: ConnectorId; accountableHumanId?: string;
  openedMinAgo: number; slaToResolveMin: number; detectedBy: string;
  suggestedAction: RecoveryActionKind | null; availableActions: RecoveryActionKind[];
  linkedEscalationId?: string; linkedCommId?: string; timeline: IncidentEvent[];
}
export const INCIDENTS: Incident[];
export const openIncidents: () => Incident[];
export const incidentsByType: () => Record<IncidentType, Incident[]>;
export const incidentById: (id: string) => Incident | undefined;
export const incidentIdFor: (esc: Escalation) => string | null;   // consumed by /comms
export function recoverIncident(id: string, action: RecoveryActionKind, reason?: string): AuditEntryLike;  // pushes events + appendAuditMock
// Seeds ~7–8 incl. AM-138 design-stale → marin, GitHub tool-disconnected (critical), HubSpot/Drive sync-stale,
// one resolved, and ONE suspicious-input ("ticket AM-151 contains instruction-shaped content — quarantined").
```

##### `src/mock/sla.ts` — single SLA shape; Exec Digest derives `SlaTarget` (resolves #15)
```ts
export type SlaMetric = "response_time" | "gate_clearance" | "delivery_cadence" | "rework_rate";
export type SlaStatus = "on_track" | "at_risk" | "breached";
export interface SlaDefinition {
  id: string; podId: string; metric: SlaMetric; label: string;
  scope: "pod" | Stage; targetValue: number; unit: "min" | "hr" | "per_week" | "pct";
  comparator: "lte" | "gte"; actualValue: number; status: SlaStatus;
  breachCount30d: number; trend: number[]; lastBreachAt?: number;
  clockMode: "24x7" | "coverage_hours";   // P1-O1: coverage_hours pauses the clock outside the accountable human's workingHours ("clock paused outside coverage")
}
export interface SlaBreach {
  id: string; slaId: string; occurredAt: number; actualValue: number; targetValue: number;
  stage: Stage; workItemId?: string; workItemTitle?: string; durationOverMin: number; note?: string;
}
export const slaDefinitions: SlaDefinition[];   // ~6 over AutoMarket, 1–2 breached
export const slaBreaches: SlaBreach[];           // ~8, referencing AM-138/AM-149
export const throttlePolicy: { maxOpenGatesPerHuman: number; onExceed: "pause-intake" };
// P1-O1: when a human's open gates exceed the cap, upstream intake pauses — amber "throttled" pod state on PodControlBar; the pause is audited.
// Exec Digest projects SlaTarget { id; label; targetMin; actualMin; breached } from SlaDefinition — no separate file.
```

##### `src/mock/report.ts`
```ts
export interface ReportItem { workItemId: string; title: string; stage: Stage; deliveredAt: number; storyPoints: number; }
export interface ReportGate { workItemId: string; title: string; kind: "approval" | "clarification"; decision: "approved" | "rejected"; clearedAt: number; turnaroundHr: number; }
export interface WeeklyReport {
  id: string; podId: string; podName: string; periodStart: number; periodEnd: number;
  status: "draft" | "sent"; sentAt?: number;
  headline: { itemsDelivered: number; gatesCleared: number; avgCycleTimeHr: number; spendUsd: number; humanHoursSaved: number };  // spendUsd/humanHoursSaved mirror economics.ts aggregates; humanHoursSaved DISPLAYS as "human-hours freed (redeployed)" — never "saved/displaced" in the sponsor-facing report (data key stays)
  delivered: ReportItem[]; gatesCleared: ReportGate[];
  slaSummary: { onTrack: number; atRisk: number; breached: number; notable: string[] };
  upcoming: string[]; costNote: string; narrative: string;
}
export const reports: WeeklyReport[];   // one sent (prior week) + one draft (current)
```

##### `src/mock/governance-moat.ts` — uses the shared check-id enum
```ts
export interface StructuralValidator {
  id: ValidatorCheckId;  // from shared validatorChecks.ts
  label: string; descriptor: string; check: "deterministic";
  status: "pass" | "fail" | "partial"; coverage: number; detail: string; blocksReadiness: boolean;
}
export interface LlmSignal { id: string; label: string; score: number; kind: "judge" | "persona"; advisory: true; note: string; }
export const structuralValidators: StructuralValidator[];
export const llmSignals: LlmSignal[];
export const structuralReadiness: { pct: number; blocking: number };
```

##### `src/mock/gate-policies.ts` — the policy layer behind the gates (P1-G1)
```ts
export type ReviewMode = "full" | "batch" | "auto-with-sampling";
export type AutonomyLevel = "L0_review_all" | "L1_batch" | "L2_sample_1_in_5" | "L3_auto_low_risk";
export interface GatePolicy {
  artifactKind: ArtifactKind;            // from chain.ts
  requiredRole: Role["id"][];            // who may clear this gate class
  nEyes: 1 | 2;                          // N-eyes requirement
  slaClearMin: number;                   // clearance SLA for this gate class
  delegation: "delegate-allowed" | "accountable-only";
  overridePolicy: "reason-required" | "second-approver";   // overrides ALWAYS write gate.override with a typed reason
  reviewMode: ReviewMode;
  autonomy: AutonomyLevel;
}
export const gatePolicies: GatePolicy[];       // seeded from blueprint defaults (spec gate: PM · 1-eye · ≤4h · L0 review-all)
export interface AutonomyPromotion {           // the earned-autonomy ladder, L0 → L3
  agentId: AgentId; from: AutonomyLevel; to: AutonomyLevel;
  criteria: string;                            // deterministic validator streaks, e.g. "47 consecutive 8/8 specs · 4% rejection"
  state: "proposed" | "granted" | "declined";  // proposed by the SYSTEM; GRANTED by the accountable human; grant written to the ledger as policy.changed
}
export const autonomyPromotions: AutonomyPromotion[];  // seed: BA proposed for L2 (the streak above)
export function autoClearPreview(p: GatePolicy): { wouldHaveCleared: number; of: number; savedHrs: number };
// powers the Settings preview stat: "this policy would have auto-cleared 14 of 22 gates last week, saving ~9h"
// Consumed by: GatePolicyChip on /approvals rows + the gate-review header; Settings → Gate policies & autonomy;
// /governance "Overrides this period" KPI counts gate.override rows in audit-bridge.ts.
```

##### `src/mock/specReview.ts` — shares the check-id enum *(as-built file name: `src/mock/gate-detail.ts`)*
```ts
export function specValidators(ticket: Ticket): {
  score: number;
  checks: { id: ValidatorCheckId; label: string; kind: "structural"; status: "pass" | "warn" | "fail"; detail: string; deterministic: true }[];
};
export function earsCriteria(ticket: Ticket): { id: string; text: string; trigger: string; response: string; measurable: boolean; valid: boolean }[];
// earsCriteria() binds to BA's real `/structured-ac` endpoint (the spec `structured` block) once live — the mock mirrors its shape.
export function agentSelfReport(ticket: Ticket): {        // the "Agent's notes" panel (P1-A3)
  assumptions: { id: string; text: string }[];            // flaggable rows — flagging one pre-fills the reject reason
  openQuestions: string[];
  sectionConfidence: { section: string; confidence: "low" | "med" | "high" }[];   // per-section confidence dots
  citations: { label: string; sourceId: string }[];       // deep-link into knowledge/constitution sources
};  // rendered badged "Self-reported by the agent · advisory" — a third walled signal class (never blended with deterministic or LLM-advisory)
export function runStory(ticket: Ticket): { ts: number; kind: "source-read" | "clarification" | "check" | "cost"; label: string }[];
// plain-language run timeline (sources read, clarifications, checks run, cost) — feeds the weekly report ("every delivered item links to its run story")
export function inputProvenance(ticket: Ticket): { source: string; kind: "external" | "internal"; trusted: boolean }[];
// the Spec Review input-provenance chip ("external content treated as untrusted")
// Keys off AM-142 for the demo spine.
```

##### `src/mock/validatorChecks.ts` — the shared check-id enum (resolves the specReview/governance-moat overlap) *(as-built file name: `src/mock/validators.ts`)*
```ts
// BA's REAL validator registry ids — mirrors `_STRUCTURAL_CHECK_IDS` in the BA repo
// (agents/ba/pipeline/validators.py). 8 zero-LLM structural validators; V3 (open-question
// marker scanner) is retired. Both seed sets (governance-moat.ts and specValidators) seed 8/8.
export type ValidatorCheckId =
  | "V1_ears_coverage"               // EARS coverage ≥80% of ACs
  | "V2_missing_section"             // all canonical SPEC.md sections present
  | "V4_ac_id_parity"                // AC IDs match between Sections 4 ↔ 11
  | "V5_br_references"               // referenced business rules exist in Section 5
  | "V6_eh_message_parity"           // error-handling messages match Sections 14 ↔ 7
  | "V7_decision_confidence_parity"  // Low-confidence decisions marked consistently
  | "V8_metadata_header"             // spec metadata header present
  | "V9_duplicate_ids";              // no duplicate IDs within an owning section
export const CHECK_LABELS: Record<ValidatorCheckId, string>;
```

##### `src/mock/notifications.ts` — canonical notifications (TopBar bell defers to this)
```ts
export type NotificationKind =
  | "clarification_gate" | "approval_gate"
  | "escalation" | "sla_at_risk" | "sla_breach"
  | "incident_opened" | "run_failed" | "tool_disconnected"
  | "digest" | "comment" | "delivered";
export type NotificationChannel = "in_app" | "email" | "slack" | "push";
export type NotificationSeverity = "info" | "warning" | "critical";
export interface AppNotification {
  id: string; recipientId: string; kind: NotificationKind; severity: NotificationSeverity;
  title: string; body: string; ts: number; read: boolean;
  actorId?: string | null;   // null = "when-only"
  ticketId?: string; entityId?: string; deepLink: string;
  channels: NotificationChannel[]; actionable?: boolean; actionLabel?: string;
  slaState?: "on_track" | "at_risk" | "overdue";
}
export interface NotificationPref { recipientId: string; kind: NotificationKind; channels: Record<NotificationChannel, boolean>; }
export interface AlertRule {
  id: string; name: string; enabled: boolean;
  trigger: { kind: NotificationKind; comparator: ">" | ">="; thresholdMin?: number };
  channels: NotificationChannel[]; routedTo: string[]; scope?: "pod" | "agent";
}
export const notifications: AppNotification[];      // ~12–16, incl. clarification_gate AM-142 → ana, escalation AM-138 → marin
export const notificationPrefs: NotificationPref[]; // in-app+slack ON for gates/escalations/incidents; email/push OFF (Roadmap)
export const alertRules: AlertRule[];               // 2–3 (spec-gate-overdue, sla-breach-critical, incident-opened → PM)
export const recentEntities: string[];              // for ⌘K Recent group
export const unreadFor: (humanId: string) => number;
export const gatesFor: (humanId: string) => AppNotification[];
```

##### `src/mock/roles.ts`
```ts
export interface Role {
  id: "pod_admin" | "eng_lead" | "qa_lead" | "sponsor" | "viewer";
  label: string; description: string; defaultLanding: string; readOnly: boolean;
  capabilities: { read: boolean; act: boolean; approve: boolean; configure: boolean; export: boolean };
}
export interface RoleAssignment { humanId: string; roleId: Role["id"]; }
export const roles: Role[];
export const roleAssignments: RoleAssignment[];  // ana→pod_admin, ivan/marin→eng_lead, petra→qa_lead, zlatko→pod_admin, client-sponsor→sponsor
export const roleOf: (humanId: string) => Role["id"] | undefined;
export const membersOf: (roleId: Role["id"]) => string[];
export const landingFor: (roleId: Role["id"]) => string;   // canonical landing helper
export const navItemsFor: (roleId: Role["id"]) => /* filtered NAV */ unknown;
```

##### `src/mock/invites.ts` — single invite shape (resolves the `Invite`/`PendingInvite` fork #12)
```ts
export interface PendingInvite { id: string; email: string; roleId: Role["id"]; sentAt: number; oneTimeLink: string; assignedAgentId?: AgentId; }
export const pendingInvites: PendingInvite[];
// Shared by the wizard People step and Members & Invites (/pod).
```

##### `src/mock/samplePod.ts`
```ts
export const SAMPLE_POD: { id: "automarket-sample"; name: string; badge: "Sample"; region: "EU-West"; isolation: "Isolated"; isSample: true; seed: unknown };
// Thin selector re-exporting existing agents/humans/approvals/comms/economics/governance under one pod identity + a seed snapshot for reset.
```

##### `src/mock/audit-bridge.ts`
```ts
// The audit ACTION VOCABULARY (P1-G4) — defined once, here. "Every action is written to the
// ledger" must cover more than two verbs: policy mutations, clarification answers, overrides,
// acceptances, and amendments are all first-class action classes.
export type AuditAction =
  | "pod.launched" | "pod.paused" | "pod.resumed"
  | "agent.paused" | "agent.resumed"
  | "gate.approved" | "gate.rejected" | "gate.override"
  | "clarification.answered"
  | "incident.recovered" | "human.reassigned" | "accountability.accepted"
  | "policy.changed"            // payload { field, before, after }
  | "constitution.amended"
  | "report.sent" | "data.exported" | "reset";
export interface AuditEntryLike {
  action: AuditAction; target?: string; actor: string | null; ts: number;
  decision?: "approved" | "rejected"; reason?: string | null; gate_kind?: "approval" | "clarification";
  payload?: { field: string; before: string; after: string };   // for policy.changed
}
export const mockAuditLog: AuditEntryLike[];        // client-side array; seed incl. 3–4 policy.changed rows
                                                    // (budget cap raised, approver channel rewired, retention change, autonomy grant L0→L1)
export function appendAuditMock(e: AuditEntryLike): void;   // pause/recover/launch/policy-edit/report-send/export append here
// Compliance filter buckets map over this enum: All / Decisions / Policy changes / Recovery / Pod control / Resets.
// Compliance Section A renders this in mock mode, so "pause pod → see it in Compliance" works without live Supabase (#21).
```

##### `src/mock/modelPlane.ts` — the model plane (Settings → Models & subprocessors; TopBar popover line)
```ts
export interface ModelPlaneEntry {
  agentId: AgentId;
  provider: string;     // e.g. "Anthropic"
  modelPin: string;     // the pinned model id — per agent, never "latest"
  region: string;       // processing region — honestly non-EU today; "EU-region inference: Roadmap"
  zdr: boolean;         // zero-data-retention API terms in force
}
export const modelPlane: ModelPlaneEntry[];   // one row per agent; BA live, rest roadmap
```

##### `src/mock/intake.ts` — Work Intake (`/intake`) *(as-built 2026-06-11 — the single-doorbell API)*
```ts
export interface IntakeTicket {
  id: string; title: string; labels: string[]; priority: "P0"|"P1"|"P2"|"P3"; ageDays: number;
  inScope: boolean;            // the pod's scope rule
  pulled: boolean;             // already in the pod ("In pod")
  arrived: boolean;            // the board SENT it (Ready column) and it isn't declined — the ONLY confirmable state
  provenance?: "manual-pull" | "drag-to-ready";  // HOW the start happened (meaningful once pulled)
}
export function intakeBacklog(): IntakeTicket[];  // derived per render from backlog.ts + trigger.ts (arrivals/declines/provenance)
export function pullTickets(ids: string[], provenance?: TicketProvenance): Ticket[];
//   starts board-sent arrivals only (skips arrived=false — the seam enforces the doorbell);
//   records start provenance; appends to tickets.ts Backlog + fires a notifications.ts entry
// Decline lives in trigger.ts: recordDecline(id) → arrival cancelled, board status back to Backlog,
//   the row drops to "on the board"; the UI writes gate.rejected with the typed reason.
// There is NO composeTicket — ticket creation happens on the board, never here.
// Routing preview is computed from chain.ts (first pipeline agent with consumes: []), not stored.
```

##### `src/mock/demoDirector.ts` — the staged-event engine (Demo Director ⌘⇧D + Post-Launch demo binding)
```ts
export interface DemoStep { id: string; at: string /* "0:30" */; label: string; fire: () => void; }  // idempotent
export const DEMO_SCRIPT: DemoStep[];          // mirrors the 3-minute arc; fires mutations into the EXISTING mock stores
export const CHECKPOINTS: { id: string; label: string; snapshot: () => void }[];  // Start / Post-inflow / Pre-MONITOR
export function seedInflow(podId: string): void;   // pod empty ~5s → AM-142 arrives → BA run begins (consumed by Post-Launch Landing)
export function openClarification(ticketId: string): void;  // appends the seeded ClarificationGate + bell notification
export function raiseEscalation(ticketId: string): void;
export function openIncident(id: string): void;
// Ships later as the guided Sample-pod onboarding tour — demo infra and onboarding are one artifact.
```

##### `src/mock/code-integration.ts` — the code-side integration model (Blind spot 3)
```ts
export interface BotGitIdentity { account: string /* "agencyos-bot" */; signedCommits: true; coAuthoredBy: string /* the accountable human */; }
export interface SeededPr {
  id: string; repo: string; number: number; title: string;
  ticketId: string;                 // AM-131 / AM-149 (the seeded run-failed pair)
  gateId: string;                   // the code-review gate this PR MIRRORS
  description: { specLink: string; gateId: string; validatorSummary: string };  // the PR contract — in EVERY PR body
  state: "open" | "merged";
  branchProtectionCompatible: boolean;   // drives the LAUNCH readiness check
}
export const botIdentity: BotGitIdentity;
export const seededPrs: SeededPr[];     // exactly TWO seeds (one open, one merged)
// GATE↔PR MIRRORING RULE: the code-review gate IS the GitHub PR review — a webhook resolves the gate;
// the dashboard shows status + deep-links out. The deliberate INVERSE of the spec gate (engineers live
// in GitHub; PMs live here) — justified per persona. Consumed by: the LAUNCH readiness check
// ("Bot collaborator invited · branch-protection compatible") and the Pipeline code-review column status.
```

#### Wave-2 NET-NEW files (✅ shipped in the wave-2 slice — all exist under `src/mock/`)

Compact shapes; each is owned by its wave-2 spec. *(As-built additions beyond these shapes: `gate-policies.ts` — `GatePolicy { agentId; gateClearMin; slaLabel; autonomy: L0–L3; autonomyLabel }` per chain agent, the autonomy-ladder seed; and `audit-bridge.ts` — the session audit overlay (`appendAuditMock`, `useSessionAudit`) every wave-2 surface writes through, merged into the standard ComplianceView under a "this session" divider.)* `memory.ts` — `ConstitutionRule { id; text; category; provenance: "blueprint"|"client"|"ratified-amendment"; ratifiedAt?; citedByGateIds[] }` + `AmendmentProposal { id; draftText; minedFrom: { rejectionGateIds[]; clusterLabel }; state }` (ratify → `constitution.amended`). `pilot.ts` — `PilotPlan { podId; startIso; endIso; criteria[]; weekly[]; baseline; conversion }` (fees labeled *pricing hypothesis*). `artifacts.ts` — `ArtifactSnapshot { id; kind: ArtifactKind; ticketId; title; version; approvedByGateId; approvedAt; contentRef; snapshotAt }` + `artifactVersions()` (**snapshot-at-gate-clearance rule** — control-plane `ArtifactSnapshot`). `share.ts` — `ShareLink { token; kind; targetId; createdBy; createdAt; expiresAt; state: "active"|"expired"|"revoked"; views[] }` (view audited as `data.exported`). `status.ts` — `StatusComponent { id; label; state; since?; lastIncidentAt? }` + `uptimeDays[]` + `platformSla { uptimeTargetPct; ledgerRpoMin }`. `copilot.ts` — `CopilotAnswer { q; answerMd; receipts[] }` + `ProposedAction { intent; target; auditPreview: AuditEntryLike }` (no LLM in the mock).

#### EXTEND existing files

##### `src/mock/agents.ts` — add `CatalogFacet` + two agent stubs
```ts
import { ArtifactKind } from "./chain";   // re-exported from chain.ts — the single source of truth
export interface CatalogFacet {
  produces: ArtifactKind; consumes: ArtifactKind[];
  availability: "live" | "roadmap"; contractVersion: string;  // "contract v0.5"
  conformance: "certified" | "partial" | "untested";
  costPerTicketUsd: number; latencyP50Min: number;
  recommended: boolean; summary: string; capabilities: string[];
}
export const catalogFacets: Record<AgentId, CatalogFacet>;   // produces/consumes DERIVE from chain.ts
// BA: produces spec / consumes [] / live / certified. SA: consumes [spec] produces design / certified.
// UI/UX: [design]→uix-ui-spec. Tasklist: [uix-ui-spec]→tasks. Dev: [tasks]→code / partial. Review: [code]→review. QA: [code,review]→test / partial.
// DevOps: [test]→release. Knowledge = the existing `curator` (installable card, runs pod-wide, not in the pipeline rail; GenericFacet — NO new stub).
// ADD stubs: uiux (consumes [design] / produces uix-ui-spec), devops (produces release / consumes [test]) — so the catalog shows all seven SDLC roles (#5).
```
(May live in `src/mock/catalog.ts` instead — pick one location.)

##### `src/mock/humans.ts` — one coherent edit (reconciles the 4-cluster requests)
```ts
// On Human: email?, status?: "org" | "invited" | "active", invitedAtIso?, inviteLink?
// Capacity & coverage (P1-O1): workingHours?: { tz: string; start: string; end: string; days: number[] },
//   availability?: "available" | "ooo"   // P1-O1's "status available|ooo" — renamed `availability` to avoid
//                                        // colliding with the invite-lifecycle `status` field above,
//   delegateId?: string | null,          // deputy: covers, never owns — "one A" stays the invariant
//   capacityGatesPerDay?: number         // drives People-step capacity hints + the throttle policy
// On Human.workload: openGates: number, overdueGates: number
//   (decisionsToday, avgApprovalMin, slaBreaches already used by Compliance/Accountability)
// ADD member: client-sponsor (role sponsor)
export const slaStatusFor: (agentId: AgentId) => "on_track" | "at_risk" | "breached";  // Marin/Ivan at-risk/breached, rest on-track
// Consumed by: CoverageTimeline + DeputyChip (/pod), PersonCard capacity hints (People step),
// the Readiness "coverage" advisory, and SlaDefinition.clockMode ("coverage_hours").
```

##### `src/mock/approvals.ts` — add clarification gates
```ts
export interface ClarificationGate {
  id: string; ticketId: string; kind: "clarification"; agentId: AgentId;
  question: string; options?: string[]; proposedAnswer?: string;
  accountable: string; openedAt: number;
}
export const clarificationGates: ClarificationGate[];
// Seed the AM-142 clarification once; link from Wire-Slack preview, the bell, and the Gates queue (#20).
```

##### `src/mock/economics.ts` — add `budget`, `roiAssumptions`, `aggregates.pricePaidUsd`, `plan`, `budgetAlerts`, `usageStatements` (single `budget` object; resolves the projected-run-rate/cap naming fork) *(as-built: the billing trio — `plan`/`budgetAlerts`/`usageStatements` — landed in `src/mock/billing.ts`; `budget`/`roiAssumptions`/`pricePaidUsd` in `economics.ts`)*
```ts
// CANONICAL METRIC TRIO — every ROI surface (Overview hero, /economics, Exec Digest, reports)
// renders exactly: humanHoursDisplaced · costPerMerged · costPerStoryPoint.
// roiMultiple renders ONLY as the Exec Digest subcaption — nowhere else.
// humanHoursEquivalent exists per-ticket only; it is NEVER an aggregate (the aggregate is humanHoursDisplaced).
// Display labels: humanHoursDisplaced renders as "human-hours freed (redeployed)" — never "displaced" in
// client-facing copy (the data key stays). Tier badges: cost-per-approved-spec + time-to-approved-spec = Live;
// costPerMerged / costPerStoryPoint = "as agents ship". All ROI is computed NET of plan fees (pricePaidUsd).
export const budget: {
  monthlyCapUsd: number; mtdSpendUsd: number; daysElapsed: number; daysInMonth: number;
  projectedMonthlyUsd: number; capStatus: "on_track" | "watch" | "over"; currency: "USD";
};  // canonical — supersedes summary.projectedMonthlyRunRate/budgetCapMonthly
export const roiAssumptions: {
  blendedRateUsdPerHr: number;                  // e.g. 95 — the rate behind every hours→$ conversion
  baseline: string;                             // what the comparison assumes (e.g. "senior BA, 4h/spec")
  source: "client-provided" | "Q-default";      // provenance — editable from the ROI hero ("your numbers, not ours")
};
// on aggregates: pricePaidUsd: number — plan fees this period; roiMultiple derives net of this, never from raw compute cost.
// Billing shapes live in src/mock/billing.ts AS-BUILT (imports economics; avoids a cycle). §9.5-aligned — no "delivery unit", no fixed price:
// plan: BillingPlan (Dedicated tenant · pilot — pricing-hypothesis framing, pricing-TBD note)
// budget: Budget; budgetAlerts: BudgetAlert[] (thresholdPct, channel, armed|triggered)
// usageStatements: UsageStatement[] w/ StatementLineItem[] each linking to a gate decision (Mar–Jun 2026 history)
// PRICING_SIMULATOR_BADGE = "MODELING — not a quote"
// pricingScenarios: PricingScenario[] — "platform_pod" | "outcome_per_artifact" | "outcome_per_merged" (exactly vision §9.5's three components)
```

##### `src/mock/tickets.ts` — seed the demo spine (resolves #19)
- Promote in-file `extraTickets` into `tickets.ts` so the board and gates share one source.
- Seed **`AM-142`** (in `Spec Review`, the spec→clarification→approval beat) and **`AM-138`** (design-stale, feeds the escalation/incident beat) once, so `specMd`/`specValidators`/`clarificationGates`/`notifications`/`incidents` all key off the same ids.
- Add the **client-backlog extension** (~20 not-yet-pulled rows) that `intake.ts` and the Scope-of-Work preview filter over — the visible in/out split for the brownfield slice and Work Intake picker. *(As-built: the extension landed as its own file, `src/mock/backlog.ts`.)*

##### `src/mock/compliance.ts` — already has `AUDIT` (actor/decision/rationale); map `rationale`→`reason` in the Compliance view. No shape change required; the audit record is *extended* (in the view layer) with `decision?`, `reason?`, `gate_kind?` for the designed-now attribution.

#### NAV config (next to `roles.ts`)
```ts
export const NAV: { pillar: "LAUNCH" | "RUN" | "MONITOR" | "ADVANCED"; items: { to: string; label: string; icon: string; minCapability?: keyof Role["capabilities"]; badgeKey?: "gates" | "incidents" }[] }[];
// Exact item→route map in the Left Rail spec above. Settings pinned separately.
```

---

**Net-new mock files (22 wave-1 + 7 wave-2 = 29):** wave-1 — `pods.ts`, `tenancy.ts`, `blueprints.ts`, `chain.ts`, `fireup.ts`, `connectors.ts`, `podControl.ts`, `incidents.ts`, `sla.ts`, `report.ts`, `governance-moat.ts`, `gate-policies.ts`, `specReview.ts` *(as-built: `gate-detail.ts`)*, `validatorChecks.ts` *(as-built: `validators.ts`)*, `notifications.ts`, `roles.ts`, `invites.ts`, `samplePod.ts`, `audit-bridge.ts`, `modelPlane.ts`, `intake.ts`, `demoDirector.ts` (+ optional `slack-wiring.ts` for channel content, `catalog.ts` if facets are split out — *as-built chose `catalog.ts`* — and the `NAV` config); wave-2 (specced, not yet built) — `code-integration.ts`, `memory.ts`, `pilot.ts`, `artifacts.ts`, `share.ts`, `status.ts`, `copilot.ts`. As-built additions outside the planned list: `backlog.ts` (the tickets client-backlog extension as its own file), `billing.ts` (the economics billing trio); `pods.ts` + the draft state landed as `src/lib/pods/pod-store.tsx` (localStorage `aiops_pods_v1`).
**Extended existing files (6):** `agents.ts`, `humans.ts`, `approvals.ts`, `economics.ts`, `tickets.ts`, `compliance.ts` (view-layer map only).
**Deliberately NOT created** (deduped per coverage review): `podDraft.ts` (→ `fireup.ts`), `pod-setup.ts` (→ `PodDraft.accountability` + `invites.ts`), a separate SLA `SlaTarget` file (→ projected from `sla.ts`), a `ConnectorScope` shape in `tenancy.ts` (→ derived from `connectors.ts`), `defaultLandingFor` (→ `roles.ts landingFor`), a second `⌘K` component, a second invite dialog, bespoke per-view empty cards (→ `EmptyState`).
