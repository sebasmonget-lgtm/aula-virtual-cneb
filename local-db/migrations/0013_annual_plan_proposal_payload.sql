alter table annual_plans add column if not exists proposal jsonb not null default '{}'::jsonb;
alter table annual_plans add column if not exists generation_metadata jsonb not null default '{}'::jsonb;
