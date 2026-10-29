begin;
-- No rewrite of existing projects/activities. An older V2 activity occupies position 1.
create unique index multi_age_activity_position on activities(experience_id,(coalesce((details->'activity_contract'->>'position')::int,1)))
  where details->'activity_contract'->>'curriculum_contract_version'='2';
alter table multi_age_generation_jobs drop constraint multi_age_generation_jobs_kind_check;
alter table multi_age_generation_jobs add constraint multi_age_generation_jobs_kind_check check(kind in ('diagnostic','annual','activity','conversation'));
create unique index multi_age_conversation_turn on multi_age_generation_jobs(teacher_id,classroom_id,(input->>'scopeKey'),((input->>'turnNumber')::int)) where kind='conversation';
create table multi_age_planning_decisions(
  id uuid primary key,
  teacher_id uuid not null references auth.users(id),
  classroom_id uuid not null references classrooms(id),
  scope_key text not null,
  revision integer not null check(revision>0),
  messages jsonb not null check(jsonb_typeof(messages)='array'),
  teacher_confirmed_at timestamptz not null default now(),
  unique(teacher_id,classroom_id,scope_key,revision)
);
create function validate_multi_age_decision() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare item jsonb;
begin
  if tg_op<>'INSERT' then raise exception 'Las decisiones confirmadas conservan su historia.'; end if;
  if not exists(select 1 from classrooms where id=new.classroom_id and teacher_id=new.teacher_id and curriculum_contract_version=2)
    then raise exception 'Decisión fuera del aula autorizada.' using errcode='42501'; end if;
  for item in select * from jsonb_array_elements(new.messages) loop
    if not exists(select 1 from multi_age_generation_jobs j where j.id=(item->>'turnId')::uuid and j.teacher_id=new.teacher_id
      and j.classroom_id=new.classroom_id and j.kind='conversation' and j.input->>'scopeKey'=new.scope_key and j.input->>'text'=item->>'text')
      then raise exception 'Una decisión requiere un mensaje docente propio y literal.'; end if;
  end loop;
  return new;
end $$;
create trigger multi_age_decision_guard before insert or update or delete on multi_age_planning_decisions for each row execute function validate_multi_age_decision();

alter table public.multi_age_planning_decisions enable row level security;
create policy multi_age_decisions_read_own on public.multi_age_planning_decisions for select to authenticated using(teacher_id=(select auth.uid()) and private.owns_classroom(classroom_id));
revoke all on public.multi_age_planning_decisions from public,anon,authenticated;
grant select on public.multi_age_planning_decisions to authenticated;

commit;
