# Build Brief — `agency-agent-sdk` (make an agent pluggable into Agency OS)

> **Who this is for:** the engineer / AI programmer working inside an agent's
> codebase — **BA first**, then the Knowledge Agent (KA), SA, and others.
> **What you're building:** a small **reusable Python SDK** that gives any agent
> a standard observability + human-in-the-loop (HITL) + health surface and a
> self-describing **Agent Card**, so it plugs into **Agency OS** (our fleet
> control plane). Build it once (extracted from BA), then KA/SA adopt it by
> changing only their identity + `produces`/`consumes`/`sources`.

This brief is self-contained — you don't need any other context to act on it.

---

## 0. Background (why this exists)

**Agency OS** is a separate dashboard that does **not** run agents — it
_observes and governs_ them. It reads each agent's **live API (REST + SSE)** and
normalizes it against a shared **contract**. For an agent to appear in Agency OS
it must (a) **emit the contract** (runs, events, HITL gates, health) and (b)
**advertise itself** via an A2A-aligned **Agent Card**.

Rather than hand-roll this in every agent, put it in **one shared SDK**. BA
already implements ~all of these mechanics (event bus, `/runs`, `/agent/watch`
SSE, `/agent/health`, HITL via `waiting_for_input`) — so for BA this is mostly an
**extract-and-generalize** job, not a greenfield build.

---

## Part A — The SDK (what to build)

### A.0 Packaging

- Standalone, installable Python package. Working name **`agency-agent-sdk`**,
  import module **`agency_sdk`**.
- **Zero agent-specific imports** — no Teamwork/Slack/spec/EARS logic, no BA
  database models. It must be `pip install`-able by KA and SA unchanged.
- If our agents share a monorepo, put it in `packages/agent-sdk/`. If they're
  separate repos, publish it (private index or `pip install git+…@v0.1`) and
  **pin a version**.
