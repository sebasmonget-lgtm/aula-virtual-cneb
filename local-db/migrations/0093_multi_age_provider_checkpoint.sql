-- Private transport checkpoint; never changes the immutable pedagogical sources.
create table multi_age_generation_provider_state (
  job_id uuid primary key references multi_age_generation_jobs(id) on delete cascade,
  response_id text not null check(response_id ~ '^resp_[a-zA-Z0-9_-]{1,240}$'),
  started_at timestamptz not null default now(),
  next_poll_at timestamptz not null default now(),
  poll_count integer not null default 0 check(poll_count >= 0),
  last_reason text
);
