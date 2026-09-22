alter table evidences drop constraint if exists evidences_observation_text_check;
alter table evidences alter column observation_text drop not null;
alter table evidences add column if not exists observation_status text check (observation_status in (
  'demonstrated', 'with_support', 'not_yet_demonstrated', 'insufficient_information'
));
alter table evidences add constraint evidences_meaningful_content_check check (
  observation_status is not null or observation_text is not null or media_path is not null
);
create index if not exists evidences_student_criterion_date_idx on evidences(student_id, criterion_id, observed_at desc);
