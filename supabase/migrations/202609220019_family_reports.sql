begin;
create table if not exists public.family_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  period_start date not null,
  period_end date not null,
  version integer not null check (version > 0),
  selected_competency_ids jsonb not null default '[]'::jsonb,
  source_conclusion_ids jsonb not null default '[]'::jsonb,
  source_conclusion_snapshot jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  generation_metadata jsonb not null default '{}'::jsonb,
  status text not null check (status in ('draft','active','archived')),
  teacher_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_start <= period_end)
);
create index if not exists family_reports_lookup on public.family_reports(student_id, period_start, period_end, created_at);
create unique index if not exists family_reports_version on public.family_reports(student_id, period_start, period_end, version);
create unique index if not exists family_reports_one_draft on public.family_reports(student_id, period_start, period_end) where status = 'draft';
create unique index if not exists family_reports_one_active on public.family_reports(student_id, period_start, period_end) where status = 'active';
alter table public.family_reports enable row level security;
create policy family_reports_own_all on public.family_reports for all to authenticated using (public.owns_student(student_id)) with check (public.owns_student(student_id));
commit;
