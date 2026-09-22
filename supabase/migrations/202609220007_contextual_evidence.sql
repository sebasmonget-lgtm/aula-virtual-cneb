begin;

alter table public.activity_criteria
  add column if not exists evidence_kind text check (evidence_kind in ('observation', 'oral', 'drawing', 'production', 'photo', 'movement'));

-- Future private bucket: student-evidence. Its objects remain outside the AI payload by default.
-- Storage policies will be applied only in the new Supabase staging project after auth/RLS validation.

commit;
