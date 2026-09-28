-- F10: immutable bytes for a confirmed source/version; no historical backfill.
create table document_artifacts (
  id uuid primary key,
  teacher_id uuid not null references profiles(user_id),
  classroom_id uuid not null references classrooms(id),
  source_kind text not null check (source_kind in ('annual_plan','experience')),
  source_id uuid not null,
  source_version integer not null check (source_version >= 1),
  artifact_version integer not null default 1 check (artifact_version >= 1),
  template_version text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending','failed','confirmed')),
  filename text not null,
  mime_type text not null default 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  storage_key text,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  byte_length integer check (byte_length is null or byte_length > 0),
  attempts integer not null default 0 check (attempts >= 0),
  last_error_code text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique(source_kind,source_id,source_version,artifact_version,template_version),
  check (status <> 'confirmed' or
    (storage_key is not null and sha256 is not null and byte_length is not null and confirmed_at is not null))
);
create index document_artifacts_owner_idx on document_artifacts(teacher_id,classroom_id,created_at desc);

create function protect_confirmed_document_artifact() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'El artefacto documental no se borra.'; end if;
  if old.status = 'confirmed' then raise exception 'El artefacto confirmado es inmutable.'; end if;
  if old.id is distinct from new.id or old.teacher_id is distinct from new.teacher_id
    or old.classroom_id is distinct from new.classroom_id or old.source_kind is distinct from new.source_kind
    or old.source_id is distinct from new.source_id or old.source_version is distinct from new.source_version
    or old.artifact_version is distinct from new.artifact_version
    or old.template_version is distinct from new.template_version
    or old.source_sha256 is distinct from new.source_sha256
    or old.filename is distinct from new.filename or old.mime_type is distinct from new.mime_type then
    raise exception 'La identidad del artefacto es inmutable.';
  end if;
  return new;
end;
$$;
create trigger document_artifact_immutable before update or delete on document_artifacts
  for each row execute function protect_confirmed_document_artifact();
