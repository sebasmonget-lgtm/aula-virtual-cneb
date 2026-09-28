create table if not exists public.ai_usage_events (
  id uuid primary key,
  teacher_id uuid not null references public.profiles(user_id) on delete cascade,
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
create index if not exists ai_usage_events_teacher_time on public.ai_usage_events(teacher_id,occurred_at desc);
alter table public.ai_usage_events enable row level security;
create policy teacher_read_own_ai_usage on public.ai_usage_events for select to authenticated
  using (teacher_id = (select auth.uid()));
grant select on public.ai_usage_events to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.ai_usage_events from authenticated;
revoke all on public.ai_usage_events from anon;
