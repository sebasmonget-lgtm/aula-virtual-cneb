begin;
alter table public.diagnostic_experience_observations drop constraint diagnostic_experience_observations_observation_status_check;
alter table public.diagnostic_experience_observations add constraint diagnostic_experience_observations_observation_status_check
  check (observation_status in ('demonstrated','with_support','not_yet_demonstrated','insufficient_information','observed_without_judgment'));
create table public.student_family_interviews (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'confirmed')),
  details jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  teacher_confirmed_at timestamptz,
  unique(student_id, version),
  unique(id, classroom_id, student_id)
);
create unique index student_family_interview_one_draft_idx on public.student_family_interviews(student_id) where status = 'draft';
create index student_family_interview_scope_idx on public.student_family_interviews(classroom_id, student_id, version desc);
create trigger student_family_interview_immutable before update or delete on public.student_family_interviews
  for each row execute function public.prevent_confirmed_diagnostic_change();

create table public.student_family_interview_attachments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  interview_id uuid not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (interview_id, classroom_id, student_id)
    references public.student_family_interviews(id, classroom_id, student_id) on delete cascade
);
create index student_family_interview_attachment_scope_idx on public.student_family_interview_attachments(classroom_id,student_id,created_at desc);
create unique index student_family_interview_one_attachment_idx on public.student_family_interview_attachments(interview_id);

-- Private backups use the same opaque key as local storage:
-- family-interview/<teacher-uuid>/<student-uuid>/<opaque-uuid>.<extension>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-interviews', 'family-interviews', false, 3000000,
  array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create policy family_interview_storage_read_own on storage.objects for select to authenticated
  using (bucket_id = 'family-interviews' and (storage.foldername(name))[1] = 'family-interview'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.students s where s.id::text = (storage.foldername(name))[3]
      and public.owns_student(s.id)));
-- No authenticated write policies: upload/replacement/deletion require the authorized server.

create table public.diagnostic_spontaneous_observations (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  context_label text not null check (char_length(context_label) between 1 and 120),
  observation_text text not null check (char_length(observation_text) between 1 and 4000),
  support_status text check (support_status in ('no', 'yes', 'unknown')),
  observed_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  classification_status text not null default 'pending' check (classification_status in ('pending', 'classified', 'needs_review')),
  classification_source text check (classification_source in ('jev', 'teacher')),
  competency_v4_id text,
  secondary_competency_v4_id text,
  classification_confidence numeric check (classification_confidence between 0 and 1),
  classification_reason text,
  classified_at timestamptz
);
create index diagnostic_spontaneous_classroom_idx on public.diagnostic_spontaneous_observations(classroom_id, student_id, observed_at desc);
create index diagnostic_spontaneous_pending_idx on public.diagnostic_spontaneous_observations(classroom_id, classification_status) where classification_status <> 'classified';
create function public.protect_diagnostic_observation_source() returns trigger language plpgsql as $$
begin
  if old.classroom_id is distinct from new.classroom_id or old.student_id is distinct from new.student_id
    or old.context_label is distinct from new.context_label or old.observation_text is distinct from new.observation_text
    or old.support_status is distinct from new.support_status or old.observed_at is distinct from new.observed_at
    or old.created_by is distinct from new.created_by then
    raise exception 'La observación original es inmutable.';
  end if;
  if old.classification_source = 'teacher' and new.classification_source is distinct from 'teacher' then
    raise exception 'Una corrección docente no puede sobrescribirse.';
  end if;
  return new;
end;
$$;
create trigger diagnostic_spontaneous_source_immutable before update on public.diagnostic_spontaneous_observations
  for each row execute function public.protect_diagnostic_observation_source();

alter table public.student_family_interviews enable row level security;
alter table public.student_family_interview_attachments enable row level security;
alter table public.diagnostic_spontaneous_observations enable row level security;
create policy family_interview_read_own on public.student_family_interviews for select to authenticated using (
  created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
  and exists(select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id));
create policy family_interview_attachment_read_own on public.student_family_interview_attachments for select to authenticated using (
  created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
  and exists(select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id));
create policy spontaneous_diagnostic_read_own on public.diagnostic_spontaneous_observations for select to authenticated using (
  created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
  and exists(select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id));
-- Writes go only through the server, which validates age, ownership and v4 applicability.
revoke insert, update, delete on public.student_family_interviews from authenticated;
revoke insert, update, delete on public.student_family_interview_attachments from authenticated;
revoke insert, update, delete on public.diagnostic_spontaneous_observations from authenticated;
commit;
