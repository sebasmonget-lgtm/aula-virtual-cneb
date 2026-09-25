create table annual_plan_formal_content (
  annual_plan_id uuid primary key references annual_plans(id),
  content jsonb not null,
  ai_metadata jsonb not null default '{}'::jsonb,
  source_revision integer not null,
  created_at timestamptz not null default now()
);
