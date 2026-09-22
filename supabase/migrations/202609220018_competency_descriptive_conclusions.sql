begin;
create table if not exists public.competency_descriptive_conclusions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  competency_v4_id text not null,
  assessment_id uuid not null references public.competency_assessments(id),
  period_start date not null,
  period_end date not null,
  version integer not null check (version > 0),
  details jsonb not null default '{}'::jsonb,
  generation_metadata jsonb not null default '{}'::jsonb,
  source_assessment_snapshot jsonb not null default '{}'::jsonb,
  status text not null check (status in ('draft','active','archived')),
  teacher_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_start <= period_end)
);
create index if not exists descriptive_conclusions_lookup on public.competency_descriptive_conclusions(student_id, competency_v4_id, period_start, period_end, created_at);
create unique index if not exists descriptive_conclusions_one_draft on public.competency_descriptive_conclusions(student_id, competency_v4_id, period_start, period_end) where status = 'draft';
create unique index if not exists descriptive_conclusions_one_active on public.competency_descriptive_conclusions(student_id, competency_v4_id, period_start, period_end) where status = 'active';
alter table public.competency_descriptive_conclusions enable row level security;
create policy descriptive_conclusions_own_all on public.competency_descriptive_conclusions for all to authenticated using (public.owns_student(student_id)) with check (public.owns_student(student_id));
commit;
