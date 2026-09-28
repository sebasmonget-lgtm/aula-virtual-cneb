-- Existing evidence RLS remains in force for the original and target student.
alter table public.evidences add column if not exists student_reassignment_history jsonb not null default '[]'::jsonb
  check (jsonb_typeof(student_reassignment_history) = 'array');
