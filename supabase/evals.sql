-- Eval set: disputes whose right answers we already know, and how the AI did on them.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

-- One row per test dispute. `input` is exactly what the agent receives
-- (PayPal dispute + order evidence + the "as of" time); expected_* are the right answers.
create table if not exists eval_cases (
  id text primary key,                       -- short slug, e.g. 'inr-delivered-signature'
  title text not null,
  input jsonb not null,
  expected_recommendation text not null check (expected_recommendation in ('fight', 'refund', 'settle')),
  -- Other recommendations that also count as correct for borderline cases; empty = only the expected one.
  acceptable_recommendations text[] not null default '{}',
  expected_urgency text not null check (expected_urgency in ('high', 'medium', 'low')),
  expected_risk text not null check (expected_risk in ('high', 'medium', 'low')),
  rationale text,                            -- why these are the right answers
  active boolean not null default true,      -- set false to skip a case without deleting it
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per case per eval run. Rows from the same `npm run eval` share a run_id.
create table if not exists eval_results (
  id bigint generated always as identity primary key,
  run_id uuid not null,
  case_id text not null references eval_cases (id) on delete cascade,
  model text not null,
  prompt_version text not null,
  output jsonb,                              -- the agent's full answer (null if it errored)
  recommendation_ok boolean,
  urgency_ok boolean,
  risk_ok boolean,
  passed boolean not null default false,     -- all three correct
  confidence real,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists eval_results_run_id_idx on eval_results (run_id);

-- Only the server (secret key) touches these; no public access.
alter table eval_cases enable row level security;
alter table eval_results enable row level security;
