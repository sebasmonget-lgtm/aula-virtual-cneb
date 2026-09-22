create table if not exists attendance_records (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  student_id uuid not null references students(id),
  attendance_date date not null,
  status text not null check (status in ('present','absent','late','excused')),
  recorded_by uuid not null references profiles(user_id),
  recorded_at timestamptz not null default now(),
  unique(student_id, attendance_date)
);
create index if not exists attendance_records_classroom_date_idx on attendance_records(classroom_id, attendance_date);

create table if not exists calendar_exceptions (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  exception_date date not null,
  type text not null check (type in ('holiday','suspension','event','schedule_change')),
  label text not null,
  is_instructional boolean not null default false,
  unique(classroom_id, exception_date)
);

alter table daily_execution_logs add column if not exists current_override boolean not null default false;
alter table daily_execution_logs add column if not exists closure_type text check (closure_type in ('as_planned','note','cancelled'));
