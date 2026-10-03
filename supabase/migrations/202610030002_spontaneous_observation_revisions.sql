begin;
create table public.diagnostic_spontaneous_observation_revisions (
  id uuid primary key,
  observation_id uuid not null references public.diagnostic_spontaneous_observations(id),
  actor_id uuid not null references auth.users(id),
  revision integer not null check (revision > 0),
  state text not null check (state in ('active','withdrawn')),
  corrected_text text not null check (length(corrected_text) <= 4000),
  created_at timestamptz not null default now(),
  unique (observation_id, revision)
);
create function public.protect_spontaneous_revision() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then raise exception 'La revisión es inmutable.'; end if;
  if not exists(select 1 from public.diagnostic_spontaneous_observations o where o.id=new.observation_id and o.created_by=new.actor_id) then
    raise exception 'Observación no disponible.';
  end if;
  return new;
end;
$$;
create trigger spontaneous_revision_protect before insert or update or delete on public.diagnostic_spontaneous_observation_revisions
  for each row execute function public.protect_spontaneous_revision();
create view public.effective_diagnostic_spontaneous_observations with (security_invoker=true) as
select effective.*, coalesce(r.revision,0) as source_revision
from public.diagnostic_spontaneous_observations o
left join lateral (select revision,state,corrected_text from public.diagnostic_spontaneous_observation_revisions where observation_id=o.id order by revision desc limit 1) r on true
cross join lateral jsonb_populate_record(null::public.diagnostic_spontaneous_observations,
  to_jsonb(o)||jsonb_build_object('observation_text',coalesce(r.corrected_text,o.observation_text))) effective
where coalesce(r.state,'active')='active';

alter table public.diagnostic_spontaneous_observation_revisions enable row level security;
create policy spontaneous_revision_read_own on public.diagnostic_spontaneous_observation_revisions for select to authenticated using
(actor_id=(select auth.uid()) and exists(select 1 from public.diagnostic_spontaneous_observations o where o.id=observation_id and o.created_by=(select auth.uid()) and private.owns_classroom(o.classroom_id)));
revoke all on public.diagnostic_spontaneous_observation_revisions from anon,authenticated;
grant select on public.diagnostic_spontaneous_observation_revisions,public.effective_diagnostic_spontaneous_observations to authenticated;
revoke all on function public.protect_spontaneous_revision() from public,anon,authenticated;
commit;