- Python ≥ 3.12, **Pydantic v2**, **FastAPI** (match the agents' stack).

### A.1 Contract types (Pydantic v2, domain-agnostic)

Define a `SCHEMA_VERSION = "0.3"` constant, stamped on every emitted payload.
**Domain-specific data must ride in `metadata` / event `data` — never as core
fields.** (BA's `completeness`, EARS, `spec_version` etc. go in `metadata`.)

> **Canonical schema:** the authoritative contract is **`agent-contract.schema.json`**
> (it lives in the Agency OS repo at `src/contract/`; copy it into this repo
> **version-pinned**). The Pydantic models below must **conform to / be generated
> from** that schema — the conformance suite (A.7) verifies it. Treat the models
> here as the reference shape, not a second source of truth.

```python
class ProjectRef(BaseModel):   # scope a run / work item belongs to (SDLC: a project)
    id: str
    name: str

# Shared, agent-agnostic lifecycle every work item/artifact moves through.
# Happy path backlog→…→delivered; `reset` is the loop-back (artifact discarded,
# a fresh run is needed — can happen from any stage). Map your native status onto
# these (BA: active→in_progress, waiting_for_input→waiting, spec_ready→ready,
# approved→approved, reset→reset). Only the *artifact* differs per agent (BA spec,
# SA design, QA tests) — this lifecycle is the same for all.
LifecycleStage = Literal[
    "backlog", "in_progress", "waiting", "ready", "approved", "delivered", "reset"
]

class ArtifactRef(BaseModel):  # the thing the agent produces & advances (BA: SPEC.md)
    id: str
    type: str                  # "spec" | "design" | "tests" | ... (matches `produces`)
    title: str | None = None
    work_item_id: str | None = None
    producer_agent_id: str | None = None
    stage: LifecycleStage
    version: int | None = None
    completeness: float | None = None   # overall 0–100, if scored
    url: str | None = None              # deep-link into the agent's own tool
    updated_at: datetime | None = None

class WorkItem(BaseModel):     # the unit of work flowing through the pipeline
    id: str                    # e.g. the Teamwork task id / BA session id
    type: str                  # "ticket" | "session" | "incident" | ...
    title: str | None = None
    stage: LifecycleStage | None = None  # where it is in the shared lifecycle
    status: str | None = None            # your native status, kept for reference
    artifact_type: str | None = None     # the artifact it produces, e.g. "spec"
    project: ProjectRef | None = None   # one shared agent serves many projects
    metadata: dict = {}

class Run(BaseModel):          # one execution of the agent against a work item
    id: str
    agent_id: str
    work_item_id: str | None = None
    work_item_title: str | None = None  # denormalized for display (else the id shows)
    type: str                  # agent-defined run type, e.g. "autospec"
    artifact_type: str | None = None    # what this run produces/advances, e.g. "spec"
    status: str                # "running" | "succeeded" | "failed" | "cancelled"
    started_at: datetime
    ended_at: datetime | None = None
    duration_ms: int | None = None
    model: str | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None
    cost_usd: float | None = None
    outcome: str | None = None # "success" | "error" | "cancelled"
    error: str | None = None
    parent_run_id: str | None = None
    project: ProjectRef | None = None   # project this run belongs to
    schema_version: str = SCHEMA_VERSION
    metadata: dict = {}        # ← domain payload (e.g. {"completeness": 92})

class Step(BaseModel):         # nested trace node (tool call / llm call / stage)
    id: str
    run_id: str
    name: str
    kind: str                  # "tool" | "llm" | "stage"
    started_at: datetime
    duration_ms: int | None = None
    tokens: int | None = None
    cost_usd: float | None = None
    input: Any | None = None   # redactable
    output: Any | None = None  # redactable
    parent_id: str | None = None
    metadata: dict = {}

class EventType(str, Enum):
    run_started   = "run.started"
    run_completed = "run.completed"
    run_error     = "run.error"
    step_started  = "step.started"
    step_completed= "step.completed"
    tool_called   = "tool.called"
    tool_result   = "tool.result"
    hitl_requested= "hitl.requested"
    hitl_resolved = "hitl.resolved"
    metric_update = "metric.update"
    log           = "log"

class Event(BaseModel):        # the live stream item
    ts: datetime
    agent_id: str
    type: EventType
    run_id: str | None = None
    level: str | None = None   # "info" | "warning" | "error"
    data: dict = {}            # ← domain-specific payload rides here
    schema_version: str = SCHEMA_VERSION

class HITLGate(BaseModel):     # a human approval / clarification request
    id: str
    work_item_id: str | None = None
    work_item_title: str | None = None  # denormalized for display (else the id shows)
    run_id: str | None = None
    kind: str                  # "approval" | "clarification"
    state: str                 # "open" | "resolved" | "expired"
    prompt: str
    channel: str | None = None # "slack" | "dashboard" | ...
    opened_at: datetime
    resolved_at: datetime | None = None
    resolved_by: str | None = None
    decision: str | None = None
    metadata: dict = {}

class AgentHealth(BaseModel):
    agent_id: str
    name: str
    role: str | None = None
    state: str                 # "idle" | "running" | "waiting" | "error"
    healthy: bool
    active_runs: int = 0
    version: str | None = None
    schema_version: str = SCHEMA_VERSION
    last_seen: datetime
```

### A.2 The `Agent` object + app factory

```python
from agency_sdk import Agent

agent = Agent(
    id="ba",
    name="Business Analyst",
    description="Turns a Teamwork task into a governed SPEC.md (EARS).",
    version="1.4.0",
    domain="sdlc",
    produces=["spec"],
    consumes=["task"],
    sources=[("teamwork", "read+write"), ("slack", "write"), ("knowledge-agent", "read")],
    auth_header="X-API-Key",          # how the dashboard authenticates to us
)

app = agent.fastapi_app()             # or agent.router() to mount on an existing app
```

`fastapi_app()` / `router()` wires up **all** the standard endpoints (A.3) and
serves the Agent Card (A.6) from the constructor args.

### A.3 Standard endpoints (served by the factory)

- `GET /.well-known/agent-card.json` — the Agent Card (A.6)
- `GET /runs` — all runs, newest first (paginated); `GET /runs/{id}`; `GET /runs/by-work-item/{id}`
- `GET /agent/watch/{run_id_or_work_item}` — **SSE** stream: replay buffer **+** live tail
- `GET /agent/watchable` — list of streamable run/session ids
- `GET /agent/health` — `AgentHealth` (rich readiness; 503 if unhealthy)
- `GET /agent/active` — runs in progress
- `GET /agent/gates` — **all open HITL gates** (`HITLGate[]`), regardless of kind.
  Two kinds, one per HITL _moment_ (see A.4): `clarification` (blocked mid-run,
  needs an answer) and `approval` (an artifact it produced is ready for review).
  _BA predates the SDK and splits these across `GET /agent/interrupted`
  (`waiting_for_input` → clarification) and `GET /session/pending-approval`
  (`spec_ready` → approval); the BA adapter merges them. New SDK agents serve the
  single unified endpoint._

### A.4 Run / event / HITL API (what agent code calls)

```python
async def handle_task(task):
    async with agent.run(work_item=task.id, type="spec",
                         metadata={"teamwork_task": task.id}) as run:   # emits run.started, records a Run
        run.emit("tool.called", {"tool": "search_teamwork"})           # canonical event → SSE + history
        # ... do work ...
        decision = await run.request_approval(                          # opens a HITLGate{kind}, emits hitl.requested,
            kind="approval",                                           # "approval" (artifact ready) | "clarification" (blocked, need an answer)
            prompt="Spec ready for review", work_item_title=task.title, # title = human label (else the id shows)
            channel="slack", metadata={"completeness": 86, "artifact": "spec"},
        )
        run.finish(outcome="success", tokens_in=…, tokens_out=…,        # emits run.completed, closes the Run
                   cost_usd=…, metadata={"completeness": 92, "spec_version": 4})
```

- **Two HITL moments, one type.** Every gate is a `HITLGate`, distinguished by `kind`:
  - `clarification` — the agent is **blocked mid-run** and needs a human answer to
    continue (BA: LangGraph `__interrupt__` → `waiting_for_input` → Slack reply).
  - `approval` — an **artifact the agent produced is ready for human review/sign-off**
    (BA: `spec_ready`). Generalizes across the fleet: SA → "design ready", QA →
    "tests ready", a Knowledge agent → "doc ready", etc.
    The dashboard renders both in one Human-gates queue (distinct chips) and
    **deep-links** to the agent's own tool for the artifact-heavy review — the SDK
    standardizes the _gate_, not the artifact's content (see architecture §5).
- `run.request_approval(...)` should integrate with the agent's **existing**
  interrupt/resume mechanism (for BA: the LangGraph `__interrupt__` →
  `waiting_for_input` → Slack reply resume). The SDK just standardizes how that
  gate is _represented and emitted_; it does not replace the agent's HITL logic.

### A.5 Event bus + SSE

- Per-run channel with a **replay buffer + live fan-out** to multiple
  subscribers, kept briefly alive after a run ends. (Generalize BA's existing
  in-memory bus.)
- Leave a **pluggable store seam** (in-memory now; a durable backend later) but
  don't build durability now.

### A.6 The Agent Card (A2A-aligned + our extension)

Served at `/.well-known/agent-card.json`, built from the `Agent(...)` args:

```jsonc
{
  "name": "Business Analyst",
  "description": "Turns a Teamwork task into a governed SPEC.md (EARS).",
  "version": "1.4.0",
  "url": "https://ba.internal",
  "capabilities": { "streaming": true, "pushNotifications": false, "stateTransitionHistory": true },
  "authentication": { "schemes": ["apiKey"] },
  "skills": [
    {
      "id": "generate_spec",
      "name": "Generate specification",
      "description": "Produce an EARS spec from a task",
    },
  ],
  "x-agency": {
    // our extension (A2A doesn't model pipeline topology)
    "id": "ba",
    "domain": "sdlc",
    "contractVersion": "0.1",
    "produces": ["spec"],
    "consumes": ["task"],
    "sources": [
      { "system": "teamwork", "mode": "read+write" },
      { "system": "slack", "mode": "write" },
      { "system": "knowledge-agent", "mode": "read" },
    ],
    "endpoints": { "runs": "/runs", "events": "/agent/watch/{id}", "health": "/agent/health" },
  },
}
```

Adopt the **Card only** — do **not** implement the rest of the A2A protocol
(no JSON-RPC tasks/messages). The dashboard reads our REST + SSE directly.

### A.7 Versioning & conformance

- Stamp `schema_version` on every payload and `x-agency.contractVersion` on the
  card. Evolve **additively** within a major version.
- Ship a small **conformance check** (a pytest module + a CLI like
  `python -m agency_sdk.conformance <base_url>`) that hits the endpoints and
  validates payloads against the schemas. Any agent runs it in CI to prove it's
  pluggable.

---

## Part B — First implementation: BA (extract, don't rewrite)

BA already has all the mechanics. **Lift them into the SDK, generalize, and have
BA consume the SDK.** Approximate current locations (verify against the live
codebase — these are from an earlier read and may have moved):

| Mechanic                                       | Likely BA location to harvest                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| In-memory event bus                            | `agents/ba/services/event_bus.py`                                           |
| `watch` / `watchable` / SSE stream             | `agents/ba/routers/agent_run.py`                                            |
| Runs REST + persistence                        | `agents/ba/routers/runs.py`, `agents/ba/database/runs.py`                   |
| Health / active / interrupted                  | `agents/ba/routers/agent_health.py`                                         |
| Event taxonomy                                 | `agents/ba/services/supervisor_events.py`                                   |
| Pydantic shapes (seed the contract from these) | `agents/ba/schemas/api.py`, `schemas/agent_api.py`, `shared/state.py`       |
| HITL (interrupt → resume)                      | LangGraph `__interrupt__` → `waiting_for_input` → `routers/slack_resume.py` |

**Map BA's event types → the canonical `EventType`:**

| BA event                                             | Canonical                                                               |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `supervisor_start`                                   | `run.started`                                                           |
| `supervisor_tool_start`                              | `tool.called`                                                           |
| `supervisor_tool_result`                             | `tool.result`                                                           |
| `interrupted`                                        | `hitl.requested`                                                        |
| Slack reply resume                                   | `hitl.resolved`                                                         |
| `complete`                                           | `run.completed`                                                         |
| `error`                                              | `run.error`                                                             |
| pipeline `turn_start` / `turn_done` / `score_update` | `step.started` / `step.completed` / `metric.update` (payload in `data`) |

**Move BA-domain fields into `metadata`:** `completeness` (6-dim), EARS criteria,
`spec_version`, validation errors → `Run.metadata` / event `data`. They must
**not** become core SDK fields.

**Project is a first-class field, not metadata:** map BA's `project_id` /
`project_name` (it enriches `/runs/all`) → `Run.project` (`ProjectRef`). It's the
SDLC scope dimension the dashboard filters by.

**Refactor BA to:** instantiate `Agent(id="ba", produces=["spec"], consumes=["task"], sources=[…])`,
mount `agent.router()` (or replace its routers with the SDK's), and replace inline
event/run/HITL emission with the SDK API. Serve the card with BA's real values.

**Don't break flow-observer.** BA's own dashboard must keep working — the SDK
endpoints should serve the same shapes flow-observer already consumes (or update
flow-observer to the contract shapes in the same change).

---

## Part C — Adopting it in KA / SA (the payoff)

For the next agent, there's no plumbing to write:

```python
agent = Agent(
    id="sa", name="Software Architect",
    description="Turns an approved spec into a technical design.",
    version="0.1.0", domain="sdlc",
    produces=["design"], consumes=["spec"],
    sources=[("github", "read")],
)
app = agent.fastapi_app()
# ... then call agent.run(...) / run.emit(...) / run.request_approval(...) in the agent's logic.
```

`consumes:["spec"]` auto-wires SA downstream of BA in the dashboard's topology.

---

## Acceptance criteria

- [ ] `agency-agent-sdk` is a standalone, installable package with **zero
      agent-specific imports**.
- [ ] `GET /.well-known/agent-card.json` returns a valid A2A card + `x-agency`.
- [ ] `GET /runs`, `/runs/{id}`, SSE `/agent/watch/{id}`, `/agent/health`,
      `/agent/active`, `/agent/interrupted` all work and return contract-shaped
      payloads carrying `schema_version`.
- [ ] Canonical events are emitted (`run.started` … `run.completed`,
      `tool.called`, `hitl.requested`/`hitl.resolved`).
- [ ] No core contract type contains BA-specific fields; domain data is in
      `metadata` / event `data`.
- [ ] BA's flow-observer still works.
- [ ] `python -m agency_sdk.conformance <ba_url>` passes.

## Constraints / don'ts

- **Card only**, not the full A2A protocol.
- **No domain logic in the SDK** (no Teamwork/Slack/spec specifics).
- API key / auth header name is **configurable**; secret values come from **env**,
  never hard-coded.
- Backward-compatible, additive evolution; bump `SCHEMA_VERSION` only for breaks.
- Keep the agent's existing HITL/runtime logic — the SDK standardizes
  _representation + emission_, not the agent's brain.
