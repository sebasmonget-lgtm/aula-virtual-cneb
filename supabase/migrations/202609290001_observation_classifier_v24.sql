begin;
alter table public.diagnostic_spontaneous_observations
  add column classifier_version text,
  add column classifier_status text check (classifier_status in ('pending','suggested','abstained','privacy_blocked','missing_text','failed','disabled')),
  add column teacher_action text check (teacher_action in ('confirmed','changed','rejected','saved_without_competency')),
  add column classifier_latency_ms integer check (classifier_latency_ms >= 0),
  add column classifier_error_code text;
create index diagnostic_spontaneous_v24_metrics_idx
  on public.diagnostic_spontaneous_observations(classroom_id,created_by,classifier_version);
commit;
