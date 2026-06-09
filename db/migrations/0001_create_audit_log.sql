-- 0001_create_audit_log
-- Applied to the dashboard-owned Supabase project "Q AI Ops Plane" (fwaogfwwusuiqislkbpb).
-- Kept here for reproducibility/version control; the live apply was done via the Supabase MCP.
--
-- The control plane's append-only audit ledger. Records state-changing actions across the
-- agent fleet (reset, approve, …) so they survive even when an agent deletes its own data
-- (e.g. BA's reset wipes the spec). Written/read only by the dashboard's trusted server
-- (service-role, which bypasses RLS); never exposed to the browser.

create table if not exists public.audit_log (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null,                       -- when it happened (from the agent)
  recorded_at  timestamptz not null default now(),         -- when we ingested it
  agent_id     text        not null,                       -- 'ba', later 'sa'/'dev'/'qa'
  action       text        not null,                       -- 'reset' | 'approved' | …
  target_type  text,                                       -- 'spec'
  target_id    text,                                       -- teamwork task / session id
  target_title text,
  project      text,
  actor        text,                                       -- WHO — null for now ("when-only")
  source       text        not null default 'agent-event', -- provenance
  detail       jsonb       not null default '{}'::jsonb,
  -- idempotent ingest key (NULLS NOT DISTINCT so a null target can't create dupes)
  constraint audit_log_natural_key
    unique nulls not distinct (agent_id, action, target_id, occurred_at)
);

create index if not exists idx_audit_log_occurred_at on public.audit_log (occurred_at desc);

-- RLS on + no policies → anon/authenticated roles get nothing; the service-role key the
-- dashboard server uses bypasses RLS. So the ledger is server-only by construction.
alter table public.audit_log enable row level security;
