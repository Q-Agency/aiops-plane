# BA task — add `GET /agent/events/recent` (lifecycle events feed)

> **For the BA agent's programmer.** Self-contained. Agency OS (the dashboard)
> needs a **global, recent feed of lifecycle events** — chiefly **resets** and
> **approvals** — so they show up in the Command Center activity feed. BA already
> _records_ these as `ba_chore_runs` (`event_type` ∈ {`reset`, `approval`}); it
> just doesn't expose them as a global list. Add a small read endpoint.

## Why

A reset **deletes** the task's sessions/runs, so the artifact vanishes from
`/runs/all` with no trace. The only durable record is the `reset` chore_run.
`/agent/chore-runs` is **per `teamwork_task_id`** only — there's no global feed,
so the dashboard can't surface resets. This endpoint fixes that.

## Endpoint

```
GET /agent/events/recent?limit=50   →  { "events": Event[] }   # newest first
```

`Event` (one row per `ba_chore_runs`, enriched with the task title where known):

```jsonc
{
  "id": "chore-run-uuid",
  "event_type": "reset", // "reset" | "approval"
  "teamwork_task_id": "44821",
  "teamwork_task_title": "Checkout: support Apple Pay", // null if not resolvable
  "project_name": "Acme Platform", // null ok
  "session_id": null, // reset events have no session (deleted)
  "status": "done", // chore-run status (optional)
  "created_at": "2026-06-07T14:03:00Z", // ISO-8601 UTC
}
```

## Implementation

1. **DB query** — `get_recent_chore_runs(limit: int) -> list[dict]`:
   ```sql
   SELECT * FROM ba_chore_runs ORDER BY created_at DESC LIMIT %s
   ```
   (Mirror `get_chore_runs_by_teamwork_task`, drop the task filter.) Resolve
   `teamwork_task_title` via a join/lookup if cheap; otherwise leave it null —
   the dashboard falls back to the id.
2. **Router** — in `agent_chores.py` (or `agent_health.py`):
   ```python
   @router.get("/agent/events/recent")
   async def recent_events(limit: int = Query(50, ge=1, le=200)):
       rows = await db.get_recent_chore_runs(limit)
       return {"events": rows}
   ```
3. No auth change — same `X-API-Key` as the other read endpoints.

## How the dashboard uses it

The BA adapter maps each event → the canonical `AgentEvent`:
`event_type "reset" → lifecycle.changed (stage "reset")`,
`"approval" → lifecycle.changed (stage "approved")`, then folds them into the
activity feed ("BA reset the spec · Checkout…"). Missing endpoint ⇒ the dashboard
degrades silently (feed stays runs+gates). See `agent-contract.schema.json`
(`AgentEvent`, `EventType: lifecycle.changed`, `LifecycleStage`).

## Later (SDK)

When BA adopts `agency-agent-sdk`, this becomes part of the standard event stream
(`/agent/watch` SSE emitting `AgentEvent`s, `type: "lifecycle.changed"`). The
polled `/agent/events/recent` is the pre-SDK bridge — keep it; it's also a fine
replay endpoint.
