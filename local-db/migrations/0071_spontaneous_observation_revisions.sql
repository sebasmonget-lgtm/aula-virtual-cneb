create table diagnostic_spontaneous_observation_revisions (
  id uuid primary key,
  observation_id uuid not null references diagnostic_spontaneous_observations(id),
  actor_id uuid not null references profiles(user_id),
  revision integer not null check (revision > 0),
  state text not null check (state in ('active','withdrawn')),
  corrected_text text not null check (length(corrected_text) <= 4000),
  created_at timestamptz not null default now(),
  unique (observation_id, revision)
);
create function protect_spontaneous_revision() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'La revisión es inmutable.'; end if;
  if not exists(select 1 from diagnostic_spontaneous_observations o where o.id=new.observation_id and o.created_by=new.actor_id) then
    raise exception 'Observación no disponible.';
  end if;
  return new;
end;
$$;
create trigger spontaneous_revision_protect before insert or update or delete on diagnostic_spontaneous_observation_revisions
  for each row execute function protect_spontaneous_revision();
create view effective_diagnostic_spontaneous_observations as
select effective.*, coalesce(r.revision,0) as source_revision
from diagnostic_spontaneous_observations o
left join lateral (select revision,state,corrected_text from diagnostic_spontaneous_observation_revisions where observation_id=o.id order by revision desc limit 1) r on true
cross join lateral jsonb_populate_record(null::diagnostic_spontaneous_observations,
  to_jsonb(o)||jsonb_build_object('observation_text',coalesce(r.corrected_text,o.observation_text))) effective
where coalesce(r.state,'active')='active';
