begin;
alter table public.competency_assessments
  add column if not exists draft_teacher_analysis text,
  add column if not exists working_conclusion_text text,
  add column if not exists provisional_level text check (provisional_level in ('AD','A','B','C')),
  add column if not exists draft_teacher_justification text;

alter table public.competency_assessments
  add constraint competency_assessment_draft_without_final_level
  check (status <> 'draft' or achievement_level is null) not valid;
alter table public.competency_assessments validate constraint competency_assessment_draft_without_final_level;
commit;
