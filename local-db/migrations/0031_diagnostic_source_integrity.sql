-- Preserve the already applied 0030 while tightening attachment ownership and
-- allowing a teacher to correct their own competency choice more than once.
create unique index student_family_interview_one_attachment_idx
  on student_family_interview_attachments(interview_id);
alter table student_family_interviews
  add constraint student_family_interviews_scope_key unique (id, classroom_id, student_id);
alter table student_family_interview_attachments
  drop constraint student_family_interview_attachments_interview_id_fkey;
alter table student_family_interview_attachments
  add constraint student_family_interview_attachment_scope_fkey
  foreign key (interview_id, classroom_id, student_id)
  references student_family_interviews(id, classroom_id, student_id);

create or replace function protect_diagnostic_observation_source() returns trigger language plpgsql as $$
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
