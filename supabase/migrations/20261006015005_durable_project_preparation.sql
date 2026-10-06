begin;
create table public.preparation_jobs (
  id uuid primary key,
  teacher_id uuid not null references auth.users(id),
  classroom_id uuid not null references public.classrooms(id),
  kind text not null check(kind in ('project','activity_block')),
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
create index preparation_jobs_queue_idx on public.preparation_jobs(status,created_at);
create table public.preparation_dispatch_receipts(nonce uuid primary key,expires_at timestamptz not null);
alter table public.activities add column preparation_item_id uuid unique;
alter table public.preparation_jobs enable row level security;
alter table public.preparation_dispatch_receipts enable row level security;
create policy preparation_jobs_read_own on public.preparation_jobs for select to authenticated using
(teacher_id=(select auth.uid()) and private.owns_classroom(classroom_id));
revoke all on public.preparation_jobs,public.preparation_dispatch_receipts from public,anon,authenticated;
grant select on public.preparation_jobs to authenticated;
commit;
