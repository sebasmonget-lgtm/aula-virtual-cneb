-- Dedicated V2 queue: legacy workers must never claim these tasks.
create table multi_age_generation_jobs (
  id uuid primary key,
  teacher_id uuid not null references profiles(user_id),
  classroom_id uuid not null references classrooms(id),
  kind text not null check(kind in ('diagnostic','annual','activity')),
  input jsonb not null,
  input_fingerprint text not null,
  source_fingerprint text not null,
  provider_mode text not null check(provider_mode in ('fixture','openai')),
  status text not null check(status in ('queued','running','ready','failed','interrupted','stale')),
  result jsonb,
  error_code text,
  attempts integer not null default 0 check(attempts>=0 and attempts<=3),
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(teacher_id,input_fingerprint),
  check((status='ready')=(result is not null))
);
create index multi_age_generation_queue on multi_age_generation_jobs(status,created_at);
create function validate_multi_age_generation_owner() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from classrooms where id=new.classroom_id and teacher_id=new.teacher_id and curriculum_contract_version=2)
    then raise exception 'La tarea no corresponde a un aula multiedad de esta docente.' using errcode='42501'; end if;
  if tg_op='UPDATE' and (new.teacher_id<>old.teacher_id or new.classroom_id<>old.classroom_id or new.kind<>old.kind
    or new.input is distinct from old.input or new.input_fingerprint<>old.input_fingerprint or new.source_fingerprint<>old.source_fingerprint
    or new.provider_mode<>old.provider_mode) then raise exception 'El contexto de la tarea es inmutable.'; end if;
  return new;
end $$;
create trigger multi_age_generation_owner before insert or update on multi_age_generation_jobs for each row execute function validate_multi_age_generation_owner();
