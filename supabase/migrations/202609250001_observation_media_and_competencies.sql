begin;
alter table public.diagnostic_spontaneous_observations
  add column competency_v4_ids text[] not null default '{}',
  add column suggested_competency_v4_ids text[] not null default '{}',
  add column media_path text,
  add column media_mime_type text;

update public.diagnostic_spontaneous_observations set competency_v4_ids = array_remove(array[competency_v4_id, secondary_competency_v4_id], null)
  where classification_status = 'classified';
update public.diagnostic_spontaneous_observations set suggested_competency_v4_ids = array_remove(array[competency_v4_id, secondary_competency_v4_id], null)
  where classification_status <> 'classified' and classification_source = 'jev';

alter table public.diagnostic_spontaneous_observations drop constraint diagnostic_spontaneous_observations_classification_source_check;
alter table public.diagnostic_spontaneous_observations add constraint diagnostic_spontaneous_observations_classification_source_check
  check (classification_source in ('jev', 'openai', 'teacher'));
alter table public.diagnostic_spontaneous_observations alter column observation_text drop not null;
alter table public.diagnostic_spontaneous_observations drop constraint diagnostic_spontaneous_observations_observation_text_check;
alter table public.diagnostic_spontaneous_observations add constraint diagnostic_spontaneous_observations_observation_text_check
  check (observation_text is null or char_length(observation_text) between 1 and 4000);
alter table public.diagnostic_spontaneous_observations add constraint diagnostic_spontaneous_content_check
  check (observation_text is not null or media_path is not null);
alter table public.diagnostic_spontaneous_observations add constraint diagnostic_spontaneous_media_type_check
  check ((media_path is null and media_mime_type is null) or
    (media_path is not null and media_mime_type in ('image/jpeg','image/png','image/webp','audio/webm','audio/mpeg','audio/mp4','audio/wav','audio/ogg')));

create or replace function public.protect_diagnostic_observation_source() returns trigger language plpgsql as $$
begin
  if old.classroom_id is distinct from new.classroom_id or old.student_id is distinct from new.student_id
    or old.context_label is distinct from new.context_label or old.observation_text is distinct from new.observation_text
    or old.support_status is distinct from new.support_status or old.observed_at is distinct from new.observed_at
    or old.created_by is distinct from new.created_by or old.media_path is distinct from new.media_path
    or old.media_mime_type is distinct from new.media_mime_type then
    raise exception 'La observación original es inmutable.';
  end if;
  if old.classification_source = 'teacher' and new.classification_source is distinct from 'teacher' then
    raise exception 'Una corrección docente no puede sobrescribirse.';
  end if;
  return new;
end;
$$;
commit;
