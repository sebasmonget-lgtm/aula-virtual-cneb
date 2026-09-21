begin;

create extension if not exists pgcrypto;

create type public.classroom_status as enum ('draft', 'active', 'archived');
create type public.experience_type as enum ('unit', 'project', 'workshop');
create type public.evidence_type as enum ('observation', 'oral', 'drawing', 'production', 'photo', 'other');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 100),
  locale text not null default 'es-PE',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.curriculum_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_url text not null,
  published_at date,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index curriculum_versions_one_active on public.curriculum_versions(active) where active;

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.age_grades (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels(id) on delete restrict,
  label text not null,
  age_years smallint not null check (age_years between 0 and 18),
  unique(level_id, age_years)
);

create table public.curriculum_areas (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.curriculum_versions(id) on delete restrict,
  level_id uuid not null references public.levels(id) on delete restrict,
  name text not null,
  unique(version_id, level_id, name)
);

create table public.competencies (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.curriculum_areas(id) on delete restrict,
  code text not null,
  official_text text not null,
  unique(area_id, code)
);

create table public.capacities (
  id uuid primary key default gen_random_uuid(),
  competency_id uuid not null references public.competencies(id) on delete restrict,
  code text not null,
  official_text text not null,
  unique(competency_id, code)
);

create table public.standards (
  id uuid primary key default gen_random_uuid(),
  competency_id uuid not null references public.competencies(id) on delete restrict,
  cycle text not null,
  official_text text not null,
  unique(competency_id, cycle)
);

create table public.performances (
  id uuid primary key default gen_random_uuid(),
  competency_id uuid not null references public.competencies(id) on delete restrict,
  age_grade_id uuid not null references public.age_grades(id) on delete restrict,
  official_text text not null,
  source_ref text not null
);

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  year smallint not null check (year between 2020 and 2100),
  starts_on date not null,
  ends_on date not null,
  status public.classroom_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique(owner_id, year)
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  age_grade_id uuid not null references public.age_grades(id) on delete restrict,
  institution_name text not null,
  section text not null,
  schedule_summary text,
  context text,
  status public.classroom_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(school_year_id, section)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 100),
  preferred_name text,
  status public.classroom_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_classroom_idx on public.students(classroom_id, status);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  event_type text not null check (event_type in ('national', 'local', 'school')),
  title text not null,
  relevance text,
  enabled boolean not null default true,
  check (ends_on >= starts_on)
);

create table public.learning_experiences (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  type public.experience_type not null,
  title text not null,
  purpose text not null,
  starts_on date not null,
  ends_on date not null,
  status public.classroom_status not null default 'draft',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.learning_experiences(id) on delete cascade,
  occurs_on date not null,
  title text not null,
  purpose text not null,
  sequence jsonb not null default '[]'::jsonb,
  preparation jsonb not null default '{}'::jsonb,
  adaptations jsonb not null default '[]'::jsonb,
  status public.classroom_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_experience_date_idx on public.activities(experience_id, occurs_on);

create table public.activity_criteria (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete restrict,
  performance_id uuid references public.performances(id) on delete restrict,
  criterion_text text not null,
  display_order smallint not null default 0,
  unique(activity_id, id)
);

create table public.evidences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  criterion_id uuid references public.activity_criteria(id) on delete set null,
  type public.evidence_type not null default 'observation',
  observation_text text not null check (char_length(observation_text) between 1 and 4000),
  media_path text,
  observed_at timestamptz not null default now(),
  source text not null default 'teacher',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint evidences_activity_required_for_criterion check (criterion_id is null or activity_id is not null)
);

create index evidences_student_date_idx on public.evidences(student_id, observed_at desc);
create index evidences_criterion_date_idx on public.evidences(criterion_id, observed_at desc);

create or replace function public.owns_school_year(target_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.school_years sy where sy.id = target_id and sy.owner_id = auth.uid()) $$;

create or replace function public.owns_classroom(target_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.classrooms c where c.id = target_id and c.teacher_id = auth.uid()) $$;

create or replace function public.owns_student(target_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.students s join public.classrooms c on c.id = s.classroom_id where s.id = target_id and c.teacher_id = auth.uid()) $$;

create or replace function public.owns_experience(target_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.learning_experiences e join public.classrooms c on c.id = e.classroom_id where e.id = target_id and c.teacher_id = auth.uid()) $$;

create or replace function public.owns_activity(target_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.activities a join public.learning_experiences e on e.id = a.experience_id join public.classrooms c on c.id = e.classroom_id where a.id = target_id and c.teacher_id = auth.uid()) $$;

alter table public.profiles enable row level security;
alter table public.curriculum_versions enable row level security;
alter table public.levels enable row level security;
alter table public.age_grades enable row level security;
alter table public.curriculum_areas enable row level security;
alter table public.competencies enable row level security;
alter table public.capacities enable row level security;
alter table public.standards enable row level security;
alter table public.performances enable row level security;
alter table public.school_years enable row level security;
alter table public.classrooms enable row level security;
alter table public.students enable row level security;
alter table public.calendar_events enable row level security;
alter table public.learning_experiences enable row level security;
alter table public.activities enable row level security;
alter table public.activity_criteria enable row level security;
alter table public.evidences enable row level security;

create policy profiles_own_all on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy curriculum_read_authenticated on public.curriculum_versions for select to authenticated using (true);
create policy levels_read_authenticated on public.levels for select to authenticated using (true);
create policy age_grades_read_authenticated on public.age_grades for select to authenticated using (true);
create policy curriculum_areas_read_authenticated on public.curriculum_areas for select to authenticated using (true);
create policy competencies_read_authenticated on public.competencies for select to authenticated using (true);
create policy capacities_read_authenticated on public.capacities for select to authenticated using (true);
create policy standards_read_authenticated on public.standards for select to authenticated using (true);
create policy performances_read_authenticated on public.performances for select to authenticated using (true);

create policy school_years_own_all on public.school_years for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy classrooms_own_all on public.classrooms for all using (teacher_id = auth.uid() and public.owns_school_year(school_year_id)) with check (teacher_id = auth.uid() and public.owns_school_year(school_year_id));
create policy students_own_all on public.students for all using (public.owns_classroom(classroom_id)) with check (public.owns_classroom(classroom_id));
create policy calendar_own_all on public.calendar_events for all using (public.owns_school_year(school_year_id)) with check (public.owns_school_year(school_year_id));
create policy experiences_own_all on public.learning_experiences for all using (public.owns_classroom(classroom_id)) with check (public.owns_classroom(classroom_id));
create policy activities_own_all on public.activities for all using (public.owns_experience(experience_id)) with check (public.owns_experience(experience_id));
create policy criteria_own_all on public.activity_criteria for all using (public.owns_activity(activity_id)) with check (public.owns_activity(activity_id));
create policy evidences_own_all on public.evidences for all using (public.owns_student(student_id)) with check (created_by = auth.uid() and public.owns_student(student_id) and (activity_id is null or public.owns_activity(activity_id)));

grant execute on function public.owns_school_year(uuid) to authenticated;
grant execute on function public.owns_classroom(uuid) to authenticated;
grant execute on function public.owns_student(uuid) to authenticated;
grant execute on function public.owns_experience(uuid) to authenticated;
grant execute on function public.owns_activity(uuid) to authenticated;

commit;
