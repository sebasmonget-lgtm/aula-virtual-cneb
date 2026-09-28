-- Preserve teacher corrections without rewriting the observed act or its date.
alter table evidences add column if not exists student_reassignment_history jsonb not null default '[]'::jsonb
  check (jsonb_typeof(student_reassignment_history) = 'array');
