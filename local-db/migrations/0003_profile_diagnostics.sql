alter table institution_profiles add column if not exists institution_code text;
alter table institution_profiles add column if not exists district text;
alter table institution_profiles add column if not exists ugel text;
alter table institution_profiles add column if not exists director_name text;

create table if not exists diagnostic_sessions (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  title text not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now()
);

create table if not exists diagnostic_entries (
  id uuid primary key,
  session_id uuid not null references diagnostic_sessions(id) on delete cascade,
  student_id uuid not null references students(id),
  competency_id uuid not null references competencies(id),
  guide_id uuid references competency_observation_guides(id),
  observation_context text not null,
  observation_text text not null check (char_length(observation_text) between 1 and 4000),
  teacher_interpretation text,
  teacher_confirmed boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, student_id, competency_id)
);

create index if not exists diagnostic_entries_student_idx
  on diagnostic_entries(student_id, updated_at desc);

insert into competency_observation_guides (
  id, age, competency_id, short_meaning, suggested_contexts, observe_for,
  suggested_actions, caution_text, official_performance_ids, editorial_version,
  reviewed_at, is_active
) values (
  'd0000000-0000-4000-8000-000000000001', 5,
  '50000000-0000-4000-8000-000000000001',
  'Explora, formula preguntas y comunica lo que descubre al comparar cambios en su entorno.',
  '["Juego libre en el jardín", "Exploración con semillas", "Conversación durante una actividad"]'::jsonb,
  '["Formula preguntas a partir de lo que observa", "Compara características o cambios", "Explica una idea usando sus propias palabras"]'::jsonb,
  '["Invita a describir antes de explicar", "Pregunta qué cambió y cómo lo sabe", "Registra expresiones textuales sin completarlas"]'::jsonb,
  'Guía editorial de demostración. No reemplaza el desempeño oficial ni determina automáticamente un nivel de logro.',
  '["60000000-0000-4000-8000-000000000001"]'::jsonb,
  1, now(), true
) on conflict do nothing;
