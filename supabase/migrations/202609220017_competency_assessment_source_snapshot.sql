alter table public.competency_assessments add column if not exists source_evidence_snapshot jsonb not null default '[]'::jsonb;
