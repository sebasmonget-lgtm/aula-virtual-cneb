create table if not exists ai_usage_events (
  id uuid primary key,
  teacher_id uuid not null references profiles(user_id) on delete cascade,
  provider text not null check (provider in ('openai','openrouter')),
  workflow text not null,
  model text not null,
  input_tokens bigint,
  cached_input_tokens bigint,
  output_tokens bigint,
  duration_seconds numeric(9,3),
  cost_usd numeric(18,10),
  cost_source text not null check (cost_source in ('provider','estimate','unpriced')),
  pricing_version text not null,
  occurred_at timestamptz not null default now()
);
create index if not exists ai_usage_events_teacher_time on ai_usage_events(teacher_id,occurred_at desc);
