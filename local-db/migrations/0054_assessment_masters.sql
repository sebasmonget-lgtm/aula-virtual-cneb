create table assessment_masters (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  evaluation_period_id uuid not null references evaluation_periods(id),
  version integer not null check (version > 0),
  status text not null check (status in ('draft','active','archived')) default 'draft',
  details jsonb not null,
  source_snapshot jsonb not null,
  generation_metadata jsonb not null default '{}'::jsonb,
  teacher_confirmed_at timestamptz,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(classroom_id,evaluation_period_id,version)
);

create unique index assessment_masters_active_unique
  on assessment_masters(classroom_id,evaluation_period_id) where status='active';
create unique index assessment_masters_draft_unique
  on assessment_masters(classroom_id,evaluation_period_id) where status='draft';

alter table competency_assessments
  add column if not exists assessment_master_id uuid references assessment_masters(id),
  add column if not exists assessment_master_snapshot jsonb;
