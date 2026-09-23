begin;

create table public.diagnostic_experience_observations (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  experience_id text not null,
  aspect_id text not null,
  competency_v4_id text not null,
  observation_status text not null check (observation_status in (
    'demonstrated', 'with_support', 'not_yet_demonstrated', 'insufficient_information'
  )),
  observation_text text check (observation_text is null or char_length(observation_text) between 1 and 4000),
  observed_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict
);

create index diagnostic_experience_classroom_idx
  on public.diagnostic_experience_observations(classroom_id, experience_id, observed_at desc);
create index diagnostic_experience_student_idx
  on public.diagnostic_experience_observations(student_id, observed_at desc);

alter table public.diagnostic_experience_observations enable row level security;

create policy diagnostic_experience_read_own on public.diagnostic_experience_observations
  for select to authenticated using (
    created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
    and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id)
  );

create policy diagnostic_experience_insert_own on public.diagnostic_experience_observations
  for insert to authenticated with check (
    created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
    and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id and s.status = 'active')
  );

commit;
