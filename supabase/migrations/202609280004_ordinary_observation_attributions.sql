-- F6: append-only curricular decisions; never edit raw text or student identity.
alter table public.ordinary_observations add column captured_criterion_id uuid references public.activity_criteria(id);

create function public.protect_ordinary_capture_criterion() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.captured_criterion_id is distinct from new.captured_criterion_id then
    raise exception 'El criterio elegido al capturar es inmutable.';
  end if;
  return new;
end;
$$;
create trigger ordinary_capture_criterion_immutable before update on public.ordinary_observations
  for each row execute function public.protect_ordinary_capture_criterion();

create table public.ordinary_observation_attributions (
  id uuid primary key,
  observation_id uuid not null references public.ordinary_observations(id),
  version integer not null check (version >= 1),
  state text not null check (state in ('suggested','confirmed','unclassified','unavailable')),
  source text not null check (source in ('jev','teacher','system')),
  candidate_competency_ids text[] not null default '{}',
  confirmed_competency_ids text[] not null default '{}',
  confirmed_criterion_ids uuid[] not null default '{}',
  raw_revision integer not null check (raw_revision >= 1),
  provenance jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  unique (observation_id, version),
  check ((state = 'confirmed' and cardinality(confirmed_competency_ids) > 0) or
    (state <> 'confirmed' and cardinality(confirmed_competency_ids) = 0 and cardinality(confirmed_criterion_ids) = 0)),
  check (state <> 'unclassified' or cardinality(candidate_competency_ids) = 0)
);
create index ordinary_attribution_observation_version_idx on public.ordinary_observation_attributions(observation_id, version desc);

create function public.protect_ordinary_attribution() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'La atribución histórica es inmutable.';
end;
$$;
create trigger ordinary_attribution_immutable before update or delete on public.ordinary_observation_attributions
  for each row execute function public.protect_ordinary_attribution();

create table public.ordinary_observation_criterion_links (
  id uuid primary key,
  observation_id uuid not null references public.ordinary_observations(id),
  attribution_id uuid not null references public.ordinary_observation_attributions(id),
  criterion_id uuid not null references public.activity_criteria(id),
  source_revision integer not null,
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  unique (attribution_id, criterion_id)
);
create trigger ordinary_criterion_link_immutable before update or delete on public.ordinary_observation_criterion_links
  for each row execute function public.protect_ordinary_attribution();
revoke all on function public.protect_ordinary_capture_criterion(), public.protect_ordinary_attribution() from public, anon, authenticated;

alter table public.ordinary_observation_attributions enable row level security;
alter table public.ordinary_observation_criterion_links enable row level security;
create policy teacher_read_own on public.ordinary_observation_attributions for select to authenticated
  using (created_by = (select auth.uid()) and exists (select 1 from public.ordinary_observations o
    where o.id = observation_id and o.created_by = (select auth.uid()) and private.owns_classroom(o.classroom_id)));
revoke all on public.ordinary_observation_attributions from anon, authenticated;
grant select on public.ordinary_observation_attributions to authenticated;
create policy teacher_read_own on public.ordinary_observation_criterion_links for select to authenticated
  using (created_by = (select auth.uid()) and exists (select 1 from public.ordinary_observations o
    where o.id = observation_id and o.created_by = (select auth.uid()) and private.owns_classroom(o.classroom_id)));
revoke all on public.ordinary_observation_criterion_links from anon, authenticated;
grant select on public.ordinary_observation_criterion_links to authenticated;
