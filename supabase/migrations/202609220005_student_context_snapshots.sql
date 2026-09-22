create table public.student_context_snapshots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  version integer not null default 1,
  structured_payload jsonb not null,
  summary_text text,
  generated_at timestamptz not null default now(),
  source_updated_at timestamptz not null default now(),
  unique(student_id, version)
);
create index student_context_snapshots_student_generated_idx on public.student_context_snapshots(student_id, generated_at desc);
alter table public.student_context_snapshots enable row level security;
create policy student_context_snapshots_own_student on public.student_context_snapshots for all to authenticated
  using (public.owns_student(student_id)) with check (public.owns_student(student_id));
