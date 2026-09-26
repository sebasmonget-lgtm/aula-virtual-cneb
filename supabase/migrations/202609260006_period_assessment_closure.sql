begin;

create table public.competency_display_labels (
  competency_v4_id text primary key,
  short_label text not null,
  area text not null,
  updated_at timestamptz not null default now()
);

create table public.period_evaluation_map_versions (
  id uuid primary key,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  evaluation_period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  version integer not null check(version > 0),
  source_fingerprint text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(classroom_id,evaluation_period_id,version)
);

create table public.period_evaluation_map_entries (
  id uuid primary key,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  evaluation_period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  map_version integer not null check(map_version > 0),
  learning_experience_id uuid not null references public.learning_experiences(id),
  learning_experience_type text not null,
  experience_revision bigint not null,
  formal_content_id uuid references public.experience_formal_contents(id),
  activity_blueprint_ref text,
  activity_id uuid not null references public.activities(id),
  activity_revision bigint not null,
  criterion_id uuid not null references public.activity_criteria(id),
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
create index period_evaluation_map_lookup on public.period_evaluation_map_entries(classroom_id,evaluation_period_id,competency_v4_id);

create table public.classroom_period_reports (
  id uuid primary key,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  evaluation_period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  version integer not null check(version > 0),
  status text not null default 'draft' check(status in ('draft','active','archived')),
  details jsonb not null,
  statistics_snapshot jsonb not null,
  source_fingerprint text not null,
  generation_metadata jsonb not null default '{}'::jsonb,
  teacher_confirmed_at timestamptz,
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(classroom_id,evaluation_period_id,version)
);
create unique index classroom_period_reports_active_unique on public.classroom_period_reports(classroom_id,evaluation_period_id) where status='active';
create unique index classroom_period_reports_draft_unique on public.classroom_period_reports(classroom_id,evaluation_period_id) where status='draft';

create table public.period_closure_workflows (
  id uuid primary key,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  evaluation_period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  current_step integer not null default 1 check(current_step between 1 and 8),
  step_state jsonb not null default '{}'::jsonb,
  source_fingerprint text,
  updated_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(classroom_id,evaluation_period_id)
);

do $$ declare table_name text; begin
  foreach table_name in array array['period_evaluation_map_versions','period_evaluation_map_entries','classroom_period_reports','period_closure_workflows'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy teacher_read_own on public.%I for select to authenticated using (private.owns_classroom(classroom_id))',table_name);
    execute format('grant select on public.%I to authenticated',table_name);
    execute format('revoke insert,update,delete,truncate,references,trigger on public.%I from authenticated',table_name);
    execute format('revoke all on public.%I from anon',table_name);
  end loop;
end $$;

alter table public.competency_display_labels enable row level security;
create policy authenticated_read_labels on public.competency_display_labels for select to authenticated using (true);
grant select on public.competency_display_labels to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.competency_display_labels from authenticated;
revoke all on public.competency_display_labels from anon;

commit;
