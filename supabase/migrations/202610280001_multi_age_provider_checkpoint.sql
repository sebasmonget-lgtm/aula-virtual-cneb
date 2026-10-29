begin;
create table public.multi_age_generation_provider_state (
  job_id uuid primary key references public.multi_age_generation_jobs(id) on delete cascade,
  response_id text not null check(response_id ~ '^resp_[a-zA-Z0-9_-]{1,240}$'),
  started_at timestamptz not null default now(),
  next_poll_at timestamptz not null default now(),
  poll_count integer not null default 0 check(poll_count >= 0),
  last_reason text
);
alter table public.multi_age_generation_provider_state enable row level security;
revoke all on public.multi_age_generation_provider_state from public, anon, authenticated;
grant all on public.multi_age_generation_provider_state to service_role;
commit;
