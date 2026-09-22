alter table activities add column if not exists details jsonb not null default '{}'::jsonb;
alter table activities add column if not exists generation_metadata jsonb not null default '{}'::jsonb;
alter table activities add column if not exists teacher_confirmed_at timestamptz;
alter table activities add column if not exists created_at timestamptz not null default now();
alter table activities add column if not exists updated_at timestamptz not null default now();
