create table if not exists class_schedule_entries (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  weekday smallint check (weekday between 0 and 6),
  scheduled_on date,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  block_type text not null check (block_type in ('activity','workshop','routine','free_play','break','other')),
  activity_id uuid references activities(id),
  title text,
  is_instructional boolean not null default false,
  sort_order smallint not null default 0,
  check (weekday is not null or scheduled_on is not null)
);
create index if not exists class_schedule_entries_lookup_idx on class_schedule_entries(classroom_id, weekday, scheduled_on, start_time);

create table if not exists daily_execution_logs (
  id uuid primary key,
  schedule_entry_id uuid not null references class_schedule_entries(id),
  execution_date date not null,
  status text not null default 'planned' check (status in ('planned','active','completed','skipped','rescheduled')),
  actual_started_at timestamptz,
  actual_ended_at timestamptz,
  teacher_closure_note text,
  unique(schedule_entry_id, execution_date)
);

insert into learning_experiences (id, classroom_id, type, title, purpose, starts_on, ends_on)
values ('a0000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', 'workshop', 'Taller gráfico plástico', 'Explorar materiales y representar lo observado.', '2026-09-01', '2026-12-31')
on conflict do nothing;
insert into activities (id, experience_id, occurs_on, title, purpose, preparation)
values ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', '2026-09-21', 'Representamos lo observado', 'Representar hallazgos con materiales gráficos.', '{"materials":["Hojas","Crayones","Imágenes"]}'::jsonb)
on conflict do nothing;
insert into activity_criteria (id, activity_id, competency_id, performance_id, criterion_text)
values ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'Representa con trazos o palabras lo que observó.')
on conflict do nothing;
insert into class_schedule_entries (id, classroom_id, weekday, start_time, end_time, block_type, activity_id, title, is_instructional, sort_order) values
('e0000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001',1,'08:00','08:30','routine',null,'Acogida',false,1),
('e0000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000001',1,'09:00','09:45','activity','b0000000-0000-4000-8000-000000000001','¿Qué necesitan las plantas para crecer?',true,2),
('e0000000-0000-4000-8000-000000000003','80000000-0000-4000-8000-000000000001',1,'11:20','12:00','workshop','b0000000-0000-4000-8000-000000000002','Taller gráfico plástico',true,3)
on conflict do nothing;
