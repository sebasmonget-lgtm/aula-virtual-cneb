begin;
create table public.preparation_jobs_v2 (
  id uuid primary key,
  teacher_id uuid not null references auth.users(id),
  classroom_id uuid not null references public.classrooms(id),
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
create index preparation_jobs_v2_queue_idx on public.preparation_jobs_v2(status,created_at);
alter table public.preparation_jobs_v2 enable row level security;
create policy preparation_jobs_v2_read_own on public.preparation_jobs_v2 for select to authenticated using
(teacher_id=(select auth.uid()) and private.owns_classroom(classroom_id));
revoke all on public.preparation_jobs_v2 from public,anon,authenticated;
grant select on public.preparation_jobs_v2 to authenticated;
commit;
