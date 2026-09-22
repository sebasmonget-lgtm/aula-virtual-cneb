create table if not exists student_context_snapshots (
  id uuid primary key,
  student_id uuid not null references students(id) on delete cascade,
  version integer not null default 1,
  structured_payload jsonb not null,
  summary_text text,
  generated_at timestamptz not null default now(),
  source_updated_at timestamptz not null default now(),
  unique(student_id, version)
);
create index if not exists student_context_snapshots_student_generated_idx on student_context_snapshots(student_id, generated_at desc);
