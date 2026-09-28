-- F6: append-only curricular decisions; raw observations and student identity remain canonical.
alter table ordinary_observations add column captured_criterion_id uuid references activity_criteria(id);

create function protect_ordinary_capture_criterion() returns trigger language plpgsql as $$
begin
  if old.captured_criterion_id is distinct from new.captured_criterion_id then
    raise exception 'El criterio elegido al capturar es inmutable.';
  end if;
  return new;
end;
$$;
create trigger ordinary_capture_criterion_immutable before update on ordinary_observations
  for each row execute function protect_ordinary_capture_criterion();

create table ordinary_observation_attributions (
  id uuid primary key,
  observation_id uuid not null references ordinary_observations(id),
  version integer not null check (version >= 1),
  state text not null check (state in ('suggested','confirmed','unclassified','unavailable')),
  source text not null check (source in ('jev','teacher','system')),
  candidate_competency_ids text[] not null default '{}',
  confirmed_competency_ids text[] not null default '{}',
  confirmed_criterion_ids uuid[] not null default '{}',
  raw_revision integer not null check (raw_revision >= 1),
  provenance jsonb not null default '{}'::jsonb,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  unique (observation_id, version),
  check ((state = 'confirmed' and cardinality(confirmed_competency_ids) > 0) or
    (state <> 'confirmed' and cardinality(confirmed_competency_ids) = 0 and cardinality(confirmed_criterion_ids) = 0)),
  check (state <> 'unclassified' or cardinality(candidate_competency_ids) = 0)
);
create index ordinary_attribution_observation_version_idx on ordinary_observation_attributions(observation_id, version desc);

create function protect_ordinary_attribution() returns trigger language plpgsql as $$
begin
  raise exception 'La atribución histórica es inmutable.';
end;
$$;
create trigger ordinary_attribution_immutable before update or delete on ordinary_observation_attributions
  for each row execute function protect_ordinary_attribution();

-- A link is a projection of a confirmed teacher decision, never of a Jev candidate.
-- It is active only while its attribution is the latest teacher decision at the current raw revision.
create table ordinary_observation_criterion_links (
  id uuid primary key,
  observation_id uuid not null references ordinary_observations(id),
  attribution_id uuid not null references ordinary_observation_attributions(id),
  criterion_id uuid not null references activity_criteria(id),
  source_revision integer not null,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  unique (attribution_id, criterion_id)
);
create trigger ordinary_criterion_link_immutable before update or delete on ordinary_observation_criterion_links
  for each row execute function protect_ordinary_attribution();
