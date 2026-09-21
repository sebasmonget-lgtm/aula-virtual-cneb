create table if not exists local_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key,
  display_name text not null,
  locale text not null default 'es-PE',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists curriculum_versions (
  id uuid primary key,
  name text not null,
  source_url text not null,
  published_at date,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists levels (
  id uuid primary key,
  name text not null unique
);

create table if not exists age_grades (
  id uuid primary key,
  level_id uuid not null references levels(id),
  label text not null,
  age_years smallint not null check (age_years between 0 and 18),
  unique(level_id, age_years)
);

create table if not exists curriculum_areas (
  id uuid primary key,
  version_id uuid not null references curriculum_versions(id),
  level_id uuid not null references levels(id),
  name text not null,
  unique(version_id, level_id, name)
);

create table if not exists competencies (
  id uuid primary key,
  area_id uuid not null references curriculum_areas(id),
  code text not null,
  official_text text not null,
  unique(area_id, code)
);

create table if not exists performances (
  id uuid primary key,
  competency_id uuid not null references competencies(id),
  age_grade_id uuid not null references age_grades(id),
  official_text text not null,
  source_ref text not null
);

create table if not exists school_years (
  id uuid primary key,
  owner_id uuid not null references profiles(user_id),
  year smallint not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active',
  unique(owner_id, year)
);

create table if not exists classrooms (
  id uuid primary key,
  school_year_id uuid not null references school_years(id),
  teacher_id uuid not null references profiles(user_id),
  age_grade_id uuid not null references age_grades(id),
  institution_name text not null,
  section text not null,
  schedule_summary text,
  context text,
  status text not null default 'active'
);

create table if not exists institution_assets (
  id uuid primary key,
  owner_user_id uuid not null references profiles(user_id),
  type text not null check (type = 'logo'),
  original_path text not null,
  normalized_path text,
  mime_type text not null,
  width integer,
  height integer,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists institution_profiles (
  id uuid primary key,
  owner_user_id uuid not null unique references profiles(user_id),
  display_name text not null,
  logo_asset_id uuid references institution_assets(id),
  updated_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  first_name text not null,
  last_name text not null,
  preferred_name text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists students_classroom_idx on students(classroom_id, status);

create table if not exists learning_experiences (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  type text not null check (type in ('unit', 'project', 'workshop')),
  title text not null,
  purpose text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active',
  details jsonb not null default '{}'::jsonb
);

create table if not exists activities (
  id uuid primary key,
  experience_id uuid not null references learning_experiences(id),
  occurs_on date not null,
  title text not null,
  purpose text not null,
  sequence jsonb not null default '[]'::jsonb,
  preparation jsonb not null default '{}'::jsonb,
  adaptations jsonb not null default '[]'::jsonb,
  status text not null default 'active'
);

create table if not exists activity_criteria (
  id uuid primary key,
  activity_id uuid not null references activities(id),
  competency_id uuid not null references competencies(id),
  performance_id uuid references performances(id),
  criterion_text text not null,
  display_order smallint not null default 0
);

create table if not exists evidences (
  id uuid primary key,
  student_id uuid not null references students(id),
  activity_id uuid references activities(id),
  criterion_id uuid references activity_criteria(id),
  type text not null default 'observation',
  observation_text text not null check (char_length(observation_text) between 1 and 4000),
  media_path text,
  observed_at timestamptz not null default now(),
  source text not null default 'teacher',
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now()
);

create index if not exists evidences_student_date_idx on evidences(student_id, observed_at desc);

create table if not exists competency_observation_guides (
  id uuid primary key,
  age smallint not null check (age in (3, 4, 5)),
  competency_id uuid not null references competencies(id),
  short_meaning text not null,
  suggested_contexts jsonb not null default '[]'::jsonb,
  observe_for jsonb not null default '[]'::jsonb,
  suggested_actions jsonb not null default '[]'::jsonb,
  caution_text text,
  official_performance_ids jsonb not null default '[]'::jsonb,
  editorial_version integer not null default 1,
  reviewed_at timestamptz,
  is_active boolean not null default false,
  unique(age, competency_id, editorial_version)
);

create table if not exists document_templates (
  id uuid primary key,
  template_type text not null,
  template_version integer not null,
  schema_version integer not null,
  file_path text not null,
  active boolean not null default false,
  unique(template_type, template_version)
);

create table if not exists document_versions (
  id uuid primary key,
  owner_user_id uuid not null references profiles(user_id),
  entity_type text not null,
  entity_id uuid not null,
  template_id uuid not null references document_templates(id),
  logo_asset_id uuid references institution_assets(id),
  structured_payload jsonb not null,
  finalized_at timestamptz not null default now()
);
