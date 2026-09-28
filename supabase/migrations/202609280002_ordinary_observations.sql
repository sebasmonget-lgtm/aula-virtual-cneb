-- F5: raw observations, independent from diagnostic notes and curricular evidence.
create unique index if not exists students_id_classroom_unique on public.students(id, classroom_id);

create table public.ordinary_observations (
  id uuid primary key,
  classroom_id uuid not null references public.classrooms(id),
  student_id uuid not null,
  created_by uuid not null references public.profiles(user_id),
  client_request_id uuid not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null,
  captured_at timestamptz not null default now(),
  raw_text text check (raw_text is null or char_length(raw_text) between 1 and 4000),
  media_path text,
  media_mime_type text,
  source_kind text not null check (source_kind in ('guided','spontaneous')),
  context_snapshot jsonb not null default '{}'::jsonb,
  activity_id uuid references public.activities(id),
  project_id uuid references public.learning_experiences(id),
  blueprint_id uuid,
  status text not null default 'saved' check (status in ('saved','corrected','voided')),
  source_revision integer not null default 1 check (source_revision >= 1),
  foreign key (student_id, classroom_id) references public.students(id, classroom_id),
  unique(created_by, client_request_id),
  check (raw_text is not null or media_path is not null),
  check ((media_path is null) = (media_mime_type is null))
);
create index ordinary_observations_student_date_idx on public.ordinary_observations(student_id, occurred_at desc);
create index ordinary_observations_classroom_date_idx on public.ordinary_observations(classroom_id, occurred_at desc);

create table public.ordinary_observation_revisions (
  id uuid primary key,
  observation_id uuid not null references public.ordinary_observations(id),
  revision integer not null check (revision >= 2),
  corrected_text text check (corrected_text is null or char_length(corrected_text) between 1 and 4000),
  action text not null check (action in ('correct','void')),
  reason text not null check (char_length(reason) between 1 and 500),
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  unique(observation_id, revision),
  check (action = 'void' or corrected_text is not null)
);

create function public.protect_ordinary_observation_original() returns trigger language plpgsql set search_path = '' as $$
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
create trigger ordinary_observation_original_immutable before update on public.ordinary_observations
  for each row execute function public.protect_ordinary_observation_original();

create function public.protect_ordinary_observation_revision() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'La revisión de observación es inmutable.';
end;
$$;
create trigger ordinary_observation_revision_immutable before update or delete on public.ordinary_observation_revisions
  for each row execute function public.protect_ordinary_observation_revision();

revoke all on function public.protect_ordinary_observation_original(), public.protect_ordinary_observation_revision() from public, anon, authenticated;
alter table public.ordinary_observations enable row level security;
alter table public.ordinary_observation_revisions enable row level security;
create policy teacher_read_own on public.ordinary_observations for select to authenticated
  using (created_by = (select auth.uid()) and private.owns_classroom(classroom_id)
    and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id));
create policy teacher_read_own on public.ordinary_observation_revisions for select to authenticated
  using (created_by = (select auth.uid()) and exists (select 1 from public.ordinary_observations o
    where o.id = observation_id and o.created_by = (select auth.uid()) and private.owns_classroom(o.classroom_id)));
revoke all on public.ordinary_observations, public.ordinary_observation_revisions from anon, authenticated;
grant select on public.ordinary_observations, public.ordinary_observation_revisions to authenticated;

insert into storage.buckets (id, name, public)
values ('ayni-observation-media', 'ayni-observation-media', false)
on conflict (id) do nothing;
-- No browser/Data API media writes or public reads; the authorized backend is the only writer/reader.
