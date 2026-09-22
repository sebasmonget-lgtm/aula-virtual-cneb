begin;
alter table public.annual_plans add column if not exists proposal jsonb not null default '{}'::jsonb;
alter table public.annual_plans add column if not exists generation_metadata jsonb not null default '{}'::jsonb;
commit;
