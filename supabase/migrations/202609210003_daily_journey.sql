create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present','absent','late','excused')),
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  unique(student_id, attendance_date)
);
create index attendance_records_classroom_date_idx on public.attendance_records(classroom_id, attendance_date);

create table public.calendar_exceptions (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  exception_date date not null,
  type text not null check (type in ('holiday','suspension','event','schedule_change')),
  label text not null,
  is_instructional boolean not null default false,
  unique(classroom_id, exception_date)
);

alter table public.daily_execution_logs add column current_override boolean not null default false;
alter table public.daily_execution_logs add column closure_type text check (closure_type in ('as_planned','note','cancelled'));

alter table public.attendance_records enable row level security;
alter table public.calendar_exceptions enable row level security;
create policy attendance_records_own_classroom on public.attendance_records for all to authenticated using (
  exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = (select auth.uid()))
) with check (recorded_by = auth.uid() and exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = (select auth.uid())));
create policy calendar_exceptions_own_classroom on public.calendar_exceptions for all to authenticated using (
  exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = (select auth.uid()))
) with check (exists (select 1 from public.classrooms c where c.id = classroom_id and c.teacher_id = (select auth.uid())));
