-- Ordinary facts are captured before curricular attribution. Never rewrite the original.
create unique index if not exists students_id_classroom_unique on students(id, classroom_id);

create table ordinary_observations (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  student_id uuid not null,
  created_by uuid not null references profiles(user_id),
  client_request_id uuid not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null,
  captured_at timestamptz not null default now(),
  raw_text text check (raw_text is null or char_length(raw_text) between 1 and 4000),
  media_path text,
  media_mime_type text,
  source_kind text not null check (source_kind in ('guided','spontaneous')),
  context_snapshot jsonb not null default '{}'::jsonb,
  activity_id uuid references activities(id),
  project_id uuid references learning_experiences(id),
  blueprint_id uuid,
  status text not null default 'saved' check (status in ('saved','corrected','voided')),
  source_revision integer not null default 1 check (source_revision >= 1),
  foreign key (student_id, classroom_id) references students(id, classroom_id),
  unique(created_by, client_request_id),
  check (raw_text is not null or media_path is not null),
  check ((media_path is null) = (media_mime_type is null))
);
create index ordinary_observations_student_date_idx on ordinary_observations(student_id, occurred_at desc);
create index ordinary_observations_classroom_date_idx on ordinary_observations(classroom_id, occurred_at desc);

create table ordinary_observation_revisions (
  id uuid primary key,
  observation_id uuid not null references ordinary_observations(id),
  revision integer not null check (revision >= 2),
  corrected_text text check (corrected_text is null or char_length(corrected_text) between 1 and 4000),
  action text not null check (action in ('correct','void')),
  reason text not null check (char_length(reason) between 1 and 500),
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  unique(observation_id, revision),
  check (action = 'void' or corrected_text is not null)
);

create function protect_ordinary_observation_original() returns trigger language plpgsql as $$
begin
  if old.id is distinct from new.id or old.classroom_id is distinct from new.classroom_id
    or old.student_id is distinct from new.student_id or old.created_by is distinct from new.created_by
    or old.client_request_id is distinct from new.client_request_id
    or old.request_fingerprint is distinct from new.request_fingerprint
    or old.occurred_at is distinct from new.occurred_at or old.captured_at is distinct from new.captured_at
    or old.raw_text is distinct from new.raw_text or old.media_path is distinct from new.media_path
    or old.media_mime_type is distinct from new.media_mime_type
    or old.source_kind is distinct from new.source_kind or old.context_snapshot is distinct from new.context_snapshot
    or old.activity_id is distinct from new.activity_id or old.project_id is distinct from new.project_id
    or old.blueprint_id is distinct from new.blueprint_id then
    raise exception 'La observación original es inmutable.';
  end if;
  if new.source_revision <> old.source_revision + 1 then
    raise exception 'La revisión debe avanzar una vez.';
  end if;
  return new;
end;
$$;
create trigger ordinary_observation_original_immutable before update on ordinary_observations
  for each row execute function protect_ordinary_observation_original();

create function protect_ordinary_observation_revision() returns trigger language plpgsql as $$
begin
  raise exception 'La revisión de observación es inmutable.';
end;
$$;
create trigger ordinary_observation_revision_immutable before update or delete on ordinary_observation_revisions
  for each row execute function protect_ordinary_observation_revision();
