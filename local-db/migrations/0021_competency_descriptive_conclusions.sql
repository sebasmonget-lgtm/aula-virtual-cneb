create table if not exists competency_descriptive_conclusions (
  id uuid primary key,
  student_id uuid not null references students(id),
  competency_v4_id text not null,
  assessment_id uuid not null references competency_assessments(id),
  period_start date not null,
  period_end date not null,
  version integer not null check (version > 0),
  details jsonb not null default '{}'::jsonb,
  generation_metadata jsonb not null default '{}'::jsonb,
  source_assessment_snapshot jsonb not null default '{}'::jsonb,
  status text not null check (status in ('draft','active','archived')),
  teacher_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_start <= period_end)
);
create index if not exists descriptive_conclusions_lookup on competency_descriptive_conclusions(student_id, competency_v4_id, period_start, period_end, created_at);
create unique index if not exists descriptive_conclusions_one_draft on competency_descriptive_conclusions(student_id, competency_v4_id, period_start, period_end) where status = 'draft';
create unique index if not exists descriptive_conclusions_one_active on competency_descriptive_conclusions(student_id, competency_v4_id, period_start, period_end) where status = 'active';
