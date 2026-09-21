create table if not exists observation_references (
  id uuid primary key,
  guide_id uuid not null references competency_observation_guides(id),
  short_observable_text text not null,
  performance_ids jsonb not null default '[]'::jsonb,
  evidence_recommendation text not null default 'note' check (evidence_recommendation in ('none','note','photo','audio','short_video')),
  sort_order smallint not null default 0,
  reviewed_at timestamptz,
  is_active boolean not null default false
);

alter table diagnostic_entries drop constraint if exists diagnostic_entries_observation_text_check;
alter table diagnostic_entries alter column observation_text drop not null;
alter table diagnostic_entries add constraint diagnostic_entries_observation_text_check
  check (observation_text is null or char_length(observation_text) between 1 and 4000);

create table if not exists student_observations (
  id uuid primary key,
  diagnostic_entry_id uuid not null references diagnostic_entries(id) on delete cascade,
  reference_id uuid not null references observation_references(id),
  status text not null check (status in ('observed','with_support','not_observed_yet','need_more_information')),
  note text,
  observed_at timestamptz not null default now(),
  author_id uuid not null references profiles(user_id),
  unique(diagnostic_entry_id, reference_id)
);

-- Catálogo de demostración: referencia vinculada al desempeño de muestra local.
-- No se exporta a producción hasta reemplazarlo por CNEB oficial revisado.
insert into observation_references (
  id, guide_id, short_observable_text, performance_ids,
  evidence_recommendation, sort_order, reviewed_at, is_active
) values (
  'd1000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'Formula una pregunta sobre un cambio que observó al explorar una planta o semilla.',
  '["60000000-0000-4000-8000-000000000001"]'::jsonb,
  'note', 1, now(), true
) on conflict do nothing;

insert into observation_references (
  id, guide_id, short_observable_text, performance_ids,
  evidence_recommendation, sort_order, reviewed_at, is_active
) values (
  'd1000000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000001',
  'Compara dos características observables y cuenta con sus palabras qué diferencia encontró.',
  '["60000000-0000-4000-8000-000000000001"]'::jsonb,
  'photo', 2, now(), true
) on conflict do nothing;
