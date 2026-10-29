begin;
-- Prepared only; the local feature is rejected by cloud/serverless entry points.
create table public.multi_age_generation_jobs (
  id uuid primary key,
  teacher_id uuid not null references auth.users(id),
  classroom_id uuid not null references public.classrooms(id),
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
create index multi_age_generation_queue on public.multi_age_generation_jobs(status,created_at);
create function public.validate_multi_age_generation_owner() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from classrooms where id=new.classroom_id and teacher_id=new.teacher_id and curriculum_contract_version=2)
    then raise exception 'La tarea no corresponde a un aula multiedad de esta docente.' using errcode='42501'; end if;
  if tg_op='UPDATE' and (new.teacher_id<>old.teacher_id or new.classroom_id<>old.classroom_id or new.kind<>old.kind
    or new.input is distinct from old.input or new.input_fingerprint<>old.input_fingerprint or new.source_fingerprint<>old.source_fingerprint
    or new.provider_mode<>old.provider_mode) then raise exception 'El contexto de la tarea es inmutable.'; end if;
  return new;
end $$;
create trigger multi_age_generation_owner before insert or update on public.multi_age_generation_jobs for each row execute function public.validate_multi_age_generation_owner();
alter table public.multi_age_generation_jobs enable row level security;
create policy multi_age_generation_read_own on public.multi_age_generation_jobs for select to authenticated
  using(teacher_id=(select auth.uid()) and private.owns_classroom(classroom_id));
revoke all on public.multi_age_generation_jobs from public,anon,authenticated;
grant select on public.multi_age_generation_jobs to authenticated;
commit;
