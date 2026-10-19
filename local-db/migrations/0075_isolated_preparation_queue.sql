-- New queue is invisible to legacy executors. Existing jobs are never moved or rewritten.
create table preparation_jobs_v2 (
  id uuid primary key,
  teacher_id uuid not null references profiles(user_id),
  classroom_id uuid not null references classrooms(id),
  kind text not null check(kind in ('project','activity_block','document_export')),
  source_id uuid not null,
  source_revision bigint not null check(source_revision>0),
  input_fingerprint text not null,
  status text not null check(status in ('queued','running','failed','uncertain','succeeded','cancelled')),
  payload jsonb not null,
  lease_token uuid,
  lease_until timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(kind,source_id,source_revision,input_fingerprint)
);
create index preparation_jobs_v2_queue_idx on preparation_jobs_v2(status,created_at);
