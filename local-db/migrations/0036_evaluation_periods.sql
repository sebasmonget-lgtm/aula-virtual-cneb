create table if not exists evaluation_periods (
  id uuid primary key,
  school_year_id uuid not null references school_years(id) on delete cascade,
  kind text not null check (kind in ('bimester','trimester')),
  ordinal integer not null check (ordinal between 1 and 4),
  label text not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (starts_on <= ends_on),
  unique (school_year_id, kind, ordinal)
);
create index if not exists evaluation_periods_year_dates on evaluation_periods(school_year_id, starts_on, ends_on);

create table if not exists period_competency_scope (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  evaluation_period_id uuid not null references evaluation_periods(id) on delete cascade,
  competency_v4_id text not null,
  included boolean not null,
  reason text not null default '',
  teacher_override boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (classroom_id, evaluation_period_id, competency_v4_id)
);

create table if not exists period_closures (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  evaluation_period_id uuid not null references evaluation_periods(id) on delete cascade,
  source_fingerprint text not null,
  confirmed_by uuid not null,
  confirmed_at timestamptz not null default now(),
  unique (classroom_id, evaluation_period_id)
);

alter table evidences add column if not exists observed_on date;
update evidences e set observed_on = coalesce(a.occurs_on, e.observed_at::date)
from activities a where a.id = e.activity_id and e.observed_on is null;
update evidences set observed_on = observed_at::date where observed_on is null;

alter table competency_assessments add column if not exists evaluation_period_id uuid references evaluation_periods(id);
alter table competency_assessments add column if not exists achievement_level text check (achievement_level in ('AD','A','B','C'));
alter table competency_assessments add column if not exists suggested_level text check (suggested_level in ('AD','A','B','C'));
alter table competency_assessments add column if not exists suggestion_reason text;
alter table competency_assessments add column if not exists teacher_justification text;
alter table competency_assessments add column if not exists level_confirmed_by uuid;
create unique index if not exists competency_assessments_period_active on competency_assessments(student_id, competency_v4_id, evaluation_period_id) where status='active' and evaluation_period_id is not null;
create unique index if not exists competency_assessments_period_draft on competency_assessments(student_id, competency_v4_id, evaluation_period_id) where status='draft' and evaluation_period_id is not null;

alter table competency_descriptive_conclusions add column if not exists evaluation_period_id uuid references evaluation_periods(id);
create index if not exists descriptive_conclusions_period on competency_descriptive_conclusions(evaluation_period_id, student_id, competency_v4_id, status);
