create table if not exists competency_display_labels (
  competency_v4_id text primary key,
  short_label text not null,
  area text not null,
  updated_at timestamptz not null default now()
);

create table if not exists period_evaluation_map_versions (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  evaluation_period_id uuid not null references evaluation_periods(id) on delete cascade,
  version integer not null check(version > 0),
  source_fingerprint text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(classroom_id,evaluation_period_id,version)
);

create table if not exists period_evaluation_map_entries (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  school_year_id uuid not null references school_years(id) on delete cascade,
  evaluation_period_id uuid not null references evaluation_periods(id) on delete cascade,
  map_version integer not null check(map_version > 0),
  learning_experience_id uuid not null references learning_experiences(id),
  learning_experience_type text not null,
  experience_revision bigint not null,
  formal_content_id uuid references experience_formal_contents(id),
  activity_blueprint_ref text,
  activity_id uuid not null references activities(id),
  activity_revision bigint not null,
  criterion_id uuid not null references activity_criteria(id),
  criterion_revision integer not null,
  criterion_source text not null check(criterion_source in ('project_master','criterion_realignment')),
  planned_on date not null,
  actual_on date,
  activity_state text not null check(activity_state in ('planned','completed','skipped','rescheduled')),
  competency_v4_id text not null,
  students_with_evidence integer not null default 0 check(students_with_evidence >= 0),
  evidence_count integer not null default 0 check(evidence_count >= 0),
  source_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(classroom_id,evaluation_period_id,criterion_id)
);
create index if not exists period_evaluation_map_lookup on period_evaluation_map_entries(classroom_id,evaluation_period_id,competency_v4_id);

create table if not exists classroom_period_reports (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  evaluation_period_id uuid not null references evaluation_periods(id) on delete cascade,
  version integer not null check(version > 0),
  status text not null default 'draft' check(status in ('draft','active','archived')),
  details jsonb not null,
  statistics_snapshot jsonb not null,
  source_fingerprint text not null,
  generation_metadata jsonb not null default '{}'::jsonb,
  teacher_confirmed_at timestamptz,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(classroom_id,evaluation_period_id,version)
);
create unique index if not exists classroom_period_reports_active_unique on classroom_period_reports(classroom_id,evaluation_period_id) where status='active';
create unique index if not exists classroom_period_reports_draft_unique on classroom_period_reports(classroom_id,evaluation_period_id) where status='draft';

create table if not exists period_closure_workflows (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  evaluation_period_id uuid not null references evaluation_periods(id) on delete cascade,
  current_step integer not null default 1 check(current_step between 1 and 8),
  step_state jsonb not null default '{}'::jsonb,
  source_fingerprint text,
  updated_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(classroom_id,evaluation_period_id)
);
