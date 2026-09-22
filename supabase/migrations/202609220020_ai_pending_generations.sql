begin;
create table if not exists public.ai_pending_generations (
  id uuid primary key,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  workflow text not null,
  payload jsonb not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  check (expires_at > created_at)
);
create index if not exists ai_pending_generations_expiry on public.ai_pending_generations(expires_at);
create index if not exists ai_pending_generations_classroom on public.ai_pending_generations(classroom_id,workflow);
alter table public.ai_pending_generations enable row level security;
-- No client policy: only the trusted server role may read generation metadata.
commit;
