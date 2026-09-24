begin;
create table public.evaluation_periods (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  kind text not null check (kind in ('bimester','trimester')),
  ordinal integer not null check (ordinal between 1 and 4),
  label text not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (starts_on <= ends_on),
  unique (school_year_id, kind, ordinal)
);
create index evaluation_periods_year_dates on public.evaluation_periods(school_year_id, starts_on, ends_on);

create table public.period_competency_scope (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  evaluation_period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  competency_v4_id text not null,
  included boolean not null,
  reason text not null default '',
  teacher_override boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (classroom_id, evaluation_period_id, competency_v4_id)
);

create table public.period_closures (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  evaluation_period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  source_fingerprint text not null,
  confirmed_by uuid not null references auth.users(id),
  confirmed_at timestamptz not null default now(),
  unique (classroom_id, evaluation_period_id)
);

alter table public.evidences add column observed_on date;
update public.evidences e set observed_on = coalesce(a.occurs_on, e.observed_at::date)
from public.activities a where a.id = e.activity_id and e.observed_on is null;
update public.evidences set observed_on = observed_at::date where observed_on is null;

alter table public.competency_assessments add column evaluation_period_id uuid references public.evaluation_periods(id);
alter table public.competency_assessments add column achievement_level text check (achievement_level in ('AD','A','B','C'));
alter table public.competency_assessments add column suggested_level text check (suggested_level in ('AD','A','B','C'));
alter table public.competency_assessments add column suggestion_reason text;
alter table public.competency_assessments add column teacher_justification text;
alter table public.competency_assessments add column level_confirmed_by uuid references auth.users(id);
create unique index competency_assessments_period_active on public.competency_assessments(student_id, competency_v4_id, evaluation_period_id) where status='active' and evaluation_period_id is not null;
create unique index competency_assessments_period_draft on public.competency_assessments(student_id, competency_v4_id, evaluation_period_id) where status='draft' and evaluation_period_id is not null;

create function public.check_assessment_period_link() returns trigger language plpgsql as $$
begin
  if new.evaluation_period_id is not null and not exists (
    select 1 from public.students s
    join public.classrooms c on c.id=s.classroom_id
    join public.evaluation_periods p on p.school_year_id=c.school_year_id
    where s.id=new.student_id and p.id=new.evaluation_period_id
      and p.starts_on=new.period_start and p.ends_on=new.period_end
  ) then raise exception 'La evaluación no corresponde al año y período del estudiante.'; end if;
  if new.achievement_level is not null and (new.status <> 'active' or new.teacher_confirmed_at is null or new.level_confirmed_by is null) then
    raise exception 'El nivel definitivo requiere confirmación docente.';
  end if;
  return new;
end; $$;
create trigger competency_assessment_period_integrity before insert or update on public.competency_assessments
  for each row execute function public.check_assessment_period_link();

alter table public.competency_descriptive_conclusions add column evaluation_period_id uuid references public.evaluation_periods(id);
create index descriptive_conclusions_period on public.competency_descriptive_conclusions(evaluation_period_id, student_id, competency_v4_id, status);
create function public.check_conclusion_period_link() returns trigger language plpgsql as $$
begin
  if new.evaluation_period_id is not null and not exists (
    select 1 from public.competency_assessments a
    where a.id=new.assessment_id and a.student_id=new.student_id
      and a.competency_v4_id=new.competency_v4_id and a.evaluation_period_id=new.evaluation_period_id
      and a.period_start=new.period_start and a.period_end=new.period_end
  ) then raise exception 'La conclusión no corresponde a la evaluación del período.'; end if;
  return new;
end; $$;
create trigger descriptive_conclusion_period_integrity before insert or update on public.competency_descriptive_conclusions
  for each row execute function public.check_conclusion_period_link();

alter table public.evaluation_periods enable row level security;
alter table public.period_competency_scope enable row level security;
alter table public.period_closures enable row level security;
create policy evaluation_periods_own on public.evaluation_periods for select to authenticated
  using (public.owns_school_year(school_year_id));
create policy period_competency_scope_own on public.period_competency_scope for select to authenticated
  using (public.owns_classroom(classroom_id) and exists (select 1 from public.evaluation_periods p join public.classrooms c on c.school_year_id=p.school_year_id where p.id=evaluation_period_id and c.id=classroom_id));
create policy period_closures_own on public.period_closures for select to authenticated
  using (public.owns_classroom(classroom_id) and exists (select 1 from public.evaluation_periods p join public.classrooms c on c.school_year_id=p.school_year_id where p.id=evaluation_period_id and c.id=classroom_id));
revoke insert, update, delete on public.evaluation_periods, public.period_competency_scope, public.period_closures from authenticated;
revoke insert, update, delete on public.competency_assessments, public.competency_descriptive_conclusions from authenticated;
commit;
