begin;
create unique index if not exists competency_assessments_version_unique
  on public.competency_assessments(student_id, competency_v4_id, period_start, period_end, version);
create unique index if not exists descriptive_conclusions_version_unique
  on public.competency_descriptive_conclusions(student_id, competency_v4_id, period_start, period_end, version);
commit;
