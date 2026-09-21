begin;

alter table public.diagnostic_entries drop constraint if exists diagnostic_entries_observation_text_check;
alter table public.diagnostic_entries alter column observation_text drop not null;
alter table public.diagnostic_entries add constraint diagnostic_entries_observation_text_check
  check (observation_text is null or char_length(observation_text) between 1 and 4000);

create table public.observation_references (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.competency_observation_guides(id) on delete cascade,
  short_observable_text text not null,
  performance_ids uuid[] not null,
  evidence_recommendation text not null default 'note'
    check (evidence_recommendation in ('none','note','photo','audio','short_video')),
  sort_order smallint not null default 0,
  reviewed_at timestamptz,
  is_active boolean not null default false,
  check (cardinality(performance_ids) > 0)
);

create table public.student_observations (
  id uuid primary key default gen_random_uuid(),
  diagnostic_entry_id uuid not null references public.diagnostic_entries(id) on delete cascade,
  reference_id uuid not null references public.observation_references(id) on delete restrict,
  status text not null check (status in ('observed','with_support','not_observed_yet','need_more_information')),
  note text,
  observed_at timestamptz not null default now(),
  author_id uuid not null references auth.users(id) on delete restrict,
  unique(diagnostic_entry_id, reference_id)
);

alter table public.observation_references enable row level security;
alter table public.student_observations enable row level security;

create policy observation_references_read_reviewed on public.observation_references
  for select to authenticated using (is_active and reviewed_at is not null);

create policy student_observations_own on public.student_observations for all
  to authenticated
  using (author_id = (select auth.uid()) and exists (
    select 1 from public.diagnostic_entries de
    join public.diagnostic_sessions ds on ds.id = de.session_id
    where de.id = diagnostic_entry_id and ds.created_by = (select auth.uid())
  ))
  with check (author_id = (select auth.uid()) and exists (
    select 1 from public.diagnostic_entries de
    join public.diagnostic_sessions ds on ds.id = de.session_id
    where de.id = diagnostic_entry_id and ds.created_by = (select auth.uid())
  ));

commit;
