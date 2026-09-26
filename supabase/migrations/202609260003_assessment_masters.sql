begin;

create table public.assessment_masters (
  id uuid primary key,
  classroom_id uuid not null references public.classrooms(id),
  evaluation_period_id uuid not null references public.evaluation_periods(id),
  version integer not null check (version > 0),
  status text not null check (status in ('draft','active','archived')) default 'draft',
  details jsonb not null,
  source_snapshot jsonb not null,
  generation_metadata jsonb not null default '{}'::jsonb,
  teacher_confirmed_at timestamptz,
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(classroom_id,evaluation_period_id,version)
);

create unique index assessment_masters_active_unique
  on public.assessment_masters(classroom_id,evaluation_period_id) where status='active';
create unique index assessment_masters_draft_unique
  on public.assessment_masters(classroom_id,evaluation_period_id) where status='draft';

alter table public.competency_assessments
  add column if not exists assessment_master_id uuid references public.assessment_masters(id),
  add column if not exists assessment_master_snapshot jsonb;

alter table public.assessment_masters enable row level security;
create policy teacher_read_own on public.assessment_masters for select to authenticated
  using (private.owns_classroom(classroom_id) and exists (
    select 1 from public.evaluation_periods p join public.classrooms c on c.school_year_id=p.school_year_id
    where p.id=evaluation_period_id and c.id=classroom_id));
grant select on public.assessment_masters to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.assessment_masters from authenticated;
revoke all on public.assessment_masters from anon;

commit;
