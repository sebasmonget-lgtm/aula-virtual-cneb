begin;
create table public.class_schedule_entries (
  id uuid primary key default gen_random_uuid(), classroom_id uuid not null references public.classrooms(id) on delete cascade,
  weekday smallint check (weekday between 0 and 6), scheduled_on date, start_time time not null, end_time time not null check (end_time > start_time),
  block_type text not null check (block_type in ('activity','workshop','routine','free_play','break','other')), activity_id uuid references public.activities(id) on delete set null,
  title text, is_instructional boolean not null default false, sort_order smallint not null default 0, check (weekday is not null or scheduled_on is not null)
);
create table public.daily_execution_logs (
  id uuid primary key default gen_random_uuid(), schedule_entry_id uuid not null references public.class_schedule_entries(id) on delete cascade,
  execution_date date not null, status text not null default 'planned' check (status in ('planned','active','completed','skipped','rescheduled')),
  actual_started_at timestamptz, actual_ended_at timestamptz, teacher_closure_note text, unique(schedule_entry_id, execution_date)
);
alter table public.class_schedule_entries enable row level security;
alter table public.daily_execution_logs enable row level security;
create policy schedule_entries_own_classroom on public.class_schedule_entries for all to authenticated using (exists (select 1 from public.classrooms c where c.id=classroom_id and c.teacher_id=(select auth.uid()))) with check (exists (select 1 from public.classrooms c where c.id=classroom_id and c.teacher_id=(select auth.uid())));
create policy daily_execution_own_classroom on public.daily_execution_logs for all to authenticated using (exists (select 1 from public.class_schedule_entries se join public.classrooms c on c.id=se.classroom_id where se.id=schedule_entry_id and c.teacher_id=(select auth.uid()))) with check (exists (select 1 from public.class_schedule_entries se join public.classrooms c on c.id=se.classroom_id where se.id=schedule_entry_id and c.teacher_id=(select auth.uid())));
commit;
