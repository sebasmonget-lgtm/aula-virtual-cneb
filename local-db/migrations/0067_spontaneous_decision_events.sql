alter table diagnostic_spontaneous_observations
  add column classifier_attempt_count integer not null default 0 check (classifier_attempt_count >= 0),
  add column classifier_technical_failure_count integer not null default 0 check (classifier_technical_failure_count >= 0);

create table diagnostic_spontaneous_observation_decision_events (
  id uuid primary key,
  observation_id uuid not null references diagnostic_spontaneous_observations(id),
  classroom_id uuid not null references classrooms(id),
  actor_id uuid not null references profiles(user_id),
  decision_number integer not null check (decision_number >= 1),
  classifier_version text,
  suggested_competency_v4_ids_snapshot text[] not null default '{}',
  suggested_primary_competency_id text,
  action text not null check (action in ('confirmed','changed','rejected','saved_without_competency')),
  selected_competency_v4_ids_snapshot text[] not null default '{}',
  selected_primary_competency_id text,
  created_at timestamptz not null default now(),
  unique (observation_id, decision_number),
  check (suggested_primary_competency_id is not distinct from suggested_competency_v4_ids_snapshot[1]),
  check (selected_primary_competency_id is not distinct from selected_competency_v4_ids_snapshot[1]),
  check ((action = 'confirmed' and selected_primary_competency_id is not null and
      selected_primary_competency_id = suggested_primary_competency_id)
    or (action = 'changed' and selected_primary_competency_id is not null)
    or (action = 'rejected' and suggested_primary_competency_id is not null and
      selected_primary_competency_id is null)
    or (action = 'saved_without_competency' and selected_primary_competency_id is null))
);
create index spontaneous_decision_event_scope_idx
  on diagnostic_spontaneous_observation_decision_events(classroom_id,actor_id,observation_id,decision_number desc);

create function protect_spontaneous_decision_event() returns trigger language plpgsql as $$
declare original record;
begin
  if tg_op <> 'INSERT' then raise exception 'El historial de decisiones es inmutable.'; end if;
  select classroom_id,created_by,classifier_version,suggested_competency_v4_ids,
    competency_v4_ids,teacher_action into original
    from diagnostic_spontaneous_observations where id=new.observation_id;
  if not found or original.classroom_id is distinct from new.classroom_id
    or original.created_by is distinct from new.actor_id
    or original.classifier_version is distinct from new.classifier_version
    or original.suggested_competency_v4_ids is distinct from new.suggested_competency_v4_ids_snapshot
    or original.competency_v4_ids is distinct from new.selected_competency_v4_ids_snapshot
    or original.teacher_action is distinct from new.action then
    raise exception 'El evento no coincide con la decisión docente vigente.';
  end if;
  return new;
end;
$$;
create trigger spontaneous_decision_event_validate before insert
  on diagnostic_spontaneous_observation_decision_events for each row execute function protect_spontaneous_decision_event();
create trigger spontaneous_decision_event_immutable before update or delete
  on diagnostic_spontaneous_observation_decision_events for each row execute function protect_spontaneous_decision_event();
