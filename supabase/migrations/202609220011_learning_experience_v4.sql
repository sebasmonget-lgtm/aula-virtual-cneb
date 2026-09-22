begin;
alter table public.learning_experiences add column if not exists teacher_confirmed_at timestamptz;
alter table public.learning_experiences add column if not exists generation_metadata jsonb not null default '{}'::jsonb;
alter table public.learning_experiences add column if not exists source_proposal_index integer;
create unique index if not exists learning_experiences_planned_proposal_once on public.learning_experiences(annual_plan_id, source_proposal_index) where origin = 'planned';
commit;
