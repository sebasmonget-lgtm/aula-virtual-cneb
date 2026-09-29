begin;

update diagnostic_spontaneous_observations
set classifier_status = case when teacher_action is null then 'pending' else 'disabled' end,
    classification_status = case when teacher_action is null then 'pending' else classification_status end,
    classification_source = case when teacher_action is null then null else classification_source end,
    classification_reason = null,
    classifier_error_code = null,
    classifier_latency_ms = null,
    classified_at = case when teacher_action is null then null else classified_at end
where classifier_version = 'CURRENT_V2_4_RAW' and classifier_status = 'privacy_blocked';

alter table diagnostic_spontaneous_observations
  drop constraint diagnostic_spontaneous_observations_classifier_status_check;
alter table diagnostic_spontaneous_observations
  add constraint diagnostic_spontaneous_observations_classifier_status_check
  check (classifier_status in ('pending','suggested','abstained','missing_text','failed','disabled'));

commit;
