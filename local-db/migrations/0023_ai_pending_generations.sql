create table if not exists ai_pending_generations (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  workflow text not null,
  payload jsonb not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  check (expires_at > created_at)
);
create index if not exists ai_pending_generations_expiry on ai_pending_generations(expires_at);
create index if not exists ai_pending_generations_classroom on ai_pending_generations(classroom_id,workflow);
