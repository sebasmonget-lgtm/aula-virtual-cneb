begin;
alter table public.activities add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.activities add column if not exists generation_metadata jsonb not null default '{}'::jsonb;
alter table public.activities add column if not exists teacher_confirmed_at timestamptz;
alter table public.activities add column if not exists created_at timestamptz not null default now();
alter table public.activities add column if not exists updated_at timestamptz not null default now();
commit;
