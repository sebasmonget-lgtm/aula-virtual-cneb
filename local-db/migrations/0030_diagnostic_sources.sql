-- Canonical family interview and spontaneous diagnostic observations.
alter table diagnostic_experience_observations drop constraint diagnostic_experience_observations_observation_status_check;
alter table diagnostic_experience_observations add constraint diagnostic_experience_observations_observation_status_check
  check (observation_status in ('demonstrated','with_support','not_yet_demonstrated','insufficient_information','observed_without_judgment'));
create table student_family_interviews (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  student_id uuid not null references students(id),
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'confirmed')),
  details jsonb not null default '{}'::jsonb,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  teacher_confirmed_at timestamptz,
  unique(student_id, version)
);
create unique index student_family_interview_one_draft_idx on student_family_interviews(student_id) where status = 'draft';
create index student_family_interview_scope_idx on student_family_interviews(classroom_id, student_id, version desc);
create trigger student_family_interview_immutable before update or delete on student_family_interviews
  for each row execute function prevent_confirmed_diagnostic_change();

create table student_family_interview_attachments (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  student_id uuid not null references students(id),
  interview_id uuid not null references student_family_interviews(id),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now()
);
create index student_family_interview_attachment_scope_idx on student_family_interview_attachments(classroom_id,student_id,created_at desc);

create table diagnostic_spontaneous_observations (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  student_id uuid not null references students(id),
  context_label text not null check (char_length(context_label) between 1 and 120),
  observation_text text not null check (char_length(observation_text) between 1 and 4000),
  support_status text check (support_status in ('no', 'yes', 'unknown')),
  observed_at timestamptz not null default now(),
  created_by uuid not null references profiles(user_id),
  classification_status text not null default 'pending' check (classification_status in ('pending', 'classified', 'needs_review')),
  classification_source text check (classification_source in ('jev', 'teacher')),
  competency_v4_id text,
  secondary_competency_v4_id text,
  classification_confidence numeric check (classification_confidence between 0 and 1),
  classification_reason text,
  classified_at timestamptz
);
create index diagnostic_spontaneous_classroom_idx on diagnostic_spontaneous_observations(classroom_id, student_id, observed_at desc);
create index diagnostic_spontaneous_pending_idx on diagnostic_spontaneous_observations(classroom_id, classification_status) where classification_status <> 'classified';

create function protect_diagnostic_observation_source() returns trigger language plpgsql as $$
begin
  if old.classroom_id is distinct from new.classroom_id or old.student_id is distinct from new.student_id
    or old.context_label is distinct from new.context_label or old.observation_text is distinct from new.observation_text
    or old.support_status is distinct from new.support_status or old.observed_at is distinct from new.observed_at
    or old.created_by is distinct from new.created_by then
    raise exception 'La observación original es inmutable.';
  end if;
  if old.classification_source = 'teacher' and (new.classification_source is distinct from 'teacher'
    or new.competency_v4_id is distinct from old.competency_v4_id
    or new.secondary_competency_v4_id is distinct from old.secondary_competency_v4_id) then
    raise exception 'Una corrección docente no puede sobrescribirse.';
  end if;
  return new;
end;
$$;
create trigger diagnostic_spontaneous_source_immutable before update on diagnostic_spontaneous_observations
  for each row execute function protect_diagnostic_observation_source();
